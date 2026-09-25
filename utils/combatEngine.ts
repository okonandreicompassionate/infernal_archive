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
  planetId?: string;
  parentLocation?: string;
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
  strength: number;
  speed: number;
  durability: number;
  intelligence: number;
  combatSkill: number;
  stamina: number;
  adaptability: number;
  experience: number;
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

interface RoundEvent {
  round: number;
  summary: string;
  reason: string;
  damage: number;
  healthAfter: [number, number];
  staminaAfter: [number, number];
}

export interface FightFinishState {
  winnerIndex: 0 | 1;
  loserIndex: 0 | 1;
  finisherIndex: 0 | 1;
  finisherName: string;
  loserName: string;
  finalBlow: string;
  loserTired: boolean;
  winnerTired: boolean;
  canContinue: boolean;
  finishType: "knockout" | "exhaustion" | "technical" | "decision";
}

export interface SimComputation {
  combatants: [SimCombatant, SimCombatant];
  stats: [StatBundle, StatBundle];
  modifiers: [ModifierBreakdown, ModifierBreakdown];
  effective: [number, number];
  probability: [number, number];
  winnerIndex: 0 | 1;
  isUpset: boolean;
  turningPoint: string;
  primaryCause: string;
  unexpectedFactor: string;
  why: string;
  rounds: RoundEvent[];
  finishState: FightFinishState;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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
    (c.weaknesses || []).join(" "),
    (c.equipment || []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

function parseDistance(distance: string): number {
  const normalized = distance.toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(m|km|ft|yard|y)/i);
  if (!match) return 30;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "km") return value * 1000;
  if (unit === "m") return value;
  if (unit === "ft" || unit === "yard" || unit === "y") return value * 0.3;
  return value;
}

