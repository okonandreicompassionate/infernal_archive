import React, { useState, useEffect } from "react";
import { X, Plus, Globe, Upload, Users } from "lucide-react";
import confetti from "canvas-confetti";
import { uploadArchiveImage } from "../utils/supabase";

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
          placeholder="Search characters..."
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
                No characters found.
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

    let payload: any = {
      name,
      description,
      canonStatus: "CANON",
    };

    if (entityType === "characters") {
      payload.codeName = codeName || extraField || "Operative";
      payload.universeId = "univ-1";
      payload.species = "Human";
      payload.currentStatus = "Active";
      payload.hair = hairColor || "Unspecified";
      payload.eyes = eyeColor || "Unspecified";
      payload.height = height || "5'10\"";
      payload.occupation = occupation || "Adventurer / Operative";
      payload.friends = selectedFriends;
      payload.family = selectedFamily;
      if (sketchUrl) {
        payload.portrait = sketchUrl;
        payload.sketch = sketchUrl;
      }
      if (imageFile) {
        const upload = await uploadArchiveImage(imageFile, entityType);
        if (upload.error) throw upload.error;
        payload.portrait = upload.url;
        payload.image = upload.url;
      }
    } else if (entityType === "teams") {
      payload.type = extraField || "Taskforce";
      payload.universeId = "univ-1";
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
      }
    } catch (err) {
      console.error(err);
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
