import React, { useState, useEffect } from "react";
import { X, Plus, Globe, Upload, Users } from "lucide-react";
import confetti from "canvas-confetti";
import { uploadArchiveImage } from "../utils/supabase";

export const speciesOptions = [
  "Human",
  "Enhanced Human",
  "Mutant",
  "Alien",
  "Android",
  "Cyborg",
  "Robot",
  "Artificial Intelligence",
  "Synthetic",
  "Hybrid",
  "Atlantean",
  "Beastfolk",
  "Reptilian",
  "Insectoid",
  "Avian",
  "Giant",
  "Demon",
  "Devil",
  "Angel",
  "Fallen Angel",
  "Nephilim",
  "Djinn",
  "Fae",
  "Vampire",
  "Werebeast",
  "Undead",
  "Ghost",
  "Elemental",
  "Dragon",
  "Titan",
  "Kaiju",
  "Symbiote",
  "Shapeshifter",
  "Energy Being",
  "Voidborn",
  "Celestial",
  "Astral",
  "Cosmic Being",
  "Interdimensional",
  "Multiversal",
  "Primordial",
  "Godlike",
  "Construct",
  "Technomorph",
  "Parasite",
  "Hive Mind",
  "Unknown",
  "Other",
];

const splitListInput = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const characterProfileFields = [
  ["affiliation", "Affiliation", "Teams, organizations, factions, alliances"],
  ["positionRole", "Position / Role", "Leader, commander, specialist, etc."],
  [
    "romanticInterests",
    "Romantic Interests / Partners",
    "Current or past relationships",
  ],
  ["enemiesRivals", "Enemies & Rivals", "Key conflicts and opposing forces"],
  [
    "primaryEnergySource",
    "Primary Energy / Power Source",
    "Cosmic energy, magic, technology, mutation",
  ],
  ["majorAbilities", "Major Abilities", "Core powers and skills"],
  [
    "secondaryAbilities",
    "Secondary Abilities",
    "Supporting or lesser-used abilities",
  ],
  ["signatureTechniques", "Signature Techniques", "Named moves or iconic uses"],
  ["positiveTraits", "Positive Traits", "Strengths of character"],
  ["negativeTraits", "Negative Traits", "Flaws and areas of growth"],
  ["quirksHabits", "Quirks & Habits", "Mannerisms and speech patterns"],
  [
    "physicalAppearance",
    "Physical Appearance",
    "Face, body, features, costume",
  ],
  [
    "centralThemes",
    "Central Themes",
    "Identity, heritage, power, family, belonging",
  ],
  ["corePhilosophy", "Core Philosophy", "Fundamental worldview or creed"],
  ["signatureQuote", "Signature Quote", "A line that captures who they are"],
  [
    "notableEngagements",
    "Notable Engagements",
    "Key battles, confrontations, and turning points",
  ],
  [
    "battlePhilosophy",
    "Battle Philosophy",
    "Combat priorities, tactics, ethics",
  ],
  ["characterArc", "Character Arc", "Stages of personal growth"],
  [
    "heroicVillainousLegacy",
    "Heroic / Villainous Legacy",
    "Impact and symbol they become",
  ],
] as const;

const characterBibleFields = [
  ["gender", "Gender", "Gender identity"],
  ["birthDate", "Birth date", "Date or era of birth"],
  ["birthplace", "Birthplace", "Where they were born"],
  ["currentLocation", "Current location", "Where they are now"],
  ["build", "Build", "Physique and body type"],
  [
    "distinguishingFeatures",
    "Distinguishing features",
    "Signature visual markers",
  ],
  ["costume", "Costume", "Costume, armor, or everyday look"],
  ["origin", "Origin", "How their story began"],
  ["description", "Overview", "Who they are and why they matter"],
] as const;

const speciesProfileSections = [
  {
    title: "Infobox",
    fields: [
      ["category", "Category", "Species / Race"],
      ["status", "Status", "Extant, extinct, endangered, unknown"],
      ["homePlanet", "Homeworld", "Primary homeworld"],
      [
        "primaryLocations",
        "Primary locations",
        "Habitats, colonies, territories",
      ],
      ["lifespan", "Lifespan", "Typical lifespan"],
      ["population", "Population", "Estimated population"],
      ["language", "Language(s)", "Languages and dialects"],
      ["government", "Government", "Political system"],
      [
        "technologyLevel",
        "Technology level",
        "Primitive, industrial, cosmic, etc.",
      ],
    ],
  },
  {
    title: "Overview & Biology",
    fields: [
      ["overview", "Overview", "The elevator pitch readers see first"],
      ["appearance", "Appearance", "Visual traits and variation"],
      ["physiology", "Physiology", "Biological systems and adaptations"],
      [
        "lifecycleReproduction",
        "Lifecycle & reproduction",
        "Birth, maturity, reproduction, death",
      ],
      ["diet", "Diet", "Food, energy, or sustenance"],
    ],
  },
  {
    title: "Abilities & Powers",
    fields: [
      [
        "innateAbilities",
        "Innate abilities",
        "Natural abilities shared by the species",
      ],
      [
        "learnedEnhanced",
        "Learned / enhanced",
        "Training, mutation, technology, or augmentation",
      ],
      [
        "limitationsWeaknesses",
        "Limitations & weaknesses",
        "Documented counters and vulnerabilities",
      ],
    ],
  },
  {
    title: "Society, History & Reference",
    fields: [
      ["customsValues", "Customs & values", "Traditions, ethics, and taboos"],
      [
        "governmentStructure",
        "Government & structure",
        "Institutions and social hierarchy",
      ],
      ["technology", "Technology", "Signature tools and infrastructure"],
      [
        "notableFactions",
        "Notable factions",
        "Major houses, clans, or movements",
      ],
      ["origins", "Origins", "Earliest known history"],
      [
        "majorEvents",
        "Major events",
        "Wars, migrations, disasters, discoveries",
      ],
      ["currentStatus", "Current status", "Present-day condition"],
      ["notableIndividuals", "Notable individuals", "Important members"],
      ["trivia", "Trivia", "Optional fun facts"],
      ["seeAlso", "See also", "Related archive records"],
      ["notesReferences", "Notes & references", "Sources and editorial notes"],
    ],
  },
] as const;

