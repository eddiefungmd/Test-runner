import { useState } from 'react';
import { LABS_REFERENCE } from '../utils/labsReference';

export default function LabsPanel({ questionLabs = [], onClose }) {
  const firstCat = questionLabs.length > 0 ? 'Question' : LABS_REFERENCE[0].category;
  const [activeCategory, setActiveCategory] = useState(firstCat);

  const categories = questionLabs.length > 0
    ? ['Question', ...LABS_REFERENCE.map(c => c.category)]
    : LABS_REFERENCE.map(c => c.category);

  const isQuestion = activeCategory === 'Question';
  const rows = isQuestion
    ? questionLabs
    : LABS_REFERENCE.find(c => c.category === activeCategory)?.values ?? [];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[520px] max-w-full h-full bg-white flex flex-col shadow-2xl">
        <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-lg">Reference Labs</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Category tabs */}
        <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200 shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-blue-700 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-gray-400 text-sm text-center mt-8">No values available</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-gray-100 text-left">
                  <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200 w-1/3">Test</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">
                    {isQuestion ? 'Value' : 'Reference Range'}
                  </th>
                  {!isQuestion && (
                    <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">SI Interval</th>
                  )}
                  {isQuestion && (
                    <>
                      <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">Unit</th>
                      <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">Ref Range</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-1.5 border border-gray-200 text-gray-800 font-medium text-xs">{row.name}</td>
                    {isQuestion ? (
                      <>
                        <td className="px-3 py-1.5 border border-gray-200 font-mono text-gray-900">{row.value}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs">{row.unit}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs">{row.refRange}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-1.5 border border-gray-200 font-mono text-gray-900 text-xs">{row.value}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs">{row.si ?? '—'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          USMLE reference ranges · abnormal values not highlighted to avoid bias
        </div>
      </div>
    </div>
  );
}
