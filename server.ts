import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import {
  createRow,
  deleteRow,
  fromSupabaseRow,
  getAuthenticatedProfile,
  getUserClient,
  readCollection,
  supabase,
  supabaseAdmin,
  toSupabaseRow,
  updateRow,
} from "./utils/supabase/server";
import {
  buildNarrativePrompt,
  fallbackNarrative,
  runSimulation,
  type SimSetup,
} from "./utils/combatEngine";

const app = express();
const PORT = Number(process.env.PORT || 3000);

const aiProvider = (
  process.env.AI_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "gemini")
).toLowerCase();

let cachedGroqModel: string | null = null;

async function resolveGroqModel(apiKey: string) {
  if (cachedGroqModel) return cachedGroqModel;

  const preferredModels = [
    process.env.GROQ_MODEL?.trim(),
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
  ].filter(Boolean) as string[];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = (await response.json()) as {
      data?: Array<{ id?: string; active?: boolean }>;
    };
    const availableModels = new Set(
      (data.data || [])
        .filter((model) => model.active !== false && model.id)
        .map((model) => model.id as string),
    );
    const availablePreferred = preferredModels.find((model) =>
      availableModels.has(model),
    );
    if (availablePreferred) {
      cachedGroqModel = availablePreferred;
      return cachedGroqModel;
    }
    throw new Error("No supported Groq chat model is available for this API key.");
  } catch (error) {
    if (process.env.GROQ_MODEL?.trim()) return process.env.GROQ_MODEL.trim();
    throw error;
  }
}

async function generateAIText(prompt: string) {
  if (aiProvider === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");
    const groqModel = await resolveGroqModel(apiKey);
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(data.error?.message || "Groq request failed.");
    return data.choices?.[0]?.message?.content || "";
  }
  const apiKey =
    aiProvider === "groq"
      ? process.env.GROQ_API_KEY
      : process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text || "";
}

async function sendResendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey)
    throw new Error("RESEND_API_KEY is not configured on the server.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to,
      subject,
      html,
    }),
  });
  const data = (await response.json()) as { id?: string; message?: string };
  if (!response.ok)
    throw new Error(data.message || "Resend email request failed.");
  return data.id;
}

app.use(express.json());
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// In-memory persistent database store initialized with rich comic universe seed data
const DB_FILE = path.join(process.cwd(), "universe_db.json");

interface UniverseDB {
  universes: any[];
  planets: any[];
  locations: any[];
  characters: any[];
  teams: any[];
  organizations: any[];
  species: any[];
  powers: any[];
  artifacts: any[];
  events: any[];
  issues: any[];
  storyArcs: any[];
  relationships: any[];
  scripts: any[];
  artwork: any[];
  auditLogs: any[];
  comments: any[];
  tasks: any[];
  retcons: any[];
  chatMessages: any[];
  simulations: any[];
}

