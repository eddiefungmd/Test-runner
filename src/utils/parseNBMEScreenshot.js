// Coordinate-based parser for NBME interface screenshot PDFs.
// One question per page (occasionally 2 pages when images are present).
// Handles NBME 12 style (1275×1066, headerY≈1040) and NBME 14 style (2592×1440,
// headerY≈3970, contentLeftX≈2063) and OCR artifacts from screenshot-to-PDF conversion.

import { guessTopic } from './topicDetect.js';

// ── Profile auto-detection ───────────────────────────────────────────────────
// Returns { HEADER_Y_MIN, FOOTER_Y_MAX, contentLeftX, isLargeFormat }
function detectProfile(pages) {
  let headerY = 0;
  let headerXMin = Infinity;

  for (const page of pages.slice(0, Math.min(8, pages.length))) {
    const items = page.items.filter(it => it.str?.trim());

    // Direct match: single item contains "Item N of N"
    for (const it of items) {
      if (/[IlL]tem\s+\d+\s+[o0]f\s+\d+/i.test(it.str) && it.y > headerY) {
        headerY = it.y;
        // headerXMin will be computed below as the row minimum, not this item's X alone
      }
    }

    // Fragmented: combine items on the same row
    const rows = new Map();
    for (const it of items) {
      const ky = Math.round(it.y / 6) * 6;
      if (!rows.has(ky)) rows.set(ky, []);
      rows.get(ky).push(it);
    }
    for (const [ky, row] of rows) {
      if (ky <= headerY) continue;
      const txt = row.map(it => it.str).join(' ');
      if (/[IlL]tem\s+\d+\s+[o0]f\s+\d+/i.test(txt)) {
        headerY = ky;
      }
    }

    // headerXMin = minimum X of ALL items near the detected header row
    // (not just the "Item N of N" item — we want the leftmost header element)
    if (headerY > 0) {
      const nearHeader = items.filter(it => Math.abs(it.y - headerY) < 70);
      if (nearHeader.length > 0) {
        headerXMin = Math.min(...nearHeader.map(it => it.x));
      }
      break;
    }
  }

  // Large-format threshold: NBME 12 header at ~1040, NBME 14 at ~3970
  const isLargeFormat = headerY > 2000;

  if (!isLargeFormat) {
    // NBME 12 defaults
    return { HEADER_Y_MIN: 1010, FOOTER_Y_MAX: 55, contentLeftX: 0, isLargeFormat: false };
  }

  // Large-format: raise FOOTER_Y_MAX above the URL watermark band.
  // Nav buttons appear just above the watermark and are excluded by the same threshold.
  let footerY = 200; // conservative minimum
  for (const page of pages.slice(0, Math.min(12, pages.length))) {
    for (const it of page.items) {
      if (/https?:\/\//i.test(it.str) && it.y > footerY) {
        footerY = Math.max(footerY, it.y + 70);
      }
    }
  }

  const contentLeftX = headerXMin === Infinity ? 2040 : Math.max(0, headerXMin - 20);

  return {
    HEADER_Y_MIN: headerY - 80,
    FOOTER_Y_MAX: footerY,
    contentLeftX,
    isLargeFormat: true,
  };
}

export function isNBMEScreenshot(pages) {
  if (!pages || pages.length < 2) return false;
  let hits = 0;
  for (const page of pages.slice(0, Math.min(12, pages.length))) {
    // Radio glyphs (NBME 12) or "Item N of N" header at any large Y (NBME 14: y≈3970)
    const hasRadio = page.items.some(it => isRadioGlyph(it, 0));
    const hasHeader = page.items.some(
      it => it.y >= 1000 && /\d+\s+[o0]f\s+\d+/i.test(it.str)
    );
    // Also check combined row text for fragmented headers (NBME 14 page 5 style)
    let hasFragHeader = false;
    if (!hasHeader) {
      const rows = new Map();
      for (const it of page.items) {
        const ky = Math.round(it.y / 6) * 6;
        if (!rows.has(ky)) rows.set(ky, []);
        rows.get(ky).push(it);
      }
      for (const [ky, row] of rows) {
        if (ky < 1000) continue;
        if (/[IlL]tem\s+\d+\s+[o0]f\s+\d+/i.test(row.map(it => it.str).join(' '))) {
          hasFragHeader = true;
          break;
        }
      }
    }
    if (hasRadio || hasHeader || hasFragHeader) hits++;
  }
  return hits >= 3;
}

