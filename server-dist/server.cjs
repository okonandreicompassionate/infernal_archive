var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_fs = __toESM(require("fs"), 1);

// utils/supabase/server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_supabase_js = require("@supabase/supabase-js");
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config();
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabase = supabaseUrl && supabaseKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey) : null;
var supabaseAdmin = supabaseUrl && serviceRoleKey ? (0, import_supabase_js.createClient)(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
}) : null;
var databaseClient = () => supabaseAdmin || supabase;
function getUserClient(authorization) {
  if (!supabaseUrl || !supabaseKey || !authorization?.startsWith("Bearer "))
    return null;
  const token = authorization.slice("Bearer ".length);
  return (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
async function getAuthenticatedProfile(authorization) {
  if (!supabase || !authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  const userClient = getUserClient(authorization);
  if (!userClient) return null;
  const { data: userData } = await userClient.auth.getUser(token);
  if (!userData.user) return null;
  const { data: profile } = await userClient.from("profiles").select("id, email, display_name, role, active").eq("id", userData.user.id).maybeSingle();
  return profile?.active ? { user: userData.user, profile } : null;
}
var tableForCollection = (collection) => collection.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
var camelToSnake = (value) => {
  if (Array.isArray(value)) return value.map(camelToSnake);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      camelToSnake(item)
    ])
  );
};
var snakeToCamel = (value) => {
  if (Array.isArray(value)) return value.map(snakeToCamel);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      snakeToCamel(item)
    ])
  );
};
var toSupabaseRow = (value) => camelToSnake(value);
var fromSupabaseRow = (value) => snakeToCamel(value);
async function readCollection(collection) {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured."
    };
  const { data, error } = await client.from(tableForCollection(collection)).select("*");
  if (error) return { data: null, error: error.message };
  return { data: (data || []).map(fromSupabaseRow), error: null };
}
async function createRow(collection, value) {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured."
    };
  const { data, error } = await client.from(tableForCollection(collection)).insert(toSupabaseRow(value)).select().single();
  if (error) return { data: null, error: error.message };
  return { data: fromSupabaseRow(data), error: null };
}
async function updateRow(collection, id, value) {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured."
    };
  const { data, error } = await client.from(tableForCollection(collection)).update(toSupabaseRow(value)).eq("id", id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: fromSupabaseRow(data), error: null };
}
async function deleteRow(collection, id) {
  const client = databaseClient();
  if (!client)
    return {
      data: null,
      error: "Supabase environment variables are not configured."
    };
  const { data, error } = await client.from(tableForCollection(collection)).delete().eq("id", id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: fromSupabaseRow(data), error: null };
}