const teamProfileSections = [
  {
    title: "Infobox",
    fields: [
      ["category", "Category", "Team"],
      ["fullName", "Full name", "Formal team name"],
      ["alias", "Alias", "Other names"],
      ["status", "Status", "Active, disbanded, underground, unknown"],
      ["type", "Type", "Heroic, villainous, neutral, government, corporate"],
      ["foundedBy", "Founded by", "Founder or founding group"],
      ["foundingDate", "Founded", "Date or era"],
      ["headquarters", "Headquarters", "Primary base"],
      ["territory", "Territory", "Operational territory"],
      ["affiliation", "Affiliation", "Parent organization or faction"],
      ["leader", "Leader", "Current leader"],
      ["size", "Size", "Approximate roster size"],
      ["powerSource", "Power source", "How the team is empowered"],
      ["specialties", "Specialties", "Core capabilities"],
      ["resources", "Resources", "Funding, equipment, and support"],
    ],
  },
  {
    title: "Purpose & Structure",
    fields: [
      ["overview", "Overview", "What the team is and why it exists"],
      ["purposeMandate", "Purpose & mandate", "Stated and hidden goals"],
      ["chainCommand", "Chain of command", "Leadership structure"],
      ["roles", "Roles", "Specialist roles and departments"],
      ["membershipCriteria", "Membership criteria", "Who qualifies"],
      ["recruitment", "Recruitment", "How members are found or chosen"],
    ],
  },
  {
    title: "Roster & Culture",
    fields: [
      ["currentMembers", "Current members", "Roster and active units"],
      ["notableFormer", "Notable former members", "Past members"],
      [
        "reservistsAffiliates",
        "Reservists / affiliates",
        "Allied or reserve personnel",
      ],
      ["teamValues", "Values", "Team ideals and rules"],
      ["internalDynamics", "Internal dynamics", "Conflicts and relationships"],
      [
        "symbolsInsignia",
        "Symbols & insignia",
        "Logo, colors, uniforms, rituals",
      ],
      ["reputation", "Reputation", "How the world sees them"],
    ],
  },
  {
    title: "Relationships, History & Legacy",
    fields: [
      ["allies", "Allies", "Allied teams and organizations"],
      ["enemies", "Enemies / rivals", "Opposing forces"],
      ["founding", "Founding", "Founding story"],
      ["majorOperations", "Major operations", "Important missions"],
      [
        "schismsReforms",
        "Schisms & reforms",
        "Splits, changes, and restructuring",
      ],
      ["currentStatus", "Current status", "Present condition"],
      ["legacy", "Legacy", "What the team symbolizes"],
      ["trivia", "Trivia", "Optional fun facts"],
      ["seeAlso", "See also", "Related records"],
      ["notesReferences", "Notes & references", "Sources and editorial notes"],
    ],
  },
] as const;

const planetProfileSections = [
  {
    title: "Infobox",
    fields: [
      ["category", "Category", "Planet"],
      ["fullName", "Full name", "Formal planetary name"],
      ["alias", "Alias", "Other names"],
      ["status", "Status", "Habitable, hostile, destroyed, unknown"],
      ["starSystem", "System", "Star system"],
      ["star", "Star", "Primary star"],
      ["position", "Position", "Orbital position"],
      ["moons", "Moons", "Number and names of moons"],
      ["dayLength", "Day length", "Rotation period"],
      ["yearLength", "Year length", "Orbital period"],
      ["gravity", "Gravity", "Surface gravity"],
      ["atmosphere", "Atmosphere", "Atmospheric composition"],
      ["climate", "Climate", "Climate classification"],
      ["terrain", "Terrain", "Major terrain types"],
    ],
  },
  {
    title: "Ecology & Civilization",
    fields: [
      ["nativeSpecies", "Native species", "Species evolved here"],
      ["dominantSpecies", "Dominant species", "Current dominant population"],
      ["population", "Population", "Estimated population"],
      ["languages", "Languages", "Languages and dialects"],
      ["government", "Government", "Political system"],
      ["techLevel", "Technology", "Technology level"],
      ["flora", "Flora", "Plant life"],
      ["fauna", "Fauna", "Animal life"],
      ["extinctEndangered", "Extinct / endangered", "At-risk lifeforms"],
      ["citiesSettlements", "Cities & settlements", "Major population centers"],
    ],
  },
  {
    title: "Overview, Geography & Culture",
    fields: [
      ["overview", "Overview", "What the planet is and why it matters"],
      [
        "continentsRegions",
        "Continents & regions",
        "Major landmasses and regions",
      ],
      ["oceansWaterways", "Oceans & waterways", "Water systems and seas"],
      ["naturalWonders", "Natural wonders", "Notable natural features"],
      ["valuesCustoms", "Values & customs", "Social customs and traditions"],
      ["religionBelief", "Religion & belief", "Faiths and belief systems"],
      ["economy", "Economy", "Trade, resources, and industries"],
      [
        "artArchitecture",
        "Art & architecture",
        "Visual culture and structures",
      ],
    ],
  },
  {
    title: "History, Alliances & Legacy",
    fields: [
      ["formation", "Formation", "Planetary formation"],
      ["ancientEra", "Ancient era", "Earliest known civilizations"],
      ["majorEvents", "Major events", "Wars, disasters, discoveries"],
      ["currentStatus", "Current status", "Present condition"],
      [
        "strategicSignificance",
        "Strategic significance",
        "Resources, location, symbolism",
      ],
      ["legacy", "Legacy", "What the planet means in-universe"],
      ["affiliation", "Affiliation", "Political or factional affiliation"],
      ["allies", "Allies", "Allied worlds and factions"],
      ["enemies", "Enemies", "Opposing worlds and factions"],
      ["notableLocations", "Notable locations", "Important sites"],
      ["trivia", "Trivia", "Optional fun facts"],
      ["seeAlso", "See also", "Related records"],
      ["notesReferences", "Notes & references", "Sources and editorial notes"],
    ],
  },
] as const;

