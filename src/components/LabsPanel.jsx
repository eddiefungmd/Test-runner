import { useState } from 'react';
import { LABS_REFERENCE } from '../utils/labsReference';

export default function LabsPanel({ questionLabs = [], onClose }) {
  const [activeCategory, setActiveCategory] = useState(questionLabs.length > 0 ? 'Question' : 'CBC');

  const categories = questionLabs.length > 0
    ? ['Question', ...LABS_REFERENCE.map(c => c.category)]
    : LABS_REFERENCE.map(c => c.category);

  const rows = activeCategory === 'Question'
    ? questionLabs
    : LABS_REFERENCE.find(c => c.category === activeCategory)?.values || [];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[480px] max-w-full h-full bg-white flex flex-col shadow-2xl">
        <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-lg">Reference Labs</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200">
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

        <div className="flex-1 overflow-y-auto p-4">
          {rows.length === 0 ? (
            <p className="text-gray-400 text-sm text-center mt-8">No values available</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">Test</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">Value</th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">Units</th>
                  {activeCategory !== 'Question' && (
                    <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">Ref Range</th>
                  )}
                  {activeCategory === 'Question' && (
                    <th className="px-3 py-2 font-semibold text-gray-600 border border-gray-200">Ref Range</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 text-gray-800">{row.name}</td>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-gray-900">{row.value}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-500 text-xs">{row.unit}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-500 text-xs">
                      {row.refRange || row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          Values shown are typical adult reference ranges. Abnormal values are not highlighted to avoid bias.
        </div>
      </div>
    </div>
  );
}
