import { useState, useEffect, useCallback, useRef } from 'react';
import LabsPanel from './LabsPanel';
import CalculatorPanel from './CalculatorPanel';
import ReviewGrid from './ReviewGrid';
import PageImage from './PageImage';
import StemDisplay from './StemDisplay';

// Block-level countdown timer. Resets (via key) only when the block changes.
function BlockTimer({ seconds, onExpire, paused }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (paused || seconds === 0) return;
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(id); onExpire(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, paused, onExpire]);

  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  const pct = seconds > 0 ? remaining / seconds : 1;
  const color = pct > 0.4 ? 'text-white' : pct > 0.2 ? 'text-amber-300' : 'text-red-300';

  return (
    <div className={`font-mono text-lg font-bold tabular-nums ${color}`}>
      {seconds === 0 ? '∞' : `${m}:${s}`}
    </div>
  );
}

const PROGRESS_KEY = 'nbme_test_progress';

function loadProgress(questions) {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Only restore if the question set matches (same ids in same order)
    const ids = questions.map(q => q.id).join(',');
    if (saved.ids !== ids) return null;
    return saved;
  } catch { return null; }
}

export default function TestScreen({ questions, timerMinutes, pdfData, onFinish }) {
  const saved = loadProgress(questions);

  const [currentIdx, setCurrentIdx] = useState(saved?.currentIdx ?? 0);
  const [answers, setAnswers]       = useState(saved?.answers ?? {});
  const [flagged, setFlagged]       = useState(new Set(saved?.flagged ?? []));
  const [showLabs, setShowLabs] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [paused, setPaused] = useState(false);
  // highlights: { [qId]: [{start, end}] }
  const [highlightsMap, setHighlightsMap] = useState({});
  // block timer resets per section
  const [blockTimerKey, setBlockTimerKey] = useState(0);
  const prevSectionRef = useRef(null);

  const q = questions[currentIdx];
  const total = questions.length;
  const userAnswer = answers[q.id];
  const isFlagged = flagged.has(q.id);
  const blockSeconds = (timerMinutes ?? 0) * 60;
  const qHighlights = highlightsMap[q.id] ?? [];

  // Persist progress to sessionStorage on every answer/flag/navigation change
  useEffect(() => {
    try {
      sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ids: questions.map(q => q.id).join(','),
        currentIdx,
        answers,
        flagged: [...flagged],
      }));
    } catch {}
  }, [currentIdx, answers, flagged, questions]);

  // Reset block timer when section changes
  useEffect(() => {
    const sec = q.sectionNum ?? 1;
    if (prevSectionRef.current !== null && prevSectionRef.current !== sec) {
      setBlockTimerKey(k => k + 1);
    }
    prevSectionRef.current = sec;
  }, [q.sectionNum]);

  // Auto-show image panel for questions flagged with an image; hide for others
  useEffect(() => {
    setShowImage(!!(questions[currentIdx]?._hasImage && pdfData));
  }, [currentIdx, questions, pdfData]);

  const goTo = useCallback((idx) => {
    if (idx >= 0 && idx < total) setCurrentIdx(idx);
  }, [total]);

  const selectAnswer = useCallback((label) => {
    setAnswers(prev => ({ ...prev, [q.id]: label }));
  }, [q.id]);

  const toggleFlag = useCallback(() => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(q.id) ? next.delete(q.id) : next.add(q.id);
      return next;
    });
  }, [q.id]);

  const setQHighlights = useCallback((ranges) => {
    setHighlightsMap(prev => ({ ...prev, [q.id]: ranges }));
  }, [q.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goTo(currentIdx + 1);
      else if (e.key === 'ArrowLeft') goTo(currentIdx - 1);
      else if (e.key === 'f' || e.key === 'F') toggleFlag();
      else if (e.key === 'l' || e.key === 'L') setShowLabs(v => !v);
      else if (e.key === 'c' || e.key === 'C') setShowCalc(v => !v);
      else if (e.key === 'i' || e.key === 'I') { if (q._hasImage && pdfData) setShowImage(v => !v); }
      else {
        const idx = 'abcdefgh'.indexOf(e.key.toLowerCase());
        if (idx >= 0 && idx < q.choices.length) selectAnswer(q.choices[idx].label);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, goTo, toggleFlag, selectAnswer, q.choices, q._hasImage, pdfData]);

  const handleSubmit = () => {
    setShowGrid(false);
    try { sessionStorage.removeItem(PROGRESS_KEY); } catch {}
    onFinish({ questions, answers, flagged });
  };

  const sectionLabel = q.sectionNum ? `Section ${q.sectionNum}` : null;
  const canShowImage = !!pdfData;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="bg-blue-900 text-white px-4 py-2 flex items-center gap-4">
        <span className="text-sm font-medium">
          {sectionLabel ? `${sectionLabel} · ` : ''}Item {currentIdx + 1} of {total}
        </span>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 bg-blue-800 rounded-lg px-4 py-1">
            <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2"/>
            </svg>
            <BlockTimer
              key={blockTimerKey}
              seconds={blockSeconds}
              paused={paused || showLabs || showCalc || showGrid}
              onExpire={() => {}}
            />
            {sectionLabel && blockSeconds > 0 && (
              <span className="text-blue-300 text-xs ml-1">({sectionLabel})</span>
            )}
            {blockSeconds > 0 && (
              <button
                onClick={() => setPaused(p => !p)}
                className={`ml-1 px-2 py-0.5 rounded text-xs font-medium transition ${
                  paused ? 'bg-amber-500 text-white' : 'bg-blue-700 text-blue-200 hover:bg-blue-600'
                }`}
                title="Pause / resume timer"
              >
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFlag}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              isFlagged ? 'bg-amber-500 text-white' : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
            }`}
            title="F key to toggle"
          >
            🚩 {isFlagged ? 'Flagged' : 'Flag'}
          </button>
          {canShowImage && (
            <button
              onClick={() => setShowImage(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                showImage ? 'bg-indigo-500 text-white' : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
              }`}
              title="I key to toggle"
            >
              {showImage ? 'Hide Image' : 'View Image'}
            </button>
          )}
          <button
            onClick={() => setShowLabs(true)}
            className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 rounded-lg text-sm text-blue-200 transition"
            title="L key"
          >
            Labs
          </button>
          <button
            onClick={() => setShowCalc(true)}
            className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 rounded-lg text-sm text-blue-200 transition"
            title="C key"
          >
            Calc
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-blue-950">
        <div
          className="h-full bg-blue-400 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full p-4 gap-4">
        {/* Vignette / Stem */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <div className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
            Question {currentIdx + 1}
            {q.topic && <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{q.topic}</span>}
            {q._hasImage && (
              <span className="ml-2 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">has image</span>
            )}
            <span className="ml-2 text-gray-300">Select text to highlight</span>
          </div>

          <StemDisplay
            text={q.stem}
            highlights={qHighlights}
            onHighlightsChange={setQHighlights}
          />

          {showImage && canShowImage && (
            <PageImage
              pdfData={pdfData}
              pageNum={q._imagePage ?? q._pageNum}
              firstChoiceY={q._firstChoiceY ?? -1}
            />
          )}

          {q.labs && q.labs.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-2 py-1 border border-gray-200 text-gray-500 font-medium">Test</th>
                    <th className="text-left px-2 py-1 border border-gray-200 text-gray-500 font-medium">Result</th>
                    <th className="text-left px-2 py-1 border border-gray-200 text-gray-500 font-medium">Units</th>
                    <th className="text-left px-2 py-1 border border-gray-200 text-gray-500 font-medium">Ref Range</th>
                  </tr>
                </thead>
                <tbody>
                  {q.labs.map((lab, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 py-1 border border-gray-200 text-gray-700">{lab.name}</td>
                      <td className="px-2 py-1 border border-gray-200 font-mono">{lab.value}</td>
                      <td className="px-2 py-1 border border-gray-200 text-gray-500 text-xs">{lab.unit}</td>
                      <td className="px-2 py-1 border border-gray-200 text-gray-500 text-xs">{lab.refRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Answer choices */}
        <div className="w-96 flex flex-col gap-2">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Select one answer</p>
            <div className="space-y-2">
              {q.choices.map((choice) => {
                const isSelected = userAnswer === choice.label;
                return (
                  <button
                    key={choice.label}
                    onClick={() => selectAnswer(choice.label)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold mt-0.5 transition ${
                      isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400 text-gray-500'
                    }`}>
                      {choice.label}
                    </span>
                    <span className={`text-sm leading-relaxed ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                      {choice.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-gray-400 text-center">
            A–{q.choices[q.choices.length - 1]?.label || 'E'} to answer · ←→ navigate · F flag · L labs · C calc
            {canShowImage && ' · I image'}
          </div>
        </div>
      </div>

      {/* Bottom nav bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          ← Previous
        </button>

        <button
          onClick={() => setShowGrid(true)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 font-medium transition"
        >
          Review All ({Object.keys(answers).length}/{total})
        </button>

        {currentIdx < total - 1 ? (
          <button
            onClick={() => goTo(currentIdx + 1)}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium transition"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setShowGrid(true)}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            Review & Submit
          </button>
        )}
      </div>

      {showLabs && <LabsPanel questionLabs={q.labs || []} onClose={() => setShowLabs(false)} />}
      {showCalc && <CalculatorPanel onClose={() => setShowCalc(false)} />}
      {showGrid && (
        <ReviewGrid
          questions={questions}
          answers={answers}
          flagged={flagged}
          currentIdx={currentIdx}
          onJump={setCurrentIdx}
          onSubmit={handleSubmit}
          onClose={() => setShowGrid(false)}
        />
      )}
    </div>
  );
}
