// Coordinate-based parser for NBME interface screenshot PDFs.
// One question per page (occasionally 2 pages when images are present).
// Handles the many OCR artifacts from screenshot-to-PDF conversion.

import { guessTopic } from './topicDetect.js';

const HEADER_Y_MIN = 1010;  // header bar (title, counter, timer) is at y≈1025-1060
const FOOTER_Y_MAX = 55;    // nav buttons are at y≈12-38

export function isNBMEScreenshot(pages) {
  if (!pages || pages.length < 2) return false;
  let hits = 0;
  for (const page of pages.slice(0, Math.min(12, pages.length))) {
    const hasRadio = page.items.some(it => isRadioGlyph(it));
    const hasHeader = page.items.some(
      it => it.y >= 1000 && /\d+\s+[o0]f\s+\d+/i.test(it.str)
    );
    if (hasRadio || hasHeader) hits++;
  }
  return hits >= 3;
}

// ── Radio-glyph detection ────────────────────────────────────────────────────
function isRadioGlyph(it) {
  const s = it.str.trim();
  // "0" or "O" alone, or starts with O/0 followed by optional letter/paren
  return it.x >= 38 && it.x <= 68 && (
    s === '0' || s === 'O' ||
    /^[O0][A-H]\)?$/.test(s) ||         // "OA", "OB)", "0A"
    /^\([A-H]\)$/.test(s)               // "(A)"
  );
}

// ── Extract item number from this page ──────────────────────────────────────
function extractItemNum(headerItems, bodyItems) {
  // 1. From header text (concatenated)
  const ht = headerItems.map(it => it.str).join(' ');

  let headerItem = null;
  // "Item N of M" or "ltem N of M" (OCR l→I); also "0f" OCR typo for "of"
  let m = /[IlL]tem\s+(\d+)\s+[o0]f\s+\d+/i.exec(ht);
  if (m) headerItem = parseInt(m[1]);

  if (!headerItem) {
    // Just "N of 50" (or "N 0f 50") when "Item" was a separate text item not joined
    m = /\b(\d{1,3})\s+[o0]f\s+(?:50|40|44|48)\b/.exec(ht);
    if (m) headerItem = parseInt(m[1]);
  }

  // 2. Scan ALL body items (no Y filter) — overflow pages push content down
  let bodyItem = null;
  const topBody = bodyItems
    .slice()
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (let i = 0; i < Math.min(topBody.length, 40); i++) {
    const it = topBody[i];
    const s  = it.str.trim();

    // "10." or "47."
    if (/^\d{1,3}\.$/.test(s) && it.x < 80) { bodyItem = parseInt(s); break; }

    // "1 0." or "4 7." — OCR inserts space in digits
    const spaced = /^(\d)\s+(\d)\.$/.exec(s);
    if (spaced && it.x < 80) { bodyItem = parseInt(spaced[1] + spaced[2]); break; }

    // "41" alone at x<65, followed by "." at same Y
    if (/^\d{1,3}$/.test(s) && it.x < 65) {
      const dot = topBody.find(
        ni => ni !== it && Math.abs(ni.y - it.y) <= 4 && ni.x > it.x && ni.x < 110 && ni.str.trim() === '.'
      );
      if (dot) { bodyItem = parseInt(s); break; }
    }

    // "31. An 87-year-old…" — stem merged into question number
    const merged = /^(\d{1,3})\.\s+\S/.exec(s);
    if (merged && it.x < 80) { bodyItem = parseInt(merged[1]); break; }
  }

  // Body takes priority when it's exactly one ahead of header
  // (overflow page where an image pushed the NEXT question's content into view)
  if (headerItem && bodyItem && bodyItem === headerItem + 1) return bodyItem;

  return headerItem ?? bodyItem;
}

// ── Extract choices from body items ─────────────────────────────────────────
function extractChoices(bodyItems) {
  // Strategy A: radio glyphs at x≈49
  const radioItems = bodyItems
    .filter(it => isRadioGlyph(it))
    .sort((a, b) => b.y - a.y); // A first (highest Y)

  if (radioItems.length >= 2) {
    return buildChoicesFromAnchors(radioItems, bodyItems, true);
  }

  // Strategy B: letter items "A)", "B)" at x in [72,115] with no radio
  const letterItems = bodyItems
    .filter(it => /^[A-H]\)/.test(it.str.trim()) && it.x >= 72 && it.x <= 120)
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
    const anchor     = anchorItems[ci];
    const nextAnchorY = ci + 1 < anchorItems.length ? anchorItems[ci + 1].y : 0;

    // Collect items on this row and rows between this anchor and next
    const band = bodyItems
      .filter(it => it.y <= anchor.y + 8 && it.y > nextAnchorY)
      .sort((a, b) => a.x - b.x);

    // Build raw text from the band, skipping pure radio glyphs
    const parts = band
      .filter(it => !(anchorsAreRadios && it === anchor && (it.str === '0' || it.str === 'O')))
      .map(it => it.str.trim())
      .filter(Boolean);

    let rowText = parts.join(' ').trim();

    // If the anchor itself contains "OA text" or "(B) text", strip the radio char
    if (anchorsAreRadios) {
      const anchorStr = anchor.str.trim();
      // If anchor is "OA", "OB)", "(B)", etc., its letter is already in rowText from parts
      // Just ensure clean start
    }

    // Strip leading "O", "0" noise
    rowText = rowText.replace(/^[O0]\s+/, '').trim();

    // Parse label and text
    const lm = /^([A-H])\)?\s*(.*)/.exec(rowText);
    const label = lm ? lm[1] : CHOICE_LABELS[ci] ?? '?';
    const text  = lm ? lm[2].trim() : rowText;

    if (label) choices.push({ label, text });
  }

  return choices;
}

