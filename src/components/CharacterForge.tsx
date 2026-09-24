import React, { useState } from "react";
import { Check, FileText, Sparkles, Trash2, Upload } from "lucide-react";

type DraftCharacter = {
  name: string;
  codeName: string;
  species: string;
  height: string;
  occupation: string;
  description: string;
  origin: string;
  majorAbilities: string;
  secondaryAbilities: string;
  weaknesses: string;
  personality: string;
  appearance: string;
  affiliation: string;
  currentStatus: string;
  suggestions: string[];
};

const emptyDraft: DraftCharacter = {
  name: "",
  codeName: "",
  species: "",
  height: "",
  occupation: "",
  description: "",
  origin: "",
  majorAbilities: "",
  secondaryAbilities: "",
  weaknesses: "",
  personality: "",
  appearance: "",
  affiliation: "",
  currentStatus: "DRAFT",
  suggestions: [],
};

const fields: Array<[keyof DraftCharacter, string]> = [
  ["name", "Name"],
  ["codeName", "Code name / alias"],
  ["species", "Species"],
  ["height", "Height / build"],
  ["occupation", "Occupation"],
  ["affiliation", "Affiliation"],
  ["description", "Summary"],
  ["origin", "Origin"],
  ["appearance", "Appearance"],
  ["personality", "Personality"],
  ["majorAbilities", "Major abilities"],
  ["secondaryAbilities", "Secondary abilities"],
  ["weaknesses", "Weaknesses"],
];

export const CharacterForge: React.FC = () => {
  const [rawText, setRawText] = useState("");
  const [drafts, setDrafts] = useState<DraftCharacter[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const updateDraft = (
    index: number,
    key: keyof DraftCharacter,
    value: string,
  ) => {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, [key]: value } : draft,
      ),
    );
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setRawText(await file.text());
  };

  const generateDrafts = async () => {
    if (!rawText.trim() || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/ai/character-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Draft generation failed.");
      const generated = Array.isArray(data.characters) ? data.characters : [];
      setDrafts(generated.length ? generated : [emptyDraft]);
      setSelected(generated.map((_: DraftCharacter, index: number) => index));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Draft generation failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const approveSelected = async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const results = await Promise.all(
        selected.map((index) => {
          const draft = drafts[index];
          return fetch("/api/characters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...draft,
              canonStatus: "DRAFT",
              currentStatus: draft.currentStatus || "DRAFT",
              majorAbilities: draft.majorAbilities,
              secondaryAbilities: draft.secondaryAbilities,
              description: draft.description,
            }),
          });
        }),
      );
      const failed = results.filter((response) => !response.ok).length;
      setMessage(
        failed
          ? `${failed} draft(s) could not be saved.`
          : `${selected.length} character draft(s) saved to the archive.`,
      );
      if (!failed) {
        setDrafts((current) =>
          current.filter((_, index) => !selected.includes(index)),
        );
        setSelected([]);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Drafts could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 pb-10 space-y-5">
      <div className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-bold text-zinc-100">Character Forge</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Paste one idea or a raw file of characters. AI drafts them for review;
          nothing becomes canon automatically.
        </p>
      </div>

      <div className="bg-zinc-900/70 border border-white/5 rounded-2xl p-4 space-y-3">
        <textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          rows={8}
          placeholder="Rylan is a cosmic star entity...\n\nDark Dwarf: former engineer, distrusts empires..."
          className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Upload .txt / .md
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => handleFile(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={generateDrafts}
            disabled={loading || !rawText.trim()}
            className="inline-flex items-center gap-2 bg-yellow-400 text-zinc-950 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Drafting..." : "Generate drafts"}
          </button>
          <span className="text-[10px] text-zinc-500">
            Review and edit before saving.
          </span>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">
            {drafts.length} draft(s) ready · {selected.length} selected
          </span>
          <button
            type="button"
            onClick={approveSelected}
            disabled={!selected.length || saving}
            className="inline-flex items-center gap-2 bg-emerald-400 text-zinc-950 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Approve selected as drafts"}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {drafts.map((draft, index) => (
          <article
            key={`${draft.name}-${index}`}
            className="bg-zinc-900/70 border border-white/5 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={selected.includes(index)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(index)
                        ? current.filter((item) => item !== index)
                        : [...current, index],
                    )
                  }
                  className="accent-yellow-400"
                />{" "}
                Include draft
              </label>
              <button
                type="button"
                onClick={() => {
                  setDrafts((current) =>
                    current.filter((_, item) => item !== index),
                  );
                  setSelected((current) =>
                    current.filter((item) => item !== index),
                  );
                }}
                className="text-zinc-500 hover:text-red-300"
                title="Remove draft"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fields.map(([key, label]) => (
                <label
                  key={key}
                  className="text-[10px] uppercase tracking-wide text-zinc-500"
                >
                  {label}
                  {[
                    "description",
                    "origin",
                    "appearance",
                    "personality",
                    "majorAbilities",
                    "secondaryAbilities",
                    "weaknesses",
                  ].includes(key) ? (
                    <textarea
                      rows={2}
                      value={String(draft[key] || "")}
                      onChange={(event) =>
                        updateDraft(index, key, event.target.value)
                      }
                      className="mt-1 w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs normal-case tracking-normal text-zinc-200"
                    />
                  ) : (
                    <input
                      value={String(draft[key] || "")}
                      onChange={(event) =>
                        updateDraft(index, key, event.target.value)
                      }
                      className="mt-1 w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs normal-case tracking-normal text-zinc-200"
                    />
                  )}
                </label>
              ))}
            </div>
            {draft.suggestions.length > 0 && (
              <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-yellow-300">
                  AI suggestions to review
                </p>
                {draft.suggestions.map((suggestion) => (
                  <p key={suggestion} className="mt-1 text-xs text-zinc-300">
                    {suggestion}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      {message && <p className="text-xs text-yellow-200">{message}</p>}
      {drafts.length === 0 && (
        <div className="text-center text-xs text-zinc-500 py-8">
          <FileText className="w-5 h-5 mx-auto mb-2" />
          Generated drafts will appear here for approval.
        </div>
      )}
    </section>
  );
};