const initialSeed: UniverseDB = {
  universes: [
    {
      id: "univ-1",
      name: "Prime Universe",
      code: "U-88",
      description:
        "The primary continuity where the events of Night Watch and the Eclipse Wars unfold.",
      status: "Active",
      timelineSystem: "Standard Galactic Epoch (SGE)",
      creationDate: "2024-01-01",
      canonStatus: "CANON",
      coverImage:
        "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "univ-2",
      name: "Alternate Epoch (Future 2099)",
      code: "U-99",
      description:
        "A dark dystopian timeline where the Black Sun syndicate rules New Lagos.",
      status: "Divergent",
      timelineSystem: "Post-Collapse Chronology",
      creationDate: "2080-05-12",
      canonStatus: "ALTERNATE",
      coverImage:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    },
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
      description:
        "Cradle of humanity and ground zero for meta-human awakenings following the Eclipse Incident.",
      canonStatus: "CANON",
      image:
        "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=800&q=80",
    },
  ],
  locations: [
    {
      id: "loc-1",
      name: "New Lagos",
      planetId: "plan-1",
      type: "Megacity",
      parentLocation: "Nigeria / West African Union",
      description:
        "A sprawling vertical metropolis humming with neon cyber-kinetics and ancient mystical wards.",
      coordinates: "6.5244° N, 3.3792° E",
      history: "Rebuilt after the 2026 Black Tower explosion.",
      canonStatus: "CANON",
      image:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "loc-2",
      name: "Black Tower",
      planetId: "plan-1",
      type: "Secret Headquarters",
      parentLocation: "New Lagos",
      description:
        "Orbital-anchored monolith serving as the base of operations for the Night Watch.",
      coordinates: "Altitude 12,000m",
      history: "Infiltrated by Viper during Issue #7.",
      canonStatus: "CANON",
      image:
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    },
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
      height: "6'2\"",
      build: "Athletic / Lean",
      hair: "Black / Short Dreadlocks",
      eyes: "Amber Luminescent",
      distinguishingFeatures: "Cybernetic optic nerve scar over left eye.",
      costume:
        "Matte-black ballisticweave tactical coat with kinetic dampeners.",
      personality:
        "Stoic, analytical, fiercely protective of civilians, haunted by his brother's disappearance.",
      powers: [
        "Enhanced Reflexes",
        "Kinetic Energy Absorption",
        "Night Vision",
      ],
      skills: ["Master Archer", "CQC Combat", "Hacking", "Tactical Tracking"],
      weaknesses: [
        "Overloads when absorbing excessive kinetic feedback",
        "Estranged from family",
      ],
      equipment: ["Eclipse Bow", "Grapple Gauntlets", "EMP Arrows"],
      origin:
        "Exposed to anomalous dark-matter radiation during the 2024 orbital eclipse.",
      biography:
        "Once a premier tactical officer for the Global Defense Accord, Marcus Vale forged the identity of Archer after discovering systemic corruption within the upper ranks. Now he protects the streets of New Lagos alongside the Night Watch.",
      firstAppearance: "Issue #1",
      currentStatus: "Active",
      canonStatus: "CANON",
      portrait:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
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
      height: "5'9\"",
      build: "Wiry / Acrobatic",
      hair: "Emerald Green",
      eyes: "Viperine Slit Pupils",
      distinguishingFeatures:
        "Subdermal venom ducts glowing faintly under UV light.",
      costume:
        "Green-scaled armored tactical bodysuit with neural venom injectors.",
      personality:
        "Calculated, cynical, intellectually arrogant, seeking revenge against the science board.",
      powers: ["Neurotoxic Touch", "Acidic Blood", "Regenerative Healing"],
      skills: ["Advanced Pharmacology", "Toxicology", "Stealth Infiltration"],
      weaknesses: ["Vulnerable to extreme cold temperatures", "Arrogance"],
      equipment: ["Venom Blasters", "Nanite Scramblers"],
      origin: "Self-experimentation with genetically synthesized alien venom.",
      biography:
        "Dr. Alika Vane was the lead geneticist on the Genesis Project before corporate saboteurs killed her research team. Embittered, she adopted the moniker Viper and founded the Black Sun Syndicate.",
      firstAppearance: "Issue #2",
      currentStatus: "Active",
      canonStatus: "CANON",
      portrait:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
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
      height: "5'6\"",
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
        "Prone to exhaustion",
      ],
      equipment: ["Quantum Holo-Pad", "Photon Shield Bracers"],
      origin: "Surviving the atmospheric collapse of orbital station Daedalus.",
      biography:
        "Nova joined the Night Watch after analyzing the anomalies of the Eclipse Incident. She serves as Archer's primary tactical advisor and technical lifeline.",
      firstAppearance: "Issue #3",
      currentStatus: "Active",
      canonStatus: "CANON",
      portrait:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    },
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
      goals:
        "Protect New Lagos from meta-human corruption and uncover corporate cover-ups.",
      history: "Founded in the ashes of the Eclipse Incident.",
      status: "Active",
      universeId: "univ-1",
      canonStatus: "CANON",
      logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    },
  ],
  organizations: [
    {
      id: "org-1",
      name: "Black Sun Syndicate",
      type: "Criminal Syndicate",
      leadership: "Viper",
      headquarters: "Undercity Catacombs, New Lagos",
      resources:
        "High-grade cybernetics, illegal neurotoxins, smuggled alien tech.",
      goals:
        "Overthrow the New Lagos council and monopolize dark-matter energy.",
      influence:
        "High in the undercity, covertly infiltrating corporate boards.",
      status: "Active",
      canonStatus: "CANON",
    },
  ],
  species: [
    {
      id: "spec-1",
      name: "Enhanced Human (Metahuman)",
      homePlanet: "Earth",
      lifespan: "90-120 years",
      biology:
        "Cellular structure capable of absorbing and metabolizing cosmic radiation without cellular necrosis.",
      abilities:
        "Varies widely (energy projection, enhanced physical traits, sensory augmentation).",
      weaknesses: "Electromagnetic dampening fields, heavy lead isotopes.",
      culture:
        "Fragmented between integrationists and separatist metahuman supremacists.",
      language: "Standard Earth Dialects & Binary Code",
      population: "14 Million worldwide",
      canonStatus: "CANON",
    },
  ],
  powers: [
    {
      id: "pow-1",
      name: "Kinetic Energy Absorption",
      category: "Physical / Energy",
      description:
        "Absorbs physical impacts and kinetic force, storing it within cellular muscle fibers for explosive physical release or energy discharge.",
      knownUsers: ["Marcus Vale (Archer)"],
      limitations:
        "Maximum absorption threshold before muscular tearing occurs.",
      strengthRating: 8,
      canonStatus: "CANON",
    },
    {
      id: "pow-2",
      name: "Neurotoxic Secretion",
      category: "Biological",
      description:
        "Produces complex synthetic neurotoxins capable of paralyzing motor functions within 3.4 seconds of epidermal contact.",
      knownUsers: ["Viper"],
      limitations:
        "Requires 12 hours to synthesize a full dose after depletion.",
      strengthRating: 9,
      canonStatus: "CANON",
    },
  ],
  artifacts: [
    {
      id: "art-1",
      name: "Eclipse Bow",
      type: "Composite Weapon / Relic",
      creator: "Unknown Pre-Collapse Artisan",
      currentOwner: "Marcus Vale (Archer)",
      origin: "Retrieved from the wreckage of orbital station Daedalus.",
      abilities:
        "Materializes quantum arrows formed from ambient dark matter when drawn.",
      history:
        "Bonded to Archer's biometric signature during the Eclipse Incident.",
      status: "Active",
      canonStatus: "CANON",
      image:
        "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=800&q=80",
    },
  ],
  events: [
    {
      id: "evt-1",
      name: "Eclipse Incident",
      date: "2024-03-14",
      location: "New Lagos Upper Atmosphere",
      characters: ["Marcus Vale", "Dr. Alika Vane", "Dr. Nova Chen"],
      teams: ["Night Watch"],
      consequences:
        "Orbital station Daedalus destroyed; Marcus gains kinetic abilities; Alika's team wiped out.",
      issues: ["#1", "#2"],
      canonStatus: "CANON",
    },
    {
      id: "evt-2",
      name: "Black Tower Siege",
      date: "2026-08-19",
      location: "Black Tower",
      characters: ["Marcus Vale", "Viper"],
      teams: ["Night Watch"],
      consequences:
        "Viper escapes with encrypted quantum drives; Black Tower defense grid upgraded.",
      issues: ["#7", "#8"],
      canonStatus: "CANON",
    },
  ],
  issues: [
    {
      id: "issue-1",
      issueNumber: 7,
      title: "Shadows Over New Lagos",
      storyArc: "The Eclipse War",
      releaseStatus: "Published",
      publicationDate: "2026-09-01",
      synopsis:
        "Viper launches a surprise assault on the Black Tower while Archer investigates anomalies in the undercity.",
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
      cover:
        "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    },
  ],
  storyArcs: [
    {
      id: "arc-1",
      title: "The Eclipse War",
      issues: ["Issue #7", "Issue #8", "Issue #9"],
      mainCharacters: ["Archer", "Viper", "Nova"],
      majorEvents: ["Eclipse Incident", "Black Tower Siege"],
      status: "Active Production",
      canonStatus: "CANON",
    },
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
      canonStatus: "CANON",
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
      description:
        "Bitterness stemming from the Genesis Project tragedy and subsequent terrorist attacks.",
      canonStatus: "CANON",
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
      canonStatus: "CANON",
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
      canonStatus: "CANON",
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
      canonStatus: "CANON",
    },
  ],
  scripts: [
    {
      id: "script-1",
      issueId: "issue-1",
      pageNumber: 1,
      panelNumber: 1,
      setting: "EXT. NEW LAGOS SKYLINE — NIGHT",
      description:
        "Heavy cyber-rain pours over glowing neon pagoda spires. A lone figure stands perched on the gargoyle ridge of the Black Tower.",
      dialogue: [
        {
          character: "ARCHER",
          text: "The rain doesn't wash away the blood, Nova. It just makes it conduct better.",
        },
      ],
      narration:
        "New Lagos. Year 2026 of the Post-Eclipse Epoch. The city breathes in neon and exhales smoke.",
      sfx: "THROBBING LOW-FREQUENCY HUM",
      artistNote:
        "Emphasize verticality and glowing cyan neon against obsidian armor.",
      editorNote: "Approved.",
    },
    {
      id: "script-2",
      issueId: "issue-1",
      pageNumber: 1,
      panelNumber: 2,
      setting: "INT. BLACK TOWER COMMAND DECK",
      description:
        "Nova's fingers fly across holographic touch-displays as alarm runes flare red.",
      dialogue: [
        {
          character: "NOVA",
          text: "Archer, we've got an unauthorized quantum signature breaching Sector 4! It's Viper's bio-signature.",
        },
      ],
      sfx: "WARNING KLAXON BEEP BEEP",
      artistNote:
        "Warm amber glow from holographic displays contrasting with cold blue room lighting.",
      editorNote: "",
    },
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
      canonStatus: "CANON",
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
      canonStatus: "DRAFT",
    },
  ],
  auditLogs: [
    {
      id: "audit-1",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      user: "Andrei Thorne (Editor)",
      action: "APPROVED_CANON",
      details:
        "Approved Issue #7 and updated Archer's kinetic energy absorption threshold.",
    },
    {
      id: "audit-2",
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      user: "Elena Vance (Writer)",
      action: "CREATED_SCRIPT",
      details: "Added Script pages 1-2 for Issue #7.",
    },
  ],
  comments: [
    {
      id: "comm-1",
      targetId: "issue-1",
      targetType: "Issue",
      author: "Andrei Thorne",
      text: "Great opening hook on page 1. Make sure Viper's entrance matches her dialogue in Issue #2.",
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      resolved: false,
    },
  ],
  tasks: [
    {
      id: "task-1",
      issueId: "issue-1",
      stage: "PENCILS",
      assignee: "Kaelen Voss",
      deadline: "2026-10-01",
      status: "IN_PROGRESS",
    },
    {
      id: "task-2",
      issueId: "issue-1",
      stage: "COLORS",
      assignee: "Maya Lin",
      deadline: "2026-10-10",
      status: "PENDING",
    },
  ],
  retcons: [
    {
      id: "ret-1",
      entityId: "char-1",
      entityName: "Marcus Vale (Archer)",
      field: "birthDate",
      oldValue: "1999-04-12",
      newValue: "2001-04-12",
      reason:
        "Timeline synchronization for orbital academy flashback in Issue #12.",
      issue: "Issue #12",
      approvedBy: "Andrei Thorne (Editor)",
      date: "2026-08-01",
    },
  ],
  chatMessages: [],
  simulations: [],
};