const locationProfileSections = [
  {
    title: "Location Context",
    fields: [
      ["category", "Category", "City, district, planet, base, region"],
      ["fullName", "Full name", "Formal location name"],
      ["alias", "Alias", "Alternate or common name"],
      ["type", "Type", "City, district, starport, ruin, stronghold"],
      ["status", "Status", "Active, hidden, ruined, under siege"],
      ["planetId", "Planet", "Select the planet this location belongs to"],
      [
        "parentLocation",
        "Parent location",
        "Choose a broader location it sits within",
      ],
      ["coordinates", "Coordinates", "Latitude / longitude / sector grid"],
      ["population", "Population", "Estimated population or density"],
      ["terrain", "Terrain", "Urban, desert, oceanic, subterranean, forest"],
      ["security", "Security / threat", "Low, medium, high, forbidden"],
    ],
  },
  {
    title: "Overview & History",
    fields: [
      ["overview", "Overview", "What the place is and why it matters"],
      ["history", "History", "Origins and turning points"],
      ["culture", "Culture", "People, customs, and identity"],
      ["economy", "Economy", "Trade, resources, and politics"],
      ["notableFeatures", "Notable features", "Landmarks and hazards"],
      ["access", "Access / travel", "How people reach or avoid it"],
    ],
  },
] as const;

const artifactProfileSections = [
  {
    title: "Infobox",
    fields: [
      ["category", "Category", "Artifact / Weapon"],
      ["fullName", "Full name", "Formal artifact name"],
      ["alias", "Alias", "Other names"],
      ["type", "Type", "Weapon, relic, armor, tool, vehicle"],
      ["status", "Status", "Active, lost, destroyed, sealed"],
      ["creator", "Creator", "Who made it"],
      ["created", "Created", "Date or era of creation"],
      ["origin", "Origin", "Where it came from"],
      ["material", "Material", "Construction and composition"],
      ["creatorOwner", "Owner", "Current owner"],
      ["wielders", "Wielders", "Known wielders"],
      ["affiliation", "Affiliation", "Faction or organization"],
      ["location", "Location", "Current location"],
      ["powerSource", "Power source", "Energy or magic source"],
      ["destructivePower", "Destructive power", "Threat or output scale"],
    ],
  },
  {
    title: "Function & History",
    fields: [
      ["overview", "Overview", "What it is and why it matters"],
      [
        "appearanceDesign",
        "Appearance & design",
        "Physical description and craftsmanship",
      ],
      ["abilities", "Primary abilities", "Core functions"],
      ["secondaryAbilities", "Secondary abilities", "Additional functions"],
      ["activationUse", "Activation / use", "How it is activated or wielded"],
      ["drawbacks", "Limitations & costs", "Drawbacks, costs, and risks"],
      ["creation", "Creation", "Who made it and why"],
      ["notableWielders", "Notable wielders", "Important users"],
      ["majorEvents", "Major events", "Events involving the artifact"],
      ["currentStatus", "Current status", "Present condition"],
      [
        "significance",
        "Significance",
        "Symbolic, strategic, or narrative weight",
      ],
      ["trivia", "Trivia", "Optional fun facts"],
      ["seeAlso", "See also", "Related records"],
      ["notesReferences", "Notes & references", "Sources and editorial notes"],
    ],
  },
] as const;

const eventProfileSections = [
  {
    title: "Infobox",
    fields: [
      ["category", "Category", "Event"],
      ["fullName", "Full name", "Formal event name"],
      ["alias", "Alias", "Other names"],
      ["caption", "Image caption", "Caption for the event image"],
      [
        "type",
        "Type",
        "Battle, disaster, discovery, political, cosmic, personal",
      ],
      ["status", "Status", "Resolved, ongoing, aftermath, suppressed"],
      ["date", "Date", "Date or era"],
      ["era", "Era", "Historical era"],
      ["duration", "Duration", "How long it lasted"],
      ["location", "Location", "Where it happened"],
      ["scale", "Scale", "Local, planetary, galactic, multiversal"],
      ["cause", "Cause", "Primary cause or trigger"],
      ["participants", "Participants", "People involved"],
      ["keyFigures", "Key figures", "Central individuals"],
      ["factions", "Factions", "Groups and forces involved"],
      ["outcome", "Outcome", "What resulted"],
      ["casualties", "Casualties", "Losses and affected populations"],
    ],
  },
  {
    title: "Overview & Causes",
    fields: [
      ["overview", "Overview", "What happened and why it matters"],
      [
        "longTermTensions",
        "Long-term tensions",
        "Conditions building toward the event",
      ],
      ["immediateTriggers", "Immediate triggers", "What set it in motion"],
      ["warningSigns", "Warning signs", "Forewarnings and ignored signals"],
    ],
  },
  {
    title: "Timeline of Events",
    fields: [
      ["prelude", "Prelude", "Events immediately before"],
      ["theEvent", "The event", "Main sequence of events"],
      ["climax", "Climax", "Turning point"],
      ["aftermath", "Aftermath", "What followed"],
    ],
  },
  {
    title: "Outcome, Significance & Legacy",
    fields: [
      ["immediateResults", "Immediate results", "Direct consequences"],
      ["longTermConsequences", "Long-term consequences", "Lasting effects"],
      ["unresolvedThreads", "Unresolved threads", "Open questions"],
      ["significance", "Significance", "In-universe and narrative importance"],
      ["legacy", "Legacy", "How it is remembered or suppressed"],
      ["trivia", "Trivia", "Optional facts"],
      ["seeAlso", "See also", "Related records"],
      ["notesReferences", "Notes & references", "Sources and editorial notes"],
    ],
  },
] as const;

