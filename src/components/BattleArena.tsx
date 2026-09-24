import React, { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Flame,
  RefreshCcw,
  Search,
  Shield,
  Sparkles,
  Swords,
  TimerReset,
  Users,
  Zap,
} from "lucide-react";

type TeamSide = "A" | "B";

type CharacterRecord = {
  id: string;
  name: string;
  codeName?: string;
  species?: string;
  affiliation?: string;
  powers?: string[];
  skills?: string[];
  weaknesses?: string[];
  equipment?: string[];
  biography?: string;
  description?: string;
  portrait?: string;
  origin?: string;
  battlePhilosophy?: string;
  majorAbilities?: string;
  signatureTechniques?: string;
  currentStatus?: string;
  aliases?: string[];
};

type Battlefield = {
  id: string;
  name: string;
  theme: string;
  hazard: string;
  description: string;
};

type BattleSummary = {
  winner: string;
  battleLog: string[];
  mvp: string;
  turningPoint: string;
  biggestSurprise: string;
  majorEvent: string;
  durationMinutes: number;
  damageDealt: number;
  chaosEvents: string[];
  winnerTeam: string[];
  losingTeam: string[];
  contextualEffects: string[];
};

type PartyPlayer = {
  id: string;
  name: string;
  teamName: string;
  isHost?: boolean;
  picks: CharacterRecord[];
};

const BATTLEFIELDS: Battlefield[] = [
  {
    id: "infernal-city",
    name: "Infernal City",
    theme: "Sky-bridges and collapsing towers",
    hazard: "Power outage",
    description:
      "A dense, broken metropolis with rooftop lanes and unstable power grids.",
  },
  {
    id: "embers-void",
    name: "Embers of the Void",
    theme: "Cracked planetside crater",
    hazard: "Anti-void field",
    description:
      "A ravaged volcanic perimeter where dark-energy pulses scramble powers.",
  },
  {
    id: "solar-gate",
    name: "Solar Gate",
    theme: "Radiant fortress archway",
    hazard: "Solar flare",
    description:
      "A towering, exposed platform where light and heat reign over the battlefield.",
  },
  {
    id: "frost-cavern",
    name: "Frost Cavern",
    theme: "Glacial ruins and fractured ice",
    hazard: "Flash freeze",
    description:
      "A brittle cavern with ice bridges, frozen runoff, and sudden slips.",
  },
  {
    id: "storm-harbor",
    name: "Storm Harbor",
    theme: "Flooded docks and steel wrecks",
    hazard: "Lightning storm",
    description:
      "A harbor section with dangerous elevation changes and live electrical weather.",
  },
];

const STORAGE_KEY = "infernal-battle-arena-game-stats-v1";
// This is game-only state for the arena layer and is intentionally not part of the canon archive data.

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getCharacterName = (character: CharacterRecord | null) =>
  character?.name || character?.codeName || "Unnamed fighter";

