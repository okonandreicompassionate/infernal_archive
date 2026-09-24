import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
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

  const allRecords = useMemo(
    () =>
      ARCHIVE_TYPES.flatMap((type) =>
        (records[type] || []).map((item) => ({ type, item })),
      ),
    [records],
  );
  const filteredRecords = allRecords.filter(({ item }) => {
    const haystack = JSON.stringify(item).toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
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

        {section === "simulator" ? (
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
            {loading ? (
              <div className="public-loading">Loading canon records...</div>
            ) : publicSections.length === 0 ? (
              <div className="public-empty">
                No public canon records match that search.
              </div>
            ) : (
              <div className="public-record-grid">
                {publicSections.map(renderRecordCard)}
              </div>
            )}
          </div>
        )}
      </main>

      {selectedRecord && (
        <div
          className="public-record-modal"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="public-record-modal-inner"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {getImage(selectedRecord.item) && (
              <img
                src={getImage(selectedRecord.item)}
                alt=""
                className="public-modal-image"
              />
            )}
            <div className="p-6 space-y-4">
              <span className="public-eyebrow">
                {TYPE_LABELS[selectedRecord.type] || selectedRecord.type} ·
                CANON
              </span>
              <h2>{getName(selectedRecord.item)}</h2>
              <p>{getSummary(selectedRecord.item)}</p>
              <div className="public-detail-list">
                {Object.entries(selectedRecord.item)
                  .filter(
                    ([key, value]) =>
                      ![
                        "id",
                        "portrait",
                        "image",
                        "cover",
                        "logo",
                        "description",
                        "biography",
                        "synopsis",
                      ].includes(key) &&
                      typeof value !== "object" &&
                      value,
                  )
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div key={key}>
                      <span>{key.replace(/([A-Z])/g, " $1")}</span>
                      <strong>{String(value)}</strong>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