interface CharacterPickerProps {
  label: string;
  characters: any[];
  selected: string[];
  onToggle: (name: string) => void;
  accentClass?: string;
}

const CharacterPicker: React.FC<CharacterPickerProps> = ({
  label,
  characters,
  selected,
  onToggle,
  accentClass = "text-yellow-400",
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = characters.filter((character) => {
    const text =
      `${character.name || ""} ${character.codeName || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <div className="character-picker bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">{label}</span>
        <span className={`text-[10px] ${accentClass} font-mono`}>
          {selected.length} selected
        </span>
      </div>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            characters.length
              ? "Search characters (optional)..."
              : "No characters yet (optional)"
          }
          disabled={!characters.length}
          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
        />
        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded border border-white/10 bg-zinc-950 shadow-xl">
            {matches.length ? (
              matches.map((character) => {
                const name = character.name || character.codeName;
                const selectedNow = selected.includes(name);
                return (
                  <button
                    type="button"
                    key={character.id}
                    onClick={() => onToggle(name)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/10"
                  >
                    <span>
                      {name}
                      {character.codeName ? ` (${character.codeName})` : ""}
                    </span>
                    <span
                      className={
                        selectedNow ? "text-yellow-400" : "text-zinc-500"
                      }
                    >
                      {selectedNow ? "Selected" : "Pick"}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-xs text-zinc-500">
                {characters.length
                  ? "No characters found."
                  : "Add other characters first to create a relationship."}
              </p>
            )}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => onToggle(name)}
              className="rounded bg-white/10 px-2 py-1 text-[10px] text-zinc-200"
            >
              {name} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface QuickCreateModalProps {
  initialEntityType?: string;
  onClose: () => void;
  onCreated: () => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  initialEntityType = "characters",
  onClose,
  onCreated,
}) => {
  const [entityType, setEntityType] = useState(initialEntityType);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [extraField, setExtraField] = useState("");

  // Detailed character attributes
  const [codeName, setCodeName] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [height, setHeight] = useState("");
  const [occupation, setOccupation] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string[]>([]);
  const [sketchUrl, setSketchUrl] = useState("");
  const [powersInput, setPowersInput] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([]);
  const [availablePlanets, setAvailablePlanets] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [saveError, setSaveError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [species, setSpecies] = useState("Human");
  const [availableSpecies, setAvailableSpecies] =
    useState<string[]>(speciesOptions);
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [showSpecies, setShowSpecies] = useState(false);
  const [profileFields, setProfileFields] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    setEntityType(initialEntityType || "characters");
  }, [initialEntityType]);

  useEffect(() => {
    Promise.all([
      fetch("/api/characters").then((res) => res.json()),
      fetch("/api/planets").then((res) => res.json()),
      fetch("/api/locations").then((res) => res.json()),
      fetch("/api/species").then((res) => res.json()),
    ])
      .then(([characters, planets, locations, archiveSpecies]) => {
        setAvailableCharacters(characters || []);
        setAvailablePlanets(planets || []);
        setAvailableLocations(locations || []);
        const archiveSpeciesNames = (
          Array.isArray(archiveSpecies) ? archiveSpecies : []
        )
          .map(
            (record: any) =>
              record.name ||
              record.speciesName ||
              record.commonName ||
              record.title ||
              record.id,
          )
          .filter((name: unknown): name is string => Boolean(name));
        setAvailableSpecies(
          [...archiveSpeciesNames, ...speciesOptions].filter(
            (name, index, names) =>
              names.findIndex(
                (candidate) => candidate.toLowerCase() === name.toLowerCase(),
              ) === index,
          ),
        );
      })
      .catch((err) => console.error(err));
  }, []);

  const handleToggleFriend = (charName: string) => {
    setSelectedFriends((prev) =>
      prev.includes(charName)
        ? prev.filter((f) => f !== charName)
        : [...prev, charName],
    );
  };

  const handleToggleFamily = (charName: string) => {
    setSelectedFamily((prev) =>
      prev.includes(charName)
        ? prev.filter((f) => f !== charName)
        : [...prev, charName],
    );
  };

  const submitRecord = async (canonStatus: "CANON" | "DRAFT") => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setSaveError("");

    let payload: any = {
      name,
      description,
      canonStatus,
    };

    try {
      if (entityType === "characters") {
        payload.codeName = codeName || extraField || "Operative";
        payload.species = "Human";
        payload.species = species;
        payload.currentStatus = "Active";
        payload.hair = hairColor || "Unspecified";
        payload.eyes = eyeColor || "Unspecified";
        payload.height = height || "5'10\"";
        payload.occupation = occupation || "Adventurer / Operative";
        payload.friends = selectedFriends;
        payload.family = selectedFamily;
        Object.assign(payload, profileFields);
        payload.powers = splitListInput(
          String(profileFields.powers ?? powersInput ?? ""),
        );
        payload.skills = splitListInput(
          String(profileFields.skills ?? skillsInput ?? ""),
        );
        payload.weaknesses = splitListInput(
          String(profileFields.weaknesses ?? ""),
        );
        payload.equipment = splitListInput(
          String(profileFields.equipment ?? ""),
        );
        if (sketchUrl) {
          payload.portrait = sketchUrl;
        }
        if (imageFile) {
          const upload = await uploadArchiveImage(imageFile, entityType);
          if (upload.error) throw upload.error;
          if (entityType === "characters") payload.portrait = upload.url;
          else if (entityType === "teams") payload.logo = upload.url;
          else if (entityType === "issues") payload.cover = upload.url;
          else if (["planets", "locations", "artifacts"].includes(entityType))
            payload.image = upload.url;
        }
      } else if (entityType === "teams") {
        payload.type = profileFields.type || extraField || "Taskforce";
        payload.fullName = profileFields.fullName || name;
        payload.alias = profileFields.alias || "";
        payload.category = profileFields.category || "Team";
        payload.status = profileFields.status || "Active";
        payload.foundingDate = profileFields.foundingDate || "";
        payload.foundedBy = profileFields.foundedBy || "";
        payload.territory = profileFields.territory || "";
        payload.affiliation = profileFields.affiliation || "";
        payload.size = profileFields.size || "";
        payload.powerSource = profileFields.powerSource || "";
        payload.specialties = profileFields.specialties || "";
        payload.resources = profileFields.resources || "";
        payload.description = profileFields.overview || description;
        Object.assign(payload, profileFields);
        if (imageFile) {
          const upload = await uploadArchiveImage(imageFile, "teams");
          if (upload.error) throw upload.error;
          payload.logo = upload.url;
        }
      } else if (entityType === "planets") {
        payload.fullName = profileFields.fullName || name;
        payload.category = profileFields.category || "Planet";
        payload.status = profileFields.status || "Unknown";
        payload.starSystem = profileFields.starSystem || "";
        payload.star = profileFields.star || "";
        payload.position = profileFields.position || "";
        payload.dayLength = profileFields.dayLength || "";
        payload.yearLength = profileFields.yearLength || "";
        payload.terrain = profileFields.terrain || "";
        payload.nativeSpecies = profileFields.nativeSpecies || "";
        payload.languages = profileFields.languages || "";
        payload.government = profileFields.government || "";
        payload.techLevel = profileFields.techLevel || "";
        payload.overview = profileFields.overview || description;
        payload.description = profileFields.overview || description;
        Object.assign(payload, profileFields);
        if (imageFile) {
          const upload = await uploadArchiveImage(imageFile, "planets");
          if (upload.error) throw upload.error;
          payload.image = upload.url;
        }
      } else if (entityType === "locations") {
        payload.fullName = profileFields.fullName || name;
        payload.category = profileFields.category || "Location";
        payload.status = profileFields.status || "Active";
        payload.alias = profileFields.alias || "";
        payload.type = profileFields.type || extraField || "Settlement";
        payload.planetId = profileFields.planetId || "";
        payload.parentLocation = profileFields.parentLocation || "";
        payload.coordinates = profileFields.coordinates || "";
        payload.history = profileFields.history || "";
        payload.description = profileFields.overview || description;
        Object.assign(payload, profileFields);
        if (imageFile) {
          const upload = await uploadArchiveImage(imageFile, "locations");
          if (upload.error) throw upload.error;
          payload.image = upload.url;
        }
      } else if (entityType === "artifacts") {
        payload.type = profileFields.type || extraField || "Weapon";
        payload.status = profileFields.status || "Active";
        payload.fullName = profileFields.fullName || name;
        payload.alias = profileFields.alias || "";
        payload.category = profileFields.category || "Artifact / Weapon";
        payload.created = profileFields.created || "";
        payload.material = profileFields.material || "";
        payload.currentOwner = profileFields.creatorOwner || "";
        payload.wielders = profileFields.wielders || "";
        payload.affiliation = profileFields.affiliation || "";
        payload.location = profileFields.location || "";
        payload.powerSource = profileFields.powerSource || "";
        payload.destructivePower = profileFields.destructivePower || "";
        payload.description = profileFields.overview || description;
        Object.assign(payload, profileFields);
        if (imageFile) {
          const upload = await uploadArchiveImage(imageFile, "artifacts");
          if (upload.error) throw upload.error;
          payload.image = upload.url;
        }
      } else if (entityType === "species") {
        Object.assign(payload, {
          homePlanet: profileFields.homePlanet || "",
          lifespan: profileFields.lifespan || "",
          biology: profileFields.biology || "",
          abilities: profileFields.abilities || "",
          weaknesses: profileFields.weaknesses || "",
          culture: profileFields.culture || "",
          language: profileFields.language || "",
          population: profileFields.population || "",
          overview: profileFields.overview || description,
        });
        Object.assign(payload, profileFields);
        payload.overview = profileFields.overview || description;
        delete payload.description;
        if (imageFile) {
          const upload = await uploadArchiveImage(imageFile, "species");
          if (upload.error) throw upload.error;
          payload.image = upload.url;
        }
      } else if (entityType === "powers") {
        payload.category = profileFields.category || "Power / Tech";
        payload.type = profileFields.type || extraField || "Power";
        payload.status = profileFields.status || "Active";
        payload.description = profileFields.description || description;
        payload.limitations = profileFields.limitations || "";
        payload.knownUsers = splitListInput(
          String(profileFields.knownUsers || ""),
        );
        payload.strengthRating = profileFields.strengthRating
          ? Number(profileFields.strengthRating)
          : null;
        Object.assign(payload, profileFields);
      } else if (entityType === "events") {
        payload.fullName = profileFields.fullName || name;
        payload.category = profileFields.category || "Event";
        payload.type = profileFields.type || "Battle";
        payload.status = profileFields.status || "Ongoing";
        payload.eventDate = profileFields.date || "";
        payload.location = profileFields.location || "";
        payload.characters = profileFields.keyFigures || "";
        payload.teams = profileFields.factions || "";
        payload.consequences = profileFields.longTermConsequences || "";
        payload.description = profileFields.overview || description;
        Object.assign(payload, profileFields);
        if (imageFile) {
          const upload = await uploadArchiveImage(imageFile, "events");
          if (upload.error) throw upload.error;
          payload.image = upload.url;
        }
      }

      const res = await fetch(`/api/${entityType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        onCreated();
        onClose();
      } else {
        const result = await res.json().catch(() => ({}));
        setSaveError(result.error || "The record could not be saved.");
      }
    } catch (err) {
      console.error(err);
      setSaveError(
        err instanceof Error ? err.message : "The record could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    submitRecord("CANON");
  };

  const entityMeta = {
    characters: {
      title: "Create Character",
      nameLabel: "Full name / real name",
      namePlaceholder: "e.g. Dr. Alika Vane",
      secondaryLabel: "Code name / alias",
      secondaryPlaceholder: "e.g. Viper",
    },
    species: {
      title: "Create Species",
      nameLabel: "Species name",
      namePlaceholder: "e.g. Celestial Seraphim",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
    powers: {
      title: "Create Power / Tech",
      nameLabel: "Power or tech name",
      namePlaceholder: "e.g. Chrono Pulse",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
    teams: {
      title: "Create Team",
      nameLabel: "Team name",
      namePlaceholder: "e.g. Crimson Vanguard",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
    planets: {
      title: "Create Planet",
      nameLabel: "Planet name",
      namePlaceholder: "e.g. Aether Prime",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
    locations: {
      title: "Create Location",
      nameLabel: "Location name",
      namePlaceholder: "e.g. Hollow Spire",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
    artifacts: {
      title: "Create Artifact",
      nameLabel: "Artifact name",
      namePlaceholder: "e.g. Ashen Crown",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
    events: {
      title: "Create Event",
      nameLabel: "Event name",
      namePlaceholder: "e.g. The Silent Eclipse",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
    issues: {
      title: "Create Issue",
      nameLabel: "Issue title",
      namePlaceholder: "e.g. The Veil Breaks",
      secondaryLabel: "",
      secondaryPlaceholder: "",
    },
  } as const;

  const currentEntityMeta =
    entityMeta[entityType as keyof typeof entityMeta] || entityMeta.characters;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/5 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-bold text-zinc-100">
              {currentEntityMeta.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white bg-zinc-900 rounded-2xl border border-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              Entity Category
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              <option value="characters">Character (Detailed)</option>
              <option value="species">Species / Race</option>
              <option value="powers">Powers &amp; Tech</option>
              <option value="teams">Team</option>
              <option value="planets">Planet</option>
              <option value="locations">Location</option>
              <option value="artifacts">Artifact / Weapon</option>
              <option value="events">Event</option>
              <option value="issues">Issue</option>
            </select>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${entityType === "characters" ? "sm:grid-cols-2" : ""}`}
          >
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                {currentEntityMeta.nameLabel}
              </label>
              <input
                type="text"
                placeholder={currentEntityMeta.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </div>
            {entityType === "characters" && (
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium">
                  {currentEntityMeta.secondaryLabel}
                </label>
                <input
                  type="text"
                  placeholder={currentEntityMeta.secondaryPlaceholder}
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
                />
              </div>
            )}
          </div>

          {entityType === "characters" && (
            <>
              {/* Precise Physical & Biographical Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-mono">
                    Hair Color
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Emerald Green"
                    value={hairColor}
                    onChange={(e) => setHairColor(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-mono">
                    Eye Color
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amber / Slit"
                    value={eyeColor}
                    onChange={(e) => setEyeColor(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-mono">
                    Height / Build
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5 ft 9 in / Athletic"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-mono">
                    Occupation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bio-Engineer"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-1.5 text-xs text-zinc-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs text-zinc-400 font-medium">
                  Species / Race
                </label>
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
                  placeholder={`Search species (selected: ${species})...`}
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
                />
                {showSpecies && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded border border-white/10 bg-zinc-950 shadow-xl">
                    {speciesQuery.trim() &&
                      !availableSpecies.some(
                        (option) =>
                          option.toLowerCase() ===
                          speciesQuery.trim().toLowerCase(),
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSpecies(speciesQuery.trim());
                            setSpeciesQuery("");
                            setShowSpecies(false);
                          }}
                          className="block w-full border-b border-white/10 px-3 py-2 text-left text-xs text-yellow-300 hover:bg-white/10"
                        >
                          Use custom: “{speciesQuery.trim()}”
                        </button>
                      )}
                    {availableSpecies
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
                            setSpecies(option);
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
              </div>

              <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono sm:col-span-2">
                    <span>Powers</span>
                    <textarea
                      rows={2}
                      value={profileFields.powers ?? powersInput}
                      placeholder="Separate powers with commas or new lines"
                      onChange={(event) => {
                        setPowersInput(event.target.value);
                        setProfileFields((current) => ({
                          ...current,
                          powers: event.target.value,
                        }));
                      }}
                      className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                    />
                  </label>
                  <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono sm:col-span-2">
                    <span>Skills</span>
                    <textarea
                      rows={2}
                      value={profileFields.skills ?? skillsInput}
                      placeholder="Separate skills with commas or new lines"
                      onChange={(event) => {
                        setSkillsInput(event.target.value);
                        setProfileFields((current) => ({
                          ...current,
                          skills: event.target.value,
                        }));
                      }}
                      className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                    />
                  </label>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
                    Character Infobox & History
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Real identity, appearance, origin, and present-day context.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {characterBibleFields.map(([key, label, placeholder]) => (
                    <label
                      key={key}
                      className={`space-y-1 text-[10px] text-zinc-400 uppercase font-mono ${key === "description" || key === "origin" ? "sm:col-span-2" : ""}`}
                    >
                      <span>{label}</span>
                      <textarea
                        rows={key === "description" || key === "origin" ? 3 : 2}
                        value={profileFields[key] || ""}
                        placeholder={placeholder}
                        onChange={(event) =>
                          setProfileFields((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                {characterProfileFields.map(([key, label, placeholder]) => (
                  <label
                    key={key}
                    className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono"
                  >
                    <span>{label}</span>
                    <textarea
                      rows={
                        key === "physicalAppearance" || key === "characterArc"
                          ? 3
                          : 2
                      }
                      placeholder={placeholder}
                      value={profileFields[key] || ""}
                      onChange={(event) =>
                        setProfileFields((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                    />
                  </label>
                ))}
              </div>

              {/* Searchable character relationships */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CharacterPicker
                  label="Friends & Allies"
                  characters={availableCharacters}
                  selected={selectedFriends}
                  onToggle={handleToggleFriend}
                />
                <CharacterPicker
                  label="Family & Relatives"
                  characters={availableCharacters}
                  selected={selectedFamily}
                  onToggle={handleToggleFamily}
                  accentClass="text-pink-400"
                />
              </div>

              {/* Concept Art / Sketch Upload */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 font-medium flex items-center space-x-1.5">
                  <Upload className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Upload an image</span>
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] || null)
                  }
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
                />
                {imageFile && (
                  <p className="text-[10px] text-zinc-400">
                    Ready to upload: {imageFile.name}
                  </p>
                )}
              </div>
            </>
          )}

          {entityType === "powers" && (
            <div className="space-y-4 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono">
                  <span>Type</span>
                  <select
                    value={profileFields.type || "Power"}
                    onChange={(event) =>
                      setProfileFields((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                  >
                    <option value="Power">Power</option>
                    <option value="Tech">Tech</option>
                    <option value="Mutation">Mutation</option>
                    <option value="Artifact Tech">Artifact Tech</option>
                    <option value="Mystic Ability">Mystic Ability</option>
                  </select>
                </label>

                <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono">
                  <span>Status</span>
                  <select
                    value={profileFields.status || "Active"}
                    onChange={(event) =>
                      setProfileFields((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Lost">Lost</option>
                    <option value="Forbidden">Forbidden</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </label>

                <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono">
                  <span>Category</span>
                  <input
                    value={profileFields.category || "Power / Tech"}
                    onChange={(event) =>
                      setProfileFields((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono">
                  <span>Strength rating</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={profileFields.strengthRating || ""}
                    onChange={(event) =>
                      setProfileFields((current) => ({
                        ...current,
                        strengthRating: event.target.value,
                      }))
                    }
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono sm:col-span-2">
                  <span>Known Users</span>
                  <textarea
                    rows={2}
                    value={profileFields.knownUsers || ""}
                    placeholder="Separate names with commas or new lines"
                    onChange={(event) =>
                      setProfileFields((current) => ({
                        ...current,
                        knownUsers: event.target.value,
                      }))
                    }
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono sm:col-span-2">
                  <span>Limitations</span>
                  <textarea
                    rows={2}
                    value={profileFields.limitations || ""}
                    onChange={(event) =>
                      setProfileFields((current) => ({
                        ...current,
                        limitations: event.target.value,
                      }))
                    }
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono sm:col-span-2">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={profileFields.description || description || ""}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setProfileFields((current) => ({
                        ...current,
                        description: event.target.value,
                      }));
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                  />
                </label>
              </div>
            </div>
          )}

          {entityType === "species" && (
            <div className="space-y-5 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    Species Bible
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Build the full reference entry, not just a race name.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-[10px] text-zinc-200 cursor-pointer hover:bg-white/10">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{imageFile ? "Replace image" : "Species image"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) =>
                      setImageFile(event.target.files?.[0] || null)
                    }
                    className="sr-only"
                  />
                </label>
              </div>
              {speciesProfileSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.fields.map(([key, label, placeholder]) => (
                      <label
                        key={key}
                        className={`space-y-1 text-[10px] text-zinc-400 uppercase font-mono ${["overview", "appearance", "physiology", "lifecycleReproduction", "diet", "limitationsWeaknesses", "customsValues", "governmentStructure", "technology", "origins", "majorEvents", "currentStatus", "notableIndividuals", "trivia", "seeAlso", "notesReferences"].includes(key) ? "sm:col-span-2" : ""}`}
                      >
                        <span>{label}</span>
                        <textarea
                          rows={["overview", "biology"].includes(key) ? 4 : 2}
                          value={profileFields[key] || ""}
                          placeholder={placeholder}
                          onChange={(event) =>
                            setProfileFields((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {entityType === "teams" && (
            <div className="space-y-5 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    Team Bible
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Roster, mandate, operations, culture, and legacy.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-[10px] text-zinc-200 cursor-pointer hover:bg-white/10">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {imageFile ? "Replace insignia" : "Team insignia"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) =>
                      setImageFile(event.target.files?.[0] || null)
                    }
                    className="sr-only"
                  />
                </label>
              </div>
              {teamProfileSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.fields.map(([key, label, placeholder]) => (
                      <label
                        key={key}
                        className={`space-y-1 text-[10px] text-zinc-400 uppercase font-mono ${["overview", "purposeMandate", "chainCommand", "roles", "membershipCriteria", "recruitment", "currentMembers", "notableFormer", "reservistsAffiliates", "teamValues", "internalDynamics", "symbolsInsignia", "reputation", "allies", "enemies", "founding", "majorOperations", "schismsReforms", "currentStatus", "legacy", "trivia", "seeAlso", "notesReferences"].includes(key) ? "sm:col-span-2" : ""}`}
                      >
                        <span>{label}</span>
                        <textarea
                          rows={key === "overview" || key === "legacy" ? 4 : 2}
                          value={profileFields[key] || ""}
                          placeholder={placeholder}
                          onChange={(event) =>
                            setProfileFields((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {entityType === "planets" && (
            <div className="space-y-5 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    Planet Bible
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Astronomy, ecology, civilization, culture, and strategic
                    value.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-[10px] text-zinc-200 cursor-pointer hover:bg-white/10">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{imageFile ? "Replace image" : "Planet image"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) =>
                      setImageFile(event.target.files?.[0] || null)
                    }
                    className="sr-only"
                  />
                </label>
              </div>
              {planetProfileSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.fields.map(([key, label, placeholder]) => (
                      <label
                        key={key}
                        className={`space-y-1 text-[10px] text-zinc-400 uppercase font-mono ${["overview", "continentsRegions", "oceansWaterways", "naturalWonders", "valuesCustoms", "religionBelief", "economy", "artArchitecture", "formation", "ancientEra", "majorEvents", "currentStatus", "strategicSignificance", "legacy", "affiliation", "allies", "enemies", "notableLocations", "trivia", "seeAlso", "notesReferences"].includes(key) ? "sm:col-span-2" : ""}`}
                      >
                        <span>{label}</span>
                        <textarea
                          rows={key === "overview" || key === "legacy" ? 4 : 2}
                          value={profileFields[key] || ""}
                          placeholder={placeholder}
                          onChange={(event) =>
                            setProfileFields((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {entityType === "locations" && (
            <div className="space-y-5 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-zinc-200">
                    Location World Map
                  </p>
                  <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-[10px] text-zinc-200 cursor-pointer hover:bg-white/10">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {imageFile ? "Replace image" : "Location image"}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) =>
                        setImageFile(event.target.files?.[0] || null)
                      }
                      className="sr-only"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Bind this location to a planet and optionally another broader
                  region.
                </p>
              </div>
              {locationProfileSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.fields.map(([key, label, placeholder]) => {
                      const isSelect =
                        key === "planetId" || key === "parentLocation";
                      const options =
                        key === "planetId"
                          ? availablePlanets
                          : key === "parentLocation"
                            ? availableLocations
                            : [];

                      if (isSelect) {
                        return (
                          <label
                            key={key}
                            className="space-y-1 text-[10px] text-zinc-400 uppercase font-mono"
                          >
                            <span>{label}</span>
                            <select
                              value={profileFields[key] || ""}
                              onChange={(event) =>
                                setProfileFields((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                            >
                              <option value="">
                                {key === "planetId"
                                  ? "Select a planet"
                                  : "No parent location"}
                              </option>
                              {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }

                      return (
                        <label
                          key={key}
                          className={`space-y-1 text-[10px] text-zinc-400 uppercase font-mono ${["overview", "history", "culture", "economy", "notableFeatures", "access"].includes(key) ? "sm:col-span-2" : ""}`}
                        >
                          <span>{label}</span>
                          <textarea
                            rows={
                              key === "overview" || key === "history" ? 4 : 2
                            }
                            value={profileFields[key] || ""}
                            placeholder={placeholder}
                            onChange={(event) =>
                              setProfileFields((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                          />
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {entityType === "artifacts" && (
            <div className="space-y-5 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    Artifact Bible
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Design, function, origin, wielders, and significance.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-[10px] text-zinc-200 cursor-pointer hover:bg-white/10">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{imageFile ? "Replace image" : "Artifact image"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) =>
                      setImageFile(event.target.files?.[0] || null)
                    }
                    className="sr-only"
                  />
                </label>
              </div>
              {artifactProfileSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.fields.map(([key, label, placeholder]) => (
                      <label
                        key={key}
                        className={`space-y-1 text-[10px] text-zinc-400 uppercase font-mono ${["overview", "appearanceDesign", "abilities", "secondaryAbilities", "activationUse", "drawbacks", "creation", "notableWielders", "majorEvents", "currentStatus", "significance", "trivia", "seeAlso", "notesReferences"].includes(key) ? "sm:col-span-2" : ""}`}
                      >
                        <span>{label}</span>
                        <textarea
                          rows={
                            key === "overview" || key === "significance" ? 4 : 2
                          }
                          value={profileFields[key] || ""}
                          placeholder={placeholder}
                          onChange={(event) =>
                            setProfileFields((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {entityType === "events" && (
            <div className="space-y-5 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              <div className="border-b border-white/5 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-zinc-200">
                    Event Bible
                  </p>
                  <label className="inline-flex items-center gap-2 border border-white/10 bg-zinc-900 px-3 py-2 text-[10px] text-zinc-200 cursor-pointer hover:bg-white/10">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{imageFile ? "Replace image" : "Event image"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) =>
                        setImageFile(event.target.files?.[0] || null)
                      }
                      className="sr-only"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Record what happened, who was involved, and how the event
                  changed the universe.
                </p>
              </div>
              {eventProfileSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-widest text-yellow-400 font-mono">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.fields.map(([key, label, placeholder]) => (
                      <label
                        key={key}
                        className={`space-y-1 text-[10px] text-zinc-400 uppercase font-mono ${["overview", "cause", "longTermTensions", "immediateTriggers", "warningSigns", "prelude", "theEvent", "climax", "aftermath", "immediateResults", "longTermConsequences", "unresolvedThreads", "significance", "legacy", "trivia", "seeAlso", "notesReferences"].includes(key) ? "sm:col-span-2" : ""}`}
                      >
                        <span>{label}</span>
                        <textarea
                          rows={
                            key === "overview" ||
                            key === "theEvent" ||
                            key === "significance" ||
                            key === "legacy"
                              ? 4
                              : 2
                          }
                          value={profileFields[key] || ""}
                          placeholder={placeholder}
                          onChange={(event) =>
                            setProfileFields((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs normal-case font-sans text-zinc-200"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              Description / Lore Summary
            </label>
            <textarea
              rows={3}
              placeholder="Enter comprehensive lore summary..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
            />
          </div>

          {saveError && <p className="auth-message">{saveError}</p>}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-zinc-900 text-zinc-300 rounded-2xl text-xs hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submitRecord("DRAFT")}
              disabled={submitting}
              className="px-4 py-2 bg-zinc-900 text-zinc-200 border border-white/10 rounded-2xl text-xs hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-yellow-400 text-zinc-950 font-semibold rounded-2xl text-xs hover:bg-yellow-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save Precise Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
