import React, { useEffect, useMemo, useState } from "react";
import { Download, ImagePlus, Layers, Save, Trash2 } from "lucide-react";
import { uploadArchiveImage } from "../utils/supabase";

export const ArtistWorkspace: React.FC = () => {
  const [artwork, setArtwork] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [artworkPage, setArtworkPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingPanelId, setSavingPanelId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [artworkDraft, setArtworkDraft] = useState({
    title: "",
    artist: "",
    version: "1.0",
    stage: "SKETCH",
    notes: "",
    entityId: "",
    issueId: "",
    pageNumber: "",
    panelNumber: "",
    approvalStatus: "SKETCH",
    file: null as File | null,
  });

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch("/api/artwork"),
        fetch("/api/scripts"),
        fetch("/api/issues"),
      ]);
      const data = await Promise.all(
        responses.map((response) => response.json()),
      );
      setArtwork(Array.isArray(data[0]) ? data[0] : []);
      setScripts(Array.isArray(data[1]) ? data[1] : []);
      const nextIssues = Array.isArray(data[2]) ? data[2] : [];
      setIssues(nextIssues);
      if (!selectedIssueId && nextIssues[0]?.id)
        setSelectedIssueId(nextIssues[0].id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);
  useEffect(() => {
    setPageNumber(1);
  }, [selectedIssueId]);

  const issueScripts = useMemo(
    () =>
      scripts
        .filter((script) => script.issueId === selectedIssueId)
        .sort((a, b) => Number(a.panelNumber) - Number(b.panelNumber)),
    [scripts, selectedIssueId],
  );
  const pages = Array.from(
    new Set(issueScripts.map((script) => Number(script.pageNumber) || 1)),
  ).sort((a, b) => a - b);
  const pageScripts = issueScripts.filter(
    (script) => Number(script.pageNumber) === pageNumber,
  );
  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId);
  const artworkPageSize = 6;
  const artworkPageCount = Math.max(
    1,
    Math.ceil(artwork.length / artworkPageSize),
  );
  const visibleArtwork = artwork.slice(
    (artworkPage - 1) * artworkPageSize,
    artworkPage * artworkPageSize,
  );

  const updateScript = (scriptId: string, patch: Record<string, unknown>) => {
    setScripts((current) =>
      current.map((script) =>
        script.id === scriptId ? { ...script, ...patch } : script,
      ),
    );
  };

  const savePanel = async (script: any) => {
    setSavingPanelId(script.id);
    try {
      await fetch(`/api/scripts/${script.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelStatus: script.panelStatus || "DRAFT",
          shotNotes: script.shotNotes || "",
          artistNote: script.artistNote || script.shotNotes || "",
          cameraAngle: script.cameraAngle || "Eye-level",
        }),
      });
      await loadWorkspace();
    } finally {
      setSavingPanelId(null);
    }
  };

  const createArtwork = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!artworkDraft.file || !artworkDraft.title.trim() || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      const upload = await uploadArchiveImage(artworkDraft.file, "artwork");
      if (upload.error || !upload.url)
        throw upload.error || new Error("Image upload failed.");
      const response = await fetch("/api/artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: artworkDraft.title,
          artist: artworkDraft.artist,
          version: artworkDraft.version,
          stage: artworkDraft.stage,
          notes: artworkDraft.notes,
          entityId: artworkDraft.entityId,
          issueId: artworkDraft.issueId || selectedIssueId,
          pageNumber: Number(artworkDraft.pageNumber) || null,
          panelNumber: Number(artworkDraft.panelNumber) || null,
          approvalStatus: artworkDraft.approvalStatus,
          entityType: "script-panel",
          url: upload.url,
          canonStatus: "DRAFT",
        }),
      });
      if (!response.ok) throw new Error("Artwork record could not be saved.");
      setArtworkDraft({
        title: "",
        artist: "",
        version: "1.0",
        stage: "SKETCH",
        notes: "",
        entityId: "",
        issueId: "",
        pageNumber: "",
        panelNumber: "",
        approvalStatus: "SKETCH",
        file: null,
      });
      await loadWorkspace();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Artwork upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteArtwork = async (id: string) => {
    if (!confirm("Delete this artwork record?")) return;
    await fetch(`/api/artwork/${id}`, { method: "DELETE" });
    loadWorkspace();
  };

  const updateArtworkStatus = async (art: any, approvalStatus: string) => {
    await fetch(`/api/artwork/${art.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...art, approvalStatus }),
    });
    loadWorkspace();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-xs">
        Loading Artist Reference System...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
            Artist Studio & Character Reference System
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Turn each written panel into a visual brief, then keep sketches and
            final assets attached to the story.
          </p>
        </div>
        <Layers className="w-6 h-6 text-yellow-400" />
      </header>

      <section className="bg-zinc-900/70 border border-white/5 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
              Panel reference board
            </p>
            <h2 className="text-lg font-bold text-zinc-100 mt-1">
              {selectedIssue
                ? `Issue #${selectedIssue.issueNumber || "?"} · ${selectedIssue.title}`
                : "Choose an issue"}
            </h2>
          </div>
          <select
            value={selectedIssueId}
            onChange={(event) => setSelectedIssueId(event.target.value)}
            className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
          >
            <option value="">Select issue</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                Issue #{issue.issueNumber || "?"} — {issue.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {pages.map((page) => (
            <button
              type="button"
              key={page}
              onClick={() => setPageNumber(page)}
              className={
                page === pageNumber
                  ? "bg-yellow-400 text-zinc-950 px-3 py-1.5 rounded-lg text-xs"
                  : "bg-zinc-950 text-zinc-400 px-3 py-1.5 rounded-lg text-xs"
              }
            >
              Page {page}
            </button>
          ))}
          {!pages.length && (
            <p className="text-xs text-zinc-500">
              No written panels exist for this issue yet.
            </p>
          )}
        </div>
        <div className="space-y-4">
          {pageScripts.map((script) => (
            <article
              key={script.id}
              className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-yellow-400 text-zinc-950 px-2 py-1 rounded">
                    PANEL {script.panelNumber}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {script.panelType || "Standard"} ·{" "}
                    {script.cameraAngle || "Eye-level"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => savePanel(script)}
                  disabled={savingPanelId === script.id}
                  className="inline-flex items-center gap-1 border border-yellow-400/30 bg-yellow-400/10 text-yellow-200 px-2.5 py-1.5 rounded-lg text-[10px] disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  {savingPanelId === script.id ? "Saving" : "Save panel"}
                </button>
              </div>
              <p className="text-xs text-yellow-300 font-mono">
                {script.setting || "Unspecified setting"}
              </p>
              <p className="text-sm text-zinc-200 leading-relaxed">
                {script.description || "No visual description supplied."}
              </p>
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                    Characters & dialogue
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {script.dialogue?.length || 0} lines
                  </span>
                </div>
                {(script.dialogue || []).map((line: any, index: number) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(6rem,0.7fr)_minmax(0,1.3fr)] gap-2"
                  >
                    <span className="text-xs font-semibold text-yellow-200">
                      {line.character || "Unassigned"}
                    </span>
                    <span className="text-xs text-zinc-300">
                      {line.text || "No dialogue"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                <textarea
                  rows={2}
                  value={script.shotNotes || script.artistNote || ""}
                  onChange={(event) =>
                    updateScript(script.id, {
                      shotNotes: event.target.value,
                      artistNote: event.target.value,
                    })
                  }
                  placeholder="Artist direction: framing, costume, lighting, expression, props..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
                />
                <select
                  value={script.panelStatus || "DRAFT"}
                  onChange={(event) =>
                    updateScript(script.id, { panelStatus: event.target.value })
                  }
                  className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
                >
                  <option>DRAFT</option>
                  <option>NEEDS_REFERENCE</option>
                  <option>IN_PROGRESS</option>
                  <option>READY_FOR_REVIEW</option>
                  <option>LOCKED</option>
                </select>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
              Asset library
            </p>
            <h2 className="text-lg font-bold text-zinc-100 mt-1">
              Sketches and finished art
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {visibleArtwork.map((art) => (
              <article
                key={art.id}
                className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-lg"
              >
                <div className="h-56 bg-zinc-950 relative">
                  <img
                    src={art.url}
                    alt={art.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border bg-zinc-950/80 text-yellow-200 border-yellow-400/30">
                    {art.approvalStatus || art.stage}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-[10px] text-yellow-400 font-mono">
                    <span>{art.artist || "Uncredited"}</span>
                    <span>v{art.version || "1.0"}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    {art.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {art.notes}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {art.issueId
                      ? `Issue link: ${art.issueId}`
                      : "Unlinked asset"}
                    {art.pageNumber ? ` · Page ${art.pageNumber}` : ""}
                    {art.panelNumber ? ` · Panel ${art.panelNumber}` : ""}
                  </p>
                  <select
                    value={art.approvalStatus || "SKETCH"}
                    onChange={(event) =>
                      updateArtworkStatus(art, event.target.value)
                    }
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
                  >
                    <option>SKETCH</option>
                    <option>REVIEW</option>
                    <option>REVISION</option>
                    <option>APPROVED</option>
                  </select>
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                  <a
                    href={art.url}
                    download={art.title || "artwork"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-yellow-400"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Open asset
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteArtwork(art.id)}
                    className="text-zinc-500 hover:text-red-300"
                    title="Delete artwork"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {artwork.length > artworkPageSize && (
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-[10px] text-zinc-500 font-mono">
                Page {artworkPage} of {artworkPageCount}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={artworkPage === 1}
                  onClick={() =>
                    setArtworkPage((current) => Math.max(1, current - 1))
                  }
                  className="border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={artworkPage === artworkPageCount}
                  onClick={() =>
                    setArtworkPage((current) =>
                      Math.min(artworkPageCount, current + 1),
                    )
                  }
                  className="border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        <form
          onSubmit={createArtwork}
          className="bg-zinc-900/70 border border-white/5 rounded-2xl p-5 space-y-3"
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
              New asset
            </p>
            <h2 className="text-sm font-bold text-zinc-100 mt-1">
              Add artwork to the library
            </h2>
          </div>
          <input
            required
            value={artworkDraft.title}
            onChange={(event) =>
              setArtworkDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Asset title"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
          />
          <input
            value={artworkDraft.artist}
            onChange={(event) =>
              setArtworkDraft((current) => ({
                ...current,
                artist: event.target.value,
              }))
            }
            placeholder="Artist name"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={artworkDraft.stage}
              onChange={(event) =>
                setArtworkDraft((current) => ({
                  ...current,
                  stage: event.target.value,
                }))
              }
              className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
            >
              <option>SKETCH</option>
              <option>ROUGH</option>
              <option>COLOR</option>
              <option>OFFICIAL</option>
            </select>
            <input
              value={artworkDraft.version}
              onChange={(event) =>
                setArtworkDraft((current) => ({
                  ...current,
                  version: event.target.value,
                }))
              }
              placeholder="Version"
              className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
            />
          </div>
          <input
            value={artworkDraft.entityId}
            onChange={(event) =>
              setArtworkDraft((current) => ({
                ...current,
                entityId: event.target.value,
              }))
            }
            placeholder="Panel or character ID (optional)"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={artworkDraft.issueId || selectedIssueId}
              onChange={(event) =>
                setArtworkDraft((current) => ({
                  ...current,
                  issueId: event.target.value,
                }))
              }
              className="bg-zinc-950 border border-white/10 rounded-xl px-2 py-2 text-xs text-zinc-200"
            >
              <option value="">Issue link</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  #{issue.issueNumber || "?"}
                </option>
              ))}
            </select>
            <input
              value={artworkDraft.pageNumber}
              onChange={(event) =>
                setArtworkDraft((current) => ({
                  ...current,
                  pageNumber: event.target.value,
                }))
              }
              placeholder="Page"
              className="bg-zinc-950 border border-white/10 rounded-xl px-2 py-2 text-xs text-zinc-200"
            />
            <input
              value={artworkDraft.panelNumber}
              onChange={(event) =>
                setArtworkDraft((current) => ({
                  ...current,
                  panelNumber: event.target.value,
                }))
              }
              placeholder="Panel"
              className="bg-zinc-950 border border-white/10 rounded-xl px-2 py-2 text-xs text-zinc-200"
            />
          </div>
          <select
            value={artworkDraft.approvalStatus}
            onChange={(event) =>
              setArtworkDraft((current) => ({
                ...current,
                approvalStatus: event.target.value,
              }))
            }
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
          >
            <option>SKETCH</option>
            <option>REVIEW</option>
            <option>REVISION</option>
            <option>APPROVED</option>
          </select>
          <textarea
            rows={3}
            value={artworkDraft.notes}
            onChange={(event) =>
              setArtworkDraft((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            placeholder="Reference notes, palette, costume version..."
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
          />
          <label className="flex items-center gap-2 border border-dashed border-white/15 rounded-xl px-3 py-3 text-xs text-zinc-400 cursor-pointer">
            <ImagePlus className="w-4 h-4 text-yellow-400" />
            {artworkDraft.file ? artworkDraft.file.name : "Choose image"}
            <input
              required
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) =>
                setArtworkDraft((current) => ({
                  ...current,
                  file: event.target.files?.[0] || null,
                }))
              }
              className="sr-only"
            />
          </label>
          {uploadError && <p className="text-xs text-red-300">{uploadError}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="w-full inline-flex justify-center items-center gap-2 bg-yellow-400 text-zinc-950 rounded-xl px-3 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            {uploading ? "Uploading..." : "Save artwork"}
          </button>
        </form>
      </section>
    </div>
  );
};