// utils/combatEngine.ts
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}
function countMatches(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.reduce(
    (count, kw) => lower.includes(kw) ? count + 1 : count,
    0
  );
}
var textBlob = (c) => [
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
  (c.skills || []).join(" ")
].filter(Boolean).join(" ").toLowerCase();
function deriveStats(c, rng) {
  const blob = textBlob(c);
  const powerCount = c.powers?.length || 0;
  const skillCount = c.skills?.length || 0;
  const weaknessCount = c.weaknesses?.length || 0;
  const equipmentCount = c.equipment?.length || 0;
  const variance = () => rng() * 10;
  const speed = 40 + powerCount * 3 + countMatches(blob, ["speed", "reflexes", "agile", "swift", "fast"]) * 8 + variance();
  const durability = 40 + countMatches(blob, [
    "durab",
    "regenerat",
    "armor",
    "resilient",
    "tank",
    "invulnerab"
  ]) * 10 + equipmentCount * 3 + variance();
  const intelligence = 40 + countMatches(blob, [
    "genius",
    "tactician",
    "strategist",
    "scientist",
    "intellect",
    "analytical",
    "engineer"
  ]) * 10 + skillCount * 2 + variance();
  const combatExperience = 40 + countMatches(blob, [
    "veteran",
    "trained",
    "master",
    "combat",
    "soldier",
    "warrior",
    "assassin",
    "operative"
  ]) * 8 + skillCount * 3 + variance();
  const rawPower = 40 + powerCount * 12 + countMatches(blob, [
    "cosmic",
    "godlike",
    "omnipotent",
    "reality",
    "multiversal",
    "primordial"
  ]) * 15 + variance();
  const weaknessPenalty = weaknessCount * 6;
  const basePower = rawPower * 0.35 + speed * 0.15 + durability * 0.2 + intelligence * 0.1 + combatExperience * 0.2 - weaknessPenalty;
  return {
    speed,
    durability,
    intelligence,
    combatExperience,
    rawPower,
    weaknessPenalty,
    basePower: Math.max(10, basePower)
  };
}
var INTERACTIONS = [
  {
    a: ["fire", "flame", "heat", "pyro", "inferno"],
    b: ["ice", "cold", "frost", "cryo"],
    label: "Thermal matchup"
  },
  {
    a: ["light", "solar", "radiant", "photon"],
    b: ["void", "shadow", "dark", "umbra"],
    label: "Light vs. void matchup"
  },
  {
    a: ["reality", "anchor", "stabiliz"],
    b: ["void", "shadow", "dark", "phase", "intangib"],
    label: "Reality anchoring"
  },
  {
    a: ["electric", "lightning", "volt"],
    b: ["water", "aqua", "hydro"],
    label: "Conductive matchup"
  },
  {
    a: ["telepath", "mind", "psychic"],
    b: ["mindless", "construct", "robot", "android"],
    label: "Psionic immunity"
  },
  {
    a: ["sonic", "sound", "vibration"],
    b: ["crystal", "glass", "brittle"],
    label: "Resonance matchup"
  }
];
function matchupModifier(a, b) {
  const aPowers = (a.powers || []).join(" ").toLowerCase();
  const bPowers = (b.powers || []).join(" ").toLowerCase();
  const aWeak = (a.weaknesses || []).join(" ").toLowerCase();
  const bWeak = (b.weaknesses || []).join(" ").toLowerCase();
  for (const rule of INTERACTIONS) {
    const aHasA = rule.a.some((kw) => aPowers.includes(kw));
    const bHasA = rule.a.some((kw) => bPowers.includes(kw));
    const bVulnerable = rule.b.some(
      (kw) => bPowers.includes(kw) || bWeak.includes(kw)
    );
    const aVulnerable = rule.b.some(
      (kw) => aPowers.includes(kw) || aWeak.includes(kw)
    );
    if (aHasA && bVulnerable)
      return { aMod: 1.18, bMod: 0.88, label: rule.label };
    if (bHasA && aVulnerable)
      return { aMod: 0.88, bMod: 1.18, label: rule.label };
  }
  return { aMod: 1, bMod: 1, label: null };
}
function environmentModifier(c, location, conditions) {
  if (!location) return { mod: 1, label: null };
  const blob = textBlob(c);
  const cond = conditions.toLowerCase();
  let mod = 1;
  let label = null;
  if (location.dominantSpecies && c.species && location.dominantSpecies.toLowerCase().includes(c.species.toLowerCase())) {
    mod *= 1.1;
    label = "Home-turf familiarity";
  }
  if (cond.includes("night") && countMatches(blob, ["shadow", "void", "stealth", "night", "dark"]) > 0) {
    mod *= 1.12;
    label = label || "Cover of darkness";
  }
  if (location.atmosphere && countMatches(location.atmosphere.toLowerCase(), [
    "toxic",
    "radiation",
    "corrosive"
  ]) > 0 && countMatches(blob, ["immun", "resistan", "adapt"]) === 0) {
    mod *= 0.92;
    label = label || "Hostile atmosphere exposure";
  }
  if (location.technologyLevel && countMatches(location.technologyLevel.toLowerCase(), [
    "high",
    "advanced",
    "futuristic"
  ]) > 0 && countMatches(blob, ["hack", "tech", "engineer", "cyber"]) > 0) {
    mod *= 1.1;
    label = label || "Technological exploitation";
  }
  return { mod, label };
}
function conditionModifier(index, setup) {
  let mod = 1;
  let label = null;
  if (setup.preparation === "both" || setup.preparation === "combatant1" && index === 0 || setup.preparation === "combatant2" && index === 1) {
    mod *= 1.1;
    label = "Preparation advantage";
  }
  return { mod, label };
}
function personalityModifier(c, setup) {
  const blob = textBlob(c);
  let mod = 1;
  let label = null;
  if (countMatches(blob, ["arrogant", "overconfiden", "cocky"]) > 0) {
    mod *= 0.95;
    label = "Overconfidence";
  }
  if (setup.morals === "canon" && countMatches(blob, ["protective", "merciful", "compassion", "heroic"]) > 0) {
    mod *= 0.97;
    label = label || "Restraint / held back";
  }
  if (countMatches(blob, ["ruthless", "strategic", "calculating", "adapt"]) > 0) {
    mod *= 1.06;
    label = label || "Tactical adaptability";
  }
  return { mod, label };
}
function runSimulation(combatants, location, setup, seed) {
  const baseSeed = seed ?? hashString(
    `${combatants[0].id}:${combatants[1].id}:${Date.now()}:${Math.random()}`
  );
  const rng = mulberry32(baseSeed);
  const stats = [
    deriveStats(combatants[0], rng),
    deriveStats(combatants[1], rng)
  ];
  const {
    aMod,
    bMod,
    label: matchupLabel
  } = matchupModifier(combatants[0], combatants[1]);
  const env0 = environmentModifier(combatants[0], location, setup.conditions);
  const env1 = environmentModifier(combatants[1], location, setup.conditions);
  const cond0 = conditionModifier(0, setup);
  const cond1 = conditionModifier(1, setup);
  const pers0 = personalityModifier(combatants[0], setup);
  const pers1 = personalityModifier(combatants[1], setup);
  const randSpread = setup.knowledge === "unknown" ? 0.35 : setup.knowledge === "partial" ? 0.22 : 0.1;
  const rand0 = 1 - randSpread / 2 + rng() * randSpread;
  const rand1 = 1 - randSpread / 2 + rng() * randSpread;
  const modifiers = [
    {
      matchup: aMod,
      environment: env0.mod,
      condition: cond0.mod,
      personality: pers0.mod,
      randomness: rand0,
      total: aMod * env0.mod * cond0.mod * pers0.mod * rand0
    },
    {
      matchup: bMod,
      environment: env1.mod,
      condition: cond1.mod,
      personality: pers1.mod,
      randomness: rand1,
      total: bMod * env1.mod * cond1.mod * pers1.mod * rand1
    }
  ];
  const effective = [
    stats[0].basePower * modifiers[0].total,
    stats[1].basePower * modifiers[1].total
  ];
  const probability = [
    effective[0] / (effective[0] + effective[1]),
    effective[1] / (effective[0] + effective[1])
  ];
  const roll = rng();
  const winnerIndex = roll < probability[0] ? 0 : 1;
  const favoredIndex = stats[0].basePower >= stats[1].basePower ? 0 : 1;
  const isUpset = winnerIndex !== favoredIndex;
  const winnerMods = modifiers[winnerIndex];
  const categories = [
    ["Power matchup", winnerMods.matchup],
    ["Environmental exploitation", winnerMods.environment],
    ["Preparation advantage", winnerMods.condition],
    ["Behavioral deviation", winnerMods.personality]
  ];
  categories.sort((a, b) => b[1] - a[1]);
  const primaryCause = categories[0][1] > 1.01 ? categories[0][0] : "Statistical favorite";
  const turningPoint = matchupLabel || env0.label || env1.label || cond0.label || cond1.label || pers0.label || pers1.label || "A single decisive exchange";
  const unexpectedFactor = isUpset ? `${combatants[winnerIndex].name} overcame the numbers via ${primaryCause.toLowerCase()}.` : "None \u2014 the statistical favorite prevailed.";
  return {
    stats,
    modifiers,
    effective,
    probability,
    winnerIndex,
    isUpset,
    turningPoint,
    primaryCause,
    unexpectedFactor
  };
}
function buildNarrativePrompt(combatants, location, setup, computation) {
  const [a, b] = combatants;
  const winner = combatants[computation.winnerIndex];
  const loser = combatants[computation.winnerIndex === 0 ? 1 : 0];
  const describe = (c) => `${c.name}${c.codeName ? ` ("${c.codeName}")` : ""} \u2014 Species: ${c.species || "Unknown"}. Powers: ${(c.powers || []).join(", ") || "none listed"}. Weaknesses: ${(c.weaknesses || []).join(", ") || "none listed"}. Fighting style / techniques: ${c.signatureTechniques || c.majorAbilities || "unspecified"}. Personality: ${c.personality || "unspecified"}. Equipment: ${(c.equipment || []).join(", ") || "none"}.`;
  return `You are writing the narrative for a comic-book combat simulation. A rules engine has already decided the numeric outcome below \u2014 you must NOT change who wins. Your only job is to dramatize it in terse, comic-panel-style prose.

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
function fallbackNarrative(combatants, computation, setup) {
  const winner = combatants[computation.winnerIndex];
  const loser = combatants[computation.winnerIndex === 0 ? 1 : 0];
  return [
    `${combatants[0].name} and ${combatants[1].name} size each other up at ${setup.distance || "close range"}, neither committing first.`,
    `${loser.name} opens the engagement, testing the other's reactions.`,
    `The fight shifts: ${computation.turningPoint.toLowerCase()} changes the balance of the exchange.`,
    `${winner.name} capitalizes on the opening, pressing the advantage before ${loser.name} can recover.`,
    `TWIST: ${computation.unexpectedFactor}`
  ];
}