// ── Radio-glyph detection ────────────────────────────────────────────────────
function isRadioGlyph(it, contentLeftX) {
  const s = it.str.trim();
  if (!(s === '0' || s === 'O' || /^[O0][A-H]\)?$/.test(s) || /^\([A-H]\)$/.test(s))) {
    return false;
  }
  if (contentLeftX > 100) {
    // Large-format: radio appears near contentLeftX offset (x≈contentLeftX+50-80)
    const relX = it.x - contentLeftX;
    return relX >= 40 && relX <= 110;
  }
  // NBME 12: radio at absolute x≈38-68
  return it.x >= 38 && it.x <= 68;
}

// ── Extract item number from this page ──────────────────────────────────────
function extractItemNum(headerItems, bodyItems, contentLeftX) {
  const qNumMaxX = contentLeftX > 100 ? contentLeftX + 130 : 80;

  // 1. From header text (concatenated, handles fragmentation)
  const ht = headerItems.map(it => it.str).join(' ');

  let headerItem = null;
  let m = /[IlL]tem\s+(\d+)\s+[o0]f\s+\d+/i.exec(ht);
  if (m) headerItem = parseInt(m[1]);

  if (!headerItem) {
    // Fragmented header: "Item:" and "4 of 50" may be separate items
    const rows = new Map();
    for (const it of headerItems) {
      const ky = Math.round(it.y / 6) * 6;
      if (!rows.has(ky)) rows.set(ky, []);
      rows.get(ky).push(it);
    }
    for (const row of rows.values()) {
      const txt = row.map(it => it.str).join(' ');
      m = /[IlL]tem\s*:?\s*(\d+)\s+[o0]f\s+\d+/i.exec(txt);
      if (m) { headerItem = parseInt(m[1]); break; }
      m = /\b(\d{1,3})\s+[o0]f\s+(?:50|40|44|48)\b/.exec(txt);
      if (m) { headerItem = parseInt(m[1]); break; }
    }
  }

  if (!headerItem) {
    // "N of 50" as a single item (e.g. "4 of 50")
    m = /\b(\d{1,3})\s+[o0]f\s+(?:50|40|44|48)\b/.exec(ht);
    if (m) headerItem = parseInt(m[1]);
  }

  // 2. Scan top body items for "N." question number
  let bodyItem = null;
  const topBody = bodyItems
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (let i = 0; i < Math.min(topBody.length, 60); i++) {
    const it = topBody[i];
    const s  = it.str.trim();
    if (it.x >= qNumMaxX) continue; // skip items too far right

    // "10." or "47."
    if (/^\d{1,3}\.$/.test(s)) { bodyItem = parseInt(s); break; }

    // "1 0." or "4 7." — OCR inserts space in digits
    const spaced = /^(\d)\s+(\d)\.$/.exec(s);
    if (spaced) { bodyItem = parseInt(spaced[1] + spaced[2]); break; }

    // "41" alone, followed by "." at same Y slightly to the right
    if (/^\d{1,3}$/.test(s)) {
      const dot = topBody.find(
        ni => ni !== it && Math.abs(ni.y - it.y) <= 6 && ni.x > it.x &&
              ni.x < it.x + 60 && ni.str.trim() === '.'
      );
      if (dot) { bodyItem = parseInt(s); break; }
    }

    // "31. An 87-year-old…" — stem merged into question number
    const merged = /^(\d{1,3})\.\s+\S/.exec(s);
    if (merged) { bodyItem = parseInt(merged[1]); break; }
  }

  // Body takes priority when it's exactly one ahead of header
  // (overflow page where an image pushed the NEXT question's content into view)
  if (headerItem && bodyItem && bodyItem === headerItem + 1) return bodyItem;

  return headerItem ?? bodyItem;
}

// ── Extract choices from body items ─────────────────────────────────────────
function extractChoices(bodyItems, contentLeftX) {
  // Strategy A: radio glyphs
  const radioItems = bodyItems
    .filter(it => isRadioGlyph(it, contentLeftX))
    .sort((a, b) => b.y - a.y);

  if (radioItems.length >= 2) {
    return buildChoicesFromAnchors(radioItems, bodyItems, true);
  }

  // Strategy B: items starting with "A)" "B)" etc.
  // Require x >= contentLeftX + 50 to avoid false matches in stem
  const choiceMinX = contentLeftX > 100 ? contentLeftX + 100 : 50;
  const letterItems = bodyItems
    .filter(it => /^[A-H]\)/.test(it.str.trim()) && it.x >= choiceMinX)
    .sort((a, b) => b.y - a.y);

  if (letterItems.length >= 2) {
    return buildChoicesFromAnchors(letterItems, bodyItems, false);
  }

  return [];
}

