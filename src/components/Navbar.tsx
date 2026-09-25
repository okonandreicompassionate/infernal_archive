import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Shield,
  BookOpen,
  Users,
  MapPin,
  Zap,
  Sword,
  Calendar,
  FileText,
  Network,
  Bot,
  Search,
  Plus,
  Terminal,
  Layers,
  RefreshCw,
  X,
  Tag,
  LogOut,
  Settings,
  FileEdit,
  Lock,
  Swords,
  Menu,
} from "lucide-react";
import type { UserRole } from "../utils/supabase";
import { getEntityDescription } from "../utils/entitySummary";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCommandPalette: () => void;
  onOpenQuickCreate: () => void;
  onOpenBibleExport: () => void;
  onRefreshData: () => void;
  onSelectItem: (type: string, id: string) => void;
  role: UserRole | null;
  userEmail?: string;
  displayName?: string;
  onOpenGuide: () => void;
  onOpenInvite: () => void;
  onSignOut: () => void;
  onOpenForbiddenArchive: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCommandPalette,
  onOpenQuickCreate,
  onOpenBibleExport,
  onRefreshData,
  onSelectItem,
  role,
  userEmail,
  displayName,
  onOpenGuide,
  onOpenInvite,
  onSignOut,
  onOpenForbiddenArchive,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { type: string; item: any }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allUniverseData, setAllUniverseData] = useState<Record<string, any[]>>(
    {},
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const navGroups = [
    {
      label: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: Layers },
        { id: "drafts", label: "Drafts", icon: FileEdit },
      ],
    },
    {
      label: "Archive",
      items: [
        { id: "characters", label: "Characters", icon: Users },
        { id: "species", label: "Species & Races", icon: Users },
        { id: "teams", label: "Teams & Orgs", icon: Shield },
        { id: "planets", label: "Planets & Locs", icon: Globe },
        { id: "powers", label: "Powers & Tech", icon: Zap },
        { id: "artifacts", label: "Artifacts", icon: Sword },
        { id: "events", label: "Events", icon: Calendar },
        { id: "issues", label: "Issues & Arcs", icon: BookOpen },
      ],
    },
    {
      label: "Production",
      items: [
        { id: "graph", label: "Knowledge Graph", icon: Network },
        { id: "timeline", label: "Timeline", icon: Calendar },
        { id: "writer", label: "Writer Studio", icon: FileText },
        { id: "artist", label: "Artist Studio", icon: Layers },
        { id: "lorekeeper", label: "Lorekeeper", icon: Bot },
        { id: "simulator", label: "Combat Simulator", icon: Swords },
        { id: "battle-arena", label: "Battle Arena", icon: Swords },
      ],
    },
    {
      label: "Workspace",
      items: [{ id: "settings", label: "Settings", icon: Settings }],
    },
  ];

  // Fetch all entities for global fuzzy search
  useEffect(() => {
    const categories = [
      "characters",
      "teams",
      "planets",
      "locations",
      "powers",
      "artifacts",
      "events",
      "issues",
      "organizations",
      "species",
    ];
    Promise.all(
      categories.map((cat) =>
        fetch(`/api/${cat}`)
          .then((res) => res.json())
          .then((data) => ({ cat, data: Array.isArray(data) ? data : [] }))
          .catch(() => ({ cat, data: [] })),
      ),
    ).then((results) => {
      const map: Record<string, any[]> = {};
      results.forEach((r) => {
        map[r.cat] = r.data;
      });
      setAllUniverseData(map);
    });
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileNavOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileNavOpen(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!text || !query) return false;
    const t = text.toLowerCase();
    const q = query.toLowerCase().trim();
    if (t.includes(q)) return true;

    // Fuzzy character sequence match
    let qIdx = 0;
    for (let i = 0; i < t.length && qIdx < q.length; i++) {
      if (t[i] === q[qIdx]) {
        qIdx++;
      }
    }
    return qIdx === q.length;
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);
    const results: { type: string; item: any }[] = [];

    Object.entries(allUniverseData).forEach(([type, items]) => {
      items.forEach((item) => {
        const name = item.name || item.title || item.codeName || "";
        const desc = getEntityDescription(item);
        const tags = item.tags || [];
        const aliases = item.aliases || [];

        const isMatch =
          fuzzyMatch(name, q) ||
          fuzzyMatch(desc, q) ||
          tags.some((tag: string) => fuzzyMatch(tag, q)) ||
          aliases.some((alias: string) => fuzzyMatch(alias, q));

        if (isMatch) {
          results.push({ type, item });
        }
      });
    });

    setSearchResults(results.slice(0, 20)); // Limit to top 20 results
  };

  const getTitle = (item: any) =>
    item.name || item.title || item.codeName || "Untitled";
  const getSubtitle = (item: any) =>
    item.codeName || item.designation || item.type || item.universeId || "";

  return (
    <>
      <aside className="hidden w-[280px] shrink-0 border-r border-[#2b2623] bg-[#171411] px-4 py-5 md:flex md:flex-col">
        <div
          className="mb-6 flex cursor-pointer items-center gap-3 px-2"
          onClick={() => setActiveTab("dashboard")}
        >
          <img
            src="https://i.imgur.com/iS5wVPz.png"
            alt="Infernal Archive logo"
            className="h-12 w-12 bg-[#201c1a] object-cover"
          />
          <span className="text-[11px] font-mono tracking-[0.22em] text-[#f0e6dc]">
            ARCHIVE
          </span>
        </div>

        <div className="mb-5 px-2" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#a89d93]" />
            <input
              type="text"
              placeholder="Fuzzy search..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setIsDropdownOpen(true);
              }}
              className="w-full rounded-xl border border-[#3a312e] bg-[#1d1a18] py-2.5 pl-9 pr-8 text-[11px] text-[#f3ebdf] placeholder-[#8d8479] outline-none transition focus:border-[#d4b280]"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3 top-2.5 text-[#a89d93] hover:text-[#f5efe9]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-[#3a312e] bg-[#1d1a18] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#bfae9c]">
                  <span>Results ({searchResults.length})</span>
                  <span className="text-[#d4b280]">Esc</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-[#b9b0a7]">
                    No matching entities for "{searchQuery}".
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {searchResults.map((res, idx) => {
                      const item = res.item;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            onSelectItem(res.type, item.id);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className="flex cursor-pointer items-start gap-3 p-3 transition hover:bg-[#2a221f]"
                        >
                          {item.portrait ||
                          item.cover ||
                          item.image ||
                          item.logo ? (
                            <img
                              src={
                                item.portrait ||
                                item.cover ||
                                item.image ||
                                item.logo
                              }
                              alt={getTitle(item)}
                              className="h-10 w-10 rounded-xl border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold text-[#d4b280]">
                              {getTitle(item).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#d4b280]">
                                {res.type}
                              </span>
                              {item.canonStatus && (
                                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] text-[#d6d0ca]">
                                  {item.canonStatus}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs font-medium text-[#f5efe9]">
                              {getTitle(item)}
                            </div>
                            <p className="mt-1 truncate text-[10px] text-[#b9b0a7]">
                              {getEntityDescription(item) ||
                                "No description provided."}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-5 space-y-2 px-2">
          <button
            onClick={onOpenQuickCreate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d05b48] px-3 py-2.5 text-sm font-medium text-[#fff8f4] transition hover:bg-[#c4483b]"
          >
            <Plus className="h-4 w-4" />
            <span>New Entity</span>
          </button>

          <button
            onClick={onOpenBibleExport}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3a312e] bg-[#1d1a18] px-3 py-2.5 text-sm text-[#f3ebdf] transition hover:bg-[#27221f]"
          >
            <BookOpen className="h-4 w-4 text-[#d4b280]" />
            <span>Universe Bible</span>
          </button>
        </div>

        <div className="space-y-4 px-2">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="px-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#8b8380]">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      isActive
                        ? "bg-[#2b2623] text-[#f3ebdf] shadow-inner shadow-black/10"
                        : "text-[#d9d0c7] hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-[#d4b280]" : "text-[#b0a69d]"}`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-auto px-2 pt-6">
          <div className="flex items-center gap-2 text-[#8b8380]">
            <button
              onClick={onRefreshData}
              className="rounded-lg border border-[#3a312e] bg-[#1d1a18] p-2 text-[#d9d0c7] hover:bg-[#27221f]"
              title="Refresh records"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenGuide}
              className="rounded-lg border border-[#3a312e] bg-[#1d1a18] p-2 text-[#d9d0c7] hover:bg-[#27221f]"
              title="Open navigation guide"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            {role === "god" && (
              <button
                onClick={onOpenInvite}
                className="rounded-lg border border-[#3a312e] bg-[#1d1a18] p-2 text-[#d9d0c7] hover:bg-[#27221f]"
                title="Invite admin"
              >
                <Users className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onSignOut}
              className="ml-auto rounded-lg border border-[#3a312e] bg-[#1d1a18] p-2 text-[#d9d0c7] hover:bg-[#27221f]"
              title={`Sign out ${userEmail || "account"}`}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <aside className="w-[280px] shrink-0 border-r border-[#2b2623] bg-[#171411] px-4 py-5 md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://i.imgur.com/iS5wVPz.png"
              alt="Infernal Archive logo"
              className="h-12 w-12 bg-[#201c1a] object-cover"
            />
            <span className="text-[11px] font-mono tracking-[0.22em] text-[#f0e6dc]">
              ARCHIVE
            </span>
          </div>
          <button
            type="button"
            aria-label="Open navigation menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#3a312e] bg-[#1d1a18] text-[#f5efe9]"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-50 transition-all duration-200 md:hidden ${isMobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          className="absolute inset-0 bg-black/65"
          onClick={() => setIsMobileNavOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[82vw] max-w-xs border-r border-[#2b2623] bg-[#171411] p-4 shadow-2xl transition-transform duration-200 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <img
                src="https://i.imgur.com/iS5wVPz.png"
                alt="Infernal Archive logo"
                className="h-12 w-12 bg-[#201c1a] object-cover"
              />
              <span className="text-[11px] font-mono tracking-[0.22em] text-[#f0e6dc]">
                ARCHIVE
              </span>
            </div>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileNavOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a312e] bg-[#1d1a18] text-[#f5efe9]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-5 overflow-y-auto pb-6">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <button
                onClick={() => {
                  onOpenQuickCreate();
                  setIsMobileNavOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-[#d05b48] px-3 py-2.5 text-left text-sm text-[#fff8f4]"
              >
                <Plus className="h-4 w-4" />
                <span>New Entity</span>
              </button>
              <button
                onClick={() => {
                  onOpenBibleExport();
                  setIsMobileNavOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[#3a312e] bg-[#1d1a18] px-3 py-2.5 text-left text-sm text-[#f3ebdf]"
              >
                <BookOpen className="h-4 w-4 text-[#d4b280]" />
                <span>Universe Bible</span>
              </button>
            </div>
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="px-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#8b8380]">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileNavOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${isActive ? "bg-[#2b2623] text-[#f3ebdf]" : "text-[#d9d0c7] hover:bg-white/5"}`}
                    >
                      <Icon
                        className={`h-4 w-4 ${isActive ? "text-[#d4b280]" : "text-[#b0a69d]"}`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
};
