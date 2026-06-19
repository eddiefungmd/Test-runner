import { useRef, useCallback } from 'react';

// Walk text nodes under root to convert a DOM (node, offset) pair into an
// absolute character offset from the start of root's text content.
function toAbsOffset(root, node, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let total = 0;
  while (walker.nextNode()) {
    if (walker.currentNode === node) return total + offset;
    total += walker.currentNode.textContent.length;
  }
  return total;
}

// Merge overlapping/adjacent ranges and sort
function mergeRanges(ranges) {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      out.push({ ...sorted[i] });
    }
  }
  return out;
}

export default function StemDisplay({ text, highlights, onHighlightsChange }) {
  const containerRef = useRef(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !containerRef.current) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const start = toAbsOffset(containerRef.current, range.startContainer, range.startOffset);
    const end   = toAbsOffset(containerRef.current, range.endContainer, range.endOffset);
    if (start >= end) return;

    sel.removeAllRanges();

    // If the selection fully overlaps an existing highlight → remove it; else add
    const overlaps = highlights.filter(h => h.start < end && h.end > start);
    let next;
    if (overlaps.length > 0) {
      next = highlights.filter(h => !(h.start < end && h.end > start));
    } else {
      next = mergeRanges([...highlights, { start, end }]);
    }
    onHighlightsChange(next);
  }, [highlights, onHighlightsChange]);

  // Build span segments from highlights
  const segments = [];
  const sorted = mergeRanges(highlights);
  let pos = 0;
  for (const h of sorted) {
    if (pos < h.start) segments.push({ t: text.slice(pos, h.start), hi: false });
    if (h.start < h.end) segments.push({ t: text.slice(h.start, h.end), hi: true });
    pos = h.end;
  }
  if (pos < text.length) segments.push({ t: text.slice(pos), hi: false });

  return (
    <p
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap select-text cursor-text"
      title="Select text to highlight; select again to remove"
    >
      {segments.map((seg, i) =>
        seg.hi
          ? <mark key={i} className="bg-yellow-200 text-gray-800 rounded-sm">{seg.t}</mark>
          : <span key={i}>{seg.t}</span>
      )}
    </p>
  );
}