function loadDB(): UniverseDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load DB, initializing seed", e);
  }
  saveDB(initialSeed);
  return initialSeed;
}

function saveDB(db: UniverseDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save DB", e);
  }
}

let db = loadDB();
db.chatMessages = db.chatMessages || [];
db.simulations = db.simulations || [];

async function getCurrentArchive() {
  if (!supabase) return db;
  const entries = await Promise.all(
    collections.map(
      async (collection) =>
        [collection, await readCollection(collection)] as const,
    ),
  );
  const remote = Object.fromEntries(entries);
  return Object.fromEntries(
    Object.keys(db).map((collection) => [
      collection,
      remote[collection]?.data ?? [],
    ]),
  ) as unknown as UniverseDB;
}

// API Endpoints

app.post("/api/admin/invite", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res
      .status(403)
      .json({ error: "Only the god account can invite admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    });
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  if (!email)
    return res.status(400).json({ error: "An admin email is required." });
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl || !/^https?:\/\/[^\s]+$/i.test(appUrl))
    return res.status(500).json({
      error:
        "APP_URL is missing or invalid on the server. Set it to your Vercel URL, for example https://your-app.vercel.app.",
    });
  const inviteRedirect = `${appUrl}/reset-password`;
  let invitedUserId: string;
  if (process.env.RESEND_API_KEY) {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: inviteRedirect },
    });
    if (error)
      return res.status(400).json({
        error: `Supabase could not create the invite: ${error.message}`,
      });
    const actionLink = data.properties?.action_link;
    if (!actionLink)
      return res
        .status(500)
        .json({ error: "Supabase did not return an invite link." });
    try {
      await sendResendEmail(
        email,
        "You have been invited to the Archive workspace",
        `<p>You have been invited to the Archive workspace as an admin.</p><p><a href="${actionLink}">Set your password and enter the workspace</a></p><p>This invitation link may expire.</p>`,
      );
    } catch (error: any) {
      return res
        .status(502)
        .json({ error: `Resend could not send the invite: ${error.message}` });
    }
    invitedUserId = data.user.id;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: inviteRedirect },
    );
    if (error)
      return res.status(400).json({
        error: `Supabase could not send the invite: ${error.message}`,
      });
    invitedUserId = data.user.id;
  }
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: invitedUserId, email, role: "admin" });
  if (profileError)
    return res.status(400).json({ error: profileError.message });
  res.status(201).json({ invited: true, email });
});