function buildChoicesFromAnchors(anchorItems, bodyItems, anchorsAreRadios) {
  const choices = [];
  const CHOICE_LABELS = 'ABCDEFGH'.split('');

  for (let ci = 0; ci < anchorItems.length; ci++) {
    const anchor      = anchorItems[ci];
    const nextAnchorY = ci + 1 < anchorItems.length ? anchorItems[ci + 1].y : 0;

    // Collect items in this row band (between this anchor and the next)
    const band = bodyItems
      .filter(it => it.y <= anchor.y + 8 && it.y > nextAnchorY)
      .sort((a, b) => a.x - b.x);

    const parts = band
      .filter(it => !(anchorsAreRadios && it === anchor && (it.str === '0' || it.str === 'O')))
      .map(it => it.str.trim())
      .filter(Boolean);

    let rowText = parts.join(' ').trim();
    rowText = rowText.replace(/^[O0]\s+/, '').trim();

    // Handle OCR variants: "A) text", "A ) text", "A text"
    const lm = /^([A-H])\s*\)?\s*(.*)/.exec(rowText);
    const label = lm ? lm[1] : CHOICE_LABELS[ci] ?? '?';
    const text  = lm ? lm[2].trim().replace(/^\)\s*/, '') : rowText;

    if (label) choices.push({ label, text });
  }

  return choices;
}