const getPowerScore = (character: CharacterRecord) => {
  const powers = character.powers ?? [];
  const skills = character.skills ?? [];
  const weaknesses = character.weaknesses ?? [];
  const equipment = character.equipment ?? [];
  const text = [
    character.biography,
    character.description,
    character.origin,
    character.battlePhilosophy,
    character.majorAbilities,
    character.signatureTechniques,
    ...(powers || []),
    ...(skills || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const traitScore =
    powers.length * 12 +
    skills.length * 7 +
    equipment.length * 4 +
    (text.includes("cosmic") ? 10 : 0) +
    (text.includes("void") ? 8 : 0) +
    (text.includes("solar") ? 9 : 0) +
    (text.includes("tactician") ? 8 : 0) +
    (text.includes("speed") ? 8 : 0) +
    (text.includes("guardian") ? 7 : 0);

  const weaknessPenalty = weaknesses.length * 6;
  return clamp(traitScore - weaknessPenalty, 24, 100);
};

const getTeamScore = (team: CharacterRecord[], battlefield: Battlefield) => {
  const average =
    team.reduce((sum, character) => sum + getPowerScore(character), 0) /
    Math.max(1, team.length);
  const synergy = team.length > 1 ? team.length * 4 : 0;
  const battlefieldAdjustment =
    battlefield.id === "infernal-city"
      ? team.some((character) =>
          (character.powers ?? []).some((power) =>
            ["speed", "stealth", "void", "energy"].includes(
              power.toLowerCase(),
            ),
          ),
        )
        ? 6
        : 0
      : battlefield.id === "solar-gate"
        ? team.some((character) =>
            (character.powers ?? []).some((power) =>
              ["solar", "light", "radiant"].includes(power.toLowerCase()),
            ),
          )
          ? 8
          : 0
        : battlefield.id === "frost-cavern"
          ? team.some((character) =>
              (character.weaknesses ?? []).some((weakness) =>
                weakness.toLowerCase().includes("cold"),
              ),
            )
            ? -6
            : 2
          : 0;

  return average + synergy + battlefieldAdjustment;
};

const generateRoomCode = () =>
  `${Math.random().toString(36).slice(2, 5).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

const makeInitialGameStats = () => ({
  totalBattles: 0,
  wins: 0,
  losses: 0,
  favoriteCharacter: "",
  favoriteTeam: "",
  mostPicked: {} as Record<string, number>,
  teamCombos: {} as Record<string, number>,
  achievements: {
    firstBlood: false,
    tactician: false,
    chaosAgent: false,
    teamBuilder: false,
    upset: false,
  },
});

const getStoredGameStats = () => {
  if (typeof window === "undefined") return makeInitialGameStats();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeInitialGameStats();
    return { ...makeInitialGameStats(), ...JSON.parse(raw) };
  } catch {
    return makeInitialGameStats();
  }
};

function BattleArena({ publicMode = false }: { publicMode?: boolean }) {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"solo" | "party">("solo");
  const [battlefield, setBattlefield] = useState<Battlefield>(BATTLEFIELDS[0]);
  const [chaosMode, setChaosMode] = useState(true);
  const [mode, setMode] = useState<"1v1" | "2v2" | "3v3" | "5v5" | "team">(
    "1v1",
  );
  const [teamA, setTeamA] = useState<CharacterRecord[]>([]);
  const [teamB, setTeamB] = useState<CharacterRecord[]>([]);
  const [partyPlayers, setPartyPlayers] = useState<PartyPlayer[]>([
    {
      id: "host",
      name: "HOST",
      teamName: "Host Squad",
      isHost: true,
      picks: [],
    },
  ]);
  const [roomCode, setRoomCode] = useState(generateRoomCode());
  const [joinName, setJoinName] = useState("");
  const [joinTeamName, setJoinTeamName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [battleResult, setBattleResult] = useState<BattleSummary | null>(null);
  const [gameStats, setGameStats] = useState<any>(() => getStoredGameStats());

  useEffect(() => {
    fetch("/api/characters")
      .then((response) => response.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCharacters(list.filter((item) => item && item.id));
      })
      .catch(() => setCharacters([]));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gameStats));
    }
  }, [gameStats]);

  const teamSize = useMemo(
    () => ({ "1v1": 1, "2v2": 2, "3v3": 3, "5v5": 5, team: 3 })[mode],
    [mode],
  );

  const visibleCharacters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return characters.filter((character) => {
      if (!query) return true;
      const haystack = [
        character.name,
        character.codeName,
        character.species,
        character.affiliation,
        ...(character.powers ?? []),
        ...(character.skills ?? []),
        ...(character.aliases ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [characters, search]);

  const addCharacterToTeam = (side: TeamSide, character: CharacterRecord) => {
    const target = side === "A" ? teamA : teamB;
    const current = target.some((entry) => entry.id === character.id)
      ? target
      : [...target, character].slice(0, teamSize);

    if (side === "A") setTeamA(current);
    else setTeamB(current);
  };

  const removeCharacterFromTeam = (side: TeamSide, id: string) => {
    if (side === "A") {
      setTeamA((previous) => previous.filter((item) => item.id !== id));
      return;
    }
    setTeamB((previous) => previous.filter((item) => item.id !== id));
  };

  const randomizeTeam = (side: TeamSide) => {
    const source = [...characters]
      .sort(() => Math.random() - 0.5)
      .slice(0, teamSize);
    if (side === "A") setTeamA(source);
    else setTeamB(source);
  };

  const startBattle = () => {
    if (
      !teamA.length ||
      !teamB.length ||
      teamA.length !== teamSize ||
      teamB.length !== teamSize
    ) {
      return;
    }

    const aScore = getTeamScore(teamA, battlefield);
    const bScore = getTeamScore(teamB, battlefield);
    const chaosBoost = chaosMode ? 8 + Math.random() * 12 : 0;
    const totalA = aScore + chaosBoost * (Math.random() > 0.5 ? 1 : 0.3);
    const totalB = bScore + chaosBoost * (Math.random() > 0.5 ? 1 : 0.3);
    const winnerIsA = totalA >= totalB;
    const winnerTeam = winnerIsA ? teamA : teamB;
    const loserTeam = winnerIsA ? teamB : teamA;

    const winnerName = winnerTeam
      .map((character) => getCharacterName(character))
      .join(" + ");
    const loserName = loserTeam
      .map((character) => getCharacterName(character))
      .join(" + ");
    const mvp = winnerTeam.reduce(
      (best, current) =>
        getPowerScore(current) > getPowerScore(best) ? current : best,
      winnerTeam[0],
    );

    const chaosEvents = chaosMode
      ? [
          `${battlefield.hazard} erupts across the arena.`,
          `${winnerTeam[0]?.name ?? "A hero"} exploits a tactical weakness in the environment.`,
          `A third-party disruption forces everyone to rethink the fight.`,
        ]
      : ["No chaos event. The battlefield remains stable."];

    const battleLog = [
      `${teamA.map(getCharacterName).join(" + ")} enter ${battlefield.name}.`,
      `${teamB.map(getCharacterName).join(" + ")} respond aggressively.`,
      `${battlefield.hazard} shifts the fight and breaks the original rhythm.`,
      `${winnerName} adapt faster and turn the pressure into an advantage.`,
      `The final exchange decides the fight with ${mvp.name} standing at the center of the result.`,
    ];

    const result: BattleSummary = {
      winner: winnerName,
      battleLog,
      mvp: mvp.name,
      turningPoint: `${battlefield.name} forced the teams to re-evaluate position and tempo, and the stronger tactical layer won the exchange.`,
      biggestSurprise: `${loserName} had the higher raw stat profile, but the battlefield and timing turned the fight against them.`,
      majorEvent: `${battlefield.hazard} was the decisive shift.`,
      durationMinutes: 4 + Math.round(Math.random() * 10),
      damageDealt: Math.round(Math.abs(totalA - totalB) * 18),
      chaosEvents,
      winnerTeam: winnerTeam.map((character) => getCharacterName(character)),
      losingTeam: loserTeam.map((character) => getCharacterName(character)),
      contextualEffects: [
        `SIMULATION EFFECT: ${battlefield.name} reduces ${loserTeam[0]?.name ?? "the losing side"}'s effective power by 8-12 due to terrain mismatch.`,
        `SIMULATION EFFECT: ${winnerTeam[0]?.name ?? "the winning side"} gains a momentum bump from battlefield awareness and team rhythm.`,
      ],
    };

    setBattleResult(result);

    setGameStats((current: any) => {
      const next = {
        ...current,
        totalBattles: (current.totalBattles || 0) + 1,
        wins: winnerIsA ? (current.wins || 0) + 1 : current.wins || 0,
        losses: winnerIsA ? current.losses || 0 : (current.losses || 0) + 1,
        favoriteCharacter:
          current.favoriteCharacter || winnerTeam[0]?.name || "",
        favoriteTeam: current.favoriteTeam || winnerName,
        mostPicked: {
          ...(current.mostPicked || {}),
          ...Object.fromEntries(
            [...teamA, ...teamB].map((character) => [
              character.id,
              (current.mostPicked?.[character.id] || 0) + 1,
            ]),
          ),
        },
      };

      if ((current.totalBattles || 0) === 0) {
        next.achievements = { ...next.achievements, firstBlood: true };
      }
      if (winnerTeam.length < teamSize + 1 && !next.achievements?.tactician) {
        next.achievements = { ...next.achievements, tactician: true };
      }
      if (chaosMode && !next.achievements?.chaosAgent) {
        next.achievements = { ...next.achievements, chaosAgent: true };
      }
      return next;
    });
  };

  const addPartyGuest = () => {
    setPartyPlayers((current) => [
      ...current,
      {
        id: `guest-${Date.now()}`,
        name: `PLAYER ${current.length + 1}`,
        teamName: `Rival Squad ${current.length}`,
        picks: [],
      },
    ]);
  };

  const joinPartyRoom = () => {
    const trimmedName = joinName.trim();
    const trimmedTeam = joinTeamName.trim();
    const trimmedRoomCode = joinRoomCode.trim().toUpperCase();
    if (!trimmedName || !trimmedTeam || !trimmedRoomCode) return;
    if (trimmedRoomCode !== roomCode) return;

    setPartyPlayers((current) => {
      if (current.some((player) => player.name === trimmedName)) {
        return current;
      }
      return [
        ...current,
        {
          id: `join-${Date.now()}`,
          name: trimmedName,
          teamName: trimmedTeam,
          picks: [],
        },
      ];
    });
    setJoinName("");
    setJoinTeamName("");
    setJoinRoomCode("");
  };

  const updatePartyPlayerTeamName = (id: string, teamName: string) => {
    setPartyPlayers((current) =>
      current.map((player) =>
        player.id === id ? { ...player, teamName } : player,
      ),
    );
  };

  const autoDraftParty = () => {
    setPartyPlayers((current) =>
      current.map((player) => {
        const picks = [...characters]
          .sort(() => Math.random() - 0.5)
          .slice(0, 1);
        return { ...player, picks };
      }),
    );
  };

  const runPartyBattle = () => {
    const activePlayers = partyPlayers.filter(
      (player) => player.picks.length > 0,
    );
    if (activePlayers.length < 2) return;
    const fullList = activePlayers.flatMap((player) => player.picks);
    const split = Math.ceil(fullList.length / 2);
    const teamOne = fullList.slice(0, split);
    const teamTwo = fullList.slice(split);
    const partyResult = resolvePartyBattle(
      teamOne,
      teamTwo,
      battlefield,
      chaosMode,
    );
    setBattleResult(partyResult);
  };

  const canRunSolo = teamA.length === teamSize && teamB.length === teamSize;

  return (
    <div className="min-h-screen bg-[#111318] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-yellow-300">
                Infernal Comics
              </p>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                INFERNAL BATTLE ARENA
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              {chaosMode ? "Chaos events active" : "Stable battlefield"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "solo", label: "SOLO ARENA" },
              { id: "party", label: "PARTY ARENA" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id as "solo" | "party");
                  setBattleResult(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                  view === item.id
                    ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-200"
                    : "border-white/10 bg-zinc-900 text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {view === "solo" ? (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {(["1v1", "2v2", "3v3", "5v5", "team"] as const).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMode(value)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] ${
                          mode === value
                            ? "border-yellow-400/70 bg-yellow-400/15 text-yellow-200"
                            : "border-white/10 bg-zinc-950 text-zinc-400"
                        }`}
                      >
                        {value}
                      </button>
                    ),
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        TEAM A
                      </p>
                      <button
                        type="button"
                        onClick={() => randomizeTeam("A")}
                        className="text-[10px] uppercase tracking-[0.15em] text-yellow-300"
                      >
                        Randomize
                      </button>
                    </div>

                    <div className="space-y-2">
                      {teamA.length === 0 && (
                        <p className="text-xs text-zinc-500">
                          No fighters selected yet.
                        </p>
                      )}
                      {teamA.map((character) => (
                        <div
                          key={character.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-2"
                        >
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {getCharacterName(character)}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                              {character.species || "Unknown species"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeCharacterFromTeam("A", character.id)
                            }
                            className="text-[10px] text-zinc-400"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/70 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        TEAM B
                      </p>
                      <button
                        type="button"
                        onClick={() => randomizeTeam("B")}
                        className="text-[10px] uppercase tracking-[0.15em] text-yellow-300"
                      >
                        Randomize
                      </button>
                    </div>

                    <div className="space-y-2">
                      {teamB.length === 0 && (
                        <p className="text-xs text-zinc-500">
                          No fighters selected yet.
                        </p>
                      )}
                      {teamB.map((character) => (
                        <div
                          key={character.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-2"
                        >
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {getCharacterName(character)}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                              {character.species || "Unknown species"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeCharacterFromTeam("B", character.id)
                            }
                            className="text-[10px] text-zinc-400"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4 text-yellow-300" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search canon roster..."
                    className="w-full border-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleCharacters.slice(0, 18).map((character) => {
                    const onCardClick = () => {
                      const side = teamA.length <= teamB.length ? "A" : "B";
                      addCharacterToTeam(side, character);
                    };

                    return (
                      <button
                        key={character.id}
                        type="button"
                        onClick={onCardClick}
                        className="rounded-2xl border border-white/10 bg-zinc-950 p-3 text-left transition hover:border-yellow-400/60 hover:bg-zinc-900"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white">
                            {getCharacterName(character)}
                          </span>
                          <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-yellow-200">
                            {character.species || "Unknown"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-3">
                          {character.description ||
                            character.biography ||
                            character.origin ||
                            "A canon fighter with no public summary yet."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {(character.powers ?? []).slice(0, 2).map((power) => (
                            <span
                              key={power}
                              className="rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-zinc-300"
                            >
                              {power}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Battlefield
                  </p>
                  <Shield className="h-4 w-4 text-yellow-300" />
                </div>

                <div className="space-y-3">
                  {BATTLEFIELDS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBattlefield(option)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        battlefield.id === option.id
                          ? "border-yellow-400/70 bg-yellow-400/10"
                          : "border-white/10 bg-zinc-950/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          {option.name}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                          {option.hazard}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Rules
                  </p>
                  <TimerReset className="h-4 w-4 text-yellow-300" />
                </div>

                <div className="space-y-3 text-sm text-zinc-300">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2">
                    <span>Chaos engine</span>
                    <input
                      type="checkbox"
                      checked={chaosMode}
                      onChange={() => setChaosMode((value) => !value)}
                    />
                  </label>
                  <div className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      Battlefield theme
                    </div>
                    <div className="mt-2 text-sm text-yellow-200">
                      {battlefield.theme}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Player meta
                  </p>
                  <Crown className="h-4 w-4 text-yellow-300" />
                </div>
                <div className="grid gap-2 text-sm text-zinc-300">
                  <div className="flex justify-between">
                    <span>Battles</span>
                    <strong>{gameStats.totalBattles || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Wins</span>
                    <strong>{gameStats.wins || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Losses</span>
                    <strong>{gameStats.losses || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Favorite</span>
                    <strong>{gameStats.favoriteCharacter || "—"}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!canRunSolo}
                onClick={startBattle}
                className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 text-sm font-black uppercase tracking-[0.24em] text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publicMode ? "Run battle" : "Launch battle"}
              </button>
            </aside>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    Party arena
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    ROOM CODE: {roomCode}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRoomCode(generateRoomCode())}
                  className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
                >
                  Refresh code
                </button>
              </div>

              <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-3 md:grid-cols-3">
                <label className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Room code
                  <input
                    value={roomCode}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Player name
                  <input
                    value={joinName}
                    onChange={(event) => setJoinName(event.target.value)}
                    placeholder="Your name"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Team name
                  <input
                    value={joinTeamName}
                    onChange={(event) => setJoinTeamName(event.target.value)}
                    placeholder="Shadow Vanguard"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                  />
                </label>
              </div>

              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-3 md:flex-row md:items-end">
                <label className="flex-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Join room code
                  <input
                    value={joinRoomCode}
                    onChange={(event) => setJoinRoomCode(event.target.value)}
                    placeholder="ENTER CODE"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm uppercase tracking-[0.2em] text-white placeholder:text-zinc-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={joinPartyRoom}
                  className="rounded-full border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200"
                >
                  Join room
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {partyPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-white/10 bg-zinc-950 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span className="text-[9px] uppercase tracking-[0.2em] text-yellow-300">
                          Host
                        </span>
                      )}
                    </div>
                    <label className="mt-3 block text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                      Team name
                      <input
                        value={player.teamName}
                        onChange={(event) =>
                          updatePartyPlayerTeamName(
                            player.id,
                            event.target.value,
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white"
                      />
                    </label>
                    <div className="mt-3 space-y-2">
                      {player.picks.length > 0 ? (
                        player.picks.map((pick) => (
                          <div
                            key={`${player.id}-${pick.id}`}
                            className="rounded-xl border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                          >
                            {getCharacterName(pick)}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/10 px-2 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                          Awaiting picks
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={addPartyGuest}
                  className="rounded-full border border-white/10 bg-zinc-950 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-300"
                >
                  Add player
                </button>
                <button
                  type="button"
                  onClick={autoDraftParty}
                  className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-yellow-200"
                >
                  Auto draft
                </button>
                <button
                  type="button"
                  onClick={runPartyBattle}
                  className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-950"
                >
                  Start party match
                </button>
              </div>
            </div>
          </div>
        )}

        {battleResult && (
          <div className="mt-8 rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#1a160f] p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-300">
                  Battle complete
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {battleResult.winner}
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-zinc-300">
                <Swords className="h-3.5 w-3.5 text-yellow-300" />{" "}
                {battleResult.durationMinutes} min
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  MVP
                </p>
                <div className="mt-2 text-lg font-bold text-yellow-200">
                  {battleResult.mvp}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Damage dealt: {battleResult.damageDealt}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Turning point
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {battleResult.turningPoint}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Biggest surprise
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {battleResult.biggestSurprise}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Battle log
                </p>
                <div className="mt-3 space-y-2">
                  {battleResult.battleLog.map((entry, index) => (
                    <div
                      key={`${entry}-${index}`}
                      className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
                    >
                      {entry}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    Chaos events
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    {battleResult.chaosEvents.map((event) => (
                      <div key={event} className="flex items-start gap-2">
                        <Flame className="mt-0.5 h-3.5 w-3.5 text-orange-400" />
                        <span>{event}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    Simulation effect
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    {battleResult.contextualEffects.map((effect) => (
                      <div
                        key={effect}
                        className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-2 py-2 text-xs text-yellow-100"
                      >
                        {effect}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function resolvePartyBattle(
  teamOne: CharacterRecord[],
  teamTwo: CharacterRecord[],
  battlefield: Battlefield,
  chaosMode: boolean,
): BattleSummary {
  const aScore = getTeamScore(teamOne, battlefield);
  const bScore = getTeamScore(teamTwo, battlefield);
  const winnerIsA = aScore >= bScore;
  const winnerTeam = winnerIsA ? teamOne : teamTwo;
  const loserTeam = winnerIsA ? teamTwo : teamOne;
  const mvp = winnerTeam.reduce(
    (best, current) =>
      getPowerScore(current) > getPowerScore(best) ? current : best,
    winnerTeam[0],
  );

  const chaosEvents = chaosMode
    ? [
        `${battlefield.name} destabilizes under a sudden environmental surge.`,
        `${mvp.name} capitalizes on the chaos and outplays the opposition.`,
      ]
    : ["No chaos event. The battlefield stays stable."];

  return {
    winner: `${winnerTeam.map(getCharacterName).join(" + ")}`,
    battleLog: [
      `${teamOne.map(getCharacterName).join(" + ")} enter ${battlefield.name}.`,
      `${teamTwo.map(getCharacterName).join(" + ")} answer in kind.`,
      `${battlefield.hazard} shifts the rhythm of the match.`,
      `${mvp.name} becomes the decisive pivot in the final sequence.`,
    ],
    mvp: mvp.name,
    turningPoint: `${battlefield.hazard} breaks the original plan and makes the team with better awareness the winner.`,
    biggestSurprise: `${loserTeam[0]?.name ?? "The losing side"} was numerically strong but lacked the flexibility to adapt.`,
    majorEvent: `${battlefield.hazard} was the key turning point.`,
    durationMinutes: 5 + Math.round(Math.random() * 11),
    damageDealt: Math.round(Math.abs(aScore - bScore) * 15),
    chaosEvents,
    winnerTeam: winnerTeam.map((character) => getCharacterName(character)),
    losingTeam: loserTeam.map((character) => getCharacterName(character)),
    contextualEffects: [
      `SIMULATION EFFECT: ${battlefield.name} grants a tactical bonus to the team that understands the environment.`,
      `SIMULATION EFFECT: unstable conditions suppress raw power for the losing side by roughly 8-12 points.`,
    ],
  };
}

export { BattleArena };
