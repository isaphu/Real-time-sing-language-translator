import React from "react";

export default function VideoPreview({ videoRef, canvasRef, cameraOn }) {
  return (
    // use a fixed 16:9 preview box
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black mb-3">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"   // use object-contain
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
