import { useState, useEffect } from 'react';
import UploadScreen from './components/UploadScreen';
import RawTextScreen from './components/RawTextScreen';
import ReviewScreen from './components/ReviewScreen';
import TestScreen from './components/TestScreen';
import ScoreReport from './components/ScoreReport';

const PHASES = {
  UPLOAD: 'upload',
  RAW: 'raw',
  REVIEW: 'review',
  TEST: 'test',
  SCORE: 'score',
};

const STORAGE_KEY = 'nbme_app_state';

function loadSaved() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(data) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function clearState() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

export default function App() {
  const saved = loadSaved();

  // Restore phase; but never restore to RAW (needs file re-upload)
  const [phase, setPhase] = useState(() => {
    const p = saved?.phase;
    return (p === PHASES.TEST || p === PHASES.SCORE) ? p : PHASES.UPLOAD;
  });
  const [extraction, setExtraction] = useState(null);
  const [fileName, setFileName]     = useState(saved?.fileName ?? '');
  const [parseResult, setParseResult] = useState(null);
  // Restore session (questions + timerMinutes). pdfData is NOT stored (too large).
  const [session, setSession]       = useState(() => saved?.session ?? null);
  const [results, setResults]       = useState(() => saved?.results ?? null);

  const handleExtracted = (result, name) => {
    setExtraction(result);
    setFileName(name);
    setPhase(PHASES.RAW);
  };

  const handleParsed = (pr) => {
    setParseResult(pr);
    setPhase(PHASES.REVIEW);
  };

  const handleStart = (questions, timerMinutes) => {
    const newSession = { questions, timerMinutes, pdfData: extraction?.rawData ?? null };
    setSession(newSession);
    setPhase(PHASES.TEST);
    // Persist (pdfData excluded — Uint8Array can't be JSON serialized)
    saveState({ phase: PHASES.TEST, session: { questions, timerMinutes }, fileName });
  };

  const handleFinish = ({ questions, answers, flagged }) => {
    const r = { questions, answers, flagged: [...flagged] };
    setResults(r);
    setPhase(PHASES.SCORE);
    saveState({ phase: PHASES.SCORE, results: r, fileName });
  };

  const handleRestart = () => {
    clearState();
    setExtraction(null);
    setParseResult(null);
    setSession(null);
    setResults(null);
    setFileName('');
    setPhase(PHASES.UPLOAD);
  };

  return (
    <>
      {phase === PHASES.UPLOAD && <UploadScreen onExtracted={handleExtracted} />}
      {phase === PHASES.RAW && extraction && (
        <RawTextScreen extraction={extraction} fileName={fileName} onParsed={handleParsed} />
      )}
      {phase === PHASES.REVIEW && parseResult && (
        <ReviewScreen parseResult={parseResult} onStart={handleStart} onBack={() => setPhase(PHASES.RAW)} />
      )}
      {phase === PHASES.TEST && session && (
        <TestScreen
          questions={session.questions}
          timerMinutes={session.timerMinutes}
          pdfData={session.pdfData ?? null}
          onFinish={handleFinish}
        />
      )}
      {phase === PHASES.SCORE && results && (
        <ScoreReport questions={results.questions} answers={results.answers} onRestart={handleRestart} />
      )}
    </>
  );
}
