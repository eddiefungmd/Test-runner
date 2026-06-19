import { useState } from 'react';

export default function ScoreReport({ questions, answers, onRestart }) {
  const [expandedQ, setExpandedQ] = useState(null);
  const [filterTopic, setFilterTopic] = useState('All');

  const total = questions.length;
  const correct = questions.filter(q => answers[q.id] === q.correctAnswer && q.correctAnswer).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Topic breakdown
  const topicMap = {};
  for (const q of questions) {
    const t = q.topic || 'Uncategorized';
    if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 };
    topicMap[t].total++;
    if (answers[q.id] === q.correctAnswer && q.correctAnswer) topicMap[t].correct++;
  }

  const topics = ['All', ...Object.keys(topicMap)];
  const displayed = filterTopic === 'All' ? questions : questions.filter(q => (q.topic || 'Uncategorized') === filterTopic);

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      score: { correct, total, pct },
      topicBreakdown: topicMap,
      questions: questions.map(q => ({
        ...q,
        yourAnswer: answers[q.id] || null,
        isCorrect: answers[q.id] === q.correctAnswer,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = pct >= 70 ? 'bg-green-50 border-green-200' : pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Score Report</h1>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg text-sm"
          >
            Export JSON
          </button>
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
          >
            New Test
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Score summary */}
        <div className={`rounded-xl border p-6 ${scoreBg}`}>
          <div className="flex items-center gap-8">
            <div>
              <div className={`text-6xl font-bold ${scoreColor}`}>{pct}%</div>
              <div className="text-gray-500 mt-1">{correct} / {total} correct</div>
            </div>
            <div className="flex-1">
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-gray-500">Passing: 70%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Topic breakdown */}
        {Object.keys(topicMap).length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">By Topic</h2>
            <div className="space-y-2">
              {Object.entries(topicMap).map(([topic, data]) => {
                const tp = Math.round((data.correct / data.total) * 100);
                return (
                  <div key={topic} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-40 shrink-0">{topic}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tp >= 70 ? 'bg-green-500' : tp >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${tp}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-24 text-right text-gray-700">
                      {data.correct}/{data.total} ({tp}%)
                    </span>
                    <button
                      onClick={() => setFilterTopic(filterTopic === topic ? 'All' : topic)}
                      className="text-xs text-blue-600 hover:underline w-16"
                    >
                      {filterTopic === topic ? 'Show all' : 'Filter'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-question review */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <h2 className="font-semibold text-gray-800">Question Review</h2>
            {topics.length > 2 && (
              <select
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                className="ml-auto border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {displayed.map((q, idx) => {
              const yours = answers[q.id];
              const isCorrect = yours === q.correctAnswer && q.correctAnswer;
              const isWrong = yours && yours !== q.correctAnswer;
              const unanswered = !yours;

              return (
                <div key={q.id} className="px-5 py-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  >
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                      isCorrect ? 'bg-green-100 text-green-700' :
                      isWrong ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {isCorrect ? '✓' : isWrong ? '✗' : '–'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-500">Q{q.num}</span>
                        {q.topic && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{q.topic}</span>}
                        <span className="ml-auto text-sm">
                          {unanswered ? (
                            <span className="text-gray-400">Not answered</span>
                          ) : isCorrect ? (
                            <span className="text-green-600 font-medium">Correct: {yours}</span>
                          ) : (
                            <span className="text-red-600 font-medium">
                              Your answer: {yours} · Correct: {q.correctAnswer || '?'}
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{q.stem}</p>
                    </div>
                    <span className="text-gray-400 text-xs shrink-0">{expandedQ === q.id ? '▲' : '▼'}</span>
                  </div>

                  {expandedQ === q.id && (
                    <div className="mt-4 ml-10 space-y-3">
                      <div className="space-y-1.5">
                        {q.choices.map(c => {
                          const isYours = yours === c.label;
                          const isCorrectChoice = q.correctAnswer === c.label;
                          let cls = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm ';
                          if (isCorrectChoice) cls += 'bg-green-50 border border-green-300 text-green-800';
                          else if (isYours && !isCorrectChoice) cls += 'bg-red-50 border border-red-300 text-red-700';
                          else cls += 'text-gray-600';
                          return (
                            <div key={c.label} className={cls}>
                              <span className="font-bold w-5">{c.label}</span>
                              <span>{c.text}</span>
                              {isCorrectChoice && <span className="ml-auto text-xs font-medium text-green-600">Correct</span>}
                              {isYours && !isCorrectChoice && <span className="ml-auto text-xs font-medium text-red-600">Your answer</span>}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Explanation</p>
                          <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}

                      {q.labs && q.labs.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Labs</p>
                          <table className="text-xs border-collapse">
                            <tbody>
                              {q.labs.map((lab, i) => (
                                <tr key={i}>
                                  <td className="pr-4 py-0.5 text-gray-600">{lab.name}</td>
                                  <td className="pr-4 py-0.5 font-mono">{lab.value} {lab.unit}</td>
                                  <td className="py-0.5 text-gray-400">{lab.refRange}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
