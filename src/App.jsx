import React, { useMemo, useRef, useState, useEffect } from "react";

import Stepper from "./components/Stepper";
import Terms from "./components/Terms";
import Translation from "./components/Translation";
import Complete from "./components/Complete";

import { nowISO } from "./utils/time";
import { exportTranscriptPDF } from "./utils/pdf";
import { buildTranscriptLines } from "./utils/transcript";
import { initialTranscript as seed } from "./data/initialTranscript";

export default function RealTimeSignTranslator() {
  const [step, setStep] = useState(0); // 0 Terms, 1 In-Progress, 2 Complete
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [showSaved, setShowSaved] = useState(false);
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState(() => seed);

  const chatRef = useRef(null);

  const fontClass = useMemo(() => {
    if (fontScale < 0.95) return "text-sm";
    if (fontScale < 1.15) return "text-base";
    if (fontScale < 1.35) return "text-lg";
    if (fontScale < 1.55) return "text-xl";
    return "text-2xl";
  }, [fontScale]);

  // ---------- Lightweight tests (console-only) ----------
  useEffect(() => {
    try {
      // Test 1
      const sample = new Date().toLocaleString();
      console.assert(typeof sample === "string" && sample.length > 0, "Timestamp formatting failed");

      // Test 2
      const mock = [
        { role: "DHH", text: "Hello", timestamp: nowISO() },
        { role: "STAFF", text: "Hi", timestamp: nowISO() },
      ];
      const lines = buildTranscriptLines(mock).join("\n");
      console.assert(/\[\d{2}\/\d{2}\/\d{2}, \d{2}:\d{2}:\d{2} (AM|PM)\] DHH: Hello/.test(lines), "Export format failed (non-empty)");

      // Test 3
      const emptyLines = buildTranscriptLines([]);
      console.assert(Array.isArray(emptyLines) && emptyLines[0] === "(No messages in this session)", "Export format failed (empty)");
    } catch (e) {
      console.error("Dev tests encountered an error:", e);
    }
  }, []);

  // ---------- Actions ----------
  const onStart = () => {
    setTranscript([]); // clear transcript when starting new translation
    setInput("");
    setStep(1);
  };

  const onClose = () => {
    if (step === 1) {
      setShowEndModal(true);
    } else {
      setStep(0);
    }
  };

  const confirmEndTranslation = () => {
    setShowEndModal(false);
    setStep(2);
  };

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const msg = { role: "STAFF", text: trimmed, timestamp: nowISO() };
    setTranscript((t) => [...t, msg]);
    setInput("");
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const onExport = () => exportTranscriptPDF(transcript);

  // Step 3 > Start New Translation flow with warning & optional export
  const requestRestart = () => setShowRestartModal(true);

  const restartWithoutExport = () => {
    setShowRestartModal(false);
    setTranscript([]);
    setInput("");
    setStep(0);
  };

  const exportThenRestart = () => {
    exportTranscriptPDF(transcript);
    setShowRestartModal(false);
    setTimeout(() => {
      setTranscript([]);
      setInput("");
      setStep(0);
    }, 0);
  };

  const saveSettings = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
    setIsSettingsOpen(false);
  };

  // ---------- Render ----------
  return (
    <div className="w-full min-h-screen bg-neutral-100 flex items-start justify-center p-4">
      <div className="w-[390px] bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Real-time Sign Language Translator</div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-sm text-neutral-600 hover:text-black"
            aria-label="Settings"
          >
            ⚙️ Setting
          </button>
        </div>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Content */}
        <div className="p-4">
          {step === 0 && <Terms onStart={onStart} />}
          {step === 1 && (
            <Translation
              chatRef={chatRef}
              transcript={transcript}
              fontClass={fontClass}
              onClose={onClose}
              input={input}
              setInput={setInput}
              onSend={onSend}
            />
          )}
          {step === 2 && (
            <Complete onExport={onExport} onRestartRequest={requestRestart} />
          )}
        </div>

        {/* Settings drawer */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
            <div className="w-[390px] bg-white rounded-t-2xl p-4">
              <div className="text-center font-semibold mb-2">Setting</div>
              <div className="space-y-2">
                <div className="border rounded-xl p-3">
                  <div className="text-sm mb-2">Text</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">A</span>
                    <input
                      type="range"
                      min={0.8}
                      max={1.6}
                      step={0.05}
                      value={fontScale}
                      onChange={(e) => setFontScale(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-base">A</span>
                  </div>
                </div>
              </div>

              {showSaved && (
                <div className="mt-3 text-center text-green-600 text-sm">
                  Your setting has been successfully saved
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={() => setIsSettingsOpen(false)} className="flex-1 py-2 rounded-xl border">Cancel</button>
                <button onClick={saveSettings} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* End Translation Modal (Step 2 entry) */}
        {showEndModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-[360px] bg-white rounded-2xl shadow-lg p-4">
              <div className="text-lg font-semibold mb-1">End translation?</div>
              <p className="text-sm text-neutral-600 mb-4">
                Are you sure you want to end this translation? You can still export the chat on the next screen.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndModal(false)} className="flex-1 py-2 rounded-xl border">Cancel</button>
                <button onClick={confirmEndTranslation} className="flex-1 py-2 rounded-xl bg-red-500 text-white">End translation</button>
              </div>
            </div>
          </div>
        )}

        {/* Restart Modal (Step 3) */}
        {showRestartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-[360px] bg-white rounded-2xl shadow-lg p-4">
              <div className="text-lg font-semibold mb-1">Start a new translation?</div>
              <p className="text-sm text-neutral-600 mb-4">
                Your current chat will be cleared. Would you like to export it first?
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={exportThenRestart} className="py-2 rounded-xl bg-emerald-500 text-white">Export & Start New</button>
                <button onClick={restartWithoutExport} className="py-2 rounded-xl border">Start New Without Export</button>
                <button onClick={() => setShowRestartModal(false)} className="py-2 rounded-xl text-neutral-600">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
