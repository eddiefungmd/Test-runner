import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  // Slice BEFORE passing to pdfjs — pdfjs transfers the ArrayBuffer to its worker,
  // which neuters the original buffer and would make a Uint8Array view of it empty.
  const rawData = new Uint8Array(arrayBuffer.slice(0));
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const pages = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(`Extracting page ${i} of ${numPages}…`);

    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Keep raw items with coordinates — essential for NBME screenshot parsing
    const rawItems = content.items
      .filter(item => item.str && item.str.trim())
      .map(item => ({
        str: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        fontSize: Math.round(Math.abs(item.transform[0])),
      }));

    // Sort top→bottom (y descending in PDF coords), then left→right
    rawItems.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 3) return dy;
      return a.x - b.x;
    });

    // Build readable lines (grouped by Y) for the raw-text preview
    const lines = [];
    let currentLine = [];
    let lastY = null;
    for (const item of rawItems) {
      if (lastY !== null && Math.abs(item.y - lastY) > 3) {
        if (currentLine.length) {
          lines.push(currentLine.map(i => i.str).join(' ').trim());
          currentLine = [];
        }
      }
      currentLine.push(item);
      lastY = item.y;
    }
    if (currentLine.length) lines.push(currentLine.map(i => i.str).join(' ').trim());

    pages.push({
      pageNum: i,
      items: rawItems,    // raw coordinate data for structured parsing
      lines,              // line-grouped text for preview
      text: lines.join('\n'),
    });
  }

  const fullText = pages.map(p => p.text).join('\n\n--- PAGE BREAK ---\n\n');
  return { pages, fullText, numPages, rawData };
}
