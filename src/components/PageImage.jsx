import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const docCache = new WeakMap();
const SCALES = [0.5, 0.75, 1.0, 1.4, 2.0];

export default function PageImage({ pdfData, pageNum, firstChoiceY = -1 }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [scaleIdx, setScaleIdx] = useState(1);
  const [loading, setLoading]   = useState(true);

  if (!pdfData) {
    return (
      <div className="border border-gray-200 rounded-lg mt-3 p-6 text-center bg-gray-50">
        <p className="text-sm text-gray-500">PDF not loaded — page view requires the original PDF.</p>
        <p className="text-xs text-gray-400 mt-1">Start a new test by uploading your PDF again to enable this feature.</p>
      </div>
    );
  }

  const scale = SCALES[scaleIdx];

  useEffect(() => {
    if (!pdfData || !pageNum) return;
    let cancelled = false;
    setLoading(true);

    async function render() {
      let pdf = docCache.get(pdfData);
      if (!pdf) {
        pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        docCache.set(pdfData, pdf);
      }
      if (cancelled) return;

      const page     = await pdf.getPage(pageNum);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const canvas   = canvasRef.current;
      if (!canvas) return;

      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      if (cancelled) return;

      setLoading(false);

      // Auto-scroll so the image region is visible.
      // If we know where choices are (firstChoiceY in PDF units, Y-up), the image is
      // above them. Scroll to put the bottom of the canvas (choices) just off-screen,
      // landing the viewport on the image region.
      if (containerRef.current) {
        const container   = containerRef.current;
        const canvasH     = canvas.height;
        const containerH  = container.clientHeight;

        if (firstChoiceY > 0) {
          // choices bottom-of-canvas position: canvas_y = viewport.height - firstChoiceY*scale
          const choicesCanvasY = viewport.height - firstChoiceY * scale;
          // scroll so the image (above choices) fills the view
          const target = Math.max(0, choicesCanvasY - containerH + 40);
          container.scrollTop = target;
        } else {
          // No choice hint — scroll to ~35% from top (past header + stem, into image)
          container.scrollTop = canvasH * 0.32;
        }
      }
    }

    render().catch(console.error);
    return () => { cancelled = true; };
  }, [pdfData, pageNum, scale]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 mt-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200 select-none">
        <span className="text-xs text-gray-500 font-medium">Page image — scroll to see full page</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScaleIdx(i => Math.max(0, i - 1))}
            disabled={scaleIdx === 0}
            className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded text-sm font-bold disabled:opacity-40 hover:bg-gray-50"
          >
            −
          </button>
          <span className="text-xs text-gray-600 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScaleIdx(i => Math.min(SCALES.length - 1, i + 1))}
            disabled={scaleIdx === SCALES.length - 1}
            className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded text-sm font-bold disabled:opacity-40 hover:bg-gray-50"
          >
            +
          </button>
        </div>
      </div>

      {/* Scrollable canvas */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ maxHeight: '55vh' }}
      >
        {loading && (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">
            Loading image…
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: loading ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}
