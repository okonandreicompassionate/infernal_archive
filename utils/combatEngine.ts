// Deterministic weighted combat-simulation engine.
// The ENGINE decides who wins (grounded in real character/location data);
// the AI layer (wired up in server.ts) only writes the prose around that outcome.

export interface SimCombatant {
  id: string;
  name: string;
  codeName?: string;
  species?: string;
  occupation?: string;
  personality?: string;
  positiveTraits?: string;
  negativeTraits?: string;
  battlePhilosophy?: string;
  majorAbilities?: string;
  secondaryAbilities?: string;
  signatureTechniques?: string;
  physicalAppearance?: string;
  powers?: string[];
  skills?: string[];
  weaknesses?: string[];
  equipment?: string[];
  origin?: string;
}

export interface SimLocation {
  id?: string;
  name?: string;
  planetType?: string;
  climate?: string;
  atmosphere?: string;
  dominantSpecies?: string;
  technologyLevel?: string;
  description?: string;
}

export type Knowledge = "unknown" | "partial" | "full";
export type Preparation = "none" | "combatant1" | "combatant2" | "both";
export type Morals = "canon" | "bloodlusted" | "no_kill";

export interface SimSetup {
  locationName: string;
  distance: string;
  knowledge: Knowledge;
  preparation: Preparation;
  morals: Morals;
  conditions: string;
  winCondition: string;
}

interface StatBundle {
  speed: number;
  durability: number;
  intelligence: number;
  combatExperience: number;
  rawPower: number;
  weaknessPenalty: number;
  basePower: number;
}

interface ModifierBreakdown {
  matchup: number;
  environment: number;
  condition: number;
  personality: number;
  randomness: number;
  total: number;
}

export interface SimComputation {
  stats: [StatBundle, StatBundle];
  modifiers: [ModifierBreakdown, ModifierBreakdown];
  effective: [number, number];
  probability: [number, number];
  winnerIndex: 0 | 1;
  isUpset: boolean;
  turningPoint: string;
  primaryCause: string;
  unexpectedFactor: string;
}

// Simple deterministic PRNG (mulberry32) so reruns with an explicit seed are reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce(
    (count, kw) => (lower.includes(kw) ? count + 1 : count),
    0,
  );
}

