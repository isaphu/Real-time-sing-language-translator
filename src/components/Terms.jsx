import React from "react";
import termsText from "../data/termsCondition.js";

export default function Terms({ onStart }) {
  return (
    <div>
      <pre className="border rounded-2xl h-72 p-3 overflow-auto whitespace-pre-wrap text-sm mb-4">
        {termsText || "Terms and condition area"}
      </pre>
      <div className="flex gap-3">
        <button className="flex-1 py-2 rounded-xl bg-emerald-500 text-white" onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}