app.get("/api/admin/users", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res
      .status(403)
      .json({ error: "Only the god account can manage admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    });
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, display_name, role, active, created_at")
    .order("created_at", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

app.patch("/api/admin/users/:id", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res
      .status(403)
      .json({ error: "Only the god account can manage admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    });
  if (req.params.id === actor.user.id)
    return res
      .status(400)
      .json({ error: "The god account cannot deactivate itself." });
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", req.params.id)
    .maybeSingle();
  if (!target || target.role !== "admin")
    return res
      .status(400)
      .json({ error: "Only normal admin accounts can be deactivated here." });
  const active = Boolean(req.body.active);
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select("id, email, display_name, role, active, created_at")
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete("/api/admin/users/:id", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.profile.role !== "god")
    return res
      .status(403)
      .json({ error: "Only the god account can delete admins." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    });
  if (req.params.id === actor.user.id)
    return res
      .status(400)
      .json({ error: "The god account cannot delete itself." });
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("role, email")
    .eq("id", req.params.id)
    .maybeSingle();
  if (!target || target.role !== "admin")
    return res
      .status(400)
      .json({ error: "Only normal admin accounts can be deleted here." });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ deleted: true, email: target.email });
});

app.patch("/api/profiles/:id", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor || actor.user.id !== req.params.id)
    return res
      .status(403)
      .json({ error: "You can only update your own profile." });
  if (!supabaseAdmin)
    return res.status(500).json({
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    });
  const displayName = String(req.body.displayName || "")
    .trim()
    .slice(0, 40);
  if (!displayName)
    return res.status(400).json({ error: "A nickname is required." });
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", actor.user.id)
    .select("id, email, display_name, role, active")
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Directory of teammates available to chat with (excludes the caller).
app.get("/api/chat/contacts", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });

  const client = supabaseAdmin || getUserClient(req.headers.authorization);
  if (!client) return res.json([]);
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name, email, role, active")
    .neq("id", actor.user.id)
    .eq("active", true)
    .order("display_name", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(fromSupabaseRow(data || []));
});

// One row per DM conversation (latest message only), used to render a
// WhatsApp-style chat list with previews and per-conversation unread badges.
app.get("/api/chat/dm-summary", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });
  const meId = actor.user.id;

  let rows: any[] = [];
  if (supabase) {
    const userClient = getUserClient(req.headers.authorization);
    if (!userClient)
      return res.status(401).json({ error: "Sign in required." });
    const { data, error } = await userClient
      .from("chat_messages")
      .select("*")
      .eq("channel", "dm")
      .or(`sender_id.eq.${meId},recipient_id.eq.${meId}`)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) return res.status(400).json({ error: error.message });
    rows = fromSupabaseRow<any[]>(data || []);
  } else {
    rows = (db.chatMessages || [])
      .filter(
        (m: any) =>
          m.channel === "dm" && (m.senderId === meId || m.recipientId === meId),
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  const latestByContact = new Map<string, any>();
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
      hasAttachment: Boolean(row.attachmentUrl),
    })),
  );
});