// server.ts
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT || 3e3);
var aiProvider = (process.env.AI_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "gemini")).toLowerCase();
var cachedGroqModel = null;
async function resolveGroqModel(apiKey) {
  if (cachedGroqModel) return cachedGroqModel;
  const preferredModels = [
    process.env.GROQ_MODEL?.trim(),
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b"
  ].filter(Boolean);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await response.json();
    const availableModels = new Set(
      (data.data || []).filter((model) => model.active !== false && model.id).map((model) => model.id)
    );
    const availablePreferred = preferredModels.find(
      (model) => availableModels.has(model)
    );
    if (availablePreferred) {
      cachedGroqModel = availablePreferred;
      return cachedGroqModel;
    }
    throw new Error(
      "No supported Groq chat model is available for this API key."
    );
  } catch (error) {
    if (process.env.GROQ_MODEL?.trim()) return process.env.GROQ_MODEL.trim();
    throw error;
  }
}
async function generateAIText(prompt) {
  if (aiProvider === "groq") {
    const apiKey2 = process.env.GROQ_API_KEY;
    if (!apiKey2) throw new Error("GROQ_API_KEY is not configured.");
    const groqModel = await resolveGroqModel(apiKey2);
    const response2 = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey2}`
        },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }]
        })
      }
    );
    const data = await response2.json();
    if (!response2.ok)
      throw new Error(data.error?.message || "Groq request failed.");
    return data.choices?.[0]?.message?.content || "";
  }
  const apiKey = aiProvider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const ai = new import_genai.GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt
  });
  return response.text || "";
}
async function sendResendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey)
    throw new Error("RESEND_API_KEY is not configured on the server.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to,
      subject,
      html
    })
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || "Resend email request failed.");
  return data.id;
}
app.use(import_express.default.json());
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
var DB_FILE = import_path.default.join(process.cwd(), "universe_db.json");
var initialSeed = {
  universes: [
    {
      id: "univ-1",
      name: "Prime Universe",
      code: "U-88",
      description: "The primary continuity where the events of Night Watch and the Eclipse Wars unfold.",
      status: "Active",
      timelineSystem: "Standard Galactic Epoch (SGE)",
      creationDate: "2024-01-01",
      canonStatus: "CANON",
      coverImage: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80"
    },
    {
      id: "univ-2",
      name: "Alternate Epoch (Future 2099)",
      code: "U-99",
      description: "A dark dystopian timeline where the Black Sun syndicate rules New Lagos.",
      status: "Divergent",
      timelineSystem: "Post-Collapse Chronology",
      creationDate: "2080-05-12",
      canonStatus: "ALTERNATE",
      coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
    }
  ],
  planets: [
    {
      id: "plan-1",
      name: "Earth",
      designation: "Sol-3",
      universeId: "univ-1",
      starSystem: "Solar System",
      planetType: "Terrestrial",
      population: "8.2 Billion",
      gravity: "1.0 G",
      atmosphere: "Nitrogen-Oxygen (Standard)",
      climate: "Diverse / Temperate",
      diameter: "12,742 km",
      moons: 1,
      technologyLevel: "Advanced / Hybrid Meta-Tech",
      politicalSystem: "Global Coalition & Sovereign States",
      dominantSpecies: "Human / Enhanced",
      description: "Cradle of humanity and ground zero for meta-human awakenings following the Eclipse Incident.",
      canonStatus: "CANON",
      image: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=800&q=80"
    }
  ],
  locations: [
    {
      id: "loc-1",
      name: "New Lagos",
      planetId: "plan-1",
      type: "Megacity",
      parentLocation: "Nigeria / West African Union",
      description: "A sprawling vertical metropolis humming with neon cyber-kinetics and ancient mystical wards.",
      coordinates: "6.5244\xB0 N, 3.3792\xB0 E",
      history: "Rebuilt after the 2026 Black Tower explosion.",
      canonStatus: "CANON",
      image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "loc-2",
      name: "Black Tower",
      planetId: "plan-1",
      type: "Secret Headquarters",
      parentLocation: "New Lagos",
      description: "Orbital-anchored monolith serving as the base of operations for the Night Watch.",
      coordinates: "Altitude 12,000m",
      history: "Infiltrated by Viper during Issue #7.",
      canonStatus: "CANON",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
    }
  ],
  characters: [
    {
      id: "char-1",
      name: "Marcus Vale",
      codeName: "Archer",
      aliases: ["The Shadow of Lagos", "Mark"],
      universeId: "univ-1",
      species: "Enhanced Human",
      gender: "Male",
      age: 28,
      birthDate: "1999-04-12",
      birthplace: "New Lagos, Earth",
      currentLocation: "Black Tower",
      occupation: "Vigilante / Night Watch Operative",
      height: `6'2"`,
      build: "Athletic / Lean",
      hair: "Black / Short Dreadlocks",
      eyes: "Amber Luminescent",
      distinguishingFeatures: "Cybernetic optic nerve scar over left eye.",
      costume: "Matte-black ballisticweave tactical coat with kinetic dampeners.",
      personality: "Stoic, analytical, fiercely protective of civilians, haunted by his brother's disappearance.",
      powers: [
        "Enhanced Reflexes",
        "Kinetic Energy Absorption",
        "Night Vision"
      ],
      skills: ["Master Archer", "CQC Combat", "Hacking", "Tactical Tracking"],
      weaknesses: [
        "Overloads when absorbing excessive kinetic feedback",
        "Estranged from family"
      ],
      equipment: ["Eclipse Bow", "Grapple Gauntlets", "EMP Arrows"],
      origin: "Exposed to anomalous dark-matter radiation during the 2024 orbital eclipse.",
      biography: "Once a premier tactical officer for the Global Defense Accord, Marcus Vale forged the identity of Archer after discovering systemic corruption within the upper ranks. Now he protects the streets of New Lagos alongside the Night Watch.",
      firstAppearance: "Issue #1",
      currentStatus: "Active",
      canonStatus: "CANON",
      portrait: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "char-2",
      name: "Viper (Dr. Alika Vane)",
      codeName: "Viper",
      aliases: ["The Venom Chemist", "Alika"],
      universeId: "univ-1",
      species: "Genetically Altered Human",
      gender: "Female",
      age: 32,
      birthDate: "1995-11-20",
      birthplace: "Geneva, Switzerland",
      currentLocation: "Unknown Sub-Saharan Outpost",
      occupation: "Terrorist Leader / Former Lead Bio-Engineer",
      height: `5'9"`,
      build: "Wiry / Acrobatic",
      hair: "Emerald Green",
      eyes: "Viperine Slit Pupils",
      distinguishingFeatures: "Subdermal venom ducts glowing faintly under UV light.",
      costume: "Green-scaled armored tactical bodysuit with neural venom injectors.",
      personality: "Calculated, cynical, intellectually arrogant, seeking revenge against the science board.",
      powers: ["Neurotoxic Touch", "Acidic Blood", "Regenerative Healing"],
      skills: ["Advanced Pharmacology", "Toxicology", "Stealth Infiltration"],
      weaknesses: ["Vulnerable to extreme cold temperatures", "Arrogance"],
      equipment: ["Venom Blasters", "Nanite Scramblers"],
      origin: "Self-experimentation with genetically synthesized alien venom.",
      biography: "Dr. Alika Vane was the lead geneticist on the Genesis Project before corporate saboteurs killed her research team. Embittered, she adopted the moniker Viper and founded the Black Sun Syndicate.",
      firstAppearance: "Issue #2",
      currentStatus: "Active",
      canonStatus: "CANON",
      portrait: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "char-3",
      name: "Dr. Nova Chen",
      codeName: "Nova",
      aliases: ["Starlight", "Chen"],
      universeId: "univ-1",
      species: "Human",
      gender: "Female",
      age: 26,
      birthDate: "2001-09-05",
      birthplace: "Beijing, Earth",
      currentLocation: "Black Tower",
      occupation: "Astrophysicist / Quantum Tactician",
      height: `5'6"`,
      build: "Slender",
      hair: "Silver-White",
      eyes: "Violet",
      distinguishingFeatures: "Subtle stellar phosphorescence on fingertips.",
      costume: "White and gold titanium weave flight suit.",
      personality: "Curious, optimistic, relentless problem solver.",
      powers: ["Photon Manipulation", "Solar Flare Projection"],
      skills: ["Quantum Physics", "Astrogation", "Data Decryption"],
      weaknesses: [
        "Requires solar or high-energy ambient recharge",
        "Prone to exhaustion"
      ],
      equipment: ["Quantum Holo-Pad", "Photon Shield Bracers"],
      origin: "Surviving the atmospheric collapse of orbital station Daedalus.",
      biography: "Nova joined the Night Watch after analyzing the anomalies of the Eclipse Incident. She serves as Archer's primary tactical advisor and technical lifeline.",
      firstAppearance: "Issue #3",
      currentStatus: "Active",
      canonStatus: "CANON",
      portrait: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80"
    }
  ],
  teams: [
    {
      id: "team-1",
      name: "Night Watch",
      type: "Vigilante Taskforce",
      leader: "Marcus Vale (Archer)",
      headquarters: "Black Tower, New Lagos",
      foundingDate: "2024-03-14",
      members: ["Marcus Vale (Archer)", "Dr. Nova Chen (Nova)"],
      formerMembers: ["Dr. Alika Vane (Viper)"],
      allies: ["Global Defense Accord (Fringe)"],
      enemies: ["Black Sun Syndicate", "Viper"],
      goals: "Protect New Lagos from meta-human corruption and uncover corporate cover-ups.",
      history: "Founded in the ashes of the Eclipse Incident.",
      status: "Active",
      universeId: "univ-1",
      canonStatus: "CANON",
      logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"
    }
  ],
  organizations: [
    {
      id: "org-1",
      name: "Black Sun Syndicate",
      type: "Criminal Syndicate",
      leadership: "Viper",
      headquarters: "Undercity Catacombs, New Lagos",
      resources: "High-grade cybernetics, illegal neurotoxins, smuggled alien tech.",
      goals: "Overthrow the New Lagos council and monopolize dark-matter energy.",
      influence: "High in the undercity, covertly infiltrating corporate boards.",
      status: "Active",
      canonStatus: "CANON"
    }
  ],
  species: [
    {
      id: "spec-1",
      name: "Enhanced Human (Metahuman)",
      homePlanet: "Earth",
      lifespan: "90-120 years",
      biology: "Cellular structure capable of absorbing and metabolizing cosmic radiation without cellular necrosis.",
      abilities: "Varies widely (energy projection, enhanced physical traits, sensory augmentation).",
      weaknesses: "Electromagnetic dampening fields, heavy lead isotopes.",
      culture: "Fragmented between integrationists and separatist metahuman supremacists.",
      language: "Standard Earth Dialects & Binary Code",
      population: "14 Million worldwide",
      canonStatus: "CANON"
    }
  ],
  powers: [
    {
      id: "pow-1",
      name: "Kinetic Energy Absorption",
      category: "Physical / Energy",
      description: "Absorbs physical impacts and kinetic force, storing it within cellular muscle fibers for explosive physical release or energy discharge.",
      knownUsers: ["Marcus Vale (Archer)"],
      limitations: "Maximum absorption threshold before muscular tearing occurs.",
      strengthRating: 8,
      canonStatus: "CANON"
    },
    {
      id: "pow-2",
      name: "Neurotoxic Secretion",
      category: "Biological",
      description: "Produces complex synthetic neurotoxins capable of paralyzing motor functions within 3.4 seconds of epidermal contact.",
      knownUsers: ["Viper"],
      limitations: "Requires 12 hours to synthesize a full dose after depletion.",
      strengthRating: 9,
      canonStatus: "CANON"
    }
  ],
  artifacts: [
    {
      id: "art-1",
      name: "Eclipse Bow",
      type: "Composite Weapon / Relic",
      creator: "Unknown Pre-Collapse Artisan",
      currentOwner: "Marcus Vale (Archer)",
      origin: "Retrieved from the wreckage of orbital station Daedalus.",
      abilities: "Materializes quantum arrows formed from ambient dark matter when drawn.",
      history: "Bonded to Archer's biometric signature during the Eclipse Incident.",
      status: "Active",
      canonStatus: "CANON",
      image: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=800&q=80"
    }
  ],
  events: [
    {
      id: "evt-1",
      name: "Eclipse Incident",
      date: "2024-03-14",
      location: "New Lagos Upper Atmosphere",
      characters: ["Marcus Vale", "Dr. Alika Vane", "Dr. Nova Chen"],
      teams: ["Night Watch"],
      consequences: "Orbital station Daedalus destroyed; Marcus gains kinetic abilities; Alika's team wiped out.",
      issues: ["#1", "#2"],
      canonStatus: "CANON"
    },
    {
      id: "evt-2",
      name: "Black Tower Siege",
      date: "2026-08-19",
      location: "Black Tower",
      characters: ["Marcus Vale", "Viper"],
      teams: ["Night Watch"],
      consequences: "Viper escapes with encrypted quantum drives; Black Tower defense grid upgraded.",
      issues: ["#7", "#8"],
      canonStatus: "CANON"
    }
  ],
  issues: [
    {
      id: "issue-1",
      issueNumber: 7,
      title: "Shadows Over New Lagos",
      storyArc: "The Eclipse War",
      releaseStatus: "Published",
      publicationDate: "2026-09-01",
      synopsis: "Viper launches a surprise assault on the Black Tower while Archer investigates anomalies in the undercity.",
      characters: ["Marcus Vale (Archer)", "Viper", "Dr. Nova Chen (Nova)"],
      locations: ["New Lagos", "Black Tower"],
      events: ["Black Tower Siege"],
      writer: "Elena Vance",
      artist: "Kaelen Voss",
      colorist: "Maya Lin",
      letterer: "Samira Khan",
      editor: "Andrei Thorne",
      pages: 24,
      canonStatus: "CANON",
      cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80"
    }
  ],
  storyArcs: [
    {
      id: "arc-1",
      title: "The Eclipse War",
      issues: ["Issue #7", "Issue #8", "Issue #9"],
      mainCharacters: ["Archer", "Viper", "Nova"],
      majorEvents: ["Eclipse Incident", "Black Tower Siege"],
      status: "Active Production",
      canonStatus: "CANON"
    }
  ],
  relationships: [
    {
      id: "rel-1",
      source: "char-1",
      sourceName: "Marcus Vale (Archer)",
      target: "team-1",
      targetName: "Night Watch",
      type: "MEMBER_OF",
      startDate: "2024-03-14",
      endDate: "Present",
      description: "Founder and current leader of the taskforce.",
      canonStatus: "CANON"
    },
    {
      id: "rel-2",
      source: "char-1",
      sourceName: "Marcus Vale (Archer)",
      target: "char-2",
      targetName: "Viper",
      type: "ENEMY_OF",
      startDate: "2024-03-14",
      endDate: "Present",
      description: "Bitterness stemming from the Genesis Project tragedy and subsequent terrorist attacks.",
      canonStatus: "CANON"
    },
    {
      id: "rel-3",
      source: "char-1",
      sourceName: "Marcus Vale (Archer)",
      target: "loc-1",
      targetName: "New Lagos",
      type: "LIVES_IN",
      startDate: "2024-03-14",
      endDate: "Present",
      description: "Primary operational sector.",
      canonStatus: "CANON"
    },
    {
      id: "rel-4",
      source: "char-1",
      sourceName: "Marcus Vale (Archer)",
      target: "art-1",
      targetName: "Eclipse Bow",
      type: "USES",
      startDate: "2024-03-14",
      endDate: "Present",
      description: "Primary signature weapon.",
      canonStatus: "CANON"
    },
    {
      id: "rel-5",
      source: "char-3",
      sourceName: "Dr. Nova Chen (Nova)",
      target: "char-1",
      targetName: "Marcus Vale (Archer)",
      type: "ALLY_OF",
      startDate: "2024-05-10",
      endDate: "Present",
      description: "Close tactical partner and confidante.",
      canonStatus: "CANON"
    }
  ],
  scripts: [
    {
      id: "script-1",
      issueId: "issue-1",
      pageNumber: 1,
      panelNumber: 1,
      setting: "EXT. NEW LAGOS SKYLINE \u2014 NIGHT",
      description: "Heavy cyber-rain pours over glowing neon pagoda spires. A lone figure stands perched on the gargoyle ridge of the Black Tower.",
      dialogue: [
        {
          character: "ARCHER",
          text: "The rain doesn't wash away the blood, Nova. It just makes it conduct better."
        }
      ],
      narration: "New Lagos. Year 2026 of the Post-Eclipse Epoch. The city breathes in neon and exhales smoke.",
      sfx: "THROBBING LOW-FREQUENCY HUM",
      artistNote: "Emphasize verticality and glowing cyan neon against obsidian armor.",
      editorNote: "Approved."
    },
    {
      id: "script-2",
      issueId: "issue-1",
      pageNumber: 1,
      panelNumber: 2,
      setting: "INT. BLACK TOWER COMMAND DECK",
      description: "Nova's fingers fly across holographic touch-displays as alarm runes flare red.",
      dialogue: [
        {
          character: "NOVA",
          text: "Archer, we've got an unauthorized quantum signature breaching Sector 4! It's Viper's bio-signature."
        }
      ],
      sfx: "WARNING KLAXON BEEP BEEP",
      artistNote: "Warm amber glow from holographic displays contrasting with cold blue room lighting.",
      editorNote: ""
    }
  ],
  artwork: [
    {
      id: "artw-1",
      title: "Archer Official Character Sheet",
      entityId: "char-1",
      entityType: "Character",
      stage: "OFFICIAL",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
      artist: "Kaelen Voss",
      version: "3.0",
      notes: "Updated tactical coat with kinetic weave lines.",
      canonStatus: "CANON"
    },
    {
      id: "artw-2",
      title: "Viper Concept Thumbnail",
      entityId: "char-2",
      entityType: "Character",
      stage: "CONCEPT",
      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
      artist: "Maya Lin",
      version: "1.2",
      notes: "Exploring venom duct glow patterns.",
      canonStatus: "DRAFT"
    }
  ],
  auditLogs: [
    {
      id: "audit-1",
      timestamp: new Date(Date.now() - 36e5 * 24).toISOString(),
      user: "Andrei Thorne (Editor)",
      action: "APPROVED_CANON",
      details: "Approved Issue #7 and updated Archer's kinetic energy absorption threshold."
    },
    {
      id: "audit-2",
      timestamp: new Date(Date.now() - 36e5 * 48).toISOString(),
      user: "Elena Vance (Writer)",
      action: "CREATED_SCRIPT",
      details: "Added Script pages 1-2 for Issue #7."
    }
  ],
  comments: [
    {
      id: "comm-1",
      targetId: "issue-1",
      targetType: "Issue",
      author: "Andrei Thorne",
      text: "Great opening hook on page 1. Make sure Viper's entrance matches her dialogue in Issue #2.",
      timestamp: new Date(Date.now() - 36e5 * 12).toISOString(),
      resolved: false
    }
  ],
  tasks: [
    {
      id: "task-1",
      issueId: "issue-1",
      stage: "PENCILS",
      assignee: "Kaelen Voss",
      deadline: "2026-10-01",
      status: "IN_PROGRESS"
    },
    {
      id: "task-2",
      issueId: "issue-1",
      stage: "COLORS",
      assignee: "Maya Lin",
      deadline: "2026-10-10",
      status: "PENDING"
    }
  ],
  retcons: [
    {
      id: "ret-1",
      entityId: "char-1",
      entityName: "Marcus Vale (Archer)",
      field: "birthDate",
      oldValue: "1999-04-12",
      newValue: "2001-04-12",
      reason: "Timeline synchronization for orbital academy flashback in Issue #12.",
      issue: "Issue #12",
      approvedBy: "Andrei Thorne (Editor)",
      date: "2026-08-01"
    }
  ],
  chatMessages: [],
  simulations: []
};
function loadDB() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const data = import_fs.default.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load DB, initializing seed", e);
  }
  saveDB(initialSeed);
  return initialSeed;
}
function saveDB(db2) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db2, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save DB", e);
  }
}
var db = loadDB();
db.chatMessages = db.chatMessages || [];
db.simulations = db.simulations || [];
async function getCurrentArchive() {
  if (!supabase) return db;
  const entries = await Promise.all(
    collections.map(
      async (collection) => [collection, await readCollection(collection)]
    )
  );
  const remote = Object.fromEntries(entries);
  return Object.fromEntries(
    Object.keys(db).map((collection) => [
      collection,
      remote[collection]?.data ?? []
    ])
  );
}
app.post("/api/admin/invite", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res.status(403).json({ error: "Only the god account can invite admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server."
    });
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email)
    return res.status(400).json({ error: "An admin email is required." });
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl || !/^https?:\/\/[^\s]+$/i.test(appUrl))
    return res.status(500).json({
      error: "APP_URL is missing or invalid on the server. Set it to your Vercel URL, for example https://your-app.vercel.app."
    });
  const inviteRedirect = `${appUrl}/reset-password`;
  let invitedUserId;
  if (process.env.RESEND_API_KEY) {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: inviteRedirect }
    });
    if (error)
      return res.status(400).json({
        error: `Supabase could not create the invite: ${error.message}`
      });
    const actionLink = data.properties?.action_link;
    if (!actionLink)
      return res.status(500).json({ error: "Supabase did not return an invite link." });
    try {
      await sendResendEmail(
        email,
        "You have been invited to the Archive workspace",
        `<p>You have been invited to the Archive workspace as an admin.</p><p><a href="${actionLink}">Set your password and enter the workspace</a></p><p>This invitation link may expire.</p>`
      );
    } catch (error2) {
      return res.status(502).json({ error: `Resend could not send the invite: ${error2.message}` });
    }
    invitedUserId = data.user.id;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: inviteRedirect }
    );
    if (error)
      return res.status(400).json({
        error: `Supabase could not send the invite: ${error.message}`
      });
    invitedUserId = data.user.id;
  }
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({ id: invitedUserId, email, role: "admin" });
  if (profileError)
    return res.status(400).json({ error: profileError.message });
  res.status(201).json({ invited: true, email });
});
app.get("/api/admin/users", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res.status(403).json({ error: "Only the god account can manage admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server."
    });
  const { data, error } = await supabaseAdmin.from("profiles").select("id, email, display_name, role, active, created_at").order("created_at", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});
