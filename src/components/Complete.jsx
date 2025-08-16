import React from "react";

export default function Complete({ onExport, onRestartRequest }) {
  return (
    <div>
      <div className="border rounded-2xl h-72 flex flex-col items-center justify-center text-emerald-600 mb-4 gap-4">
        ✓ Translation complete
        <button onClick={onExport} className="px-4 py-2 rounded-xl border bg-white shadow text-sm">
          Export Chat
        </button>
      </div>
      <div className="flex gap-3">
        <button className="flex-1 py-2 rounded-xl bg-neutral-200" onClick={onRestartRequest}>
          Start New Translation
        </button>
      </div>
    </div>
  );
}