function keywordMap(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function deriveStats(c: SimCombatant): StatBundle {
  const blob = textBlob(c);
  const powers = keywordMap((c.powers || []).join(" "));
  const skills = keywordMap((c.skills || []).join(" "));
  const weaknesses = keywordMap((c.weaknesses || []).join(" "));
  const equipment = keywordMap((c.equipment || []).join(" "));

  const strength =
    40 +
    (c.powers?.length || 0) * 8 +
    countMatches(blob, ["power", "force", "energy", "cosmic", "godlike"]) * 10;
  const speed =
    40 +
    countMatches(blob, [
      "speed",
      "reflex",
      "agile",
      "swift",
      "flight",
      "phase",
    ]) *
      9 +
    (c.skills?.includes("CQC") || c.skills?.includes("Combat") ? 5 : 0);
  const durability =
    40 +
    countMatches(blob, [
      "durable",
      "regener",
      "armor",
      "resist",
      "tank",
      "shield",
    ]) *
      10 +
    (equipment.length > 0 ? equipment.length * 2 : 0);
  const intelligence =
    40 +
    countMatches(blob, [
      "genius",
      "tactician",
      "strategist",
      "scientist",
      "engineer",
      "analytical",
    ]) *
      11 +
    Math.max(0, skills.length - 2) * 2;
  const combatSkill =
    40 +
    countMatches(blob, [
      "veteran",
      "trained",
      "master",
      "combat",
      "warrior",
      "assassin",
      "martial",
    ]) *
      10 +
    Math.max(0, skills.length - 2) * 3;
  const stamina =
    40 +
    countMatches(blob, [
      "endurance",
      "stamina",
      "tough",
      "fortitude",
      "resilient",
    ]) *
      9 +
    Math.max(0, 6 - weaknesses.length) * 3;
  const adaptability =
    40 +
    countMatches(blob, [
      "adapt",
      "react",
      "improv",
      "learn",
      "counter",
      "versatile",
    ]) *
      8 +
    (powers.length > 0 ? 4 : 0);
  const experience =
    40 +
    countMatches(blob, [
      "veteran",
      "seasoned",
      "trained",
      "expert",
      "battle",
      "mission",
    ]) *
      8 +
    (c.origin ? 5 : 0);
  const rawPower =
    strength * 0.9 +
    speed * 0.7 +
    intelligence * 0.6 +
    combatSkill * 0.8 +
    stamina * 0.6;
  const weaknessPenalty = Math.max(0, weaknesses.length * 6);

  return {
    strength: clamp(strength, 30, 100),
    speed: clamp(speed, 30, 100),
    durability: clamp(durability, 30, 100),
    intelligence: clamp(intelligence, 30, 100),
    combatSkill: clamp(combatSkill, 30, 100),
    stamina: clamp(stamina, 30, 100),
    adaptability: clamp(adaptability, 30, 100),
    experience: clamp(experience, 30, 100),
    rawPower: clamp(rawPower, 30, 160),
    weaknessPenalty,
    basePower: clamp(rawPower - weaknessPenalty, 20, 160),
  };
}

const INTERACTIONS: { a: string[]; b: string[]; label: string }[] = [
  {
    a: ["fire", "flame", "heat", "pyro", "inferno"],
    b: ["ice", "cold", "frost", "cryo"],
    label: "thermal pressure",
  },
  {
    a: ["light", "solar", "radiant", "photon"],
    b: ["void", "shadow", "dark", "umbra"],
    label: "light versus void",
  },
  {
    a: ["electric", "lightning", "volt"],
    b: ["water", "aqua", "hydro", "shield"],
    label: "conductive overload",
  },
  {
    a: ["telepath", "mind", "psychic", "illusion"],
    b: ["robot", "android", "construct", "machine"],
    label: "mental disruption",
  },
  {
    a: ["sonic", "sound", "vibration"],
    b: ["glass", "crystal", "brittle", "armor"],
    label: "resonant fracture",
  },
  {
    a: ["gravity", "mass", "force", "kinetic"],
    b: ["air", "wind", "speed", "agility"],
    label: "gravitational disruption",
  },
  {
    a: ["speed", "movement", "phase", "blink", "teleport"],
    b: ["fortify", "barrier", "shield", "anchor"],
    label: "mobility pressure",
  },
];

function matchupModifier(a: SimCombatant, b: SimCombatant) {
  const aKeys = keywordMap((a.powers || []).join(" "));
  const bKeys = keywordMap((b.powers || []).join(" "));
  const aWeak = keywordMap((a.weaknesses || []).join(" "));
  const bWeak = keywordMap((b.weaknesses || []).join(" "));

  let aMod = 1;
  let bMod = 1;
  let label: string | null = null;

  for (const rule of INTERACTIONS) {
    const aHas = rule.a.some(
      (kw) => aKeys.includes(kw) || textBlob(a).includes(kw),
    );
    const bHas = rule.a.some(
      (kw) => bKeys.includes(kw) || textBlob(b).includes(kw),
    );
    const aCountered = rule.b.some(
      (kw) => aWeak.includes(kw) || bKeys.includes(kw),
    );
    const bCountered = rule.b.some(
      (kw) => bWeak.includes(kw) || aKeys.includes(kw),
    );

    if (aHas && bCountered) {
      aMod *= 1.18;
      bMod *= 0.89;
      label = label || rule.label;
    }
    if (bHas && aCountered) {
      bMod *= 1.18;
      aMod *= 0.89;
      label = label || rule.label;
    }
  }

  const aTraits = textBlob(a);
  const bTraits = textBlob(b);
  if (
    aTraits.includes("shield") &&
    bTraits.includes("heavy") &&
    !aTraits.includes("counter")
  ) {
    aMod *= 1.04;
  }
  if (
    bTraits.includes("shield") &&
    aTraits.includes("heavy") &&
    !bTraits.includes("counter")
  ) {
    bMod *= 1.04;
  }

  return { aMod, bMod, label };
}

function environmentModifier(
  c: SimCombatant,
  location: SimLocation | null,
  conditions: string,
) {
  if (!location) return { mod: 1, label: null };
  const blob = textBlob(c);
  let mod = 1;
  let label: string | null = null;

  if (
    location.dominantSpecies &&
    c.species &&
    location.dominantSpecies.toLowerCase().includes(c.species.toLowerCase())
  ) {
    mod *= 1.08;
    label = label || "home terrain familiarity";
  }
  if (
    conditions.toLowerCase().includes("night") &&
    countMatches(blob, ["shadow", "void", "stealth", "dark", "night"]) > 0
  ) {
    mod *= 1.1;
    label = label || "night cover";
  }
  if (
    conditions.toLowerCase().includes("rain") &&
    countMatches(blob, ["electric", "lightning", "storm"]) > 0
  ) {
    mod *= 1.06;
    label = label || "weather leverage";
  }
  if (
    location.atmosphere &&
    countMatches(location.atmosphere.toLowerCase(), [
      "toxic",
      "radiation",
      "corrosive",
    ]) > 0 &&
    countMatches(blob, ["immun", "resist", "adapt"]) === 0
  ) {
    mod *= 0.9;
    label = label || "hostile environment pressure";
  }
  return { mod, label };
}

function conditionModifier(index: 0 | 1, setup: SimSetup) {
  const prepared =
    setup.preparation === "both" ||
    (setup.preparation === "combatant1" && index === 0) ||
    (setup.preparation === "combatant2" && index === 1);

  return {
    mod: prepared ? 1.12 : 1,
    label: prepared ? "preparation advantage" : null,
  };
}

function personalityModifier(c: SimCombatant, setup: SimSetup) {
  const blob = textBlob(c);
  let mod = 1;
  let label: string | null = null;

  if (countMatches(blob, ["arrogant", "cocky", "overconfident"]) > 0) {
    mod *= 0.92;
    label = label || "overconfidence";
  }
  if (
    countMatches(blob, ["calculating", "strategic", "adaptive", "tactician"]) >
    0
  ) {
    mod *= 1.07;
    label = label || "adaptability";
  }
  if (
    setup.morals === "no_kill" &&
    countMatches(blob, ["merciful", "protective", "heroic"]) > 0
  ) {
    mod *= 0.94;
    label = label || "restraint";
  }

  return { mod, label };
}

function parseStatRange(value: number) {
  return clamp(value, 10, 100);
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
    deriveStats(combatants[0]),
    deriveStats(combatants[1]),
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

  const randSpread =
    setup.knowledge === "unknown"
      ? 0.34
      : setup.knowledge === "partial"
        ? 0.22
        : 0.12;

  const modifiers: [ModifierBreakdown, ModifierBreakdown] = [
    {
      matchup: aMod,
      environment: env0.mod,
      condition: cond0.mod,
      personality: pers0.mod,
      randomness: 1 - randSpread / 2 + rng() * randSpread,
      total: 1,
    },
    {
      matchup: bMod,
      environment: env1.mod,
      condition: cond1.mod,
      personality: pers1.mod,
      randomness: 1 - randSpread / 2 + rng() * randSpread,
      total: 1,
    },
  ];

  modifiers[0].total =
    modifiers[0].matchup *
    modifiers[0].environment *
    modifiers[0].condition *
    modifiers[0].personality *
    modifiers[0].randomness;
  modifiers[1].total =
    modifiers[1].matchup *
    modifiers[1].environment *
    modifiers[1].condition *
    modifiers[1].personality *
    modifiers[1].randomness;

  const distanceFactor = parseDistance(setup.distance) / 80;
  const knowledgeFactor =
    setup.knowledge === "full"
      ? 1.08
      : setup.knowledge === "partial"
        ? 1.02
        : 0.95;
  const moraleFactor =
    setup.morals === "bloodlusted"
      ? 1.08
      : setup.morals === "no_kill"
        ? 0.96
        : 1;

  const fighterRaw = [
    stats[0].basePower * 0.9 +
      stats[0].strength * 0.6 +
      stats[0].combatSkill * 0.7 +
      stats[0].adaptability * 0.4,
    stats[1].basePower * 0.9 +
      stats[1].strength * 0.6 +
      stats[1].combatSkill * 0.7 +
      stats[1].adaptability * 0.4,
  ];

  const effective: [number, number] = [
    fighterRaw[0] *
      modifiers[0].total *
      distanceFactor *
      knowledgeFactor *
      moraleFactor,
    fighterRaw[1] *
      modifiers[1].total *
      distanceFactor *
      knowledgeFactor *
      moraleFactor,
  ];

  const probability: [number, number] = [
    effective[0] / (effective[0] + effective[1]),
    effective[1] / (effective[0] + effective[1]),
  ];

  const state = [
    {
      health: 100,
      stamina: 100,
      energy: 100,
      wounds: 0,
      position: 0,
      adaptation: 0,
    },
    {
      health: 100,
      stamina: 100,
      energy: 100,
      wounds: 0,
      position: 0,
      adaptation: 0,
    },
  ];

  const rounds: RoundEvent[] = [];
  let winnerIndex: 0 | 1 = probability[0] >= probability[1] ? 0 : 1;
  let lastReason = "statistical model";
  let lastStrikeIndex: 0 | 1 = 0;
  let finalBlow =
    "The fight turns on a decisive exchange of pressure and timing.";
  let finishType: FightFinishState["finishType"] = "decision";

  for (let round = 1; round <= 7; round++) {
    const actionA =
      stats[0].speed * 0.42 +
      stats[0].combatSkill * 0.33 +
      stats[0].intelligence * 0.16 +
      state[0].adaptation * 0.2 +
      state[0].position * 0.15 +
      (setup.preparation === "combatant1" ? 8 : 0) -
      state[0].wounds * 0.2;

    const actionB =
      stats[1].speed * 0.42 +
      stats[1].combatSkill * 0.33 +
      stats[1].intelligence * 0.16 +
      state[1].adaptation * 0.2 +
      state[1].position * 0.15 +
      (setup.preparation === "combatant2" ? 8 : 0) -
      state[1].wounds * 0.2;

    const counterA = matchupModifier(combatants[0], combatants[1]).aMod;
    const counterB = matchupModifier(combatants[1], combatants[0]).aMod;

    let damageA = clamp(
      actionA * counterA * 0.18 -
        (stats[1].durability * 0.14 + state[1].position * 0.6),
      4,
      32,
    );
    let damageB = clamp(
      actionB * counterB * 0.18 -
        (stats[0].durability * 0.14 + state[0].position * 0.6),
      4,
      32,
    );

    const distanceMeters = parseDistance(setup.distance);
    if (distanceMeters > 150) {
      damageA *= 0.8;
      damageB *= 0.8;
    }
    if (setup.knowledge === "unknown") {
      damageA *= 0.94;
      damageB *= 0.94;
    }
    if (setup.conditions.toLowerCase().includes("night")) {
      damageA *= 1.02;
      damageB *= 1.02;
    }

    state[0].stamina = clamp(
      state[0].stamina - 8 + stats[0].stamina * 0.04,
      0,
      100,
    );
    state[1].stamina = clamp(
      state[1].stamina - 8 + stats[1].stamina * 0.04,
      0,
      100,
    );
    state[0].energy = clamp(
      state[0].energy - 5 + stats[0].intelligence * 0.04,
      0,
      100,
    );
    state[1].energy = clamp(
      state[1].energy - 5 + stats[1].intelligence * 0.04,
      0,
      100,
    );

    if (state[0].stamina < 28 || actionA < actionB) {
      damageA *= 0.9;
    }
    if (state[1].stamina < 28 || actionB < actionA) {
      damageB *= 0.9;
    }

    const strikeA = damageA * (0.9 + rng() * 0.28);
    const strikeB = damageB * (0.9 + rng() * 0.28);

    state[0].health = clamp(state[0].health - strikeB, 0, 100);
    state[1].health = clamp(state[1].health - strikeA, 0, 100);

    state[0].wounds = clamp(state[0].wounds + strikeB * 0.16, 0, 100);
    state[1].wounds = clamp(state[1].wounds + strikeA * 0.16, 0, 100);
    state[0].position = clamp(
      state[0].position +
        (actionA > actionB ? 8 : -4) +
        (distanceMeters < 25 ? 5 : 0),
      -20,
      20,
    );
    state[1].position = clamp(
      state[1].position +
        (actionB > actionA ? 8 : -4) +
        (distanceMeters < 25 ? 5 : 0),
      -20,
      20,
    );
    state[0].adaptation = clamp(
      state[0].adaptation + (actionB > actionA ? 10 : 4),
      0,
      100,
    );
    state[1].adaptation = clamp(
      state[1].adaptation + (actionA > actionB ? 10 : 4),
      0,
      100,
    );

    const roundReason =
      actionA > actionB
        ? `${combatants[0].name} dictated the pace with superior timing and pressure.`
        : actionB > actionA
          ? `${combatants[1].name} forced the exchange with better control and spacing.`
          : "Neither fighter gained a decisive edge, but the exchange still shaped the next exchanges.";

    const summary =
      actionA >= actionB
        ? `${combatants[0].name} attacks first, forcing ${combatants[1].name} to react under pressure.`
        : `${combatants[1].name} lands the sharper sequence, pushing ${combatants[0].name} back on the back foot.`;

    lastStrikeIndex = strikeA >= strikeB ? 0 : 1;

    rounds.push({
      round,
      summary,
      reason: roundReason,
      damage: Math.round(Math.max(strikeA, strikeB)),
      healthAfter: [
        Number(state[0].health.toFixed(1)),
        Number(state[1].health.toFixed(1)),
      ],
      staminaAfter: [
        Number(state[0].stamina.toFixed(1)),
        Number(state[1].stamina.toFixed(1)),
      ],
    });

    if (state[0].health <= 0 || state[1].health <= 0) {
      winnerIndex = state[0].health > state[1].health ? 0 : 1;
      lastReason = roundReason;
      finishType = "knockout";
      const finisherIndex = lastStrikeIndex ?? winnerIndex;
      const loserIndex = finisherIndex === 0 ? 1 : 0;
      finalBlow = `${combatants[finisherIndex].name} closes the fight with a brutal finish while ${combatants[loserIndex].name} is already collapsing from the damage.`;
      break;
    }
    if (round === 6) {
      winnerIndex = state[0].health >= state[1].health ? 0 : 1;
      lastReason = `Late-round resource drift favored ${combatants[winnerIndex].name}.`;
      finishType = state[winnerIndex].stamina > 35 ? "technical" : "exhaustion";
      const finisherIndex = lastStrikeIndex ?? winnerIndex;
      const loserIndex = finisherIndex === 0 ? 1 : 0;
      finalBlow =
        state[loserIndex].stamina < 28 || state[loserIndex].energy < 25
          ? `${combatants[finisherIndex].name} lands the last decisive exchange as ${combatants[loserIndex].name} tires out and can no longer answer.`
          : `${combatants[finisherIndex].name} takes the momentum and wins the exchange before ${combatants[loserIndex].name} can recover.`;
    }
  }

  const totalHealth = state[0].health + state[1].health;
  const preferredWinner = state[0].health >= state[1].health ? 0 : 1;
  const victoryIndex = totalHealth > 0 ? preferredWinner : winnerIndex;
  const finalWinner = victoryIndex as 0 | 1;
  const finalLoser = finalWinner === 0 ? 1 : 0;

  const categoryFactors: [string, number][] = [
    [
      "power and damage output",
      stats[finalWinner].strength + stats[finalWinner].combatSkill,
    ],
    ["environment and positioning", modifiers[finalWinner].environment * 20],
    [
      "adaptation under pressure",
      stats[finalWinner].adaptability + state[finalWinner].adaptation / 2,
    ],
    [
      "preparation and knowledge",
      modifiers[finalWinner].condition *
        modifiers[finalWinner].personality *
        40,
    ],
  ];
  categoryFactors.sort((a, b) => b[1] - a[1]);
  const primaryCause = categoryFactors[0][0];
  const turningPoint =
    matchupLabel ||
    env0.label ||
    env1.label ||
    cond0.label ||
    cond1.label ||
    pers0.label ||
    pers1.label ||
    `${combatants[finalWinner].name} adjusted after the midpoint and broke the rhythm.`;

  const favored = stats[0].basePower >= stats[1].basePower ? 0 : 1;
  const isUpset = finalWinner !== favored;
  const unexpectedFactor = isUpset
    ? `${combatants[finalWinner].name} won by outlasting the favored profile through ${primaryCause}.`
    : `${combatants[finalWinner].name} won as the stronger profile; the model expected it.`;

  const loserIndex = finalWinner === 0 ? 1 : 0;
  const finisherIndex = lastStrikeIndex ?? finalWinner;
  const loserTired =
    state[loserIndex].stamina < 28 || state[loserIndex].energy < 25;
  const winnerTired =
    state[finalWinner].stamina < 28 || state[finalWinner].energy < 25;
  const canContinue =
    state[loserIndex].health > 15 &&
    state[loserIndex].stamina > 22 &&
    state[loserIndex].energy > 18;

  const finishState: FightFinishState = {
    winnerIndex: finalWinner,
    loserIndex,
    finisherIndex,
    finisherName: combatants[finisherIndex].name,
    loserName: combatants[loserIndex].name,
    finalBlow:
      finalBlow ||
      `${combatants[finisherIndex].name} finished the exchange with a decisive ${primaryCause} sequence that broke ${combatants[loserIndex].name}'s rhythm.`,
    loserTired,
    winnerTired,
    canContinue,
    finishType,
  };

  const why = `${combatants[finalWinner].name} won because ${primaryCause} carried more weight than the opponent's resilience, and the decisive shift was ${turningPoint}. This outcome was shaped by the environment, preparation, and round-to-round adaptation, not by random narrative overrides. ${combatants[finisherIndex].name} was the one who closed the fight; ${combatants[loserIndex].name}${loserTired ? " was worn down and couldn't keep answering" : " still had enough left to continue"}.`;

  return {
    combatants,
    stats,
    modifiers,
    effective,
    probability,
    winnerIndex: finalWinner,
    isUpset,
    turningPoint,
    primaryCause,
    unexpectedFactor,
    why,
    rounds,
    finishState,
  };
}

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
- Finisher: ${computation.finishState.finisherName}
- Final blow: ${computation.finishState.finalBlow}
- Loser tired: ${computation.finishState.loserTired ? "yes" : "no"}
- Could continue: ${computation.finishState.canContinue ? "yes" : "no"}
- Win probability at simulation start: ${(computation.probability[0] * 100).toFixed(0)}% / ${(computation.probability[1] * 100).toFixed(0)}%
- Turning point: ${computation.turningPoint}
- Primary cause of outcome: ${computation.primaryCause}
- Why this happened: ${computation.why}
- Was this an upset over the statistical favorite: ${computation.isUpset ? "yes" : "no"}

Write 4 to 6 short "ROUND" beats (label each "ROUND 01", "ROUND 02", etc.), each 2-4 short sentences, escalating tension, in present tense. Reference the turning point explicitly in the round it occurs. Mention who lands the final blow and whether the loser is too tired to continue. End with one short "TWIST" paragraph revealing something about ${winner.name} or ${loser.name} that recontextualizes the fight (tie it to their personality, weakness, or relationship if plausible), still consistent with ${winner.name} winning. Do not use markdown headers, just plain paragraphs separated by "---" on their own line.`;
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