// Chat messages: a public team channel plus one-to-one DMs.
// DM privacy is enforced via the caller's own Supabase session (RLS), never the admin key.
app.get("/api/chat/messages", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });

  const channel = req.query.channel === "dm" ? "dm" : "public";
  const otherId = String(req.query.with || "");
  if (channel === "dm" && !otherId)
    return res
      .status(400)
      .json({ error: "A conversation partner is required." });

  if (supabase) {
    const userClient = getUserClient(req.headers.authorization);
    if (!userClient)
      return res.status(401).json({ error: "Sign in required." });
    let query = userClient
      .from("chat_messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(200);
    if (channel === "dm")
      query = query.or(
        `and(sender_id.eq.${actor.user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${actor.user.id})`,
      );
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    return res.json(fromSupabaseRow(data || []));
  }

  // JSON fallback (local/dev mode without Supabase configured).
  const all = db.chatMessages || [];
  if (channel === "public")
    return res.json(all.filter((m: any) => m.channel === "public"));
  res.json(
    all.filter(
      (m: any) =>
        m.channel === "dm" &&
        ((m.senderId === actor.user.id && m.recipientId === otherId) ||
          (m.senderId === otherId && m.recipientId === actor.user.id)),
    ),
  );
});

app.post("/api/chat/messages", async (req, res) => {
  const actor = await getAuthenticatedProfile(req.headers.authorization);
  if (!actor) return res.status(401).json({ error: "Sign in required." });

  const text = String(req.body.text || "")
    .trim()
    .slice(0, 2000);
  const attachmentUrl = req.body.attachmentUrl
    ? String(req.body.attachmentUrl)
    : null;
  const attachmentType = attachmentUrl
    ? req.body.attachmentType === "image"
      ? "image"
      : "file"
    : null;
  const attachmentName = attachmentUrl
    ? String(req.body.attachmentName || "Attachment").slice(0, 200)
    : null;
  if (!text && !attachmentUrl)
    return res
      .status(400)
      .json({ error: "A message or attachment is required." });
  const channel = req.body.channel === "dm" ? "dm" : "public";
  const recipientId =
    channel === "dm" ? String(req.body.recipientId || "") : null;
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
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    const userClient = getUserClient(req.headers.authorization);
    if (!userClient)
      return res.status(401).json({ error: "Sign in required." });
    const { data, error } = await userClient
      .from("chat_messages")
      .insert(toSupabaseRow(newMessage))
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(fromSupabaseRow(data));
  }

  db.chatMessages = db.chatMessages || [];
  db.chatMessages.push(newMessage);
  saveDB(db);
  res.status(201).json(newMessage);
});