const textBlob = (c: SimCombatant) =>
  [
    c.personality,
    c.positiveTraits,
    c.negativeTraits,
    c.battlePhilosophy,
    c.majorAbilities,
    c.secondaryAbilities,
    c.signatureTechniques,
    c.physicalAppearance,
    c.occupation,
    (c.powers || []).join(" "),
    (c.skills || []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

function deriveStats(c: SimCombatant, rng: () => number): StatBundle {
  const blob = textBlob(c);
  const powerCount = c.powers?.length || 0;
  const skillCount = c.skills?.length || 0;
  const weaknessCount = c.weaknesses?.length || 0;
  const equipmentCount = c.equipment?.length || 0;
  const variance = () => rng() * 10;

  const speed =
    40 +
    powerCount * 3 +
    countMatches(blob, ["speed", "reflexes", "agile", "swift", "fast"]) * 8 +
    variance();
  const durability =
    40 +
    countMatches(blob, [
      "durab",
      "regenerat",
      "armor",
      "resilient",
      "tank",
      "invulnerab",
    ]) *
      10 +
    equipmentCount * 3 +
    variance();
  const intelligence =
    40 +
    countMatches(blob, [
      "genius",
      "tactician",
      "strategist",
      "scientist",
      "intellect",
      "analytical",
      "engineer",
    ]) *
      10 +
    skillCount * 2 +
    variance();
  const combatExperience =
    40 +
    countMatches(blob, [
      "veteran",
      "trained",
      "master",
      "combat",
      "soldier",
      "warrior",
      "assassin",
      "operative",
    ]) *
      8 +
    skillCount * 3 +
    variance();
  const rawPower =
    40 +
    powerCount * 12 +
    countMatches(blob, [
      "cosmic",
      "godlike",
      "omnipotent",
      "reality",
      "multiversal",
      "primordial",
    ]) *
      15 +
    variance();
  const weaknessPenalty = weaknessCount * 6;

  const basePower =
    rawPower * 0.35 +
    speed * 0.15 +
    durability * 0.2 +
    intelligence * 0.1 +
    combatExperience * 0.2 -
    weaknessPenalty;

  return {
    speed,
    durability,
    intelligence,
    combatExperience,
    rawPower,
    weaknessPenalty,
    basePower: Math.max(10, basePower),
  };
}

// A first-pass "power interaction" table. Grounded in simple documented
// keyword antagonisms rather than an LLM freely deciding who counters whom —
// this is the seed of the fuller power_interactions table described for later.
const INTERACTIONS: { a: string[]; b: string[]; label: string }[] = [
  {
    a: ["fire", "flame", "heat", "pyro", "inferno"],
    b: ["ice", "cold", "frost", "cryo"],
    label: "Thermal matchup",
  },
  {
    a: ["light", "solar", "radiant", "photon"],
    b: ["void", "shadow", "dark", "umbra"],
    label: "Light vs. void matchup",
  },
  {
    a: ["reality", "anchor", "stabiliz"],
    b: ["void", "shadow", "dark", "phase", "intangib"],
    label: "Reality anchoring",
  },
  {
    a: ["electric", "lightning", "volt"],
    b: ["water", "aqua", "hydro"],
    label: "Conductive matchup",
  },
  {
    a: ["telepath", "mind", "psychic"],
    b: ["mindless", "construct", "robot", "android"],
    label: "Psionic immunity",
  },
  {
    a: ["sonic", "sound", "vibration"],
    b: ["crystal", "glass", "brittle"],
    label: "Resonance matchup",
  },
];

function matchupModifier(
  a: SimCombatant,
  b: SimCombatant,
): { aMod: number; bMod: number; label: string | null } {
  const aPowers = (a.powers || []).join(" ").toLowerCase();
  const bPowers = (b.powers || []).join(" ").toLowerCase();
  const aWeak = (a.weaknesses || []).join(" ").toLowerCase();
  const bWeak = (b.weaknesses || []).join(" ").toLowerCase();

  for (const rule of INTERACTIONS) {
    const aHasA = rule.a.some((kw) => aPowers.includes(kw));
    const bHasA = rule.a.some((kw) => bPowers.includes(kw));
    const bVulnerable = rule.b.some(
      (kw) => bPowers.includes(kw) || bWeak.includes(kw),
    );
    const aVulnerable = rule.b.some(
      (kw) => aPowers.includes(kw) || aWeak.includes(kw),
    );

    if (aHasA && bVulnerable)
      return { aMod: 1.18, bMod: 0.88, label: rule.label };
    if (bHasA && aVulnerable)
      return { aMod: 0.88, bMod: 1.18, label: rule.label };
  }
  return { aMod: 1, bMod: 1, label: null };
}

function environmentModifier(
  c: SimCombatant,
  location: SimLocation | null,
  conditions: string,
): { mod: number; label: string | null } {
  if (!location) return { mod: 1, label: null };
  const blob = textBlob(c);
  const cond = conditions.toLowerCase();
  let mod = 1;
  let label: string | null = null;

  if (
    location.dominantSpecies &&
    c.species &&
    location.dominantSpecies.toLowerCase().includes(c.species.toLowerCase())
  ) {
    mod *= 1.1;
    label = "Home-turf familiarity";
  }
  if (
    cond.includes("night") &&
    countMatches(blob, ["shadow", "void", "stealth", "night", "dark"]) > 0
  ) {
    mod *= 1.12;
    label = label || "Cover of darkness";
  }
  if (
    location.atmosphere &&
    countMatches(location.atmosphere.toLowerCase(), [
      "toxic",
      "radiation",
      "corrosive",
    ]) > 0 &&
    countMatches(blob, ["immun", "resistan", "adapt"]) === 0
  ) {
    mod *= 0.92;
    label = label || "Hostile atmosphere exposure";
  }
  if (
    location.technologyLevel &&
    countMatches(location.technologyLevel.toLowerCase(), [
      "high",
      "advanced",
      "futuristic",
    ]) > 0 &&
    countMatches(blob, ["hack", "tech", "engineer", "cyber"]) > 0
  ) {
    mod *= 1.1;
    label = label || "Technological exploitation";
  }
  return { mod, label };
}

function conditionModifier(
  index: 0 | 1,
  setup: SimSetup,
): { mod: number; label: string | null } {
  let mod = 1;
  let label: string | null = null;
  if (
    setup.preparation === "both" ||
    (setup.preparation === "combatant1" && index === 0) ||
    (setup.preparation === "combatant2" && index === 1)
  ) {
    mod *= 1.1;
    label = "Preparation advantage";
  }
  return { mod, label };
}

function personalityModifier(
  c: SimCombatant,
  setup: SimSetup,
): { mod: number; label: string | null } {
  const blob = textBlob(c);
  let mod = 1;
  let label: string | null = null;
  if (countMatches(blob, ["arrogant", "overconfiden", "cocky"]) > 0) {
    mod *= 0.95;
    label = "Overconfidence";
  }
  if (
    setup.morals === "canon" &&
    countMatches(blob, ["protective", "merciful", "compassion", "heroic"]) > 0
  ) {
    mod *= 0.97;
    label = label || "Restraint / held back";
  }
  if (
    countMatches(blob, ["ruthless", "strategic", "calculating", "adapt"]) > 0
  ) {
    mod *= 1.06;
    label = label || "Tactical adaptability";
  }
  return { mod, label };
}

export function runSimulation(
  combatants: [SimCombatant, SimCombatant],
  location: SimLocation | null,
  setup: SimSetup,
  seed?: number,
): SimComputation {
  const baseSeed =
    seed ??
    hashString(
      `${combatants[0].id}:${combatants[1].id}:${Date.now()}:${Math.random()}`,
    );
  const rng = mulberry32(baseSeed);

  const stats: [StatBundle, StatBundle] = [
    deriveStats(combatants[0], rng),
    deriveStats(combatants[1], rng),
  ];

  const {
    aMod,
    bMod,
    label: matchupLabel,
  } = matchupModifier(combatants[0], combatants[1]);
  const env0 = environmentModifier(combatants[0], location, setup.conditions);
  const env1 = environmentModifier(combatants[1], location, setup.conditions);
  const cond0 = conditionModifier(0, setup);
  const cond1 = conditionModifier(1, setup);
  const pers0 = personalityModifier(combatants[0], setup);
  const pers1 = personalityModifier(combatants[1], setup);

  // Wider randomness swing when neither side knows the other's abilities.
  const randSpread =
    setup.knowledge === "unknown"
      ? 0.35
      : setup.knowledge === "partial"
        ? 0.22
        : 0.1;
  const rand0 = 1 - randSpread / 2 + rng() * randSpread;
  const rand1 = 1 - randSpread / 2 + rng() * randSpread;

  const modifiers: [ModifierBreakdown, ModifierBreakdown] = [
    {
      matchup: aMod,
      environment: env0.mod,
      condition: cond0.mod,
      personality: pers0.mod,
      randomness: rand0,
      total: aMod * env0.mod * cond0.mod * pers0.mod * rand0,
    },
    {
      matchup: bMod,
      environment: env1.mod,
      condition: cond1.mod,
      personality: pers1.mod,
      randomness: rand1,
      total: bMod * env1.mod * cond1.mod * pers1.mod * rand1,
    },
  ];

  const effective: [number, number] = [
    stats[0].basePower * modifiers[0].total,
    stats[1].basePower * modifiers[1].total,
  ];
  const probability: [number, number] = [
    effective[0] / (effective[0] + effective[1]),
    effective[1] / (effective[0] + effective[1]),
  ];

  const roll = rng();
  const winnerIndex: 0 | 1 = roll < probability[0] ? 0 : 1;
  const favoredIndex: 0 | 1 = stats[0].basePower >= stats[1].basePower ? 0 : 1;
  const isUpset = winnerIndex !== favoredIndex;

  // Attribute the win to whichever modifier swung hardest in the winner's favor.
  const winnerMods = modifiers[winnerIndex];
  const categories: [string, number][] = [
    ["Power matchup", winnerMods.matchup],
    ["Environmental exploitation", winnerMods.environment],
    ["Preparation advantage", winnerMods.condition],
    ["Behavioral deviation", winnerMods.personality],
  ];
  categories.sort((a, b) => b[1] - a[1]);
  const primaryCause =
    categories[0][1] > 1.01 ? categories[0][0] : "Statistical favorite";
  const turningPoint =
    matchupLabel ||
    env0.label ||
    env1.label ||
    cond0.label ||
    cond1.label ||
    pers0.label ||
    pers1.label ||
    "A single decisive exchange";
  const unexpectedFactor = isUpset
    ? `${combatants[winnerIndex].name} overcame the numbers via ${primaryCause.toLowerCase()}.`
    : "None — the statistical favorite prevailed.";

  return {
    stats,
    modifiers,
    effective,
    probability,
    winnerIndex,
    isUpset,
    turningPoint,
    primaryCause,
    unexpectedFactor,
  };
}

// Builds the prompt handed to the AI narrative layer. The AI is only allowed
// to dramatize this pre-computed outcome, never to change who wins.
export function buildNarrativePrompt(
  combatants: [SimCombatant, SimCombatant],
  location: SimLocation | null,
  setup: SimSetup,
  computation: SimComputation,
): string {
  const [a, b] = combatants;
  const winner = combatants[computation.winnerIndex];
  const loser = combatants[computation.winnerIndex === 0 ? 1 : 0];
  const describe = (c: SimCombatant) =>
    `${c.name}${c.codeName ? ` ("${c.codeName}")` : ""} — Species: ${c.species || "Unknown"}. ` +
    `Powers: ${(c.powers || []).join(", ") || "none listed"}. ` +
    `Weaknesses: ${(c.weaknesses || []).join(", ") || "none listed"}. ` +
    `Fighting style / techniques: ${c.signatureTechniques || c.majorAbilities || "unspecified"}. ` +
    `Personality: ${c.personality || "unspecified"}. Equipment: ${(c.equipment || []).join(", ") || "none"}.`;

  return `You are writing the narrative for a comic-book combat simulation. A rules engine has already decided the numeric outcome below — you must NOT change who wins. Your only job is to dramatize it in terse, comic-panel-style prose.

COMBATANT 1: ${describe(a)}
COMBATANT 2: ${describe(b)}

LOCATION: ${location?.name || setup.locationName || "Unspecified"} (${location?.description || "no further detail"})
STARTING DISTANCE: ${setup.distance || "unspecified"}
KNOWLEDGE OF EACH OTHER: ${setup.knowledge}
PREPARATION: ${setup.preparation}
MORALS: ${setup.morals}
CONDITIONS: ${setup.conditions}
WIN CONDITION: ${setup.winCondition}

ENGINE RESULT (do not contradict this):
- Winner: ${winner.name}
- Win probability at simulation start: ${(computation.probability[0] * 100).toFixed(0)}% / ${(computation.probability[1] * 100).toFixed(0)}%
- Turning point: ${computation.turningPoint}
- Primary cause of outcome: ${computation.primaryCause}
- Was this an upset over the statistical favorite: ${computation.isUpset ? "yes" : "no"}

Write 4 to 6 short "ROUND" beats (label each "ROUND 01", "ROUND 02", etc.), each 2-4 short sentences, escalating tension, in present tense. Reference the turning point explicitly in the round it occurs. End with one short "TWIST" paragraph revealing something about ${winner.name} or ${loser.name} that recontextualizes the fight (tie it to their personality, weakness, or relationship if plausible), still consistent with ${winner.name} winning. Do not use markdown headers, just plain paragraphs separated by "---" on their own line.`;
}

export function fallbackNarrative(
  combatants: [SimCombatant, SimCombatant],
  computation: SimComputation,
  setup: SimSetup,
): string[] {
  const winner = combatants[computation.winnerIndex];
  const loser = combatants[computation.winnerIndex === 0 ? 1 : 0];
  return [
    `${combatants[0].name} and ${combatants[1].name} size each other up at ${setup.distance || "close range"}, neither committing first.`,
    `${loser.name} opens the engagement, testing the other's reactions.`,
    `The fight shifts: ${computation.turningPoint.toLowerCase()} changes the balance of the exchange.`,
    `${winner.name} capitalizes on the opening, pressing the advantage before ${loser.name} can recover.`,
    `TWIST: ${computation.unexpectedFactor}`,
  ];
}