app.patch("/api/admin/users/:id", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res.status(403).json({ error: "Only the god account can manage admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server."
    });
  if (req.params.id === actor.user.id)
    return res.status(400).json({ error: "The god account cannot deactivate itself." });
  const { data: target } = await supabaseAdmin.from("profiles").select("role").eq("id", req.params.id).maybeSingle();
  if (!target || target.role !== "admin")
    return res.status(400).json({ error: "Only normal admin accounts can be deactivated here." });
  const active = Boolean(req.body.active);
  const { data, error } = await supabaseAdmin.from("profiles").update({ active, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", req.params.id).select("id, email, display_name, role, active, created_at").single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.delete("/api/admin/users/:id", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res.status(403).json({ error: "Only the god account can delete admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server."
    });
  if (req.params.id === actor.user.id)
    return res.status(400).json({ error: "The god account cannot delete itself." });
  const { data: target } = await supabaseAdmin.from("profiles").select("role, email").eq("id", req.params.id).maybeSingle();
  if (!target || target.role !== "admin")
    return res.status(400).json({ error: "Only normal admin accounts can be deleted here." });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ deleted: true, email: target.email });
});
app.patch("/api/profiles/:id", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.user.id !== req.params.id)
    return res.status(403).json({ error: "You can only update your own profile." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server."
    });
  const displayName = String(req.body.displayName || "").trim().slice(0, 40);
  if (!displayName)
    return res.status(400).json({ error: "A nickname is required." });
  const { data, error } = await supabaseAdmin.from("profiles").update({ display_name: displayName, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", actor.user.id).select("id, email, display_name, role, active").single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
app.get("/api/chat/contacts", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });
  const client = supabaseAdmin || getUserClient(req.headers.authorization);
  if (!client) return res.json([]);
  const { data, error } = await client.from("profiles").select("id, display_name, email, role, active").neq("id", actor.user.id).eq("active", true).order("display_name", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(fromSupabaseRow(data || []));
});
app.get("/api/chat/dm-summary", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });
  const meId = actor.user.id;
  let rows = [];
  if (supabase) {
    const userClient = getUserClient(req.headers.authorization);
    if (!userClient)
      return res.status(401).json({ error: "Sign in required." });
    const { data, error } = await userClient.from("chat_messages").select("*").eq("channel", "dm").or(`sender_id.eq.${meId},recipient_id.eq.${meId}`).order("created_at", { ascending: false }).limit(300);
    if (error) return res.status(400).json({ error: error.message });
    rows = fromSupabaseRow(data || []);
  } else {
    rows = (db.chatMessages || []).filter(
      (m) => m.channel === "dm" && (m.senderId === meId || m.recipientId === meId)
    ).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  const latestByContact = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const otherId = row.senderId === meId ? row.recipientId : row.senderId;
    if (!otherId || latestByContact.has(otherId)) continue;
    latestByContact.set(otherId, row);
  }
  res.json(
    Array.from(latestByContact.entries()).map(([contactId, row]) => ({
      contactId,
      contactName: row.senderId === meId ? row.recipientName : row.senderName,
      lastMessage: row.text,
      lastMessageAt: row.createdAt,
      lastSenderId: row.senderId,
      hasAttachment: Boolean(row.attachmentUrl)
    }))
  );
});
app.get("/api/chat/messages", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });
  const channel = req.query.channel === "dm" ? "dm" : "public";
  const otherId = String(req.query.with || "");
  if (channel === "dm" && !otherId)
    return res.status(400).json({ error: "A conversation partner is required." });
  if (supabase) {
    const userClient = getUserClient(req.headers.authorization);
    if (!userClient)
      return res.status(401).json({ error: "Sign in required." });
    let query = userClient.from("chat_messages").select("*").eq("channel", channel).order("created_at", { ascending: true }).limit(200);
    if (channel === "dm")
      query = query.or(
        `and(sender_id.eq.${actor.user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${actor.user.id})`
      );
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    return res.json(fromSupabaseRow(data || []));
  }
  const all = db.chatMessages || [];
  if (channel === "public")
    return res.json(all.filter((m) => m.channel === "public"));
  res.json(
    all.filter(
      (m) => m.channel === "dm" && (m.senderId === actor.user.id && m.recipientId === otherId || m.senderId === otherId && m.recipientId === actor.user.id)
    )
  );
});
app.post("/api/chat/messages", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });
  const text = String(req.body.text || "").trim().slice(0, 2e3);
  const attachmentUrl = req.body.attachmentUrl ? String(req.body.attachmentUrl) : null;
  const attachmentType = attachmentUrl ? req.body.attachmentType === "image" ? "image" : "file" : null;
  const attachmentName = attachmentUrl ? String(req.body.attachmentName || "Attachment").slice(0, 200) : null;
  if (!text && !attachmentUrl)
    return res.status(400).json({ error: "A message or attachment is required." });
  const channel = req.body.channel === "dm" ? "dm" : "public";
  const recipientId = channel === "dm" ? String(req.body.recipientId || "") : null;
  if (channel === "dm" && !recipientId)
    return res.status(400).json({ error: "A DM recipient is required." });
  const newMessage = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channel,
    senderId: actor.user.id,
    senderName: actor.profile.display_name || actor.profile.email,
    recipientId,
    // Never send a bare `null` here: the column is NOT NULL, so an explicit
    // null (rather than an omitted key) fails the insert instead of falling
    // back to its default.
    recipientName: channel === "dm" ? String(req.body.recipientName || "") : "",
    text,
    attachmentUrl,
    attachmentType,
    attachmentName,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (supabase) {
    const userClient = getUserClient(req.headers.authorization);
    if (!userClient)
      return res.status(401).json({ error: "Sign in required." });
    const { data, error } = await userClient.from("chat_messages").insert(toSupabaseRow(newMessage)).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(fromSupabaseRow(data));
  }
  db.chatMessages = db.chatMessages || [];
  db.chatMessages.push(newMessage);
  saveDB(db);
  res.status(201).json(newMessage);
});
app.get("/api/overview", async (req, res) => {
  const remoteCollections = await Promise.all(
    collections.map(
      async (collection) => [collection, await readCollection(collection)]
    )
  );
  const remote = Object.fromEntries(remoteCollections);
  const getCollection = (collection) => {
    const rows = remote[collection]?.data;
    return supabase ? rows || [] : rows && rows.length > 0 ? rows : db[collection];
  };
  res.json({
    stats: {
      ...Object.fromEntries(
        Object.keys(db).map((collection) => [
          collection,
          getCollection(collection).length
        ])
      )
    },
    recentEdits: getCollection("auditLogs").slice(0, 5),
    pendingTasks: getCollection("tasks").filter(
      (t) => t.status !== "COMPLETED"
    ),
    pendingRetcons: getCollection("retcons"),
    timelineEvents: getCollection("events"),
    activeIssues: getCollection("issues").filter(
      (issue) => issue.releaseStatus !== "COMPLETED"
    )
  });
});
var collections = [
  "universes",
  "planets",
  "locations",
  "characters",
  "teams",
  "organizations",
  "species",
  "powers",
  "artifacts",
  "events",
  "issues",
  "storyArcs",
  "relationships",
  "scripts",
  "artwork",
  "auditLogs",
  "comments",
  "tasks",
  "retcons"
];
for (const col of collections) {
  app.get(`/api/${col}`, async (req, res) => {
    const remote = await readCollection(col);
    if (remote.data !== null && supabase) {
      return res.json(remote.data);
    }
    if (remote.data && remote.data.length > 0) return res.json(remote.data);
    if (supabase && remote.error)
      return res.status(502).json({ error: remote.error });
    res.json(db[col] || []);
  });
  app.post(`/api/${col}`, async (req, res) => {
    const newItem = {
      id: `${col.slice(0, 4)}-${Date.now()}`,
      ...req.body,
      canonStatus: req.body.canonStatus || "CANON"
    };
    const remote = await createRow(col, newItem);
    if (remote.data) {
      return res.status(201).json(remote.data);
    }
    if (supabase && remote.error)
      return res.status(502).json({ error: remote.error });
    db[col].push(newItem);
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user: req.body.author || "Andrei Thorne (Editor)",
      action: `CREATE_${col.toUpperCase()}`,
      details: `Created new ${col.slice(0, -1)}: ${newItem.name || newItem.title || newItem.id}`
    });
    saveDB(db);
    res.status(201).json(newItem);
  });
  app.put(`/api/${col}/:id`, async (req, res) => {
    const { id } = req.params;
    const remote = await updateRow(col, id, req.body);
    if (remote.data) {
      return res.json(remote.data);
    }
    if (supabase && remote.error)
      return res.status(502).json({ error: remote.error });
    const index = db[col].findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Item not found" });
    }
    const updated = { ...db[col][index], ...req.body, id };
    db[col][index] = updated;
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      user: req.body.author || "Andrei Thorne (Editor)",
      action: `UPDATE_${col.toUpperCase()}`,
      details: `Updated ${col.slice(0, -1)}: ${updated.name || updated.title || id}`
    });
    saveDB(db);
    res.json(updated);
  });
  app.delete(`/api/${col}/:id`, async (req, res) => {
    const { id } = req.params;
    const remote = await deleteRow(col, id);
    if (remote.data) {
      return res.json(remote.data);
    }
    if (supabase && remote.error)
      return res.status(502).json({ error: remote.error });
    const list = db[col];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Item not found" });
    }
    const removed = list.splice(index, 1)[0];
    saveDB(db);
    res.json(removed);
  });
}
var publicArchiveCollections = [
  "characters",
  "species",
  "powers",
  "artifacts",
  "teams",
  "organizations",
  "planets",
  "locations",
  "issues"
];
app.get("/api/public/archive/search", async (req, res) => {
  const query = String(req.query.q || "").trim().toLowerCase();
  const results = [];
  const collections2 = await Promise.all(
    publicArchiveCollections.map(async (type) => {
      const remote = await readCollection(type);
      const items = supabase && remote.data !== null ? remote.data : remote.data && remote.data.length > 0 ? remote.data : db[type] || [];
      return { type, items };
    })
  );
  for (const { type, items } of collections2) {
    for (const item of items) {
      if (item.canonStatus !== "CANON") continue;
      const searchable = JSON.stringify({
        name: item.name,
        title: item.title,
        codeName: item.codeName,
        description: item.description,
        aliases: item.aliases
      }).toLowerCase();
      if (!query || searchable.includes(query)) results.push({ type, item });
    }
  }
  res.json(results.slice(0, 100));
});
app.post("/api/simulate", async (req, res) => {
  try {
    const {
      combatant1Id,
      combatant2Id,
      locationId,
      locationName,
      distance,
      knowledge,
      preparation,
      morals,
      conditions,
      winCondition,
      seed
    } = req.body;
    if (!combatant1Id || !combatant2Id)
      return res.status(400).json({ error: "Two combatants are required." });
    const charactersResult = await readCollection("characters");
    const characters = supabase && charactersResult.data !== null ? charactersResult.data : charactersResult.data && charactersResult.data.length > 0 ? charactersResult.data : db.characters;
    const c1 = characters.find(
      (c) => c.id === combatant1Id && c.canonStatus === "CANON"
    );
    const c2 = characters.find(
      (c) => c.id === combatant2Id && c.canonStatus === "CANON"
    );
    if (!c1 || !c2)
      return res.status(404).json({ error: "One or both combatants could not be found." });
    let location = null;
    if (locationId) {
      const [planetsResult, locationsResult] = await Promise.all([
        readCollection("planets"),
        readCollection("locations")
      ]);
      const planets = supabase && planetsResult.data !== null ? planetsResult.data : planetsResult.data && planetsResult.data.length > 0 ? planetsResult.data : db.planets;
      const locations = supabase && locationsResult.data !== null ? locationsResult.data : locationsResult.data && locationsResult.data.length > 0 ? locationsResult.data : db.locations;
      location = planets.find(
        (p) => p.id === locationId && p.canonStatus === "CANON"
      ) || locations.find(
        (l) => l.id === locationId && l.canonStatus === "CANON"
      ) || null;
    }
    const setup = {
      locationName: location?.name || locationName || "Unspecified",
      distance: distance || "Unspecified",
      knowledge: ["unknown", "partial", "full"].includes(knowledge) ? knowledge : "unknown",
      preparation: ["none", "combatant1", "combatant2", "both"].includes(
        preparation
      ) ? preparation : "none",
      morals: ["canon", "bloodlusted", "no_kill"].includes(morals) ? morals : "canon",
      conditions: conditions || "Day",
      winCondition: winCondition || "Incapacitation"
    };
    const computation = runSimulation([c1, c2], location, setup, seed);
    const prompt = buildNarrativePrompt([c1, c2], location, setup, computation);
    let rounds;
    try {
      const aiText = await generateAIText(prompt);
      rounds = aiText.split(/\n?---\n?/).map((r) => r.trim()).filter(Boolean);
      if (rounds.length === 0) throw new Error("Empty AI narrative");
    } catch (err) {
      console.error("Narrative generation failed, using fallback", err);
      rounds = fallbackNarrative([c1, c2], computation, setup);
    }
    const combatants = [c1, c2];
    const winner = combatants[computation.winnerIndex];
    const loser = combatants[computation.winnerIndex === 0 ? 1 : 0];
    const record = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      combatant1Id: c1.id,
      combatant1Name: c1.name,
      combatant2Id: c2.id,
      combatant2Name: c2.name,
      setup,
      rounds,
      winnerId: winner.id,
      winnerName: winner.name,
      loserName: loser.name,
      probability1: Math.round(computation.probability[0] * 100),
      probability2: Math.round(computation.probability[1] * 100),
      turningPoint: computation.turningPoint,
      primaryCause: computation.primaryCause,
      unexpectedFactor: computation.unexpectedFactor,
      isUpset: computation.isUpset,
      engineReport: {
        stats: computation.stats,
        modifiers: computation.modifiers,
        effective: computation.effective,
        probability: computation.probability,
        winnerIndex: computation.winnerIndex
      },
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabase) {
      const created = await createRow("simulations", record);
      if (created.error) return res.status(502).json({ error: created.error });
      return res.status(201).json(created.data);
    }
    db.simulations.unshift(record);
    saveDB(db);
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Simulation failed."
    });
  }
});
app.get("/api/simulations", async (req, res) => {
  const remote = await readCollection("simulations");
  if (remote.data !== null && supabase) return res.json(remote.data);
  if (remote.data && remote.data.length > 0) return res.json(remote.data);
  res.json(db.simulations || []);
});
app.get("/api/simulations/:id", async (req, res) => {
  const remote = await readCollection("simulations");
  const list = supabase && remote.data !== null ? remote.data : remote.data && remote.data.length > 0 ? remote.data : db.simulations || [];
  const found = list.find((s) => s.id === req.params.id);
  if (!found) return res.status(404).json({ error: "Simulation not found." });
  res.json(found);
});
app.post("/api/ai/lorekeeper", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }
  try {
    const archive = await getCurrentArchive();
    const contextData = `
    UNIVERSE OS DATABASE CONTEXT:
    Universes: ${JSON.stringify(archive.universes)}
    Characters: ${JSON.stringify(archive.characters)}
    Teams: ${JSON.stringify(archive.teams)}
    Locations: ${JSON.stringify(archive.locations)}
    Planets: ${JSON.stringify(archive.planets)}
    Artifacts: ${JSON.stringify(archive.artifacts)}
    Powers: ${JSON.stringify(archive.powers)}
    Events: ${JSON.stringify(archive.events)}
    Issues: ${JSON.stringify(archive.issues)}
    Relationships: ${JSON.stringify(archive.relationships)}
    Retcons: ${JSON.stringify(archive.retcons)}
    `;
    const prompt = `You are LOREKEEPER, the official AI continuity assistant for Universe OS.
    Use ONLY the provided database context to answer the user's question accurately.
    Distinguish clearly between CANON FACT, INFERENCE, and SUGGESTION.
    If the database does not contain the answer, state: "That information is not currently established in the universe database."
    Never invent canon facts not supported by the data.

    ${contextData}

    User Question: ${question}
    `;
    res.json({ answer: await generateAIText(prompt), provider: aiProvider });
  } catch (error) {
    console.error("Lorekeeper AI Error:", error);
    res.status(500).json({ error: error.message || "Failed to query Lorekeeper AI" });
  }
});
app.post("/api/ai/character-drafts", async (req, res) => {
  const rawText = String(req.body?.rawText || "").trim();
  if (!rawText) return res.status(400).json({ error: "Raw character ideas are required." });
  try {
    const archive = await getCurrentArchive();
    const prompt = `You are a character development assistant for Universe OS.
Turn the user's raw character notes into editable draft records. Split multiple characters when the notes clearly describe multiple people.
Do not create canon facts silently. Preserve supplied facts, label uncertain additions as suggestions in the notes, and keep names faithful to the input.
Return ONLY valid JSON with this exact shape:
{"characters":[{"name":"","codeName":"","species":"","occupation":"","description":"","origin":"","majorAbilities":"","secondaryAbilities":"","weaknesses":"","personality":"","appearance":"","affiliation":"","currentStatus":"DRAFT","suggestions":[""]}]}
Use empty strings when unknown. Never include markdown fences or commentary.

Existing archive context for continuity only:
${JSON.stringify((archive.characters || []).map((character) => ({ name: character.name, codeName: character.codeName, species: character.species })))}

User's raw notes:
${rawText}`;
    const responseText = await generateAIText(prompt);
    const cleaned = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const characters = Array.isArray(parsed.characters) ? parsed.characters : [];
    res.json({ characters: characters.map((character) => ({
      name: String(character.name || "Untitled character"),
      codeName: String(character.codeName || ""),
      species: String(character.species || ""),
      occupation: String(character.occupation || ""),
      description: String(character.description || ""),
      origin: String(character.origin || ""),
      majorAbilities: String(character.majorAbilities || ""),
      secondaryAbilities: String(character.secondaryAbilities || ""),
      weaknesses: String(character.weaknesses || ""),
      personality: String(character.personality || ""),
      appearance: String(character.appearance || ""),
      affiliation: String(character.affiliation || ""),
      currentStatus: String(character.currentStatus || "DRAFT"),
      suggestions: Array.isArray(character.suggestions) ? character.suggestions.map(String) : []
    })) });
  } catch (error) {
    console.error("Character draft generation failed:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Character drafts could not be generated." });
  }
});
app.post("/api/ai/canon-check", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text to check is required" });
  }
  try {
    const archive = await getCurrentArchive();
    const contextData = `
    EXISTING CANON DATABASE:
    Characters: ${JSON.stringify(archive.characters.map((c) => ({ name: c.name, codeName: c.codeName, status: c.currentStatus })))}
    Locations: ${JSON.stringify(archive.locations.map((l) => ({ name: l.name, description: l.description })))}
    Events: ${JSON.stringify(archive.events.map((e) => ({ name: e.name, date: e.date, location: e.location })))}
    Retcons: ${JSON.stringify(archive.retcons)}
    `;
    const prompt = `You are the Universe OS Canon Conflict Inspector.
    Analyze the provided writer text or script snippet against the existing canon database.
    Detect potential timeline contradictions, status contradictions (e.g., deceased characters appearing), or location inconsistencies.
    Return a JSON response with:
    {
      "hasConflicts": boolean,
      "conflicts": [
        { "entity": string, "issue": string, "description": string, "severity": "HIGH" | "MEDIUM" | "LOW" }
      ],
      "suggestions": string[]
    }

    ${contextData}

    Writer Text to Analyze:
    "${text}"
    `;
    const responseText = await generateAIText(prompt);
    let result;
    try {
      const cleanText = responseText?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
      result = JSON.parse(cleanText);
    } catch (parseErr) {
      result = {
        hasConflicts: false,
        conflicts: [],
        suggestions: [responseText]
      };
    }
    res.json(result);
  } catch (error) {
    console.error("Canon Check Error:", error);
    res.status(500).json({ error: error.message || "Failed to run canon check" });
  }
});
app.get("/api/export/bible", (req, res) => {
  res.json({
    title: "UNIVERSE OS \u2014 OFFICIAL UNIVERSE BIBLE",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    universes: db.universes,
    planets: db.planets,
    characters: db.characters,
    teams: db.teams,
    organizations: db.organizations,
    species: db.species,
    powers: db.powers,
    artifacts: db.artifacts,
    events: db.events,
    storyArcs: db.storyArcs,
    issues: db.issues,
    retcons: db.retcons
  });
});
app.post("/api/ai/generate-moodboard-item", async (req, res) => {
  const { characterName, prompt, category } = req.body;
  const apiKey = aiProvider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  const aestheticPool = [
    {
      url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
      title: "Neon Cyberpunk Skyline",
      category: "ENVIRONMENT"
    },
    {
      url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
      title: "Quantum Laboratory & Holograms",
      category: "AESTHETIC"
    },
    {
      url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
      title: "Abstract Neural Resonance",
      category: "AESTHETIC"
    },
    {
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      title: "Dark Matter Energy Core",
      category: "PROP"
    },
    {
      url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
      title: "Undercity Catacomb Outpost",
      category: "ENVIRONMENT"
    },
    {
      url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
      title: "Encrypted Neural Terminal",
      category: "PROP"
    }
  ];
  if (!apiKey) {
    const randomPick = aestheticPool[Math.floor(Math.random() * aestheticPool.length)];
    return res.json({
      id: `mood-${Date.now()}`,
      title: prompt ? `${prompt} (${characterName})` : randomPick.title,
      url: randomPick.url,
      category: category || randomPick.category,
      prompt: prompt || "Cinematic aesthetic mood reference",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  try {
    const responseText = await generateAIText(
      `Generate a concise, evocative title and description for a visual mood board item representing character "${characterName}" with aesthetic prompt "${prompt || "sci-fi cyberpunk atmosphere"}". Return JSON format: {"title": string, "description": string}`
    );
    let aiMeta = {
      title: prompt || "Character Aesthetic Mood",
      description: "Generated thematic atmosphere"
    };
    try {
      const clean = responseText?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
      aiMeta = JSON.parse(clean);
    } catch (e) {
    }
    const randomPick = aestheticPool[Math.floor(Math.random() * aestheticPool.length)];
    res.json({
      id: `mood-${Date.now()}`,
      title: aiMeta.title,
      url: randomPick.url,
      category: category || randomPick.category,
      prompt: prompt || aiMeta.description,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    const randomPick = aestheticPool[Math.floor(Math.random() * aestheticPool.length)];
    res.json({
      id: `mood-${Date.now()}`,
      title: prompt || randomPick.title,
      url: randomPick.url,
      category: category || "AESTHETIC",
      prompt: prompt || "Cinematic mood board reference",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || process.argv[1]?.endsWith("server.cjs");
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.env.FRONTEND_DIST || import_path.default.join(process.cwd(), "frontend-dist");
    if (process.env.SERVE_FRONTEND !== "false") {
      app.use(import_express.default.static(distPath));
      app.get(
        "*",
        (req, res) => res.sendFile(import_path.default.join(distPath, "index.html"))
      );
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Universe OS Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