// ── Extract stem from body items ─────────────────────────────────────────────
function extractStem(bodyItems, itemNum, firstChoiceY) {
  const stemFloor = firstChoiceY > 0 ? firstChoiceY + 2 : 0;

  const stemItems = bodyItems
    .filter(it => {
      if (it.y <= stemFloor) return false;
      if (isRadioGlyph(it)) return false;
      // Skip "N." question number prefix at x<80
      const s = it.str.trim();
      if (it.x < 80 && (
        /^\d{1,3}\.$/.test(s) ||
        /^(\d)\s+(\d)\.$/.test(s) ||
        (s === `${itemNum}.`) ||
        (/^\d{1,3}$/.test(s) && parseInt(s) === itemNum)
      )) return false;
      return true;
    })
    .sort((a, b) => {
      const dy = b.y - a.y;
      return Math.abs(dy) > 5 ? dy : a.x - b.x;
    });

  // Group into text lines
  const lines = [];
  let curLine = [];
  let lastY   = null;
  for (const it of stemItems) {
    if (lastY !== null && Math.abs(it.y - lastY) > 7) {
      if (curLine.length) lines.push(curLine.join(' '));
      curLine = [];
    }
    // Strip "N. " prefix when merged with stem text
    let str = it.str;
    if (itemNum) {
      str = str.replace(new RegExp(`^${itemNum}\\. ?`), '');
    }
    curLine.push(str);
    lastY = it.y;
  }
  if (curLine.length) lines.push(curLine.join(' '));

  return lines.join(' ').trim();
}

// ── Main export ──────────────────────────────────────────────────────────────
export function parseNBMEScreenshot(pages) {
  const warnings = [];
  const candidates = [];

  for (const page of pages) {
    const { pageNum, items } = page;

    const headerItems = items.filter(it => it.y >= HEADER_Y_MIN);
    const bodyItems   = items.filter(it => it.y < HEADER_Y_MIN && it.y > FOOTER_Y_MAX);

    // Section from header
    const ht = headerItems.map(it => it.str).join(' ');
    const sm = /Section\s+(\d+)/i.exec(ht);
    const headerSection = sm ? parseInt(sm[1]) : null;

    const itemNum = extractItemNum(headerItems, bodyItems);
    if (!itemNum) continue;

    const choices    = extractChoices(bodyItems);
    const radioYs    = bodyItems.filter(isRadioGlyph).map(it => it.y);
    const letterYs   = bodyItems
      .filter(it => /^[A-H]\)/.test(it.str.trim()) && it.x >= 72 && it.x <= 120)
      .map(it => it.y);
    const allAnchorYs = [...radioYs, ...letterYs];
    const firstChoiceY = allAnchorYs.length > 0 ? Math.max(...allAnchorYs) : -1;

    const stem = extractStem(bodyItems, itemNum, firstChoiceY);

    // Bottom of the stem text (minimum Y among stem-region body items, excluding choices)
    const stemRegionItems = bodyItems.filter(
      it => it.y > (firstChoiceY > 0 ? firstChoiceY + 2 : 0) && !isRadioGlyph(it)
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
      const firstPage = Math.min(ex._firstPageNum ?? ex.pageNum, c.pageNum);
      const newBetter = c.choiceCount > ex.choiceCount;
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
      id:          `q${globalNum}`,
      num:         globalNum,
      sectionNum:  c.sectionNum,
      itemNum:     c.itemNum,
      label:       `S${c.sectionNum}·Q${c.itemNum}`,
      stem:        c.stem,
      choices:     c.choices,
      correctAnswer: null,
      explanation: null,
      labs:        [],
      topic:       guessTopic(c.stem),
      _pageNum:       c.pageNum,
      _imagePage:     c._firstPageNum ?? c.pageNum,
      _hasImage:      hasImageKeyword || c.choices.length < 4,
      _firstChoiceY:  c.firstChoiceY ?? -1,
      _stemBottomY:   c.stemBottomY ?? -1,
      _confidence: confidence,
      _flagged:    confidence < 60 || c.choices.length < 4,
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
