import React, { useState, useEffect, useRef } from "react";
import ReactFlow, { Background, Controls, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import {
  X,
  Shield,
  Globe,
  Users,
  BookOpen,
  Sword,
  Zap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Plus,
  History,
  Trash2,
  FileText,
  Network,
  List,
  RotateCcw,
  Bot,
  Upload,
  Pencil,
  Save,
  Download,
  ArrowLeft,
} from "lucide-react";
import { authorizedFetch, uploadArchiveImage } from "../utils/supabase";
import { getEntityDescription } from "../utils/entitySummary";
import { speciesOptions } from "./QuickCreateModal";

interface EntityDetailModalProps {
  entityType: string;
  entityId: string;
  onClose: () => void;
  onSelectRelated: (type: string, id: string) => void;
}

export const EntityDetailModal: React.FC<EntityDetailModalProps> = ({
  entityType,
  entityId,
  onClose,
  onSelectRelated,
}) => {
  const [item, setItem] = useState<any>(null);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("ALLY_OF");
  const [newRelDesc, setNewRelDesc] = useState("");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [retcons, setRetcons] = useState<any[]>([]);
  const [allCharacters, setAllCharacters] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [linkedScripts, setLinkedScripts] = useState<any[]>([]);
  const [uploadingFinalComic, setUploadingFinalComic] = useState(false);
  const [relViewMode, setRelViewMode] = useState<"list" | "map">("list");
  const [modalTab, setModalTab] = useState<"details" | "moodboard" | "history">(
    "details",
  );

  const [moodPrompt, setMoodPrompt] = useState("");
  const [moodCategory, setMoodCategory] = useState("AESTHETIC");
  const [generatingMood, setGeneratingMood] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Record<string, string>>({});
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [showSpecies, setShowSpecies] = useState(false);
  // Guards every save/add/revert action below from firing twice on a rapid double-click.
  const [actionPending, setActionPending] = useState(false);
  const profileEditorRef = useRef<HTMLDivElement>(null);

  const asArray = (value: unknown): string[] => {
    if (Array.isArray(value))
      return value.map((entry) => String(entry).trim()).filter(Boolean);
    if (typeof value === "string") {
      return value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  };

  const normalizeCharacterListValue = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getFieldValue = (record: any, key: string) => {
    if (!record) return undefined;
    if (record[key] !== undefined) return record[key];
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`,
    );
    if (record[snakeKey] !== undefined) return record[snakeKey];
    return undefined;
  };

  const normalizeCharacterPayload = (record: Record<string, any>) => {
    const next = { ...record };
    for (const key of [
      "powers",
      "skills",
      "weaknesses",
      "equipment",
      "friends",
      "family",
      "aliases",
      "members",
      "formerMembers",
      "allies",
      "enemies",
    ]) {
      const rawValue = next[key];
      if (rawValue === undefined || rawValue === null) continue;
      next[key] = normalizeCharacterListValue(rawValue);
    }
    return next;
  };

  const editableCharacterFields = [
    ["codeName", "Code name / alias"],
    ["species", "Species / race"],
    ["hair", "Hair color"],
    ["eyes", "Eye color"],
    ["height", "Height / build"],
    ["occupation", "Occupation"],
    ["affiliation", "Affiliation"],
    ["positionRole", "Position / role"],
    ["romanticInterests", "Romantic interests / partners"],
    ["enemiesRivals", "Enemies & rivals"],
    ["primaryEnergySource", "Primary energy / power source"],
    ["majorAbilities", "Major abilities"],
    ["secondaryAbilities", "Secondary abilities"],
    ["signatureTechniques", "Signature techniques"],
    ["powers", "Powers"],
    ["skills", "Skills"],
    ["positiveTraits", "Positive traits"],
    ["negativeTraits", "Negative traits"],
    ["quirksHabits", "Quirks & habits"],
    ["physicalAppearance", "Physical appearance"],
    ["description", "Description / lore summary"],
    ["centralThemes", "Central themes"],
    ["corePhilosophy", "Core philosophy"],
    ["signatureQuote", "Signature quote"],
    ["battlePhilosophy", "Battle philosophy"],
    ["characterArc", "Character arc"],
    ["heroicVillainousLegacy", "Heroic / villainous legacy"],
  ] as const;

  const editableSpeciesFields = [
    ["category", "Category"],
    ["status", "Status"],
    ["homePlanet", "Homeworld"],
    ["primaryLocations", "Primary locations"],
    ["lifespan", "Lifespan"],
    ["population", "Population"],
    ["language", "Language(s)"],
    ["government", "Government"],
    ["technologyLevel", "Technology level"],
    ["overview", "Overview"],
    ["appearance", "Appearance"],
    ["physiology", "Physiology"],
    ["lifecycleReproduction", "Lifecycle & reproduction"],
    ["diet", "Diet"],
    ["innateAbilities", "Innate abilities"],
    ["learnedEnhanced", "Learned / enhanced"],
    ["limitationsWeaknesses", "Limitations & weaknesses"],
    ["culture", "Customs & values"],
    ["governmentStructure", "Government & structure"],
    ["technology", "Technology"],
    ["notableFactions", "Notable factions"],
    ["origins", "Origins"],
    ["majorEvents", "Major events"],
    ["currentStatus", "Current status"],
    ["notableIndividuals", "Notable individuals"],
    ["trivia", "Trivia"],
    ["seeAlso", "See also"],
    ["notesReferences", "Notes & references"],
  ] as const;

  const endpointMap: Record<string, string> = {
    characters: "characters",
    species: "species",
    teams: "teams",
    planets: "planets",
    locations: "locations",
    powers: "powers",
    artifacts: "artifacts",
    events: "events",
    issues: "issues",
  };

  const apiPath = endpointMap[entityType] || "characters";

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/${apiPath}`).then((res) => res.json()),
      fetch(`/api/relationships`).then((res) => res.json()),
      fetch(`/api/comments`).then((res) => res.json()),
      fetch(`/api/retcons`).then((res) => res.json()),
      fetch(`/api/characters`).then((res) => res.json()),
      fetch(`/api/teams`).then((res) => res.json()),
      entityType === "issues"
        ? fetch(`/api/scripts`).then((res) => res.json())
        : Promise.resolve([]),
    ])
      .then(
        ([
          allItems,
          allRels,
          allComments,
          allRetcons,
          chars,
          teams,
          allScripts,
        ]) => {
          const found = allItems.find((i: any) => i.id === entityId);
          setItem(found);
          setRelationships(
            allRels.filter(
              (r: any) => r.source === entityId || r.target === entityId,
            ),
          );
          setComments(allComments.filter((c: any) => c.targetId === entityId));
          setRetcons(allRetcons.filter((rc: any) => rc.entityId === entityId));
          setAllCharacters(chars);
          setAllTeams(teams);
          setLinkedScripts(
            (Array.isArray(allScripts) ? allScripts : []).filter(
              (s: any) => s.issueId === entityId,
            ),
          );
          setLoading(false);
        },
      )
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [entityId, entityType]);

  const handleGenerateMoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingMood(true);
    try {
      const res = await fetch("/api/ai/generate-moodboard-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: title,
          prompt: moodPrompt,
          category: moodCategory,
        }),
      });
      const newItem = await res.json();
      const currentMoodBoard = item.moodBoard || [
        {
          id: "mood-init",
          title: "Neon Urban Hideout",
          url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
          category: "ENVIRONMENT",
          prompt: "Initial atmosphere reference",
        },
      ];
      const updatedMoodBoard = [newItem, ...currentMoodBoard];

      const updateRes = await fetch(`/api/${apiPath}/${entityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, moodBoard: updatedMoodBoard }),
      });

      if (updateRes.ok) {
        setMoodPrompt("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingMood(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !item) return;
    setUploadingImage(true);
    const upload = await uploadArchiveImage(file, entityType);
    if (upload.error) {
      alert(upload.error.message);
      setUploadingImage(false);
      return;
    }
    const imageField =
      entityType === "characters"
        ? "portrait"
        : entityType === "teams"
          ? "logo"
          : entityType === "issues"
            ? "cover"
            : "image";
    const response = await fetch(`/api/${apiPath}/${entityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [imageField]: upload.url }),
    });
    if (response.ok) loadData();
    setUploadingImage(false);
  };

  const handleFinalComicUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !item) return;
    setUploadingFinalComic(true);
    const upload = await uploadArchiveImage(file, "final-comics");
    if (upload.error) {
      alert(upload.error.message);
      setUploadingFinalComic(false);
      return;
    }
    const response = await fetch(`/api/${apiPath}/${entityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalFileUrl: upload.url,
        finalFileName: file.name,
        finalFileType: file.type.startsWith("image/")
          ? "image"
          : file.type === "application/pdf"
            ? "pdf"
            : "file",
      }),
    });
    if (response.ok) loadData();
    setUploadingFinalComic(false);
  };

  const beginProfileEdit = () => {
    if (!item) return;
    const editableFields =
      apiPath === "species" ? editableSpeciesFields : editableCharacterFields;
    const nextDraft = Object.fromEntries(
      editableFields.map(([key]) => {
        const rawValue = getFieldValue(item, key);
        const value =
          rawValue == null
            ? ""
            : Array.isArray(rawValue)
              ? rawValue.join(", ")
              : typeof rawValue === "string"
                ? rawValue
                : String(rawValue);
        return [key, value];
      }),
    );
    setProfileDraft(nextDraft);
    setSpeciesQuery("");
    setShowSpecies(false);
    setEditingProfile(true);
    window.setTimeout(() => {
      profileEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const saveProfileEdit = async () => {
    if (actionPending || !item) return;
    setActionPending(true);
    try {
      const payload =
        apiPath === "characters"
          ? normalizeCharacterPayload({
              ...item,
              ...profileDraft,
              id: entityId,
            })
          : {
              ...item,
              ...profileDraft,
              id: entityId,
            };
      const response = await authorizedFetch(`/api/${apiPath}/${entityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        return alert(errorPayload.error || "Profile could not be saved.");
      }

      const updatedItem = await response.json().catch(() => payload);
      setItem(updatedItem || payload);
      setEditingProfile(false);
      setProfileDraft({});
      loadData();
    } finally {
      setActionPending(false);
    }
  };

  const handleDeleteMoodItem = async (moodId: string) => {
    const currentMoodBoard = item.moodBoard || [];
    const updatedMoodBoard = currentMoodBoard.filter(
      (m: any) => m.id !== moodId,
    );
    try {
      await fetch(`/api/${apiPath}/${entityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, moodBoard: updatedMoodBoard }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevertVersion = async (versionSnapshot: any) => {
    if (actionPending) return;
    if (
      !confirm(
        `Are you sure you want to revert this record to version from ${new Date(versionSnapshot.timestamp).toLocaleString()}?`,
      )
    )
      return;
    setActionPending(true);
    try {
      const restoredData = { ...versionSnapshot.data, id: entityId };
      const res = await fetch(`/api/${apiPath}/${entityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restoredData),
      });
      if (res.ok) {
        loadData();
        alert("Successfully reverted entity to previous version state.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionPending(false);
    }
  };

  const handleCreateVersionSnapshot = async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      const currentVersions = item.versions || [
        {
          id: "ver-initial",
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          author: "AI Lorekeeper (Gemini)",
          changes: "Initial generation & lore integration",
          data: { ...item },
        },
      ];
      const newVersion = {
        id: `ver-${Date.now()}`,
        timestamp: new Date().toISOString(),
        author: "Andrei Thorne (Editor)",
        changes: `Manual snapshot saved: updated ${item.name || item.title || "record"}`,
        data: { ...item },
      };
      const updatedVersions = [newVersion, ...currentVersions];
      const res = await fetch(`/api/${apiPath}/${entityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, versions: updatedVersions }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionPending(false);
    }
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelTarget || actionPending) return;
    setActionPending(true);
    try {
      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: entityId,
          sourceName: item.name || item.title || item.codeName,
          target: newRelTarget,
          targetName: newRelTarget,
          type: newRelType,
          startDate: new Date().toISOString().split("T")[0],
          endDate: "Present",
          description: newRelDesc || "Associated relationship",
          canonStatus: "CANON",
        }),
      });
      setNewRelTarget("");
      setNewRelDesc("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionPending(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || actionPending) return;
    setActionPending(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: entityId,
          targetType: entityType,
          author: "Andrei Thorne (Editor)",
          text: commentText,
          timestamp: new Date().toISOString(),
          resolved: false,
        }),
      });
      setCommentText("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 text-zinc-300 text-xs flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400"></div>
          <span>Loading entity profile...</span>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 text-zinc-300 text-xs space-y-4">
          <p>Entity not found.</p>
          <button
            onClick={onClose}
            className="bg-yellow-400 text-zinc-950 px-4 py-2 rounded-2xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const title = item.name || item.title || item.codeName || "Entity Record";
  const versions = item.versions || [
    {
      id: "ver-initial",
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      author: "AI Lorekeeper (Gemini)",
      changes: "Initial generation & lore integration",
      data: { ...item },
    },
    {
      id: "ver-current",
      timestamp: new Date().toISOString(),
      author: "Andrei Thorne (Editor)",
      changes: "Latest synchronized state",
      data: { ...item },
    },
  ];

  return (
    <div
      className={
        entityType === "characters"
          ? "fixed inset-0 z-50 bg-zinc-950 overflow-y-auto"
          : "fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      }
    >
      <div
        className={
          entityType === "characters"
            ? "character-profile-page min-h-screen w-full bg-zinc-950"
            : "bg-zinc-950 border border-white/5 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
        }
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded font-mono border border-yellow-400/30">
              {entityType.toUpperCase()}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ID: {item.id}
            </span>
          </div>

          <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setModalTab("details")}
              className={`px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                modalTab === "details"
                  ? "bg-yellow-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Profile Overview
            </button>
            <button
              onClick={() => setModalTab("moodboard")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                modalTab === "moodboard"
                  ? "bg-yellow-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Mood Board ({item.moodBoard?.length || 1})</span>
            </button>
            <button
              onClick={() => setModalTab("history")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                modalTab === "history"
                  ? "bg-yellow-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Version History ({versions.length})</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className={
              entityType === "characters"
                ? "flex items-center gap-2 text-xs text-zinc-300 hover:text-yellow-300 cursor-pointer"
                : "p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer"
            }
          >
            {entityType === "characters" ? (
              <>
                <ArrowLeft className="w-4 h-4" /> Back to characters
              </>
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {modalTab === "details" ? (
            <>
              {entityType === "characters" && (
                <section className="character-dashboard rounded-3xl border border-white/10 bg-zinc-900/60 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr]">
                    <aside className="character-profile-rail border-b lg:border-b-0 lg:border-r border-white/10 bg-zinc-900 p-5">
                      <div className="character-profile-portrait">
                        {item.portrait ? (
                          <img src={item.portrait} alt={title} />
                        ) : (
                          <Users className="w-10 h-10 text-yellow-300" />
                        )}
                      </div>
                      <span className="mt-4 inline-flex text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded-full font-mono border border-emerald-500/20">
                        {item.currentStatus || "UNKNOWN"}
                      </span>
                      <h2 className="mt-3 text-xl font-bold text-zinc-100">
                        {title}
                      </h2>
                      {item.codeName && (
                        <p className="text-xs text-yellow-300 font-mono mt-1">
                          "{item.codeName}"
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                        {item.occupation || "Archive character record"}
                      </p>
                      <button
                        type="button"
                        onClick={
                          editingProfile ? saveProfileEdit : beginProfileEdit
                        }
                        disabled={actionPending}
                        className="mt-5 w-full border border-yellow-400/40 text-yellow-300 hover:bg-yellow-400 hover:text-zinc-950 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                      >
                        {editingProfile ? "Save profile" : "Edit profile"}
                      </button>
                    </aside>
                    <div className="p-5 sm:p-6 space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                            Character dossier
                          </p>
                          <h3 className="mt-1 text-2xl font-bold text-zinc-100">
                            {getEntityDescription(item) ||
                              "No overview recorded yet."}
                          </h3>
                        </div>
                        <label className="shrink-0 inline-flex items-center gap-2 border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 cursor-pointer hover:border-yellow-400/50">
                          <Upload className="w-3.5 h-3.5" /> Portrait
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {[
                          ["Species", item.species || "Unknown"],
                          [
                            "Power source",
                            item.primaryEnergySource || "Unrecorded",
                          ],
                          [
                            "Abilities",
                            String(
                              (item.powers || []).length ||
                                (item.majorAbilities ? 1 : 0),
                            ),
                          ],
                          ["Connections", String(relationships.length)],
                        ].map(([label, value]) => (
                          <div key={label} className="character-stat-card">
                            <p>{label}</p>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="character-info-panel">
                          <p className="character-panel-kicker">
                            Profile snapshot
                          </p>
                          <div className="character-facts">
                            <span>
                              Gender <b>{item.gender || "Unknown"}</b>
                            </span>
                            <span>
                              Eyes <b>{item.eyes || "Unknown"}</b>
                            </span>
                            <span>
                              Hair <b>{item.hair || "Unknown"}</b>
                            </span>
                            <span>
                              Location{" "}
                              <b>{item.currentLocation || "Unknown"}</b>
                            </span>
                            <span>
                              Affiliation{" "}
                              <b>{item.affiliation || "Independent"}</b>
                            </span>
                            <span>
                              Canon{" "}
                              <b className="text-emerald-300">
                                {item.canonStatus || "DRAFT"}
                              </b>
                            </span>
                          </div>
                        </div>
                        <div className="character-info-panel">
                          <p className="character-panel-kicker">
                            Ability loadout
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {[...asArray(item.powers), ...asArray(item.skills)]
                              .slice(0, 8)
                              .map((power: string) => (
                                <span key={power} className="character-chip">
                                  {power}
                                </span>
                              ))}
                            {!asArray(item.powers).length &&
                              !asArray(item.skills).length && (
                                <span className="text-xs text-zinc-500">
                                  No abilities recorded.
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                      <div className="character-info-panel">
                        <p className="character-panel-kicker">
                          Character history
                        </p>
                        <div className="character-history-grid">
                          <span>
                            <i>Origin</i>
                            <b>{item.origin || "Not recorded"}</b>
                          </span>
                          <span>
                            <i>First appearance</i>
                            <b>{item.firstAppearance || "Not recorded"}</b>
                          </span>
                          <span>
                            <i>Notable engagements</i>
                            <b>{item.notableEngagements || "Not recorded"}</b>
                          </span>
                          <span>
                            <i>Current status</i>
                            <b>{item.currentStatus || "Unknown"}</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {/* Top Banner / Portrait */}
              <div
                className={
                  entityType === "characters" && !editingProfile
                    ? "hidden"
                    : "flex flex-col md:flex-row gap-6 items-start"
                }
              >
                {(item.portrait || item.cover || item.image || item.logo) && (
                  <div className="w-full md:w-56 h-64 rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 shrink-0 relative">
                    <img
                      src={
                        item.portrait || item.cover || item.image || item.logo
                      }
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-500/30">
                        {item.canonStatus}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 cursor-pointer hover:bg-white/10">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingImage ? "Uploading..." : "Upload image"}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="sr-only"
                    />
                  </label>
                  {(apiPath === "characters" || apiPath === "species") && (
                    <button
                      type="button"
                      onClick={
                        editingProfile ? saveProfileEdit : beginProfileEdit
                      }
                      disabled={actionPending}
                      className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingProfile ? (
                        <Save className="w-3.5 h-3.5" />
                      ) : (
                        <Pencil className="w-3.5 h-3.5" />
                      )}
                      {editingProfile ? "Save profile" : "Edit profile"}
                    </button>
                  )}
                  {entityType === "issues" && (
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 cursor-pointer hover:bg-white/10">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>
                          {uploadingFinalComic
                            ? "Uploading..."
                            : item.finalFileUrl
                              ? "Replace final comic"
                              : "Upload final comic"}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,.cbz,.cbr,image/*"
                          onChange={handleFinalComicUpload}
                          disabled={uploadingFinalComic}
                          className="sr-only"
                        />
                      </label>
                      {item.finalFileUrl && (
                        <a
                          href={item.finalFileUrl}
                          download={item.finalFileName || "final-comic"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            Read / download:{" "}
                            {item.finalFileName || "Final comic"}
                          </span>
                        </a>
                      )}
                      {linkedScripts.length > 0 && (
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {linkedScripts.length} script panel
                          {linkedScripts.length === 1 ? "" : "s"} on record for
                          this issue.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-zinc-100 font-sans">
                      {title}
                    </h1>
                    {item.codeName && (
                      <span className="text-sm font-mono text-yellow-400">
                        "{item.codeName}"
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {getEntityDescription(item) ||
                      "No detailed summary available."}
                  </p>

                  {editingProfile && apiPath === "characters" && (
                    <div
                      ref={profileEditorRef}
                      className="scroll-mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border border-yellow-400/30 bg-zinc-900/80 p-4 rounded-2xl"
                    >
                      <div className="sm:col-span-2 flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <p className="text-xs font-semibold text-zinc-100">
                            Edit character profile
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-500">
                            Height / build is included below with the rest of
                            the character fields.
                          </p>
                        </div>
                        <Save className="w-4 h-4 text-yellow-300" />
                      </div>
                      {editableCharacterFields.map(([key, label]) =>
                        key === "species" ? (
                          <label
                            key={key}
                            className="relative space-y-1 text-[10px] text-zinc-400 uppercase font-mono"
                          >
                            <span>{label}</span>
                            <input
                              type="search"
                              value={speciesQuery}
                              onChange={(event) => {
                                setSpeciesQuery(event.target.value);
                                setShowSpecies(true);
                              }}
                              onFocus={() => {
                                setSpeciesQuery("");
                                setShowSpecies(true);
                              }}
                              placeholder={`Search species (selected: ${profileDraft.species || "none"})...`}
                              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                            />
                            {showSpecies && (
                              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded border border-white/10 bg-zinc-950 shadow-xl normal-case">
                                {speciesQuery.trim() &&
                                  !speciesOptions.some(
                                    (option) =>
                                      option.toLowerCase() ===
                                      speciesQuery.trim().toLowerCase(),
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProfileDraft((current) => ({
                                          ...current,
                                          species: speciesQuery.trim(),
                                        }));
                                        setSpeciesQuery("");
                                        setShowSpecies(false);
                                      }}
                                      className="block w-full border-b border-white/10 px-3 py-2 text-left text-xs text-yellow-300 hover:bg-white/10"
                                    >
                                      Use custom: "{speciesQuery.trim()}"
                                    </button>
                                  )}
                                {speciesOptions
                                  .filter((option) =>
                                    option
                                      .toLowerCase()
                                      .includes(speciesQuery.toLowerCase()),
                                  )
                                  .map((option) => (
                                    <button
                                      type="button"
                                      key={option}
                                      onClick={() => {
                                        setProfileDraft((current) => ({
                                          ...current,
                                          species: option,
                                        }));
                                        setSpeciesQuery("");
                                        setShowSpecies(false);
                                      }}
                                      className="block w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/10"
                                    >
                                      {option}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </label>
                        ) : (
                          <label
                            key={key}
                            className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono"
                          >
                            <span>{label}</span>
                            <textarea
                              rows={
                                key === "description" ||
                                key === "physicalAppearance" ||
                                key === "characterArc"
                                  ? 3
                                  : 2
                              }
                              value={profileDraft[key] || ""}
                              onChange={(event) =>
                                setProfileDraft((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                            />
                          </label>
                        ),
                      )}
                    </div>
                  )}

                  {editingProfile && apiPath === "species" && (
                    <div
                      ref={profileEditorRef}
                      className="scroll-mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border border-yellow-400/30 bg-zinc-900/80 p-4 rounded-2xl"
                    >
                      <div className="sm:col-span-2 flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <p className="text-xs font-semibold text-zinc-100">
                            Edit species profile
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-500">
                            Update the living species bible record. Images are
                            optional and unchanged here.
                          </p>
                        </div>
                        <Save className="w-4 h-4 text-yellow-300" />
                      </div>
                      {editableSpeciesFields.map(([key, label]) => (
                        <label
                          key={key}
                          className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono"
                        >
                          <span>{label}</span>
                          <textarea
                            rows={
                              [
                                "overview",
                                "biology",
                                "abilities",
                                "weaknesses",
                                "culture",
                                "notesReferences",
                              ].includes(key)
                                ? 3
                                : 2
                            }
                            value={profileDraft[key] || ""}
                            onChange={(event) =>
                              setProfileDraft((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {item.species && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Species
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1">
                          {item.species}
                        </div>
                      </div>
                    )}
                    {item.hair && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Hair / Eyes
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1">
                          {item.hair} / {item.eyes}
                        </div>
                      </div>
                    )}
                    {item.height && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Height / Build
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1">
                          {item.height}
                        </div>
                      </div>
                    )}
                    {item.occupation && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Occupation
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1">
                          {item.occupation}
                        </div>
                      </div>
                    )}
                    {item.friends?.length > 0 && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5 col-span-2">
                        <div className="text-[10px] text-yellow-400 uppercase tracking-wider font-mono">
                          Friends & Allies
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1 flex flex-wrap gap-1">
                          {item.friends.map((f: string, i: number) => (
                            <span
                              key={i}
                              className="bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded text-[10px]"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.family?.length > 0 && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5 col-span-2">
                        <div className="text-[10px] text-pink-400 uppercase tracking-wider font-mono">
                          Family & Relatives
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1 flex flex-wrap gap-1">
                          {item.family.map((fam: string, i: number) => (
                            <span
                              key={i}
                              className="bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded text-[10px]"
                            >
                              {fam}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.universeId && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Universe
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1">
                          {item.universeId}
                        </div>
                      </div>
                    )}
                    {item.canonStatus && (
                      <div className="bg-zinc-900/70 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Canon Status
                        </div>
                        <div className="text-xs font-semibold text-emerald-400 mt-1">
                          {item.canonStatus}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Relationships Section */}
              <div className="space-y-4 border-t border-white/5 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-sans">
                      Connected Relationships
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Direct connections to teams, families, allies, and rivals
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 bg-zinc-900 p-1 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setRelViewMode("list")}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                        relViewMode === "list"
                          ? "bg-yellow-400 text-zinc-950"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>List View</span>
                    </button>
                    <button
                      onClick={() => setRelViewMode("map")}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                        relViewMode === "map"
                          ? "bg-yellow-400 text-zinc-950"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Relationship Map</span>
                    </button>
                  </div>
                </div>

                {relViewMode === "list" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relationships.length === 0 ? (
                      <p className="text-xs text-zinc-500 col-span-2 py-4 text-center">
                        No relationships recorded yet. Use the form below to
                        link teams or family.
                      </p>
                    ) : (
                      relationships.map((rel) => (
                        <div
                          key={rel.id}
                          className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 p-3 rounded-2xl flex items-center justify-between"
                        >
                          <div>
                            <span className="text-[10px] bg-white/5 text-yellow-300 px-2 py-0.5 rounded font-mono">
                              {rel.type}
                            </span>
                            <div className="text-xs font-semibold text-zinc-200 mt-1">
                              {rel.source === entityId
                                ? rel.targetName
                                : rel.sourceName}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              {rel.description}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="h-80 w-full rounded-2xl border border-white/5 bg-zinc-950 overflow-hidden relative shadow-inner">
                    {(() => {
                      const mapNodes: Node[] = [
                        {
                          id: entityId,
                          data: { label: `⭐ ${title}` },
                          position: { x: 250, y: 150 },
                          style: {
                            background: "#1e1b4b",
                            color: "#c7d2fe",
                            border: "2px solid #6366f1",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            fontSize: "12px",
                            fontWeight: 700,
                            width: 160,
                            textAlign: "center",
                          },
                        },
                      ];
                      const mapEdges: Edge[] = [];

                      relationships.forEach((rel, idx) => {
                        const isSource = rel.source === entityId;
                        const targetId = isSource ? rel.target : rel.source;
                        const targetName = isSource
                          ? rel.targetName
                          : rel.sourceName;
                        const angle =
                          (idx / Math.max(1, relationships.length)) *
                          2 *
                          Math.PI;
                        const radius = 170;
                        const x = 250 + radius * Math.cos(angle);
                        const y = 150 + radius * Math.sin(angle);

                        mapNodes.push({
                          id: targetId || `rel-${idx}`,
                          data: { label: targetName },
                          position: { x, y },
                          style: {
                            background: "#18181b",
                            color: "#f4f4f5",
                            border: "1px solid #10b981",
                            borderRadius: "10px",
                            padding: "8px 12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            width: 140,
                            textAlign: "center",
                          },
                        });

                        mapEdges.push({
                          id: rel.id || `edge-${idx}`,
                          source: isSource ? entityId : targetId,
                          target: isSource ? targetId : entityId,
                          label: rel.type,
                          animated: true,
                          style: {
                            stroke:
                              rel.type === "ENEMY_OF"
                                ? "#ef4444"
                                : rel.type === "FAMILY_OF"
                                  ? "#ec4899"
                                  : "#6366f1",
                            strokeWidth: 2,
                          },
                          labelStyle: {
                            fill: "#a1a1aa",
                            fontSize: 9,
                            fontWeight: 600,
                          },
                        });
                      });

                      return (
                        <ReactFlow
                          nodes={mapNodes}
                          edges={mapEdges}
                          fitView
                          style={{ background: "#09090b" }}
                        >
                          <Background color="#27272a" gap={20} />
                          <Controls />
                        </ReactFlow>
                      );
                    })()}
                  </div>
                )}

                {/* Add Relationship Form */}
                <form
                  onSubmit={handleAddRelationship}
                  className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl space-y-3"
                >
                  <h4 className="text-xs font-semibold text-zinc-300">
                    Link Hero to Team, Family, Ally, or Rival
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <input
                        list="target-entities"
                        type="text"
                        placeholder="Select or type target entity name..."
                        value={newRelTarget}
                        onChange={(e) => setNewRelTarget(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-zinc-200"
                      />
                      <datalist id="target-entities">
                        {allCharacters
                          .filter((c) => c.id !== entityId)
                          .map((c) => (
                            <option key={c.id} value={c.name || c.codeName}>
                              {c.name} ({c.codeName || "Character"})
                            </option>
                          ))}
                        {allTeams.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} (Team)
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <select
                      value={newRelType}
                      onChange={(e) => setNewRelType(e.target.value)}
                      className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="MEMBER_OF">
                        MEMBER_OF (Team / Organization)
                      </option>
                      <option value="FAMILY_OF">
                        FAMILY_OF (Family / Bloodline)
                      </option>
                      <option value="ALLY_OF">ALLY_OF (Ally / Partner)</option>
                      <option value="ENEMY_OF">
                        ENEMY_OF (Enemy / Nemesis)
                      </option>
                      <option value="MENTOR_OF">
                        MENTOR_OF (Mentor / Protege)
                      </option>
                      <option value="RIVAL_OF">
                        RIVAL_OF (Rival / Competitor)
                      </option>
                      <option value="LIVES_IN">
                        LIVES_IN (Base / Location)
                      </option>
                      <option value="USES">USES (Equipment / Artifact)</option>
                      <option value="PARTICIPATED_IN">
                        PARTICIPATED_IN (Event)
                      </option>
                    </select>
                    <input
                      type="text"
                      placeholder="Description (e.g. Founding member, Sister)"
                      value={newRelDesc}
                      onChange={(e) => setNewRelDesc(e.target.value)}
                      className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-zinc-200"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={actionPending}
                    className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-1.5 rounded-2xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Establish Link
                  </button>
                </form>
              </div>

              {/* Retcons & Version History */}
              {retcons.length > 0 && (
                <div className="space-y-3 border-t border-white/5 pt-6">
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-sans flex items-center space-x-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <span>Recorded Retcons & Continuity Adjustments</span>
                  </h3>
                  <div className="space-y-2">
                    {retcons.map((rc) => (
                      <div
                        key={rc.id}
                        className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-amber-300 font-semibold">
                          <span>
                            Field: {rc.field} ({rc.oldValue} → {rc.newValue})
                          </span>
                          <span className="font-mono text-[10px]">
                            {rc.issue}
                          </span>
                        </div>
                        <p className="text-zinc-300">Reason: {rc.reason}</p>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Approved by: {rc.approvedBy} on {rc.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments / Notes */}
              <div className="space-y-4 border-t border-white/5 pt-6">
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-sans flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-yellow-400" />
                  <span>Creative Team Comments & Notes</span>
                </h3>
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 p-3 rounded-2xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-zinc-300">
                        <span>{c.author}</span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {new Date(c.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-zinc-300">{c.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add editorial note or comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={actionPending}
                    className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Note
                  </button>
                </form>
              </div>

              <div className="character-related-section border-t border-white/5 pt-6">
                <div className="flex items-end justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] text-yellow-400 uppercase tracking-widest font-mono">
                      Continue exploring
                    </p>
                    <h3 className="text-lg font-bold text-zinc-100 mt-1">
                      Related characters
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {
                      relationships.filter((rel) =>
                        allCharacters.some(
                          (character) =>
                            character.id ===
                            (rel.source === entityId ? rel.target : rel.source),
                        ),
                      ).length
                    }{" "}
                    linked
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {relationships
                    .map((rel) =>
                      rel.source === entityId ? rel.target : rel.source,
                    )
                    .map((characterId) =>
                      allCharacters.find(
                        (character) => character.id === characterId,
                      ),
                    )
                    .filter(
                      (character, index, list) =>
                        character &&
                        list.findIndex((item) => item?.id === character.id) ===
                          index,
                    )
                    .slice(0, 4)
                    .map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() =>
                          onSelectRelated("characters", character.id)
                        }
                        className="group flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/70 p-3 text-left hover:border-yellow-400/40 cursor-pointer"
                      >
                        {character.portrait ? (
                          <img
                            src={character.portrait}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-yellow-400/15 text-xs font-bold text-yellow-300">
                            {(character.name || "?").slice(0, 1)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <strong className="block truncate text-xs text-zinc-200 group-hover:text-yellow-300">
                            {character.name}
                          </strong>
                          <small className="block truncate text-[10px] text-zinc-500">
                            {character.codeName ||
                              character.species ||
                              "Character"}
                          </small>
                        </span>
                      </button>
                    ))}
                </div>
                {relationships.length === 0 && (
                  <p className="text-xs text-zinc-500">
                    No related characters recorded yet.
                  </p>
                )}
              </div>
            </>
          ) : modalTab === "moodboard" ? (
            /* Mood Board Tab */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-yellow-400" />
                    <span>
                      Character Aesthetic & Home Environment Mood Board
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Generate cinematic AI visual references representing {title}
                    's aesthetic, psychological tone, and home environment.
                  </p>
                </div>
              </div>

              {/* AI Mood Generator Form */}
              <form
                onSubmit={handleGenerateMoodItem}
                className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 p-4 rounded-2xl space-y-3 shadow-md"
              >
                <h3 className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                  <Bot className="w-4 h-4 text-yellow-400" />
                  <span>Generate New AI Mood Board Asset</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Describe aesthetic/environment (e.g. Neon rainy rooftop overlooking New Lagos skyline)..."
                      value={moodPrompt}
                      onChange={(e) => setMoodPrompt(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
                    />
                  </div>
                  <select
                    value={moodCategory}
                    onChange={(e) => setMoodCategory(e.target.value)}
                    className="bg-zinc-950 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
                  >
                    <option value="AESTHETIC">Aesthetic / Tone</option>
                    <option value="ENVIRONMENT">Home Environment</option>
                    <option value="PROP">Weapon / Prop</option>
                    <option value="COSTUME">Costume & Gear</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={generatingMood}
                    className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-2xl transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                  >
                    {generatingMood ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Generating AI Mood...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5" />
                        <span>Generate AI Mood Image</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Mood Board Gallery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {!item.moodBoard || item.moodBoard.length === 0 ? (
                  <div className="col-span-3 bg-zinc-900/40 border border-white/5 rounded-2xl p-8 text-center text-xs text-zinc-400">
                    No mood board assets generated yet. Use the prompt generator
                    above to create cinematic atmosphere references.
                  </div>
                ) : (
                  item.moodBoard.map((mood: any) => (
                    <div
                      key={mood.id}
                      className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between group"
                    >
                      <div className="h-48 w-full bg-zinc-950 relative overflow-hidden">
                        <img
                          src={mood.url}
                          alt={mood.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded font-mono border border-yellow-400/30">
                            {mood.category}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={() => handleDeleteMoodItem(mood.id)}
                            className="p-1 bg-black/60 hover:bg-rose-600 text-zinc-300 hover:text-white rounded transition-colors"
                            title="Remove mood item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 space-y-1.5">
                        <h4 className="text-xs font-bold text-zinc-100">
                          {mood.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 italic line-clamp-2">
                          "{mood.prompt}"
                        </p>
                      </div>
                      <div className="px-4 py-2 border-t border-white/5 bg-zinc-950/40 text-[10px] font-mono text-zinc-400">
                        {new Date(
                          mood.timestamp || Date.now(),
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Version History & Diff Log Tab */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 flex items-center space-x-2">
                    <History className="w-5 h-5 text-yellow-400" />
                    <span>Version History & Diff Log</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Track changes made by the AI Lorekeeper or editorial team,
                    view diff snapshots, and revert to previous states.
                  </p>
                </div>
                <button
                  onClick={handleCreateVersionSnapshot}
                  disabled={actionPending}
                  className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-3.5 py-2 rounded-2xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Save Version Snapshot</span>
                </button>
              </div>

              <div className="space-y-4">
                {versions.map((ver: any, index: number) => (
                  <div
                    key={ver.id || index}
                    className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 rounded-2xl p-4 space-y-3 relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-yellow-400/20 text-yellow-300 font-mono text-[10px] px-2 py-0.5 rounded border border-yellow-400/30">
                          v{versions.length - index}.0
                        </span>
                        <span className="text-xs font-bold text-zinc-200">
                          {ver.author || "System / AI Lorekeeper"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-zinc-400 font-mono text-[11px]">
                          {new Date(ver.timestamp).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRevertVersion(ver)}
                          disabled={actionPending}
                          className="bg-white/5 hover:bg-yellow-400 text-zinc-300 hover:text-zinc-950 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center space-x-1 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Revert entity to this version state"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revert State</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-2xl border border-white/5">
                      <span className="text-yellow-400 font-mono text-[10px] uppercase block mb-1">
                        Diff Summary & Changes:
                      </span>
                      <p>{ver.changes || "Entity state update recorded."}</p>
                    </div>

                    {/* Snapshot data preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono text-zinc-400">
                      <div>
                        Name:{" "}
                        <span className="text-zinc-200">
                          {ver.data?.name ||
                            ver.data?.title ||
                            ver.data?.codeName ||
                            "N/A"}
                        </span>
                      </div>
                      <div>
                        Canon:{" "}
                        <span className="text-emerald-400">
                          {ver.data?.canonStatus || "CANON"}
                        </span>
                      </div>
                      <div>
                        Species:{" "}
                        <span className="text-zinc-200">
                          {ver.data?.species || "N/A"}
                        </span>
                      </div>
                      <div>
                        ID:{" "}
                        <span className="text-zinc-200">
                          {ver.data?.id || entityId}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
