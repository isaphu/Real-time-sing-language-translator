import React from "react";
import VideoPreview from "./VideoPreview";
import { formatTimestamp } from "../utils/time";
import DebugHUD from "./DebugHUD";

export default function Translation({
  chatRef,
  transcript,
  fontClass,
  onClose,
  input,
  setInput,
  onSend,
  videoRef,
  canvasRef,
  cameraOn,
  debug,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-neutral-500">Video Preview</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-full bg-red-500 text-white text-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* make this wrapper relative so HUD can be absolutely positioned */}
      <div className="relative mb-3">
        <VideoPreview
          videoRef={videoRef}
          canvasRef={canvasRef}
          cameraOn={cameraOn}
        />

        {/* debug overlay (only shows if parent passes a debug object) */}
        {debug && (
          <DebugHUD
            mpReady={debug.mpReady}
            customReady={debug.customReady}
            modelPref={debug.modelPref}
            mpLabel={debug.mpLabel}
            mpScore={debug.mpScore}
            customLabel={debug.customLabel}
            customScore={debug.customScore}
          />
        )}
      </div>

      <div
        ref={chatRef}
        className={`border rounded-2xl h-48 p-3 overflow-auto bg-neutral-50 ${fontClass}`}
      >
        {transcript.map((m, i) => (
          <div key={i} className="mb-3">
            <div>
              <span className="font-semibold mr-1">{m.role}:</span>
              <span className="break-words">{m.text}</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-1">
              {formatTimestamp(m.timestamp)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          className="flex-1 rounded-xl border px-3 py-2"
        />
        <button
          onClick={onSend}
          className="px-4 rounded-xl bg-emerald-500 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
}
