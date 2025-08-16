import React from "react";

export default function Stepper({ step }) {
  const items = [
    { label: "Terms & Conditions" },
    { label: "Start translation" },
    { label: "Translate Complete" },
  ];
  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between text-[11px] text-neutral-500">
        {items.map((it, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center">
            <div className={
              "w-8 h-8 rounded-full border flex items-center justify-center mb-1 " +
              (step >= idx ? "bg-emerald-500 text-white border-emerald-500" : "bg-white")
            }>
              {idx + 1}
            </div>
            <div className="text-center leading-tight h-7">{it.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 h-1 bg-neutral-200 rounded-full">
        <div
          className="h-1 bg-emerald-500 rounded-full transition-all"
          style={{ width: `${((step + 1) / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}
