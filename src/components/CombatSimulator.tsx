import React, { useEffect, useRef, useState } from "react";
import {
  Swords,
  Search,
  Loader2,
  Share2,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";

interface CombatSimulatorProps {
  onSelectItem?: (type: string, id: string) => void;
}

const KNOWLEDGE_OPTIONS = [
  { value: "unknown", label: "Unknown to each other" },
  { value: "partial", label: "Partial knowledge" },
  { value: "full", label: "Full knowledge" },
];
const PREPARATION_OPTIONS = [
  { value: "none", label: "No preparation" },
  { value: "combatant1", label: "Combatant 1 prepared" },
  { value: "combatant2", label: "Combatant 2 prepared" },
  { value: "both", label: "Both prepared" },
];
const MORALS_OPTIONS = [
  { value: "canon", label: "Canon morals" },
  { value: "bloodlusted", label: "Bloodlusted" },
  { value: "no_kill", label: "No-kill only" },
];
const WIN_CONDITIONS = [
  "Incapacitation",
  "Death",
  "Submission",
  "Retreat / forced withdrawal",
];

const DEFAULT_SETUP = {
  distance: "50m",
  knowledge: "unknown",
  preparation: "none",
  morals: "canon",
  conditions: "Day",
  winCondition: WIN_CONDITIONS[0],
};

interface EntitySearchPickerProps {
  label: string;
  placeholder: string;
  selected: any | null;
  onSelect: (item: any | null) => void;
  accentClass?: string;
}

const EntitySearchPicker: React.FC<EntitySearchPickerProps> = ({
  label,
  placeholder,
  selected,
  onSelect,
  accentClass = "text-yellow-400",
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ type: string; item: any }[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/public/archive/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          const all = Array.isArray(data) ? data : [];
          const q = query.toLowerCase();
          const matches: { type: string; item: any }[] = [];
          all.forEach(({ type, item }: { type: string; item: any }) => {
            const name = (
              item.name ||
              item.title ||
              item.codeName ||
              ""
            ).toLowerCase();
            if (name.includes(q)) matches.push({ type, item });
          });
          setResults(matches.slice(0, 25));
          setSearching(false);
        })
        .catch(() => {
          setResults([]);
          setSearching(false);
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-1.5 relative" ref={boxRef}>
      <label className="text-xs text-zinc-400 font-medium">{label}</label>
      {selected ? (
        <div className="flex items-center justify-between bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2">
          <span className={`text-xs font-semibold ${accentClass}`}>
            {selected.name || selected.title}
            {selected.codeName ? ` ("${selected.codeName}")` : ""}
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-8 pr-3 py-2 text-xs text-zinc-200"
            />
          </div>
          {open && query.trim() && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded border border-white/10 bg-zinc-950 shadow-xl">
              {searching ? (
                <div className="px-3 py-2 text-xs text-zinc-500">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-500">
                  No matches.
                </div>
              ) : (
                results.map(({ type, item }) => (
                  <button
                    type="button"
                    key={`${type}-${item.id}`}
                    onClick={() => {
                      onSelect({ ...item, _type: type });
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/10"
                  >
                    <span className="text-xs text-zinc-200 truncate">
                      {item.name || item.title || item.codeName}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono uppercase ml-2 shrink-0">
                      {type}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const CombatSimulator: React.FC<CombatSimulatorProps> = () => {
  const [combatant1, setCombatant1] = useState<any | null>(null);
  const [combatant2, setCombatant2] = useState<any | null>(null);
  const [location, setLocation] = useState<any | null>(null);
  const [distance, setDistance] = useState(DEFAULT_SETUP.distance);
  const [knowledge, setKnowledge] = useState(DEFAULT_SETUP.knowledge);
  const [preparation, setPreparation] = useState(DEFAULT_SETUP.preparation);
  const [morals, setMorals] = useState(DEFAULT_SETUP.morals);
  const [conditions, setConditions] = useState(DEFAULT_SETUP.conditions);
  const [winCondition, setWinCondition] = useState(DEFAULT_SETUP.winCondition);
  const [showSetup, setShowSetup] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [copyLabel, setCopyLabel] = useState("Share");

  useEffect(() => {
    const match = window.location.pathname.match(/^\/sim\/([^/]+)/);
    if (!match) return;
    fetch(`/api/simulations/${match[1]}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setResult(data);
      })
      .catch(() => {});
  }, []);

  const canSimulate =
    combatant1 &&
    combatant2 &&
    combatant1._type === "characters" &&
    combatant2._type === "characters";

  const runSimulation = async (seed?: number) => {
    if (!canSimulate) return;
    setSimulating(true);
    setError("");
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          combatant1Id: combatant1.id,
          combatant2Id: combatant2.id,
          locationId: location?.id,
          locationName: location?.name,
          distance,
          knowledge,
          preparation,
          morals,
          conditions,
          winCondition,
          seed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The simulation failed to run.");
        return;
      }
      setResult(data);
      window.history.pushState({}, "", `/sim/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The simulation failed to run.",
      );
    } finally {
      setSimulating(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/sim/${result.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Share"), 1800);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Share"), 1800);
    }
  };

  const handleChangeConditions = () => {
    setShowSetup(true);
    setResult(null);
    window.history.pushState({}, "", "/simulator");
  };

  const handleNewSimulation = () => {
    setCombatant1(null);
    setCombatant2(null);
    setLocation(null);
    setDistance(DEFAULT_SETUP.distance);
    setKnowledge(DEFAULT_SETUP.knowledge);
    setPreparation(DEFAULT_SETUP.preparation);
    setMorals(DEFAULT_SETUP.morals);
    setConditions(DEFAULT_SETUP.conditions);
    setWinCondition(DEFAULT_SETUP.winCondition);
    setError("");
    setResult(null);
    setShowSetup(true);
    window.history.pushState({}, "", "/simulator");
  };

  const handleResetSetup = () => {
    setDistance(DEFAULT_SETUP.distance);
    setKnowledge(DEFAULT_SETUP.knowledge);
    setPreparation(DEFAULT_SETUP.preparation);
    setMorals(DEFAULT_SETUP.morals);
    setConditions(DEFAULT_SETUP.conditions);
    setWinCondition(DEFAULT_SETUP.winCondition);
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-28">
        <div className="border border-white/5 rounded-2xl bg-zinc-950 overflow-hidden">
          <div className="border-b border-white/5 px-6 py-4 bg-zinc-900/60">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
              Simulation // {result.id.replace(/^sim-/, "").slice(0, 6)}
            </p>
            <h1 className="text-xl font-bold text-zinc-100 font-sans">
              {result.combatant1Name.toUpperCase()} VS{" "}
              {result.combatant2Name.toUpperCase()}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-zinc-400 font-mono">
              <span>LOCATION: {result.setup?.locationName}</span>
              <span>CONDITIONS: {result.setup?.conditions}</span>
              <span>KNOWLEDGE: {result.setup?.knowledge}</span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {result.rounds.map((round: string, i: number) => (
              <div key={i} className="space-y-1.5">
                {result.rounds.length > 1 && (
                  <p className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest">
                    {i === result.rounds.length - 1 &&
                    round.toUpperCase().startsWith("TWIST")
                      ? "Twist"
                      : `Round ${String(i + 1).padStart(2, "0")}`}
                  </p>
                )}
                <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                  {round.replace(/^TWIST:\s*/i, "")}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 px-6 py-5 bg-zinc-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-100">
                {result.winnerName.toUpperCase()} WINS
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {result.probability1}% / {result.probability2}%
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <p>
                <span className="text-zinc-500">Turning point:</span>{" "}
                {result.turningPoint}
              </p>
              <p>
                <span className="text-zinc-500">Primary cause:</span>{" "}
                {result.primaryCause}
              </p>
              {result.isUpset && (
                <p className="sm:col-span-2 text-amber-400">
                  Upset result: {result.unexpectedFactor}
                </p>
              )}
            </div>
          </div>

          {result.engineReport && (
            <div className="border-t border-white/5 px-6 py-5 space-y-4 bg-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-yellow-400">
                    Engine telemetry
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    The narrative dramatizes this model. It does not decide the
                    winner.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-600">
                  RULESET // v1
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>{result.combatant1Name}</span>
                  <span>{result.probability1}%</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="bg-yellow-300"
                    style={{ width: `${result.probability1}%` }}
                  />
                  <div
                    className="bg-pink-400"
                    style={{ width: `${result.probability2}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>{result.combatant2Name}</span>
                  <span>{result.probability2}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {result.engineReport.effective?.map(
                  (score: number, index: number) => (
                    <div
                      key={`effective-${index}`}
                      className="rounded-xl border border-white/5 bg-zinc-900/70 p-3"
                    >
                      <p className="text-[9px] uppercase text-zinc-600">
                        Effective score
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-200">
                        {Math.round(score)}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {index === 0
                          ? result.combatant1Name
                          : result.combatant2Name}
                      </p>
                    </div>
                  ),
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 text-[10px] font-mono text-zinc-500 sm:grid-cols-2">
                <p>
                  Matchup ×{" "}
                  {result.engineReport.modifiers?.[0]?.matchup?.toFixed(2)} /{" "}
                  {result.engineReport.modifiers?.[1]?.matchup?.toFixed(2)}
                </p>
                <p>
                  Environment ×{" "}
                  {result.engineReport.modifiers?.[0]?.environment?.toFixed(2)}{" "}
                  /{" "}
                  {result.engineReport.modifiers?.[1]?.environment?.toFixed(2)}
                </p>
                <p>
                  Strategy ×{" "}
                  {result.engineReport.modifiers?.[0]?.personality?.toFixed(2)}{" "}
                  /{" "}
                  {result.engineReport.modifiers?.[1]?.personality?.toFixed(2)}
                </p>
                <p>
                  Randomness ×{" "}
                  {result.engineReport.modifiers?.[0]?.randomness?.toFixed(2)} /{" "}
                  {result.engineReport.modifiers?.[1]?.randomness?.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleNewSimulation}
            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-2xl cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            New Simulation
          </button>
          <button
            onClick={() => runSimulation()}
            disabled={simulating}
            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-2xl cursor-pointer disabled:opacity-50"
          >
            {simulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Run Again
          </button>
          <button
            onClick={handleChangeConditions}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-white/10 text-zinc-200 text-xs font-medium px-4 py-2 rounded-2xl border border-white/10 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Change Conditions
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-white/10 text-zinc-200 text-xs font-medium px-4 py-2 rounded-2xl border border-white/10 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copyLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-28">
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans flex items-center gap-2">
          <Swords className="w-5 h-5 text-yellow-400" />
          Infernal Combat Simulator
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Search the archive, pick two combatants, and let the engine model the
          fight — the numbers decide the winner, the AI just narrates it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <EntitySearchPicker
          label="Select Combatant 1"
          placeholder="Search the archive..."
          selected={combatant1}
          onSelect={setCombatant1}
          accentClass="text-yellow-400"
        />
        <EntitySearchPicker
          label="Select Combatant 2"
          placeholder="Search the archive..."
          selected={combatant2}
          onSelect={setCombatant2}
          accentClass="text-pink-400"
        />
      </div>

      {(combatant1 && combatant1._type !== "characters") ||
      (combatant2 && combatant2._type !== "characters") ? (
        <p className="text-xs text-amber-400">
          Only characters can be selected as combatants right now — species,
          powers, and artifacts are searchable for reference but can't fight
          directly yet.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowSetup((prev) => !prev)}
        className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
      >
        {showSetup
          ? "Hide scenario controls"
          : "Change scenario from the default setup"}
      </button>

      {showSetup && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between sm:col-span-2 border-b border-white/5 pb-3">
            <div>
              <p className="text-xs font-semibold text-zinc-200">
                Scenario controls
              </p>
              <p className="text-[10px] text-zinc-500">
                Start with canon defaults, then bend reality.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetSetup}
              className="text-[10px] font-mono text-yellow-300 hover:text-yellow-200 cursor-pointer"
            >
              Reset defaults
            </button>
          </div>
          <EntitySearchPicker
            label="Location"
            placeholder="Search planets & locations..."
            selected={location}
            onSelect={setLocation}
            accentClass="text-emerald-400"
          />
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              Starting distance
            </label>
            <input
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 50m"
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              Knowledge
            </label>
            <select
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              {KNOWLEDGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              Preparation
            </label>
            <select
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              {PREPARATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">Morals</label>
            <select
              value={morals}
              onChange={(e) => setMorals(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              {MORALS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              Conditions
            </label>
            <input
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Night, storm, combat zone"
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs text-zinc-400 font-medium">
              Win condition
            </label>
            <select
              value={winCondition}
              onChange={(e) => setWinCondition(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              {WIN_CONDITIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && <p className="auth-message">{error}</p>}

      <button
        onClick={() => runSimulation()}
        disabled={!canSimulate || simulating}
        className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-sm px-4 py-3 rounded-2xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {simulating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Running simulation...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> SIMULATE
          </>
        )}
      </button>
    </div>
  );
};
