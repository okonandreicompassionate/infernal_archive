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
  relationSuggestions: RelationSuggestion[];
};

type RelationSuggestion = {
  targetName: string;
  targetType: "character" | "team";
  relationType: string;
  description: string;
  confidence: string;
  selected: boolean;
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
  relationSuggestions: [],
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

  const updateRelation = (draftIndex: number, relationIndex: number, patch: Partial<RelationSuggestion>) => {
    setDrafts((current) => current.map((draft, index) => index === draftIndex
      ? { ...draft, relationSuggestions: draft.relationSuggestions.map((relation, indexNow) => indexNow === relationIndex ? { ...relation, ...patch } : relation) }
      : draft));
  };

  const addRelation = (draftIndex: number) => {
    setDrafts((current) => current.map((draft, index) => index === draftIndex
      ? { ...draft, relationSuggestions: [...draft.relationSuggestions, { targetName: "", targetType: "character", relationType: "ALLY_OF", description: "", confidence: "manual", selected: true }] }
      : draft));
  };

  const removeSelectedRelations = (draftIndex: number) => {
    setDrafts((current) => current.map((draft, index) => index === draftIndex
      ? { ...draft, relationSuggestions: draft.relationSuggestions.filter((relation) => relation.selected === false) }
      : draft));
  };

  const deleteSelectedDrafts = () => {
    if (!selected.length) return;
    setDrafts((current) => current.filter((_, index) => !selected.includes(index)));
    setSelected([]);
    setMessage(`${selected.length} draft(s) removed from review.`);
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
      if (!failed) {
        const createdCharacters = await Promise.all(
          results.map((response) => response.json()),
        );
        const [existingCharacters, existingTeams] = await Promise.all([
          fetch("/api/characters").then((response) => response.json()),
          fetch("/api/teams").then((response) => response.json()),
        ]);
        const allCharacters = [
          ...(Array.isArray(existingCharacters) ? existingCharacters : []),
          ...createdCharacters,
        ];
        const relationRequests = selected.flatMap((index, selectedIndex) => {
          const source = createdCharacters[selectedIndex];
          const draft = drafts[index];
          return (draft.relationSuggestions || []).filter((relation) => relation.selected !== false).flatMap((relation) => {
            const targetPool =
              relation.targetType === "team" ? existingTeams : allCharacters;
            const target = (Array.isArray(targetPool) ? targetPool : []).find(
              (candidate: any) =>
                String(candidate.name || "").toLowerCase() ===
                  relation.targetName.toLowerCase() ||
                String(candidate.codeName || "").toLowerCase() ===
                  relation.targetName.toLowerCase(),
            );
            if (!target || !source?.id) return [];
            return [
              {
                source: source.id,
                sourceName: source.name,
                target: target.id,
                targetName: target.name,
                type: relation.relationType,
                description: relation.description,
                canonStatus: "DRAFT",
              },
            ];
          });
        });
        await Promise.all(
          relationRequests.map((relation) =>
            fetch("/api/relationships", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(relation),
            }),
          ),
        );
      }
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={deleteSelectedDrafts}
              disabled={!selected.length || saving}
              className="inline-flex items-center gap-2 bg-red-500/80 text-white rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete selected
            </button>
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
            {draft.relationSuggestions.length > 0 && (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-300">Relationships to review</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => removeSelectedRelations(index)} disabled={!draft.relationSuggestions.some((relation) => relation.selected !== false)} className="text-[10px] text-red-200 disabled:opacity-40">Delete selected</button>
                    <button type="button" onClick={() => addRelation(index)} className="text-[10px] text-cyan-200">+ Add relationship</button>
                  </div>
                </div>
                {draft.relationSuggestions.map((relation, relationIndex) => (
                  <div key={`${relationIndex}-${relation.targetName}`} className="mt-2 grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
                    <input type="checkbox" checked={relation.selected !== false} onChange={(event) => updateRelation(index, relationIndex, { selected: event.target.checked })} className="accent-cyan-400" />
                    <input value={relation.targetName} onChange={(event) => updateRelation(index, relationIndex, { targetName: event.target.value })} placeholder="Character or team name" className="bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-200" />
                    <input value={relation.relationType} onChange={(event) => updateRelation(index, relationIndex, { relationType: event.target.value })} placeholder="ALLY_OF / RIVAL_OF" className="bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-200" />
                    <input value={relation.description} onChange={(event) => updateRelation(index, relationIndex, { description: event.target.value })} placeholder="Why they are connected" className="col-span-2 bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300" />
                    <span className="text-[10px] text-zinc-500">{relation.confidence}</span>
                  </div>
                ))}
              </div>
            )}
            {draft.relationSuggestions.length === 0 && <button type="button" onClick={() => addRelation(index)} className="text-left text-xs text-cyan-300">+ Add a relationship manually</button>}
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
