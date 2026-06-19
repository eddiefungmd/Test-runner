import { useState, useRef, useCallback } from 'react';
import { extractTextFromPDF } from '../utils/pdfExtract';

export default function UploadScreen({ onExtracted }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const inputRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }
    setError(null);
    setLoading(true);
    setProgress('Reading PDF...');
    try {
      const result = await extractTextFromPDF(file, (msg) => setProgress(msg));
      setProgress('');
      onExtracted(result, file.name);
    } catch (e) {
      setError(`Failed to read PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [onExtracted]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">NBME Practice Test</h1>
          <p className="text-gray-500">Upload a PDF of practice questions to begin</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'
          }`}
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="text-5xl mb-4">📄</div>
          {loading ? (
            <div>
              <div className="text-blue-700 font-medium mb-2">{progress || 'Processing...'}</div>
              <div className="w-48 h-1.5 bg-gray-200 rounded mx-auto overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse w-full" />
              </div>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700 mb-1">Drag & drop your PDF here</p>
              <p className="text-sm text-gray-400 mb-4">or click to browse</p>
              <button className="px-5 py-2 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 transition">
                Choose PDF
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 bg-white rounded-xl p-4 border border-gray-200 text-sm text-gray-500">
          <p className="font-medium text-gray-700 mb-2">Supported formats:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Numbered questions (1. or Q1. format)</li>
            <li>Lettered choices (A. B. C. or A) B) C))</li>
            <li>Inline or appendix answer keys</li>
            <li>Embedded lab values tables</li>
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            Text is extracted client-side — your PDF never leaves your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
