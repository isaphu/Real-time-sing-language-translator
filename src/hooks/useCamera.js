import { useCallback, useEffect, useRef, useState } from "react";

export default function useCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 360 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access in your browser.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    const v = videoRef.current;
    const stream = v?.srcObject;
    if (stream && stream.getTracks) stream.getTracks().forEach(t => t.stop());
    if (v) v.srcObject = null;
    setCameraOn(false);
  }, []);

  // for safety stop camera if unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, canvasRef, cameraOn, startCamera, stopCamera };
}