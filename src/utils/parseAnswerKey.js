// Parses an NBME answer+explanation PDF (same screenshot format as the question PDF,
// but with "Correct Answer: X." and explanation text added after each question).
// Returns a Map: "s{sectionNum}_q{itemNum}" → { correctAnswer, explanation }

const HEADER_Y_MIN = 1010;
const FOOTER_Y_MAX = 55;

function isRadioGlyph(it) {
  const s = it.str.trim();
  return it.x >= 38 && it.x <= 68 && (
    s === '0' || s === 'O' ||
    /^[O0][A-H]\)?$/.test(s) ||
    /^\([A-H]\)$/.test(s)
  );
}

function extractItemNum(headerItems, bodyItems) {
  const ht = headerItems.map(it => it.str).join(' ');
  let headerItem = null;
  let m = /[IlL]tem\s+(\d+)\s+[o0]f\s+\d+/i.exec(ht);
  if (m) headerItem = parseInt(m[1]);
  if (!headerItem) {
    m = /\b(\d{1,3})\s+[o0]f\s+(?:50|40|44|48)\b/.exec(ht);
    if (m) headerItem = parseInt(m[1]);
  }

  let bodyItem = null;
  const sorted = bodyItems.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  for (let i = 0; i < Math.min(sorted.length, 60); i++) {
    const it = sorted[i]; const s = it.str.trim();
    if (/^\d{1,3}\.$/.test(s) && it.x < 80) { bodyItem = parseInt(s); break; }
    const sp = /^(\d)\s+(\d)\.$/.exec(s);
    if (sp && it.x < 80) { bodyItem = parseInt(sp[1] + sp[2]); break; }
    if (/^\d{1,3}$/.test(s) && it.x < 65) {
      const dot = sorted.find(ni => ni !== it && Math.abs(ni.y - it.y) <= 4 && ni.x > it.x && ni.x < 110 && ni.str.trim() === '.');
      if (dot) { bodyItem = parseInt(s); break; }
    }
    const mg = /^(\d{1,3})\.\s+\S/.exec(s);
    if (mg && it.x < 80) { bodyItem = parseInt(mg[1]); break; }
  }

  if (headerItem && bodyItem && bodyItem === headerItem + 1) return bodyItem;
  return headerItem ?? bodyItem;
}

function extractFromPage(page) {
  const { items } = page;
  const headerItems = items.filter(it => it.y >= HEADER_Y_MIN);
  const bodyItems   = items.filter(it => it.y < HEADER_Y_MIN && it.y > FOOTER_Y_MAX);

  const ht = headerItems.map(it => it.str).join(' ');
  const sm = /Section\s+(\d+)/i.exec(ht);
  const headerSection = sm ? parseInt(sm[1]) : null;

  const itemNum = extractItemNum(headerItems, bodyItems);
  if (!itemNum) return null;

  // Find "Correct Answer: X." line
  const caItem = bodyItems.find(it => /Correct Answer/i.test(it.str));
  let correctAnswer = null;
  let correctAnswerY = -1;

  if (caItem) {
    correctAnswerY = caItem.y;
    const m = /Correct Answer[:\s]+([A-H])/i.exec(caItem.str);
    if (m) {
      correctAnswer = m[1].toUpperCase();
    } else {
      // Answer letter might be a separate nearby item
      const nearby = bodyItems.find(
        it => it !== caItem && Math.abs(it.y - caItem.y) <= 6 && it.x > caItem.x &&
          /^[A-H]\.?$/.test(it.str.trim())
      );
      if (nearby) correctAnswer = nearby.str.trim().replace('.', '');
    }
  }

  // Collect explanation: all body items BELOW the correct answer line
  // (lower Y value in PDF coordinates = lower on page)
  const expItems = correctAnswerY > 0
    ? bodyItems.filter(it => it.y < correctAnswerY).sort((a, b) => {
        const dy = b.y - a.y;
        return Math.abs(dy) > 5 ? dy : a.x - b.x;
      })
    : [];

  // Group into lines and join
  const expLines = [];
  let curLine = []; let lastY = null;
  for (const it of expItems) {
    if (lastY !== null && Math.abs(it.y - lastY) > 7) {
      if (curLine.length) expLines.push(curLine.join(' '));
      curLine = [];
    }
    curLine.push(it.str);
    lastY = it.y;
  }
  if (curLine.length) expLines.push(curLine.join(' '));
  const explanation = expLines.join('\n').trim();

  return { headerSection, itemNum, correctAnswer, explanation };
}

export function parseAnswerKey(pages) {
  const pageResults = pages.map(extractFromPage).filter(Boolean);

  // Assign section numbers (same logic as main parser)
  let currentSection = 1, prevItemNum = 0;
  for (const r of pageResults) {
    if (r.headerSection) currentSection = r.headerSection;
    else if (prevItemNum >= 40 && r.itemNum <= 5) currentSection++;
    r.sectionNum = currentSection;
    prevItemNum = r.itemNum;
  }

  // Deduplicate: same (section, item) — merge correct answer and explanation
  const map = new Map();
  for (const r of pageResults) {
    const key = `s${r.sectionNum}_q${r.itemNum}`;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, { correctAnswer: r.correctAnswer, explanation: r.explanation });
    } else {
      // Keep the correct answer if we found one
      if (!ex.correctAnswer && r.correctAnswer) ex.correctAnswer = r.correctAnswer;
      // Append more explanation text
      if (r.explanation && !ex.explanation.includes(r.explanation.slice(0, 20))) {
        ex.explanation = ex.explanation
          ? ex.explanation + '\n' + r.explanation
          : r.explanation;
      }
    }
  }

  return map; // Map<"s{n}_q{n}", {correctAnswer, explanation}>
}
