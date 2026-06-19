import { useState, useRef } from 'react';
import { extractTextFromPDF } from '../utils/pdfExtract';
import { parseAnswerKey } from '../utils/parseAnswerKey';

const LABELS = ['A','B','C','D','E','F','G','H'];

export default function ReviewScreen({ parseResult, onStart, onBack }) {
  const [questions, setQuestions] = useState(parseResult.questions);
  const [expanded, setExpanded] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(90);
  const [answerKeyStatus, setAnswerKeyStatus] = useState(null); // null | 'loading' | {count, total}
  const answerKeyRef = useRef(null);
  const { warnings } = parseResult;

  const update = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateChoice = (qIdx, cIdx, text) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const choices = q.choices.map((c, ci) => ci === cIdx ? { ...c, text } : c);
      return { ...q, choices };
    }));
  };

  const addChoice = (qIdx) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const label = LABELS[q.choices.length] || '?';
      return { ...q, choices: [...q.choices, { label, text: '' }] };
    }));
  };

  const removeChoice = (qIdx, cIdx) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, choices: q.choices.filter((_, ci) => ci !== cIdx) };
    }));
  };

  const handleAnswerKeyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnswerKeyStatus('loading');
    try {
      const extraction = await extractTextFromPDF(file, () => {});
      const keyMap = parseAnswerKey(extraction.pages);
      let matched = 0;
      setQuestions(prev => prev.map(q => {
        const key = `s${q.sectionNum}_q${q.itemNum}`;
        const entry = keyMap.get(key);
        if (!entry) return q;
        matched++;
        return {
          ...q,
          correctAnswer: entry.correctAnswer ?? q.correctAnswer,
          explanation: entry.explanation || q.explanation,
        };
      }));
      setAnswerKeyStatus({ count: matched, total: questions.length });
    } catch (err) {
      console.error(err);
      setAnswerKeyStatus({ error: err.message });
    }
    // Reset file input so same file can be re-uploaded
    e.target.value = '';
  };

  const flagged = questions.filter(q => q._flagged);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold">Review Parsed Questions</h1>
          <p className="text-blue-200 text-sm">
            {questions.length} questions detected
            {flagged.length > 0 && ` • ${flagged.length} flagged for review`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg text-sm">
            ← Back
          </button>

          {/* Answer key upload */}
          <input
            ref={answerKeyRef}
            type="file"
            accept=".pdf"
            onChange={handleAnswerKeyUpload}
            className="hidden"
          />
          <button
            onClick={() => answerKeyRef.current?.click()}
            disabled={answerKeyStatus === 'loading'}
            className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-60 rounded-lg text-sm text-white transition"
          >
            {answerKeyStatus === 'loading' ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Parsing key…
              </>
            ) : answerKeyStatus?.count != null ? (
              `✓ Key: ${answerKeyStatus.count}/${answerKeyStatus.total} matched`
            ) : answerKeyStatus?.error ? (
              '✗ Key error — retry'
            ) : (
              '+ Upload Answer Key PDF'
            )}
          </button>

          {/* Block timer */}
          <div className="flex items-center gap-2 bg-blue-800 rounded-lg px-3 py-2">
            <label className="text-sm text-blue-200">Timer (min/block):</label>
            <input
              type="number"
              value={timerMinutes}
              min={0}
              max={360}
              onChange={e => setTimerMinutes(Number(e.target.value))}
              className="w-16 bg-blue-700 text-white rounded px-2 py-0.5 text-sm text-center border border-blue-600"
            />
          </div>

          <button
            onClick={() => onStart(questions, timerMinutes)}
            className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
          >
            Start Test →
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 space-y-3">
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-800">⚠ {w}</p>
            ))}
          </div>
        )}

        {questions.map((q, idx) => (
          <div
            key={q.id}
            className={`bg-white rounded-xl border ${q._flagged ? 'border-amber-400' : 'border-gray-200'} overflow-hidden`}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <span className="font-mono text-sm font-bold text-gray-500 w-8 shrink-0">{q.num}.</span>
              {q.label && <span className="text-xs text-gray-400 shrink-0">{q.label}</span>}
              {q._flagged && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                  ⚠ Check
                </span>
              )}
              {q._hasImage && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full shrink-0">
                  img
                </span>
              )}
              <span className="flex-1 text-sm text-gray-700 truncate">{q.stem || '(no stem detected)'}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{q.choices.length} choices</span>
                {q.correctAnswer ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ans: {q.correctAnswer}</span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">No answer</span>
                )}
                {q.topic && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{q.topic}</span>}
                <span className="text-gray-400 text-xs">{expanded === idx ? '▲' : '▼'}</span>
              </div>
            </div>

            {expanded === idx && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stem</label>
                  <textarea
                    value={q.stem}
                    onChange={e => update(idx, 'stem', e.target.value)}
                    rows={4}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Answer Choices</label>
                    <button onClick={() => addChoice(idx)} className="text-xs text-blue-600 hover:underline">+ Add choice</button>
                  </div>
                  <div className="space-y-1.5">
                    {q.choices.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <span className="font-bold text-sm w-6 text-gray-600">{c.label}</span>
                        <input
                          value={c.text}
                          onChange={e => updateChoice(idx, ci, e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button onClick={() => removeChoice(idx, ci)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Correct Answer</label>
                    <select
                      value={q.correctAnswer || ''}
                      onChange={e => update(idx, 'correctAnswer', e.target.value || null)}
                      className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">-- not set --</option>
                      {q.choices.map(c => (
                        <option key={c.label} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Topic</label>
                    <input
                      value={q.topic || ''}
                      onChange={e => update(idx, 'topic', e.target.value || null)}
                      className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="e.g. Cardiology"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Explanation (optional)</label>
                  <textarea
                    value={q.explanation || ''}
                    onChange={e => update(idx, 'explanation', e.target.value || null)}
                    rows={2}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
                    placeholder="Add explanation here..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end pb-8">
          <button
            onClick={() => onStart(questions, timerMinutes)}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium text-lg transition"
          >
            Start Test ({questions.length} Questions) →
          </button>
        </div>
      </div>
    </div>
  );
}
