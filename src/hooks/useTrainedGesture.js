import * as tf from "@tensorflow/tfjs";
import { useEffect, useRef, useState } from "react";
import { loadScaler, applyScaler } from "../utils/scaler";
import TemporalSmoother from "../utils/temporalSmoother";

// small util
const argMax = (arr) => {
  if (!arr || arr.length === 0) return 0;
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
};

export default function useTrainedGesture(modelUrl, labelsUrl, scalerUrl) {
  const modelRef = useRef(null);
  const smootherRef = useRef(null);
  const scalerRef = useRef(null);

  const [labels, setLabels] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [model, scaler, labelsResp] = await Promise.all([
          tf.loadLayersModel(modelUrl),
          loadScaler(scalerUrl),
          fetch(labelsUrl).then((r) => r.json()),
        ]);
        if (cancelled) return;

        modelRef.current = model;
        scalerRef.current = scaler;
        setLabels(labelsResp);

        smootherRef.current = new TemporalSmoother({
          classes: labelsResp,
          emaAlpha: 0.6,  // smoothing strength (0..1)
          win: 5,         // majority-vote window
          enter: 0.50,    // start emitting threshold
          exit: 0.35,     // stop emitting threshold (hysteresis)
        });

        setReady(true);
      } catch (err) {
        console.error("Failed to load custom model stack:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modelUrl, labelsUrl, scalerUrl]);

  /**
   * step(features)
   * @param {Float32Array|number[]} features - 63-D wrist-relative, *unscaled*
   * @returns {{emit: string|null, score:number, rawTop:{index:number,label:string|null,score:number}, rawProbs:number[]}}
   */
  const step = (features) => {
    if (!ready || !modelRef.current || !smootherRef.current || !scalerRef.current) {
      return { emit: null, score: 0, rawTop: { index: 0, label: null, score: 0 }, rawProbs: [] };
    }

    // 1) Scale features exactly like training
    const xScaled = applyScaler(features, scalerRef.current); // Float32Array(63)

    // 2) Predict probabilities
    const input = tf.tensor2d(xScaled, [1, xScaled.length]);
    const out = modelRef.current.predict(input);
    const probsTyped = out.dataSync(); // Float32Array length K

    input.dispose();
    out.dispose();

    // Convert to plain array for UI/logging and guard NaNs
    const probs = Array.from(probsTyped, (v) => (Number.isFinite(v) ? v : 0));

    // 3) Temporal smoothing + hysteresis
    const s = smootherRef.current.step(probs) || {};

    // choose a top index: prefer smoother’s, else raw argmax
    const topIdx =
      Number.isInteger(s.topIndex) && s.topIndex >= 0 && s.topIndex < probs.length
        ? s.topIndex
        : argMax(probs);

    const topScore = Number.isFinite(probs[topIdx]) ? probs[topIdx] : 0;
    const topLabel = labels?.[topIdx] ?? null;

    return {
      emit: s.emit ?? null, // stabilized label (already mapped to class name) or null
      score: s.score ?? topScore,
      rawTop: {
        index: topIdx,
        label: topLabel,
        score: topScore,
      },
      rawProbs: probs,
    };
  };

  const reset = () => smootherRef.current?.reset();

  return { ready, step, labels, reset };
}