// Get full universe DB summary / overview
app.get("/api/overview", async (req, res) => {
  const remoteCollections = await Promise.all(
    collections.map(
      async (collection) =>
        [collection, await readCollection(collection)] as const,
    ),
  );
  const remote = Object.fromEntries(remoteCollections);
  const getCollection = (collection: keyof UniverseDB) => {
    const rows = remote[collection]?.data;
    return supabase
      ? rows || []
      : rows && rows.length > 0
        ? rows
        : db[collection];
  };

  res.json({
    stats: {
      ...Object.fromEntries(
        Object.keys(db).map((collection) => [
          collection,
          getCollection(collection as keyof UniverseDB).length,
        ]),
      ),
    },
    recentEdits: getCollection("auditLogs").slice(0, 5),
    pendingTasks: getCollection("tasks").filter(
      (t) => t.status !== "COMPLETED",
    ),
    pendingRetcons: getCollection("retcons"),
    timelineEvents: getCollection("events"),
    activeIssues: getCollection("issues").filter(
      (issue) => issue.releaseStatus !== "COMPLETED",
    ),
  });
});

// Generic entity CRUD endpoints
const collections = [
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
  "retcons",
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
    res.json((db as any)[col] || []);
  });

  app.post(`/api/${col}`, async (req, res) => {
    const newItem = {
      id: `${col.slice(0, 4)}-${Date.now()}`,
      ...req.body,
      canonStatus: req.body.canonStatus || "CANON",
    };

    const remote = await createRow(col, newItem);
    if (remote.data) {
      return res.status(201).json(remote.data);
    }
    if (supabase && remote.error)
      return res.status(502).json({ error: remote.error });

    (db as any)[col].push(newItem);

    // Add audit log
    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: req.body.author || "Andrei Thorne (Editor)",
      action: `CREATE_${col.toUpperCase()}`,
      details: `Created new ${col.slice(0, -1)}: ${newItem.name || newItem.title || newItem.id}`,
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

    const index = (db as any)[col].findIndex((item: any) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Item not found" });
    }
    const updated = { ...(db as any)[col][index], ...req.body, id };
    (db as any)[col][index] = updated;

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: req.body.author || "Andrei Thorne (Editor)",
      action: `UPDATE_${col.toUpperCase()}`,
      details: `Updated ${col.slice(0, -1)}: ${updated.name || updated.title || id}`,
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

    const list = (db as any)[col];
    const index = list.findIndex((item: any) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Item not found" });
    }
    const removed = list.splice(index, 1)[0];
    saveDB(db);
    res.json(removed);
  });
}

