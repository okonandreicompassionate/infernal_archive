import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FileText,
  Globe2,
  Layers3,
  Menu,
  Search,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
  Zap,
} from "lucide-react";
import { CombatSimulator } from "./CombatSimulator";

const PUBLIC_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: Layers3 },
  { id: "archive", label: "Archive", icon: BookOpen },
  { id: "characters", label: "Characters", icon: Users },
  { id: "worlds", label: "Worlds", icon: Globe2 },
  { id: "comics", label: "Comics", icon: FileText },
  { id: "simulator", label: "Combat Lab", icon: Swords },
];

const ARCHIVE_TYPES = [
  "characters",
  "species",
  "powers",
  "artifacts",
  "events",
  "teams",
  "organizations",
  "planets",
  "locations",
  "issues",
];

const TYPE_LABELS: Record<string, string> = {
  characters: "Characters",
  species: "Species",
  powers: "Powers",
  artifacts: "Artifacts",
  teams: "Teams",
  organizations: "Organizations",
  planets: "Planets",
  locations: "Locations",
  issues: "Comics",
  events: "Events",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  characters: Users,
  species: Users,
  powers: Zap,
  artifacts: Shield,
  teams: Users,
  organizations: Shield,
  planets: Globe2,
  locations: Globe2,
  issues: FileText,
  events: CalendarDays,
};

interface PublicExperienceProps {
  initialSection?: string;
}

