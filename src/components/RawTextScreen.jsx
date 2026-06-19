import { useState, useMemo } from 'react';
import { parseQuestions } from '../utils/parseQuestions';
import { isNBMEScreenshot, parseNBMEScreenshot } from '../utils/parseNBMEScreenshot';

export default function RawTextScreen({ extraction, fileName, onParsed }) {
  const { fullText, pages, numPages } = extraction;
  const [view, setView] = useState('full');
  const [selectedPage, setSelectedPage] = useState(0);

  const isScreenshot = useMemo(() => isNBMEScreenshot(pages), [pages]);

  const handleParse = () => {
    const result = isScreenshot
      ? parseNBMEScreenshot(pages)
      : parseQuestions(fullText);
    onParsed(result);
  };

  const displayText = view === 'full' ? fullText : pages[selectedPage]?.text || '';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Raw Extracted Text</h1>
          <p className="text-blue-200 text-sm">
            {fileName} — {numPages} page{numPages !== 1 ? 's' : ''}
            {isScreenshot && (
              <span className="ml-2 bg-blue-700 text-blue-100 px-2 py-0.5 rounded-full text-xs">
                NBME Screenshot Format Detected
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleParse}
          className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
        >
          Parse Questions →
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4 gap-3 max-w-5xl mx-auto w-full">
        {isScreenshot ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>NBME interface screenshot detected.</strong> Using coordinate-based parser:
            one question per page, choices identified by radio-button position, sections tracked
            automatically. {numPages} pages → expected ~{numPages - Math.round(numPages * 0.03)} questions.
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>Review the extracted text</strong> before parsing. Check for correct reading order,
            missing sections, or garbled characters. Click <em>Parse Questions</em> when ready.
          </div>
        )}

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setView('full')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${view === 'full' ? 'bg-blue-700 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            Full Text
          </button>
          <button
            onClick={() => setView('pages')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${view === 'pages' ? 'bg-blue-700 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            By Page
          </button>
          {view === 'pages' && (
            <select
              value={selectedPage}
              onChange={e => setSelectedPage(Number(e.target.value))}
              className="ml-2 border rounded px-2 py-1 text-sm"
            >
              {pages.map((p, i) => (
                <option key={i} value={i}>Page {p.pageNum}</option>
              ))}
            </select>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {fullText.length.toLocaleString()} chars · {numPages} pages
          </span>
        </div>

        <textarea
          readOnly
          value={displayText}
          className="flex-1 min-h-[60vh] font-mono text-xs bg-white border border-gray-300 rounded-lg p-4 resize-none focus:outline-none"
          spellCheck={false}
        />

        <div className="flex justify-end">
          <button
            onClick={handleParse}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
          >
            Parse Questions →
          </button>
        </div>
      </div>
    </div>
  );
}
