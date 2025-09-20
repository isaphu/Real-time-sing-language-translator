export default function DebugHUD({
    mpReady, customReady, modelPref,
    mpLabel, mpScore,
    customLabel, customScore
  }) {
    return (
      <div className="absolute top-2 left-2 text-[11px] bg-black/60 text-white px-2 py-1 rounded">
        <div>Pref: <b>{modelPref}</b></div>
        <div>MP ready: <b>{String(mpReady)}</b></div>
        <div>Custom ready: <b>{String(customReady)}</b></div>
        <div>MP top: {mpLabel ?? "—"} ({mpScore?.toFixed?.(2) ?? "-"})</div>
        <div>Custom top: {customLabel ?? "—"} ({customScore?.toFixed?.(2) ?? "-"})</div>
      </div>
    );
  }
  