// Generic heuristic parser for text-based NBME-style PDFs.
// For screenshot PDFs (NBME interface captures), parseNBMEScreenshot is used instead.

import { guessTopic } from './topicDetect.js';

const CHOICE_RE      = /^([A-H])[.)]\s+(.+)/;
const QUESTION_RE    = /^(?:Q\.?\s*)?(\d{1,3})[.)]\s+(.+)/;
const LAB_UNIT_RE    = /\b(?:mg\/dL|mEq\/L|mmol\/L|g\/dL|U\/L|IU\/L|\/mm[³3]|×10[³3]|%|mm\s*Hg|bpm|beats\/min|nmol\/L|µmol\/L|ng\/mL|pg\/mL|mIU\/mL|pH|mL\/min|cm|kg|lb)\b/i;
const ANSWER_KEY_RE  = /^(?:answer[s]?\s*key|answers?|key)\b/i;
const INLINE_ANS_RE  = /^(?:Q\.?\s*)?(\d{1,3})[.)]\s*([A-H])\s*$/i;

function confidence(q) {
  let s = 100;
  if (!q.stem || q.stem.length < 20) s -= 40;
  if (!q.choices || q.choices.length < 2) s -= 40;
  if (!q.correctAnswer) s -= 20;
  return Math.max(0, s);
}

export function parseQuestions(fullText) {
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  const warnings = [];
  const answerKey = {};

  // Phase 1 – find and parse answer key section
  let answerKeyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (ANSWER_KEY_RE.test(lines[i])) { answerKeyStart = i; break; }
  }

  if (answerKeyStart >= 0) {
    const block = lines.slice(answerKeyStart).join(' ');
    let m;
    const re = /(\d{1,3})[.)]\s*([A-H])\b/g;
    while ((m = re.exec(block)) !== null) answerKey[parseInt(m[1])] = m[2].toUpperCase();
  }

  for (const line of lines) {
    const m = INLINE_ANS_RE.exec(line);
    if (m && !answerKey[parseInt(m[1])]) answerKey[parseInt(m[1])] = m[2].toUpperCase();
  }

  // Phase 2 – split into question blocks
  const cutoff = answerKeyStart >= 0 ? answerKeyStart : lines.length;
  const blocks = [];
  let cur = null;

  for (let i = 0; i < cutoff; i++) {
    const line = lines[i];
    const qm = QUESTION_RE.exec(line);
    if (qm) {
      if (cur) blocks.push(cur);
      cur = { num: parseInt(qm[1]), stemLines: [qm[2]], choices: [], inChoices: false, labLines: [] };
    } else if (cur) {
      const cm = CHOICE_RE.exec(line);
      if (cm) {
        cur.inChoices = true;
        cur.choices.push({ label: cm[1].toUpperCase(), text: cm[2].trim() });
      } else if (LAB_UNIT_RE.test(line)) {
        cur.labLines.push(line);
      } else if (!cur.inChoices) {
        cur.stemLines.push(line);
      } else if (cur.choices.length > 0) {
        cur.choices[cur.choices.length - 1].text += ' ' + line;
      }
    }
  }
  if (cur) blocks.push(cur);

  // Phase 3 – build question objects
  const questions = blocks.map(b => {
    const stem = b.stemLines.join(' ').trim();
    const q = {
      id: `q${b.num}`,
      num: b.num,
      stem,
      choices: b.choices,
      correctAnswer: answerKey[b.num] || null,
      explanation: null,
      labs: parseLabLines(b.labLines),
      topic: guessTopic(stem),
    };
    const conf = confidence(q);
    q._confidence = conf;
    q._flagged = conf < 60;
    return q;
  });

  if (questions.length === 0)
    warnings.push('No questions detected — the PDF may use a non-standard format. Check the Raw Text tab.');
  const noAns = questions.filter(q => !q.correctAnswer);
  if (noAns.length)
    warnings.push(`${noAns.length} question(s) have no detected answer. Add them manually or include an answer key.`);

  return { questions, answerKey, warnings };
}

function parseLabLines(lines) {
  const labs = [];
  const RE = /^(.+?)\s+([\d.]+)\s+([\w\/µ%³3]+)\s*(?:\(?([\d.]+\s*[-–]\s*[\d.]+)\)?)?/;
  for (const line of lines) {
    const m = RE.exec(line);
    if (m) labs.push({ name: m[1].trim(), value: m[2].trim(), unit: m[3].trim(), refRange: m[4]?.trim() || '' });
  }
  return labs;
}
