"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

export function ResizableResults({ children, video }: { children: ReactNode; video: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(60);
  const [dragging, setDragging] = useState(false);
  const clamp = (value: number) => Math.min(70, Math.max(30, value));

  return (
    <div
      ref={container}
      className="relative grid items-start gap-y-6 lg:grid-cols-[var(--result-columns)]"
      style={{ "--result-columns": `minmax(0, ${split}fr) 28px minmax(0, ${100 - split}fr)` } as CSSProperties}
    >
      <div id="election-results-content" className="min-w-0">{children}</div>
      <div className="sticky top-6 hidden self-start lg:block">
        <button
          type="button"
          role="separator"
          aria-label="Resize RNZ video panel"
          aria-orientation="vertical"
          aria-controls="election-results-content rnz-video-panel"
          aria-valuemin={30}
          aria-valuemax={70}
          aria-valuenow={split}
          aria-valuetext={`RNZ video uses ${100 - split}% of the available width`}
          title="Drag left for a bigger video, right for a smaller video. Arrow keys resize. Double-click to reset."
          className="group flex h-32 w-7 touch-none cursor-col-resize select-none items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-[#7b1025]"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId) || !container.current) return;
            const bounds = container.current.getBoundingClientRect();
            setSplit(clamp(((event.clientX - bounds.left - 14) / (bounds.width - 28)) * 100));
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setDragging(false);
          }}
          onPointerCancel={() => setDragging(false)}
          onLostPointerCapture={() => setDragging(false)}
          onDoubleClick={() => setSplit(60)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            if (event.key === "Home") setSplit(30);
            else if (event.key === "End") setSplit(70);
            else setSplit((value) => clamp(value + (event.key === "ArrowLeft" ? -2 : 2)));
          }}
        >
          <span className="flex h-16 w-4 items-center justify-center rounded-full border border-[#d2c8bd] bg-white text-sm font-bold text-[#7b1025] shadow-sm group-hover:border-[#7b1025] group-hover:bg-[#f4ead2]" aria-hidden>↔</span>
        </button>
      </div>
      <div id="rnz-video-panel" className="min-w-0 lg:sticky lg:top-6">
        <p className="mb-2 hidden text-center text-xs text-neutral-600 lg:block">Drag the ↔ handle to resize the video</p>
        {video}
      </div>
      {dragging && <div className="absolute inset-0 z-20 cursor-col-resize" aria-hidden />}
    </div>
  );
}