const publicArchiveCollections = [
  "characters",
  "species",
  "powers",
  "artifacts",
  "teams",
  "organizations",
  "planets",
  "locations",
  "issues",
] as const;

// Public simulator search. It intentionally exposes canon records only;
// drafts, retcons, and production notes stay inside the admin archive.
app.get("/api/public/archive/search", async (req, res) => {
  const query = String(req.query.q || "")
    .trim()
    .toLowerCase();
  const results: { type: string; item: any }[] = [];

  const collections = await Promise.all(
    publicArchiveCollections.map(async (type) => {
      const remote = await readCollection<any>(type);
      const items =
        supabase && remote.data !== null
          ? remote.data
          : remote.data && remote.data.length > 0
            ? remote.data
            : (db as any)[type] || [];
      return { type, items };
    }),
  );

  for (const { type, items } of collections) {
    for (const item of items) {
      if (item.canonStatus !== "CANON") continue;
      const searchable = JSON.stringify({
        name: item.name,
        title: item.title,
        codeName: item.codeName,
        description: item.description,
        aliases: item.aliases,
      }).toLowerCase();
      if (!query || searchable.includes(query)) results.push({ type, item });
    }
  }

  res.json(results.slice(0, 100));
});

// Combat Simulator: engine computes the numeric outcome, AI only writes the prose around it.
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
      seed,
    } = req.body;
    if (!combatant1Id || !combatant2Id)
      return res.status(400).json({ error: "Two combatants are required." });

    const charactersResult = await readCollection<any>("characters");
    const characters =
      supabase && charactersResult.data !== null
        ? charactersResult.data
        : charactersResult.data && charactersResult.data.length > 0
          ? charactersResult.data
          : db.characters;

    const c1 = characters.find(
      (c: any) => c.id === combatant1Id && c.canonStatus === "CANON",
    );
    const c2 = characters.find(
      (c: any) => c.id === combatant2Id && c.canonStatus === "CANON",
    );
    if (!c1 || !c2)
      return res
        .status(404)
        .json({ error: "One or both combatants could not be found." });

    let location: any = null;
    if (locationId) {
      const [planetsResult, locationsResult] = await Promise.all([
        readCollection<any>("planets"),
        readCollection<any>("locations"),
      ]);
      const planets =
        supabase && planetsResult.data !== null
          ? planetsResult.data
          : planetsResult.data && planetsResult.data.length > 0
            ? planetsResult.data
            : db.planets;
      const locations =
        supabase && locationsResult.data !== null
          ? locationsResult.data
          : locationsResult.data && locationsResult.data.length > 0
            ? locationsResult.data
            : db.locations;
      location =
        planets.find(
          (p: any) => p.id === locationId && p.canonStatus === "CANON",
        ) ||
        locations.find(
          (l: any) => l.id === locationId && l.canonStatus === "CANON",
        ) ||
        null;
    }

    const setup: SimSetup = {
      locationName: location?.name || locationName || "Unspecified",
      distance: distance || "Unspecified",
      knowledge: ["unknown", "partial", "full"].includes(knowledge)
        ? knowledge
        : "unknown",
      preparation: ["none", "combatant1", "combatant2", "both"].includes(
        preparation,
      )
        ? preparation
        : "none",
      morals: ["canon", "bloodlusted", "no_kill"].includes(morals)
        ? morals
        : "canon",
      conditions: conditions || "Day",
      winCondition: winCondition || "Incapacitation",
    };

    const computation = runSimulation([c1, c2], location, setup, seed);
    const prompt = buildNarrativePrompt([c1, c2], location, setup, computation);

    let rounds: string[];
    try {
      const aiText = await generateAIText(prompt);
      rounds = aiText
        .split(/\n?---\n?/)
        .map((r) => r.trim())
        .filter(Boolean);
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
        winnerIndex: computation.winnerIndex,
      },
      createdAt: new Date().toISOString(),
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
      error: err instanceof Error ? err.message : "Simulation failed.",
    });
  }
});

app.get("/api/simulations", async (req, res) => {
  const remote = await readCollection<any>("simulations");
  if (remote.data !== null && supabase) return res.json(remote.data);
  if (remote.data && remote.data.length > 0) return res.json(remote.data);
  res.json(db.simulations || []);
});

