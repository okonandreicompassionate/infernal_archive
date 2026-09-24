import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Copy,
  Search,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Save,
} from "lucide-react";

export const WriterWorkspace: React.FC = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSetting, setNewSetting] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [canonCheckResult, setCanonCheckResult] = useState<any>(null);
  const [checkingCanon, setCheckingCanon] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [issueDraft, setIssueDraft] = useState({
    issueNumber: "",
    title: "",
    synopsis: "",
    releaseStatus: "WRITING",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [panelNumber, setPanelNumber] = useState(1);
  const [pageNotes, setPageNotes] = useState("");
  const [pageStatus, setPageStatus] = useState("IN_PROGRESS");
  const [dialogueLines, setDialogueLines] = useState([
    { character: "", text: "" },
  ]);
  const [panelType, setPanelType] = useState("Standard");
  const [cameraAngle, setCameraAngle] = useState("Eye-level");
  const [shotNotes, setShotNotes] = useState("");
  const [caption, setCaption] = useState("");
  const [sfx, setSfx] = useState("");
  const [panelStatus, setPanelStatus] = useState("DRAFT");
  const [lineSearch, setLineSearch] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [collapsedPanels, setCollapsedPanels] = useState<string[]>([]);

  const loadScripts = () => {
    setLoading(true);
    fetch("/api/scripts")
      .then((res) => res.json())
      .then((data) => {
        setScripts(data);
        if (!selectedIssueId && data[0]?.issueId)
          setSelectedIssueId(data[0].issueId);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const loadIssues = () =>
    fetch("/api/issues")
      .then((res) => res.json())
      .then((data) => {
        setIssues(data);
        if (!selectedIssueId && data[0]?.id) setSelectedIssueId(data[0].id);
      })
      .catch(console.error);

  const loadCharacters = () =>
    fetch("/api/characters")
      .then((res) => res.json())
      .then((data) => setCharacters(Array.isArray(data) ? data : []))
      .catch(console.error);

  useEffect(() => {
    loadScripts();
    loadIssues();
    loadCharacters();
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setPanelNumber(1);
    setLineSearch("");
  }, [selectedIssueId]);

  useEffect(() => {
    const issue = issues.find((item) => item.id === selectedIssueId);
    if (issue)
      setIssueDraft({
        issueNumber: String(issue.issueNumber || ""),
        title: issue.title || "",
        synopsis: issue.synopsis || "",
        releaseStatus: issue.releaseStatus || "WRITING",
      });
  }, [selectedIssueId, issues]);

  const issueScripts = scripts.filter(
    (script) => script.issueId === selectedIssueId,
  );
  const pages = Array.from(
    new Set(issueScripts.map((script) => Number(script.pageNumber) || 1)),
  ).sort((a, b) => a - b);
  const pageScripts = issueScripts.filter(
    (script) => Number(script.pageNumber) === pageNumber,
  );
  const currentPageNotes = pageScripts[0]?.pageNotes || pageNotes;
  const currentPageStatus = pageScripts[0]?.pageStatus || pageStatus;
  const visiblePageScripts = pageScripts.filter(
    (script) =>
      !lineSearch ||
      JSON.stringify(script).toLowerCase().includes(lineSearch.toLowerCase()),
  );

  const handleCreateIssue = async () => {
    if (creatingIssue) return;
    setCreatingIssue(true);
    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueNumber:
            Math.max(
              0,
              ...issues.map((issue) => Number(issue.issueNumber) || 0),
            ) + 1,
          title: "Untitled issue",
          synopsis: "",
          releaseStatus: "WRITING",
          canonStatus: "DRAFT",
        }),
      });
      if (response.ok) {
        const issue = await response.json();
        setIssues((current) => [...current, issue]);
        setSelectedIssueId(issue.id);
      }
    } finally {
      setCreatingIssue(false);
    }
  };

  const saveIssue = async () => {
    if (!selectedIssueId) return;
    await fetch(`/api/issues/${selectedIssueId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueNumber: Number(issueDraft.issueNumber) || null,
        title: issueDraft.title,
        synopsis: issueDraft.synopsis,
        releaseStatus: issueDraft.releaseStatus,
      }),
    });
    loadIssues();
  };

  const addPage = () => {
    const nextPage = Math.max(0, ...pages) + 1;
    setPageNumber(nextPage);
    setPanelNumber(1);
    setPageNotes("");
    setPageStatus("IN_PROGRESS");
    setDialogueLines([{ character: "", text: "" }]);
  };

  const savePageMeta = async () => {
    if (!pageScripts.length) return;
    await Promise.all(
      pageScripts.map((script) =>
        fetch(`/api/scripts/${script.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageNotes: pageNotes || currentPageNotes,
            pageStatus: pageStatus || currentPageStatus,
          }),
        }),
      ),
    );
    loadScripts();
  };

  const deletePage = async () => {
    if (
      !pageScripts.length ||
      !confirm(
        `Delete page ${pageNumber} and its ${pageScripts.length} panel(s)?`,
      )
    )
      return;
    await Promise.all(
      pageScripts.map((script) =>
        fetch(`/api/scripts/${script.id}`, { method: "DELETE" }),
      ),
    );
    setPageNumber(Math.max(1, pageNumber - 1));
    loadScripts();
  };

  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueId || !newSetting.trim()) return;

    try {
      await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: selectedIssueId,
          pageNumber,
          panelNumber,
          setting: newSetting,
          description: newDesc,
          dialogue: dialogueLines.filter(
            (line) => line.character.trim() || line.text.trim(),
          ),
          narration: "",
          caption,
          sfx,
          artistNote: shotNotes,
          shotNotes,
          panelType,
          cameraAngle,
          panelStatus,
          pageNotes,
          pageStatus,
          editorNote: "Pending review",
        }),
      });
      setNewSetting("");
      setNewDesc("");
      setDialogueLines([{ character: "", text: "" }]);
      setCaption("");
      setSfx("");
      setPanelNumber(
        Math.max(
          0,
          ...pageScripts.map((script) => Number(script.panelNumber) || 0),
          Number(panelNumber) || 0,
        ) + 1,
      );
      setShotNotes("");
      setPageNotes("");
      loadScripts();
    } catch (err) {
      console.error(err);
    }
  };

  const updatePanel = async (
    scriptId: string,
    patch: Record<string, unknown>,
  ) => {
    await fetch(`/api/scripts/${scriptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadScripts();
  };

  const deletePanel = async (scriptId: string) => {
    if (!confirm("Delete this panel?")) return;
    await fetch(`/api/scripts/${scriptId}`, { method: "DELETE" });
    loadScripts();
  };

  const duplicatePanel = async (script: any) => {
    const duplicate = {
      ...script,
      id: undefined,
      panelNumber:
        Math.max(
          0,
          ...pageScripts.map((item) => Number(item.panelNumber) || 0),
        ) + 1,
    };
    delete duplicate.id;
    await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicate),
    });
    loadScripts();
  };

  const movePanel = async (script: any, direction: -1 | 1) => {
    const ordered = [...pageScripts].sort(
      (left, right) => Number(left.panelNumber) - Number(right.panelNumber),
    );
    const currentIndex = ordered.findIndex((item) => item.id === script.id);
    const swapIndex = currentIndex + direction;
    if (currentIndex < 0 || !ordered[swapIndex]) return;
    await Promise.all([
      updatePanel(script.id, { panelNumber: ordered[swapIndex].panelNumber }),
      updatePanel(ordered[swapIndex].id, { panelNumber: script.panelNumber }),
    ]);
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
        <button
          type="button"
          onClick={() => setFocusMode((current) => !current)}
          className="border border-white/10 text-zinc-300 px-3 py-2.5 rounded-2xl text-xs"
        >
          <Maximize2 className="inline w-3.5 h-3.5 mr-1" />{" "}
          {focusMode ? "Exit focus" : "Focus mode"}
        </button>
      </div>

      {!focusMode && (
        <section className="writer-issue-controls bg-zinc-900/70 border border-white/5 p-4 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedIssueId}
              onChange={(event) => setSelectedIssueId(event.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              <option value="">Select issue</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  Issue #{issue.issueNumber || "?"} — {issue.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreateIssue}
              disabled={creatingIssue}
              className="bg-yellow-400 text-zinc-950 px-3 py-2 rounded-2xl text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="inline w-3.5 h-3.5 mr-1" /> New issue
            </button>
            <input
              value={issueDraft.issueNumber}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  issueNumber: event.target.value,
                }))
              }
              placeholder="Issue #"
              className="w-20 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            />
            <input
              value={issueDraft.title}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Issue title"
              className="flex-1 min-w-40 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            />
            <select
              value={issueDraft.releaseStatus}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  releaseStatus: event.target.value,
                }))
              }
              className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              <option>WRITING</option>
              <option>READY_FOR_ART</option>
              <option>FINAL</option>
            </select>
            <button
              type="button"
              onClick={saveIssue}
              disabled={!selectedIssueId}
              className="border border-white/10 text-zinc-200 px-3 py-2 rounded-2xl text-xs"
            >
              Save issue
            </button>
          </div>
          <textarea
            value={issueDraft.synopsis}
            onChange={(event) =>
              setIssueDraft((current) => ({
                ...current,
                synopsis: event.target.value,
              }))
            }
            placeholder="Issue summary and arc notes"
            rows={2}
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
          />
        </section>
      )}

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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
              {selectedIssueId
                ? `Issue #${issueDraft.issueNumber || "?"} — ${issueDraft.title || "Page & Panel Breakdown"}`
                : "Select an issue to begin"}
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {issueScripts.length} Panels ·{" "}
              {issueScripts.reduce(
                (count, script) => count + (script.dialogue?.length || 0),
                0,
              )}{" "}
              lines
            </span>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={lineSearch}
              onChange={(event) => setLineSearch(event.target.value)}
              placeholder="Find a character or line..."
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {pages.map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => setPageNumber(page)}
                className={
                  pageNumber === page
                    ? "bg-yellow-400 text-zinc-950 px-3 py-1.5 rounded-lg text-xs"
                    : "bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-lg text-xs"
                }
              >
                Page {page}
              </button>
            ))}
            <button
              type="button"
              onClick={addPage}
              className="border border-white/10 text-zinc-300 px-3 py-1.5 rounded-lg text-xs"
            >
              <Plus className="inline w-3 h-3 mr-1" /> Page
            </button>
            <button
              type="button"
              onClick={deletePage}
              className="text-red-300 px-3 py-1.5 rounded-lg text-xs"
            >
              <Trash2 className="inline w-3 h-3 mr-1" /> Delete page
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_auto] gap-2 items-end">
            <label className="text-xs text-zinc-400">
              Page number
              <input
                type="number"
                min={1}
                value={pageNumber}
                onChange={(event) =>
                  setPageNumber(Math.max(1, Number(event.target.value) || 1))
                }
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Page status
              <select
                value={currentPageStatus}
                onChange={(event) => setPageStatus(event.target.value)}
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              >
                <option>IN_PROGRESS</option>
                <option>DONE</option>
                <option>NEEDS_ART</option>
              </select>
            </label>
            <button
              type="button"
              onClick={savePageMeta}
              disabled={!pageScripts.length}
              className="border border-white/10 text-zinc-200 px-3 py-2 rounded-2xl text-xs disabled:opacity-40"
            >
              <Save className="inline w-3.5 h-3.5 mr-1" /> Save page
            </button>
          </div>
          <textarea
            value={pageNotes || currentPageNotes}
            onChange={(event) => setPageNotes(event.target.value)}
            placeholder={`Page ${pageNumber} notes: pacing, splash page, visual rhythm...`}
            rows={2}
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
          />

          <div className="space-y-4">
            {visiblePageScripts.map((script, idx) => (
              <div
                key={script.id || idx}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold bg-yellow-400 text-zinc-950 px-2.5 py-0.5 rounded font-mono">
                      PAGE {script.pageNumber}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={script.panelNumber}
                      onChange={(event) =>
                        setScripts((current) =>
                          current.map((item) =>
                            item.id === script.id
                              ? {
                                  ...item,
                                  panelNumber: Number(event.target.value) || 1,
                                }
                              : item,
                          ),
                        )
                      }
                      onBlur={(event) =>
                        updatePanel(script.id, {
                          panelNumber: Number(event.target.value) || 1,
                        })
                      }
                      className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 font-mono"
                      aria-label="Panel number"
                    />
                    <span className="text-xs font-semibold text-zinc-300 font-mono">
                      · {script.panelType || "Standard"} ·{" "}
                      {script.panelStatus || "DRAFT"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => movePanel(script, -1)}
                      title="Move panel up"
                      className="p-1 text-zinc-500 hover:text-yellow-300"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePanel(script, 1)}
                      title="Move panel down"
                      className="p-1 text-zinc-500 hover:text-yellow-300"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicatePanel(script)}
                      title="Duplicate panel"
                      className="p-1 text-zinc-500 hover:text-yellow-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePanel(script.id)}
                      title="Delete panel"
                      className="p-1 text-zinc-500 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedPanels((current) =>
                          current.includes(script.id)
                            ? current.filter((id) => id !== script.id)
                            : [...current, script.id],
                        )
                      }
                      title="Collapse panel"
                      className="p-1 text-zinc-500 hover:text-zinc-200"
                    >
                      {collapsedPanels.includes(script.id) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {!collapsedPanels.includes(script.id) && (
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-400 font-mono">
                      {script.setting}
                    </p>
                    <p className="text-xs text-zinc-300 font-serif leading-relaxed italic">
                      "{script.description}"
                    </p>
                    {script.caption && (
                      <p className="text-xs text-zinc-400">
                        Caption: {script.caption}
                      </p>
                    )}
                    {script.shotNotes && (
                      <p className="text-xs text-zinc-400">
                        Shot notes: {script.shotNotes}
                      </p>
                    )}
                  </div>
                )}

                {!collapsedPanels.includes(script.id) &&
                  script.dialogue?.length > 0 && (
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

                {!collapsedPanels.includes(script.id) && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/5">
                    <span>
                      SFX:{" "}
                      <strong className="text-zinc-300">{script.sfx}</strong>
                    </span>
                    <span>
                      Artist Note:{" "}
                      <strong className="text-zinc-300">
                        {script.artistNote}
                      </strong>
                    </span>
                  </div>
                )}
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
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Panel number
                <input
                  type="number"
                  min={1}
                  value={panelNumber}
                  onChange={(event) =>
                    setPanelNumber(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Panel type
                <select
                  value={panelType}
                  onChange={(event) => setPanelType(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                >
                  <option>Standard</option>
                  <option>Wide</option>
                  <option>Close-up</option>
                  <option>Splash</option>
                  <option>Establishing</option>
                  <option>Insert</option>
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Camera angle
                <select
                  value={cameraAngle}
                  onChange={(event) => setCameraAngle(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                >
                  <option>Eye-level</option>
                  <option>Low</option>
                  <option>High</option>
                  <option>Bird's-eye</option>
                  <option>Dutch</option>
                </select>
              </label>
            </div>
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

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Caption / narration
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl p-2 text-xs text-zinc-200"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Shot notes for artist
                <textarea
                  rows={2}
                  value={shotNotes}
                  onChange={(event) => setShotNotes(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl p-2 text-xs text-zinc-200"
                />
              </label>
            </div>

            <label className="text-xs text-zinc-400">
              SFX
              <input
                value={sfx}
                onChange={(event) => setSfx(event.target.value)}
                placeholder="BAM! KRAKOOM!"
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </label>

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

            <label className="text-xs text-zinc-400">
              Panel status
              <select
                value={panelStatus}
                onChange={(event) => setPanelStatus(event.target.value)}
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              >
                <option>DRAFT</option>
                <option>REVISED</option>
                <option>LOCKED</option>
              </select>
            </label>

            <div className="space-y-2 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium">
                    Characters & dialogue
                  </label>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    Add one row per speaker in this panel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDialogueLines((current) => [
                      ...current,
                      { character: "", text: "" },
                    ])
                  }
                  className="whitespace-nowrap text-xs text-yellow-400"
                >
                  <Plus className="inline w-3 h-3 mr-1" /> Add character
                </button>
              </div>
              {dialogueLines.map((line, index) => (
                <div
                  className="grid grid-cols-[0.7fr_1.3fr_auto] gap-2"
                  key={index}
                >
                  <input
                    value={line.character}
                    onChange={(event) =>
                      setDialogueLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, character: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Character"
                    className="bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                  />
                  <input
                    value={line.text}
                    onChange={(event) =>
                      setDialogueLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, text: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Dialogue line"
                    className="bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDialogueLines((current) =>
                        current.length === 1
                          ? [{ character: "", text: "" }]
                          : current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                      )
                    }
                    className="px-2 text-zinc-500 hover:text-red-300"
                    aria-label={`Remove character ${index + 1}`}
                    title="Remove character"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <datalist id="writer-character-options">
                {characters.map((character) => (
                  <option
                    key={character.id}
                    value={character.codeName || character.name}
                  >
                    {character.name}
                  </option>
                ))}
              </datalist>
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
