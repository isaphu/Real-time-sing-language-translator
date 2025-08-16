import React from "react";

export default function VideoPreview({ videoRef, canvasRef, cameraOn }) {
  return (
    // Use a fixed 16:9 preview box (YouTube-style). Swap aspect-video -> object-contain below
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black mb-3">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"   // use object-contain if you prefer no cropping
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {!cameraOn && (
        <div className="absolute inset-0 grid place-items-center text-neutral-300">
          Waiting for camera…
        </div>
      )}
    </div>
  );
}
