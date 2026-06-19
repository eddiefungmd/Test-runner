export default function ReviewGrid({ questions, answers, flagged, currentIdx, onJump, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">Review All Questions</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex gap-4 text-xs text-gray-500 mb-4">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-green-100 border border-green-300 inline-block" />
              Answered ({Object.keys(answers).length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-gray-100 border border-gray-300 inline-block" />
              Unanswered ({questions.length - Object.keys(answers).length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-amber-100 border border-amber-400 inline-block" />
              Flagged ({flagged.size})
            </span>
          </div>

          <div className="grid grid-cols-10 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isFlagged = flagged.has(q.id);
              const isCurrent = idx === currentIdx;

              let cls = 'w-full aspect-square rounded text-sm font-semibold border transition flex items-center justify-center ';
              if (isCurrent) cls += 'ring-2 ring-blue-500 ';
              if (isFlagged) cls += 'bg-amber-100 border-amber-400 text-amber-800 ';
              else if (isAnswered) cls += 'bg-green-100 border-green-300 text-green-800 ';
              else cls += 'bg-gray-100 border-gray-300 text-gray-600 ';

              return (
                <button
                  key={q.id}
                  onClick={() => { onJump(idx); onClose(); }}
                  className={cls}
                  title={`Q${q.num}${isFlagged ? ' — Flagged' : ''}${isAnswered ? ` — ${answers[q.id]}` : ' — Unanswered'}`}
                >
                  {q.num}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-500">
            {Object.keys(answers).length} of {questions.length} answered
            {flagged.size > 0 && ` · ${flagged.size} flagged`}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              Continue Test
            </button>
            <button
              onClick={onSubmit}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
