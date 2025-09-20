import { useEffect, useRef, useState } from "react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export default function useGestureRecognizer() {
  const recognizerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(
          // wasm assets CDN (official)
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/gesture_recognizer.task" },
          numHands: 1,
          runningMode: "VIDEO",
        });
        if (!cancelled) {
          recognizerRef.current = recognizer;
          setReady(true);
        }
      } catch (e) {
        console.error("GestureRecognizer init failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { recognizerRef, ready };
}
