import React, { useEffect, useMemo, useRef, useState } from "react";

import Stepper from "./components/Stepper";
import Terms from "./components/Terms";
import Translation from "./components/Translation";
import Complete from "./components/Complete";

import useCamera from "./hooks/useCamera";
import initialTranscript from "./data/initialTranscript";
// MediaPipe 
import useGestureRecognizer from "./hooks/useGestureRecognizer";
// Custom TF.js 
import useTrainedGesture from "./hooks/useTrainedGesture";

import { landmarksToFeatures } from "./utils/feat";
import { createGestureInterpreter } from "./utils/gestureRules";
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
  const [hasExported, setHasExported] = useState(false);

  // model preference: "auto" | "custom" | "mp"
  const [modelPref, setModelPref] = useState(
    () => localStorage.getItem("modelPref") || "auto"
  );

  // debug HUD state (throttled updates to avoid re-rendering every frame)
  const [debug, setDebug] = useState(null);
  const lastDebugAtRef = useRef(0);

  const chatRef = useRef(null);

  const fontClass = useMemo(() => {
    if (fontScale < 0.95) return "text-sm";
    if (fontScale < 1.15) return "text-base";
    if (fontScale < 1.35) return "text-lg";
    if (fontScale < 1.55) return "text-xl";
    return "text-2xl";
  }, [fontScale]);

  // phrase mapping for 10 custom classes
  const CUSTOM_MAP = {
    hello: "Hello",
    bye: "Bye",
    thankyou: "Thank you",
    yes: "Yes",
    no: "No",
    please: "Please",
    water: "Water",
    drink: "Drink",
    book: "Book",
    where: "Where",
  };

  // ---- Hooks ----
  const { videoRef, canvasRef, cameraOn, startCamera, stopCamera } = useCamera();
  const { recognizerRef, ready: mpReady } = useGestureRecognizer(); // MediaPipe

  // useTrainedGesture returns step() that does scaling + smoothing internally
  const {
    ready: customReady,
    // -> { emit|null, score, rawTop, rawProbs }
    step: customStep, 
    labels: customLabels,
    reset: customReset,
  } = useTrainedGesture(
    "/models/sign10/model.json",
    "/models/sign10/labels.json",
    "/models/sign10/scaler.json"
  );

  // One interpreter for both sources
  const interpreterRef = useRef(
    createGestureInterpreter({
      cooldownMs: 700,       // ★ was 900
      builtInMinScore: 0.6,
      customMinScore: 0.35,  // ★ was 0.4
      customMap: CUSTOM_MAP,
    })
  );

  // ---- Helpers ----
  const appendSignerText = (text) => {
    setTranscript((t) => [...t, { role: "DHH", text, timestamp: nowISO() }]);
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const resetToTerms = () => {
    setTranscript([]);
    setInput("");
    setHasExported(false);
    setStep(0);
    interpreterRef.current.reset();
    customReset?.();
  };

  //flow actions 
  const onStart = async () => {
    setTranscript([]);
    setInput("");
    setHasExported(false);
    setStep(1);
    await startCamera();
    interpreterRef.current.reset();
    customReset?.();
  };

  const onClose = () => setShowEndModal(true);

  const confirmEndTranslation = () => {
    setShowEndModal(false);
    stopCamera();
    setStep(2);
  };

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTranscript((t) => [...t, { role: "STAFF", text: trimmed, timestamp: nowISO() }]);
    setInput("");
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const onExport = () => {
    exportTranscriptPDF(transcript);
    setHasExported(true);
  };

  const requestRestart = () => (hasExported ? resetToTerms() : setShowRestartModal(true));
  const restartWithoutExport = () => { setShowRestartModal(false); resetToTerms(); };
  const exportThenRestart = () => { onExport(); setShowRestartModal(false); setTimeout(() => resetToTerms(), 0); };

  useEffect(() => {
    if (step !== 1) stopCamera();
  }, [step, stopCamera]);

  //draw loop: mirror video + recognition (pref aware) 
  useEffect(() => {
    if (!cameraOn) return;
    let raf = 0;

    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");

    const loop = () => {
      if (v && ctx && v.readyState >= 2) {
        // sync canvas internal size to css size
        const rect = c.getBoundingClientRect();
        const cssW = Math.max(1, Math.floor(rect.width));
        const cssH = Math.max(1, Math.floor(rect.height));
        if (c.width !== cssW || c.height !== cssH) { c.width = cssW; c.height = cssH; }

        // mirror video
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.save();
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(v, 0, 0, c.width, c.height);
        ctx.restore();

        // 1) MediaPipe landmarks (used by both)
        let lm = null, mpLabel = null, mpScore = 0;
        if (mpReady && recognizerRef.current) {
          const res = recognizerRef.current.recognizeForVideo(v, performance.now());
          lm = res?.landmarks?.[0] || null;
          const top = res?.gestures?.[0]?.[0];
          mpLabel = top?.categoryName || null;
          mpScore = top?.score ?? 0;
        }

        // 2) Custom model path (uses smoothing inside hook)
        let dbgCustomLabel = null;
        let dbgCustomScore = 0;

        const tryCustom = () => {
          if (!customReady || !lm) return null;
          const feat = landmarksToFeatures(lm); // 63-D wrist-relative
          if (!feat) return null;

          const res = customStep(feat); // { emit|null, score, rawTop, rawProbs }
          if (!res) return null;

          const topLabel = res.rawTop?.label ?? null;   // ★
          const topScore = res.rawTop?.score ?? 0;      // ★
          dbgCustomLabel = topLabel;
          dbgCustomScore = topScore;

          // If the smoother says "emit", route through interpreter (for mapping/cooldown)
          if (res.emit) {
            return (
              interpreterRef.current.step({
                label: res.emit.toLowerCase(),
                score: res.score ?? 1,
                landmarks: lm,
                now: performance.now(),
                source: "custom",
              }) || res.emit
            );
          }

          // ★ High-score bypass: if the raw top is very confident, emit immediately
          if (topLabel && topScore >= 0.80) {
            return interpreterRef.current.step({
              label: topLabel.toLowerCase(),
              score: topScore,
              landmarks: lm,
              now: performance.now(),
              source: "custom",
            });
          }

          return null;
        };

        // 3) MediaPipe path
        const tryMP = () => {
          if (!mpLabel) return null;
          return interpreterRef.current.step({
            label: mpLabel,
            score: mpScore,
            landmarks: lm,
            now: performance.now(),
            source: "mp",
          });
        };

        // 4) Preference logic
        let phrase = null;
        if (modelPref === "custom") {
          phrase = tryCustom();
        } else if (modelPref === "mp") {
          phrase = tryMP();
        } else {
          // auto: prefer custom, fallback to MP
          phrase = tryCustom() ?? tryMP();
        }

        if (phrase) appendSignerText(phrase);

        //throttled debug HUD updates (~6 fps) 
        const t = performance.now();
        if (t - lastDebugAtRef.current > 150) {
          lastDebugAtRef.current = t;
          setDebug({
            mpReady,
            customReady,
            modelPref,
            mpLabel,
            mpScore,
            customLabel: dbgCustomLabel,
            customScore: dbgCustomScore,
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    cameraOn,
    videoRef,
    canvasRef,
    mpReady,
    recognizerRef,
    customReady,
    customStep,
    modelPref,
  ]);

  //settings save (persist model pref too)
  const saveSettings = () => {
    localStorage.setItem("modelPref", modelPref);
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

        <Stepper step={step} />

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
              videoRef={videoRef}
              canvasRef={canvasRef}
              cameraOn={cameraOn}
              debug={debug}
            />
          )}
          {step === 2 && <Complete onExport={onExport} onRestartRequest={requestRestart} />}
        </div>

        {/* Settings drawer */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
            <div className="w-[390px] bg-white rounded-t-2xl p-4">
              <div className="text-center font-semibold mb-2">Setting</div>
              <div className="space-y-3">
                {/* Text size */}
                <div className="border rounded-xl p-3">
                  <div className="text-sm mb-2">Text size</div>
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

                {/* Model Preference */}
                <div className="border rounded-xl p-3">
                  <div className="text-sm mb-2">Recognition model</div>
                  <div className="flex flex-col gap-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="modelPref"
                        value="auto"
                        checked={modelPref === "auto"}
                        onChange={(e) => setModelPref(e.target.value)}
                      />
                      <span>Auto (prefer Custom, fallback to MediaPipe)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="modelPref"
                        value="custom"
                        checked={modelPref === "custom"}
                        onChange={(e) => setModelPref(e.target.value)}
                      />
                      <span>Prefer Custom model</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="modelPref"
                        value="mp"
                        checked={modelPref === "mp"}
                        onChange={(e) => setModelPref(e.target.value)}
                      />
                      <span>Prefer MediaPipe</span>
                    </label>
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

        {/* Restart Modal */}
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
