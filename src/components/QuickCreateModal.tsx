import React, { useState, useEffect } from "react";
import { X, Plus, Globe, Upload, Users } from "lucide-react";
import confetti from "canvas-confetti";
import { uploadArchiveImage } from "../utils/supabase";

const speciesOptions = [
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
  onClose: () => void;
  onCreated: () => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  onClose,
  onCreated,
}) => {
  const [entityType, setEntityType] = useState("characters");
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([]);
  const [saveError, setSaveError] = useState("");
  const [species, setSpecies] = useState("Human");
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [showSpecies, setShowSpecies] = useState(false);
  const [profileFields, setProfileFields] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    fetch("/api/characters")
      .then((res) => res.json())
      .then((data) => setAvailableCharacters(data))
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaveError("");

    let payload: any = {
      name,
      description,
      canonStatus: "CANON",
    };

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
      payload.type = extraField || "Taskforce";
    } else if (entityType === "artifacts") {
      payload.type = extraField || "Weapon";
      payload.status = "Active";
    }

    try {
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/5 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Create Universe Record & Precise Character Details
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
              <option value="teams">Team</option>
              <option value="planets">Planet</option>
              <option value="locations">Location</option>
              <option value="artifacts">Artifact / Weapon</option>
              <option value="events">Event</option>
              <option value="issues">Issue</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Full Name / Real Name
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Alika Vane"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Code Name / Alias
              </label>
              <input
                type="text"
                placeholder="e.g. Viper"
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </div>
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
                      !speciesOptions.some(
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
              className="px-4 py-2 bg-zinc-900 text-zinc-300 rounded-2xl text-xs hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-400 text-zinc-950 font-semibold rounded-2xl text-xs hover:bg-yellow-400 cursor-pointer"
            >
              Save Precise Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
