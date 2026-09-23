import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Send,
} from "lucide-react";

export const WriterWorkspace: React.FC = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSetting, setNewSetting] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDialogue, setNewDialogue] = useState("");
  const [newChar, setNewChar] = useState("");
  const [canonCheckResult, setCanonCheckResult] = useState<any>(null);
  const [checkingCanon, setCheckingCanon] = useState(false);

  const loadScripts = () => {
    setLoading(true);
    fetch("/api/scripts")
      .then((res) => res.json())
      .then((data) => {
        setScripts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting) return;

    try {
      await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: "issue-1",
          pageNumber: 1,
          panelNumber: scripts.length + 1,
          setting: newSetting,
          description: newDesc,
          dialogue: newDialogue
            ? [{ character: newChar || "ARCHER", text: newDialogue }]
            : [],
          narration: "",
          sfx: "SILENCE",
          artistNote: "Maintain high contrast and dramatic lighting.",
          editorNote: "Pending review",
        }),
      });
      setNewSetting("");
      setNewDesc("");
      setNewDialogue("");
      setNewChar("");
      loadScripts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunCanonCheck = async () => {
    setCheckingCanon(true);
    const combinedText = scripts
      .map(
        (s) =>
          `${s.setting} ${s.description} ${s.dialogue.map((d: any) => d.text).join(" ")}`,
      )
      .join(" ");
    try {
      const res = await fetch("/api/ai/canon-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combinedText }),
      });
      const data = await res.json();
      setCanonCheckResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingCanon(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
            Writer Studio & Comic Script Editor
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Author page breakdowns, panel descriptions, dialogue, and real-time
            AI canon verification.
          </p>
        </div>

        <button
          onClick={handleRunCanonCheck}
          disabled={checkingCanon}
          className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4 text-zinc-950" />
          <span>
            {checkingCanon ? "Checking Canon..." : "Run AI Canon Checker"}
          </span>
        </button>
      </div>

      {/* Canon Check Results Box */}
      {canonCheckResult && (
        <div
          className={`p-5 rounded-2xl border text-xs space-y-3 ${
            canonCheckResult.hasConflicts
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-sm">
            {canonCheckResult.hasConflicts ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <span>
              {canonCheckResult.hasConflicts
                ? "Potential Canon Conflicts Detected"
                : "All Script Panels Verified Canon Clean"}
            </span>
          </div>
          {canonCheckResult.conflicts?.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {canonCheckResult.conflicts.map((conf: any, i: number) => (
                <li key={i}>
                  {conf.description} (Severity: {conf.severity})
                </li>
              ))}
            </ul>
          )}
          {canonCheckResult.suggestions?.length > 0 && (
            <div className="text-[11px] text-zinc-300 pt-1">
              <strong>AI Suggestion:</strong>{" "}
              {canonCheckResult.suggestions.join(" ")}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scripts List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
              Issue #7 — Page & Panel Breakdown
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {scripts.length} Panels
            </span>
          </div>

          <div className="space-y-4">
            {scripts.map((script, idx) => (
              <div
                key={script.id || idx}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold bg-yellow-400 text-zinc-950 px-2.5 py-0.5 rounded font-mono">
                      PAGE {script.pageNumber}
                    </span>
                    <span className="text-xs font-semibold text-zinc-300 font-mono">
                      PANEL {script.panelNumber}
                    </span>
                  </div>
                  <span className="text-xs text-yellow-400 font-mono">
                    {script.setting}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-zinc-300 font-serif leading-relaxed italic">
                    "{script.description}"
                  </p>
                </div>

                {script.dialogue?.length > 0 && (
                  <div className="space-y-2 bg-zinc-950/60 p-4 rounded-2xl border border-white/5">
                    {script.dialogue.map((dlg: any, dIdx: number) => (
                      <div key={dIdx} className="space-y-0.5">
                        <span className="text-[10px] font-mono font-bold text-yellow-400 tracking-wider uppercase">
                          {dlg.character}:
                        </span>
                        <p className="text-xs font-bold text-zinc-100">
                          {dlg.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/5">
                  <span>
                    SFX: <strong className="text-zinc-300">{script.sfx}</strong>
                  </span>
                  <span>
                    Artist Note:{" "}
                    <strong className="text-zinc-300">
                      {script.artistNote}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Panel Form */}
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 rounded-2xl p-6 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono border-b border-white/5 pb-3">
            Add New Script Panel
          </h3>

          <form onSubmit={handleAddPanel} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Setting / Location
              </label>
              <input
                type="text"
                placeholder="EXT. NEW LAGOS — NIGHT"
                value={newSetting}
                onChange={(e) => setNewSetting(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Visual Description
              </label>
              <textarea
                rows={3}
                placeholder="Rain pours over neon towers..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Character Name (Optional)
              </label>
              <input
                type="text"
                placeholder="ARCHER"
                value={newChar}
                onChange={(e) => setNewChar(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Dialogue
              </label>
              <input
                type="text"
                placeholder="You're not supposed to be here."
                value={newDialogue}
                onChange={(e) => setNewDialogue(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold py-2.5 rounded-2xl transition-all cursor-pointer"
            >
              Add Panel to Issue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