export const PublicExperience: React.FC<PublicExperienceProps> = ({
  initialSection = "dashboard",
}) => {
  const [section, setSection] = useState(initialSection);
  const [records, setRecords] = useState<Record<string, any[]>>({});
  const [query, setQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [archiveFilter, setArchiveFilter] = useState("ALL");
  const [archivePage, setArchivePage] = useState(1);
  const publicPageSize = 12;

  useEffect(() => {
    fetch("/api/public/archive/search")
      .then((res) => res.json())
      .then((data) => {
        const grouped: Record<string, any[]> = {};
        (Array.isArray(data) ? data : []).forEach(({ type, item }) => {
          grouped[type] = [...(grouped[type] || []), item];
        });
        setRecords(grouped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialSection !== section) setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setArchivePage(1);
  }, [query, archiveFilter, section]);

  const allRecords = useMemo(
    () =>
      ARCHIVE_TYPES.flatMap((type) =>
        (records[type] || []).map((item) => ({ type, item })),
      ),
    [records],
  );
  const filteredRecords = allRecords.filter(({ type, item }) => {
    const haystack = JSON.stringify(item).toLowerCase();
    const matchesQuery =
      !query.trim() || haystack.includes(query.trim().toLowerCase());
    const classifications = Array.isArray(item.recordTypes)
      ? item.recordTypes.map((value: string) => value.toLowerCase())
      : [
          String(item.category || "").toLowerCase(),
          String(item.type || "").toLowerCase(),
        ];
    const matchesFilter =
      archiveFilter === "ALL" ||
      (archiveFilter === "POWER" &&
        (type === "powers" ||
          classifications.includes("power") ||
          item.category === "Powers")) ||
      (archiveFilter === "TECHNOLOGY" &&
        classifications.includes("technology")) ||
      (archiveFilter === "WEAPON" &&
        (classifications.includes("weapon") ||
          classifications.some((value: string) => value.includes("weapon")))) ||
      (archiveFilter === "EVENT" &&
        (type === "events" || item.category === "Event"));
    return matchesQuery && matchesFilter;
  });
  const characterRecords = records.characters || [];
  const issueRecords = records.issues || [];
  const canonCount = allRecords.length;
  const publicSections =
    section === "archive"
      ? filteredRecords
      : filteredRecords.filter(({ type }) => {
          if (section === "characters") return type === "characters";
          if (section === "worlds")
            return ["planets", "locations", "species"].includes(type);
          if (section === "comics") return type === "issues";
          return true;
        });
  const publicPageCount = Math.max(
    1,
    Math.ceil(publicSections.length / publicPageSize),
  );
  const visiblePublicSections = publicSections.slice(
    (archivePage - 1) * publicPageSize,
    archivePage * publicPageSize,
  );

  const navigate = (next: string) => {
    setSection(next);
    setSelectedRecord(null);
    setMobileNavOpen(false);
    const path = next === "dashboard" ? "/public" : `/public/${next}`;
    window.history.pushState({}, "", path);
  };

  const getName = (item: any) =>
    item.name || item.title || item.codeName || "Untitled record";
  const getSummary = (item: any) =>
    item.description ||
    item.biography ||
    item.synopsis ||
    item.goals ||
    item.biology ||
    "Canon record in the Infernal Archive.";
  const getImage = (item: any) =>
    item.portrait || item.cover || item.image || item.logo;

  const renderRecordProfile = ({ type, item }: { type: string; item: any }) => {
    const recordTypes = Array.isArray(item.recordTypes)
      ? item.recordTypes
      : item.category
        ? String(item.category).split(" / ")
        : [];
    const profileSections =
      type === "events"
        ? [
            {
              title: "Overview & Causes",
              fields: [
                ["overview", item.overview || getSummary(item)],
                ["cause", item.cause],
                ["longTermTensions", item.longTermTensions],
                ["immediateTriggers", item.immediateTriggers],
                ["warningSigns", item.warningSigns],
              ],
            },
            {
              title: "Timeline of Events",
              fields: [
                ["prelude", item.prelude],
                ["theEvent", item.theEvent],
                ["climax", item.climax],
                ["aftermath", item.aftermath],
              ],
            },
            {
              title: "Participants & Outcome",
              fields: [
                ["participants", item.participants],
                ["keyFigures", item.keyFigures],
                ["factions", item.factions],
                ["outcome", item.outcome],
                ["casualties", item.casualties],
                ["immediateResults", item.immediateResults],
              ],
            },
            {
              title: "Significance & Legacy",
              fields: [
                [
                  "longTermConsequences",
                  item.longTermConsequences || item.consequences,
                ],
                ["unresolvedThreads", item.unresolvedThreads],
                ["significance", item.significance],
                ["legacy", item.legacy],
                ["trivia", item.trivia],
              ],
            },
          ]
        : [
            {
              title: "Overview",
              fields: [
                ["overview", item.overview || getSummary(item)],
                ["origin", item.origin],
                ["significance", item.significance],
              ],
            },
            {
              title: "Function",
              fields: [
                ["capabilities", item.capabilities || item.abilities],
                ["secondaryAbilities", item.secondaryAbilities],
                ["activationUse", item.activationUse],
                ["powerSource", item.powerSource],
              ],
            },
            {
              title: "Limits & context",
              fields: [
                ["limitations", item.limitations || item.drawbacks],
                ["creator", item.creator],
                ["users", item.users || item.wielders || item.notableWielders],
                ["currentStatus", item.currentStatus || item.status],
              ],
            },
          ].map((section) => ({
            ...section,
            fields: section.fields.filter(([, value]) => value),
          }));

    return (
      <div className="public-content space-y-6">
        <button
          onClick={() => setSelectedRecord(null)}
          className="public-back-button"
        >
          <ArrowLeft className="w-4 h-4" /> Back to{" "}
          {TYPE_LABELS[type] || "archive"}
        </button>
        <section className="public-profile-hero">
          <div className="public-profile-visual">
            {getImage(item) ? (
              <img src={getImage(item)} alt={getName(item)} />
            ) : (
              React.createElement(TYPE_ICONS[type] || BookOpen, {
                className: "w-12 h-12 text-yellow-300",
              })
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="public-eyebrow">
                {TYPE_LABELS[type] || type}
              </span>
              <span className="public-status">CANON</span>
              {recordTypes.map((recordType: string) => (
                <span key={recordType} className="public-profile-tag">
                  {recordType}
                </span>
              ))}
            </div>
            <h1>{getName(item)}</h1>
            <p className="public-profile-summary">{getSummary(item)}</p>
          </div>
          <div className="public-profile-facts">
            <span>
              Type <strong>{item.type || TYPE_LABELS[type] || type}</strong>
            </span>
            <span>
              Status{" "}
              <strong>{item.currentStatus || item.status || "Unknown"}</strong>
            </span>
            <span>
              Affiliation <strong>{item.affiliation || "Independent"}</strong>
            </span>
          </div>
        </section>
        <section className="public-profile-sections">
          {profileSections
            .filter((section) => section.fields.length > 0)
            .map((section) => (
              <article
                key={section.title}
                className="public-panel public-profile-panel"
              >
                <p className="public-eyebrow">{section.title}</p>
                <div className="public-detail-list">
                  {section.fields.map(([key, value]) => (
                    <div key={key}>
                      <span>{String(key).replace(/([A-Z])/g, " $1")}</span>
                      <strong>{String(value)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
        </section>
        {item.trivia && (
          <section className="public-panel public-profile-panel">
            <p className="public-eyebrow">Archive notes</p>
            <p>{item.trivia}</p>
          </section>
        )}
      </div>
    );
  };

  const renderRecordCard = ({ type, item }: { type: string; item: any }) => {
    const Icon = TYPE_ICONS[type] || BookOpen;
    return (
      <button
        key={`${type}-${item.id}`}
        onClick={() => setSelectedRecord({ type, item })}
        className="public-record-card group text-left"
      >
        {getImage(item) ? (
          <img src={getImage(item)} alt="" className="public-record-image" />
        ) : (
          <div className="public-record-placeholder">
            <Icon className="w-7 h-7" />
          </div>
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="public-eyebrow">{TYPE_LABELS[type] || type}</span>
            <span className="public-status">CANON</span>
          </div>
          <h3 className="text-sm font-bold text-zinc-100 group-hover:text-yellow-300 transition-colors truncate">
            {getName(item)}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-500 line-clamp-2">
            {getSummary(item)}
          </p>
        </div>
      </button>
    );
  };

  if (selectedRecord?.type === "characters") {
    const character = selectedRecord.item;
    const relatedCharacters = characterRecords
      .filter((item) => item.id !== character.id)
      .filter((item) => {
        const relationshipText = JSON.stringify(
          character.relationships || [],
        ).toLowerCase();
        return (
          relationshipText.includes(String(item.name || "").toLowerCase()) ||
          relationshipText.includes(
            String(item.codeName || "").toLowerCase(),
          ) ||
          (item.affiliation && item.affiliation === character.affiliation)
        );
      })
      .slice(0, 6);

    return (
      <div className="public-character-page min-h-screen bg-[#25262b] text-zinc-100">
        <header className="public-character-header">
          <button
            onClick={() => setSelectedRecord(null)}
            className="public-back-button"
          >
            <ArrowLeft className="w-4 h-4" /> Back to characters
          </button>
          <span className="public-eyebrow">Character dossier · Canon</span>
        </header>
        <main className="public-character-content">
          <section className="public-character-hero">
            <div className="public-character-portrait">
              {getImage(character) ? (
                <img src={getImage(character)} alt={getName(character)} />
              ) : (
                <Users className="w-12 h-12 text-yellow-300" />
              )}
            </div>
            <div className="public-character-identity">
              <span className="public-eyebrow">
                {character.category || "Character"} · {character.canonStatus}
              </span>
              <h1>{getName(character)}</h1>
              {character.codeName && (
                <p className="public-character-alias">"{character.codeName}"</p>
              )}
              <p>{getSummary(character)}</p>
            </div>
            <div className="public-character-facts">
              <span>
                Status <strong>{character.currentStatus || "Unknown"}</strong>
              </span>
              <span>
                Species <strong>{character.species || "Unknown"}</strong>
              </span>
              <span>
                Occupation <strong>{character.occupation || "Unknown"}</strong>
              </span>
              <span>
                Affiliation{" "}
                <strong>{character.affiliation || "Independent"}</strong>
              </span>
            </div>
          </section>
          <section className="public-character-metrics">
            {[
              ["Powers", character.powers?.length || 0],
              ["Skills", character.skills?.length || 0],
              ["Allies", character.friends?.length || 0],
              ["First appearance", character.firstAppearance || "Unknown"],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>
          <section className="public-character-grid">
            <article className="public-character-panel">
              <p className="public-eyebrow">Ability loadout</p>
              <h2>Powers & skills</h2>
              <div className="public-chip-list">
                {[...(character.powers || []), ...(character.skills || [])].map(
                  (value: string) => (
                    <span key={value}>{value}</span>
                  ),
                )}
              </div>
            </article>
            <article className="public-character-panel">
              <p className="public-eyebrow">Character history</p>
              <h2>Why they matter</h2>
              <p>
                {character.origin ||
                  character.biography ||
                  "This character's history has not been published yet."}
              </p>
              <div className="public-character-history">
                <span>
                  First appearance{" "}
                  <strong>{character.firstAppearance || "Unknown"}</strong>
                </span>
                <span>
                  Current location{" "}
                  <strong>{character.currentLocation || "Unknown"}</strong>
                </span>
                <span>
                  Core themes{" "}
                  <strong>{character.centralThemes || "Unrecorded"}</strong>
                </span>
                <span>
                  Legacy{" "}
                  <strong>
                    {character.heroicVillainousLegacy || "Unrecorded"}
                  </strong>
                </span>
              </div>
            </article>
          </section>
          <section className="public-related-characters">
            <div className="public-panel-heading">
              <div>
                <p className="public-eyebrow">Continue exploring</p>
                <h2>Related characters</h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="public-inline-link"
              >
                All characters <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="public-related-grid">
              {relatedCharacters.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    setSelectedRecord({ type: "characters", item })
                  }
                  className="public-related-card"
                >
                  {getImage(item) ? (
                    <img src={getImage(item)} alt="" />
                  ) : (
                    <span>{getName(item).slice(0, 1)}</span>
                  )}
                  <strong>{getName(item)}</strong>
                  <small>{item.codeName || item.species || "Character"}</small>
                </button>
              ))}
            </div>
            {relatedCharacters.length === 0 && (
              <p className="public-empty">
                No related canon characters have been linked yet.
              </p>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="public-experience min-h-screen bg-[#25262b] text-zinc-100">
      <button
        onClick={() => setMobileNavOpen(true)}
        className="public-mobile-menu"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>
      <aside className={`public-sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <div className="public-profile">
          <div className="public-avatar">
            <img
              src="https://i.imgur.com/iS5wVPz.png"
              alt="Infernal Archive logo"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">
              Infernal Archive
            </p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Public access
            </p>
          </div>
          {mobileNavOpen && (
            <button
              onClick={() => setMobileNavOpen(false)}
              className="ml-auto text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <nav className="public-nav">
          <p className="public-nav-label">Explore</p>
          {PUBLIC_SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`public-nav-item ${section === item.id ? "is-active" : ""}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="public-sidebar-footer">
          <p className="public-eyebrow">Canon intelligence</p>
          <p className="text-xs leading-relaxed text-zinc-500">
            Explore only what has been approved for the public archive.
          </p>
        </div>
      </aside>

      <main className="public-main">
        <header className="public-topbar">
          <div className="flex items-center gap-3 min-w-0">
            <div className="public-wordmark">ARCHIVE</div>
            <span className="public-divider" />
            <span className="public-top-context">
              {PUBLIC_SECTIONS.find((item) => item.id === section)?.label ||
                "Explore"}
            </span>
          </div>
          <div className="public-search-wrap">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the canon..."
            />
          </div>
          <button
            onClick={() => navigate("simulator")}
            className="public-top-action"
          >
            <Swords className="w-4 h-4" />
            <span>Simulate</span>
          </button>
        </header>

        {selectedRecord ? (
          renderRecordProfile(selectedRecord)
        ) : section === "simulator" ? (
          <CombatSimulator />
        ) : section === "dashboard" ? (
          <div className="public-content space-y-6">
            <section className="public-hero-band">
              <div>
                <p className="public-eyebrow">Public universe intelligence</p>
                <h1>
                  Know the world.
                  <br />
                  <span>Question the canon.</span>
                </h1>
                <p className="max-w-md text-sm leading-relaxed text-zinc-400 mt-4">
                  Explore characters, worlds, powers, factions, and published
                  stories from the Infernal Archive.
                </p>
              </div>
              <button
                onClick={() => navigate("simulator")}
                className="public-yellow-button"
              >
                <Swords className="w-4 h-4" />
                Enter Combat Lab
              </button>
            </section>

            <section className="public-metric-grid">
              <div className="public-metric-card is-yellow">
                <p>Canon records</p>
                <strong>{canonCount}</strong>
                <span>Across the archive</span>
              </div>
              <div className="public-metric-card">
                <p>Characters</p>
                <strong>{characterRecords.length}</strong>
                <span>Known identities</span>
              </div>
              <div className="public-metric-card">
                <p>Published issues</p>
                <strong>{issueRecords.length}</strong>
                <span>Available to read</span>
              </div>
            </section>

            <section className="public-dashboard-grid">
              <div className="public-panel public-panel-large">
                <div className="public-panel-heading">
                  <div>
                    <p className="public-eyebrow">Featured archive</p>
                    <h2>Meet the universe</h2>
                  </div>
                  <button
                    onClick={() => navigate("archive")}
                    className="public-inline-link"
                  >
                    Full archive <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="public-feature-grid">
                  {characterRecords
                    .slice(0, 3)
                    .map((item) =>
                      renderRecordCard({ type: "characters", item }),
                    )}
                </div>
              </div>
              <div className="public-panel public-activity-panel">
                <div className="public-panel-heading">
                  <div>
                    <p className="public-eyebrow">Signals</p>
                    <h2>Start exploring</h2>
                  </div>
                  <Activity className="w-4 h-4 text-yellow-300" />
                </div>
                <button
                  onClick={() => navigate("characters")}
                  className="public-signal-row"
                >
                  <Users className="w-4 h-4 text-yellow-300" />
                  <span>Browse character files</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-zinc-600" />
                </button>
                <button
                  onClick={() => navigate("worlds")}
                  className="public-signal-row"
                >
                  <Globe2 className="w-4 h-4 text-yellow-300" />
                  <span>Map the known worlds</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-zinc-600" />
                </button>
                <button
                  onClick={() => navigate("comics")}
                  className="public-signal-row"
                >
                  <CalendarDays className="w-4 h-4 text-yellow-300" />
                  <span>Read published issues</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-zinc-600" />
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="public-content space-y-6">
            <section className="public-section-heading">
              <div>
                <p className="public-eyebrow">Canon index</p>
                <h1>
                  {PUBLIC_SECTIONS.find((item) => item.id === section)?.label ||
                    "Archive"}
                </h1>
                <p>Browse approved material from the universe.</p>
              </div>
              <span className="public-result-count">
                {publicSections.length} records
              </span>
            </section>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                Filter archive
              </span>
              {[
                ["ALL", "All"],
                ["POWER", "Powers"],
                ["TECHNOLOGY", "Technology"],
                ["WEAPON", "Weapons"],
                ["EVENT", "Events"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setArchiveFilter(value)}
                  className={
                    archiveFilter === value
                      ? "bg-yellow-400 text-zinc-950 px-3 py-1.5 rounded-lg text-xs"
                      : "bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-lg text-xs"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="public-loading">Loading canon records...</div>
            ) : publicSections.length === 0 ? (
              <div className="public-empty">
                No public canon records match that search.
              </div>
            ) : (
              <div className="public-record-grid">
                {visiblePublicSections.map(renderRecordCard)}
              </div>
            )}
            {publicSections.length > publicPageSize && (
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-[10px] text-zinc-500 font-mono">
                  Page {archivePage} of {publicPageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={archivePage === 1}
                    onClick={() =>
                      setArchivePage((current) => Math.max(1, current - 1))
                    }
                    className="border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={archivePage === publicPageCount}
                    onClick={() =>
                      setArchivePage((current) =>
                        Math.min(publicPageCount, current + 1),
                      )
                    }
                    className="border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