app.get("/api/simulations/:id", async (req, res) => {
  const remote = await readCollection<any>("simulations");
  const list =
    supabase && remote.data !== null
      ? remote.data
      : remote.data && remote.data.length > 0
        ? remote.data
        : db.simulations || [];
  const found = list.find((s: any) => s.id === req.params.id);
  if (!found) return res.status(404).json({ error: "Simulation not found." });
  res.json(found);
});

// AI Lorekeeper Q&A Endpoint using @google/genai
app.post("/api/ai/lorekeeper", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const archive = await getCurrentArchive();
    // Construct rich context from the database
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
  } catch (error: any) {
    console.error("Lorekeeper AI Error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to query Lorekeeper AI" });
  }
});

// AI Canon Checker Endpoint
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
      const cleanText =
        responseText
          ?.replace(/```json/g, "")
          .replace(/```/g, "")
          .trim() || "{}";
      result = JSON.parse(cleanText);
    } catch (parseErr) {
      result = {
        hasConflicts: false,
        conflicts: [],
        suggestions: [responseText],
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error("Canon Check Error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to run canon check" });
  }
});

// Universe Bible Export generation endpoint
app.get("/api/export/bible", (req, res) => {
  res.json({
    title: "UNIVERSE OS — OFFICIAL UNIVERSE BIBLE",
    generatedAt: new Date().toISOString(),
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
    retcons: db.retcons,
  });
});

// AI Mood Board Image & Prompt Generation Endpoint
app.post("/api/ai/generate-moodboard-item", async (req, res) => {
  const { characterName, prompt, category } = req.body;
  const apiKey =
    aiProvider === "groq"
      ? process.env.GROQ_API_KEY
      : process.env.GEMINI_API_KEY;

  const aestheticPool = [
    {
      url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
      title: "Neon Cyberpunk Skyline",
      category: "ENVIRONMENT",
    },
    {
      url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
      title: "Quantum Laboratory & Holograms",
      category: "AESTHETIC",
    },
    {
      url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
      title: "Abstract Neural Resonance",
      category: "AESTHETIC",
    },
    {
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      title: "Dark Matter Energy Core",
      category: "PROP",
    },
    {
      url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
      title: "Undercity Catacomb Outpost",
      category: "ENVIRONMENT",
    },
    {
      url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
      title: "Encrypted Neural Terminal",
      category: "PROP",
    },
  ];

  if (!apiKey) {
    const randomPick =
      aestheticPool[Math.floor(Math.random() * aestheticPool.length)];
    return res.json({
      id: `mood-${Date.now()}`,
      title: prompt ? `${prompt} (${characterName})` : randomPick.title,
      url: randomPick.url,
      category: category || randomPick.category,
      prompt: prompt || "Cinematic aesthetic mood reference",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const responseText = await generateAIText(
      `Generate a concise, evocative title and description for a visual mood board item representing character "${characterName}" with aesthetic prompt "${prompt || "sci-fi cyberpunk atmosphere"}". Return JSON format: {"title": string, "description": string}`,
    );

    let aiMeta = {
      title: prompt || "Character Aesthetic Mood",
      description: "Generated thematic atmosphere",
    };
    try {
      const clean =
        responseText
          ?.replace(/```json/g, "")
          .replace(/```/g, "")
          .trim() || "{}";
      aiMeta = JSON.parse(clean);
    } catch (e) {}

    const randomPick =
      aestheticPool[Math.floor(Math.random() * aestheticPool.length)];
    res.json({
      id: `mood-${Date.now()}`,
      title: aiMeta.title,
      url: randomPick.url,
      category: category || randomPick.category,
      prompt: prompt || aiMeta.description,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const randomPick =
      aestheticPool[Math.floor(Math.random() * aestheticPool.length)];
    res.json({
      id: `mood-${Date.now()}`,
      title: prompt || randomPick.title,
      url: randomPick.url,
      category: category || "AESTHETIC",
      prompt: prompt || "Cinematic mood board reference",
      timestamp: new Date().toISOString(),
    });
  }
});

async function startServer() {
  // Vite middleware setup for development / production
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.argv[1]?.endsWith("server.cjs");
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath =
      process.env.FRONTEND_DIST || path.join(process.cwd(), "frontend-dist");
    if (process.env.SERVE_FRONTEND !== "false") {
      app.use(express.static(distPath));
      app.get("*", (req, res) =>
        res.sendFile(path.join(distPath, "index.html")),
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