// ── Extract stem from body items ─────────────────────────────────────────────
function extractStem(bodyItems, itemNum, firstChoiceY, contentLeftX) {
  const stemFloor  = firstChoiceY > 0 ? firstChoiceY + 2 : 0;
  const qNumMaxX   = contentLeftX > 100 ? contentLeftX + 130 : 80;

  const stemItems = bodyItems
    .filter(it => {
      if (it.y <= stemFloor) return false;
      if (isRadioGlyph(it, contentLeftX)) return false;
      // Skip "N." question number prefix
      const s = it.str.trim();
      if (it.x < qNumMaxX && (
        /^\d{1,3}\.$/.test(s) ||
        /^(\d)\s+(\d)\.$/.test(s) ||
        (s === `${itemNum}.`) ||
        (/^\d{1,3}$/.test(s) && parseInt(s) === itemNum)
      )) return false;
      // Skip "■ Mark" checkbox / watermark URLs
      if (/^■/.test(s) || /https?:\/\//i.test(s)) return false;
      return true;
    })
    .sort((a, b) => {
      const dy = b.y - a.y;
      return Math.abs(dy) > 5 ? dy : a.x - b.x;
    });

  const lines = [];
  let curLine = [];
  let lastY   = null;

  for (const it of stemItems) {
    if (lastY !== null && Math.abs(it.y - lastY) > 8) {
      if (curLine.length) lines.push(curLine.join(' '));
      curLine = [];
    }
    let str = it.str;
    if (itemNum) str = str.replace(new RegExp(`^${itemNum}\\. ?`), '');
    if (str) curLine.push(str);
    lastY = it.y;
  }
  if (curLine.length) lines.push(curLine.join(' '));

  return lines.join(' ').trim();
}

// ── Main export ──────────────────────────────────────────────────────────────
export function parseNBMEScreenshot(pages) {
  const warnings = [];
  const candidates = [];

  const profile = detectProfile(pages);
  const { HEADER_Y_MIN, FOOTER_Y_MAX, contentLeftX } = profile;

  // X threshold for firstChoiceY / anchor detection (mirrors extractChoices logic)
  const choiceMinX = contentLeftX > 100 ? contentLeftX + 100 : 50;

  for (const page of pages) {
    const { pageNum, items } = page;

    const headerItems = items.filter(it => it.y >= HEADER_Y_MIN);
    const bodyItems   = items.filter(it =>
      it.y < HEADER_Y_MIN &&
      it.y > FOOTER_Y_MAX &&
      !/https?:\/\//i.test(it.str) // strip watermark URLs
    );

    // Section from header
    const ht = headerItems.map(it => it.str).join(' ');
    const sm = /Section\s+(\d+)/i.exec(ht);
    const headerSection = sm ? parseInt(sm[1]) : null;

    const itemNum = extractItemNum(headerItems, bodyItems, contentLeftX);
    if (!itemNum) continue;

    const choices = extractChoices(bodyItems, contentLeftX);

    // firstChoiceY: max Y of choice anchors (topmost choice in PDF Y-up coords)
    const radioYs  = bodyItems.filter(it => isRadioGlyph(it, contentLeftX)).map(it => it.y);
    const letterYs = bodyItems
      .filter(it => /^[A-H]\)/.test(it.str.trim()) && it.x >= choiceMinX)
      .map(it => it.y);
    const allAnchorYs = [...radioYs, ...letterYs];
    const firstChoiceY = allAnchorYs.length > 0 ? Math.max(...allAnchorYs) : -1;

    const stem = extractStem(bodyItems, itemNum, firstChoiceY, contentLeftX);

    const stemRegionItems = bodyItems.filter(
      it => it.y > (firstChoiceY > 0 ? firstChoiceY + 2 : 0) && !isRadioGlyph(it, contentLeftX)
    );
    const stemBottomY = stemRegionItems.length > 0
      ? Math.min(...stemRegionItems.map(it => it.y))
      : -1;

    candidates.push({
      pageNum,
      headerSection,
      itemNum,
      stem,
      choices,
      choiceCount: choices.length,
      firstChoiceY,
      stemBottomY,
    });
  }

  // ── Assign section numbers ────────────────────────────────────────────────
  let currentSection = 1;
  let prevItemNum    = 0;

  for (const c of candidates) {
    if (c.headerSection) {
      currentSection = c.headerSection;
    } else if (prevItemNum >= 40 && c.itemNum <= 5) {
      currentSection++;
    }
    c.sectionNum = currentSection;
    prevItemNum  = c.itemNum;
  }

  // ── Deduplicate by (section, item) — prefer page with more choices ────────
  const questionMap = new Map();
  for (const c of candidates) {
    const key = `s${c.sectionNum}_q${c.itemNum}`;
    const ex  = questionMap.get(key);
    if (!ex) {
      questionMap.set(key, { ...c, _firstPageNum: c.pageNum });
    } else {
      const firstPage    = Math.min(ex._firstPageNum ?? ex.pageNum, c.pageNum);
      const newBetter    = c.choiceCount > ex.choiceCount;
      const sameStemLonger = c.choiceCount === ex.choiceCount && c.stem.length > ex.stem.length;
      if (newBetter || sameStemLonger) {
        const merged = { ...c, _firstPageNum: firstPage };
        if (ex.stem.length > c.stem.length) merged.stem = ex.stem;
        questionMap.set(key, merged);
      } else {
        ex._firstPageNum = firstPage;
      }
    }
  }

  // ── Sort and build question objects ──────────────────────────────────────
  const sorted = [...questionMap.values()].sort((a, b) => {
    if (a.sectionNum !== b.sectionNum) return a.sectionNum - b.sectionNum;
    return a.itemNum - b.itemNum;
  });

  let globalNum = 0;
  const questions = sorted.map(c => {
    globalNum++;
    const confidence =
      (c.stem.length > 40 ? 40 : c.stem.length > 10 ? 20 : 0) +
      (c.choices.length >= 4 ? 40 : c.choices.length >= 2 ? 20 : 0) +
      20;

    const hasImageKeyword = /\b(shown|is shown|x-ray|xray|radiograph|photograph|gram stain|CT scan|MRI|image shows|following image|ultrasound|ecg|ekg|electrocardiogram|fundoscop|biopsy shows|specimen|micrograph)\b/i.test(c.stem);

    return {
      id:           `q${globalNum}`,
      num:          globalNum,
      sectionNum:   c.sectionNum,
      itemNum:      c.itemNum,
      label:        `S${c.sectionNum}·Q${c.itemNum}`,
      stem:         c.stem,
      choices:      c.choices,
      correctAnswer: null,
      explanation:  null,
      labs:         [],
      topic:        guessTopic(c.stem),
      _pageNum:      c.pageNum,
      _imagePage:    c._firstPageNum ?? c.pageNum,
      _hasImage:     hasImageKeyword || c.choices.length < 4,
      _firstChoiceY: c.firstChoiceY ?? -1,
      _stemBottomY:  c.stemBottomY ?? -1,
      _confidence:   confidence,
      _flagged:      confidence < 60 || c.choices.length < 4,
    };
  });

  if (questions.length === 0) {
    warnings.push('No questions detected. Check the Raw Text tab.');
  }

  const noChoices = questions.filter(q => q.choices.length === 0);
  if (noChoices.length) {
    warnings.push(`${noChoices.length} question(s) have no detected choices (likely contain full-page images). Edit them manually.`);
  }

  warnings.push('NBME screenshot format detected — no answer key present. Add correct answers manually in the Review screen, or after checking your results.');

  return { questions, answerKey: {}, warnings };
}
