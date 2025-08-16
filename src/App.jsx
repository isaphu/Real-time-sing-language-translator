import React, { useEffect, useMemo, useRef, useState } from "react";

import Stepper from "./components/Stepper";
import Terms from "./components/Terms";
import Translation from "./components/Translation";
import Complete from "./components/Complete";

import useCamera from "./hooks/useCamera";
import initialTranscript from "./data/initialTranscript";
import { nowISO } from "./utils/time";
import { exportTranscriptPDF } from "./utils/pdf";

export default function App() {
  const [step, setStep] = useState(0); // 0 Terms, 1 Translation, 2 Complete
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  const [fontScale, setFontScale] = useState(1);
  const [showSaved, setShowSaved] = useState(false);

  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState(() => initialTranscript);

  // NEW: track if current session has been exported
  const [hasExported, setHasExported] = useState(false);

  const chatRef = useRef(null);

  const fontClass = useMemo(() => {
    if (fontScale < 0.95) return "text-sm";
    if (fontScale < 1.15) return "text-base";
    if (fontScale < 1.35) return "text-lg";
    if (fontScale < 1.55) return "text-xl";
    return "text-2xl";
  }, [fontScale]);

  // ---- Camera (hook) ----
  const { videoRef, canvasRef, cameraOn, startCamera, stopCamera } = useCamera();

  // Helper: clean state & go to Terms
  const resetToTerms = () => {
    setTranscript([]);
    setInput("");
    setHasExported(false);  // reset export flag for next session
    setStep(0);
  };

  // Start from Terms -> Translation
  const onStart = async () => {
    setTranscript([]);
    setInput("");
    setHasExported(false);  // NEW: new session hasn't exported yet
    setStep(1);
    await startCamera(); // turn on webcam entering Translation
  };

  // Close pressed in Translation -> confirm modal
  const onClose = () => setShowEndModal(true);

  // Confirm end translation -> to Complete (stop camera)
  const confirmEndTranslation = () => {
    setShowEndModal(false);
    stopCamera();
    setStep(2);
  };

  // Send message (STAFF side for now)
  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTranscript((t) => [...t, { role: "STAFF", text: trimmed, timestamp: nowISO() }]);
    setInput("");
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  // Export PDF (plain text 12pt)
  const onExport = () => {
    exportTranscriptPDF(transcript);
    setHasExported(true); // NEW: mark as exported
  };

  // Step 3 restart options
  // NEW: only show warning modal if NOT exported; otherwise jump straight to Terms
  const requestRestart = () => {
    if (hasExported) {
      resetToTerms();   // no warning needed
    } else {
      setShowRestartModal(true); // show Export/Start Without Export/Cancel
    }
  };

  const restartWithoutExport = () => {
    setShowRestartModal(false);
    resetToTerms();
  };

  const exportThenRestart = () => {
    onExport(); // sets hasExported = true
    setShowRestartModal(false);
    setTimeout(() => {
      resetToTerms();
    }, 0);
  };

  // Safety: stop camera any time we leave step 1
  useEffect(() => {
    if (step !== 1) stopCamera();
  }, [step, stopCamera]);

  // -------- mirror video into canvas + overlay hook --------
  useEffect(() => {
    if (!cameraOn) return;
    let raf = 0;

    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");

    const loop = () => {
      if (v && ctx && v.readyState >= 2) {
        // Match the canvas INTERNAL pixels to the DISPLAYED size of the canvas element
        const rect = c.getBoundingClientRect();
        const cssW = Math.max(1, Math.floor(rect.width));
        const cssH = Math.max(1, Math.floor(rect.height));
        if (c.width !== cssW || c.height !== cssH) {
          c.width = cssW;
          c.height = cssH;
        }

        // Clear and draw the mirrored video scaled to the canvas box
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.save();
        ctx.translate(c.width, 0);   // move origin to the right edge
        ctx.scale(-1, 1);            // mirror horizontally
        ctx.drawImage(v, 0, 0, c.width, c.height);
        ctx.restore();

        // TODO: draw overlays (e.g., landmarks) here
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cameraOn, videoRef, canvasRef]);

  const saveSettings = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
    setIsSettingsOpen(false);
  };

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
              // camera props
              videoRef={videoRef}
              canvasRef={canvasRef}
              cameraOn={cameraOn}
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
                <button onClick={() => setIsSettingsOpen(false)} className="flex-1 py-2 rounded-xl border">
                  Cancel
                </button>
                <button onClick={saveSettings} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* End Translation Modal */}
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
                <button onClick={exportThenRestart} className="py-2 rounded-xl bg-emerald-500 text-white">
                  Export & Start New
                </button>
                <button onClick={restartWithoutExport} className="py-2 rounded-xl border">
                  Start New Without Export
                </button>
                <button onClick={() => setShowRestartModal(false)} className="py-2 rounded-xl text-neutral-600">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
