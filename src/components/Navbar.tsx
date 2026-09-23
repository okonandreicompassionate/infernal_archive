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
} from "lucide-react";
import type { UserRole } from "../utils/supabase";

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
  const searchRef = useRef<HTMLDivElement>(null);

  const navGroups = [
    {
      label: "Overview",
      items: [{ id: "dashboard", label: "Dashboard", icon: Layers }],
    },
    {
      label: "Archive",
      items: [
        { id: "characters", label: "Characters", icon: Users },
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
        const desc = item.description || item.synopsis || item.biography || "";
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
    <header className="universe-nav bg-zinc-950 border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Brand / Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setActiveTab("dashboard")}
        >
          <img
            className="site-logo site-logo-nav"
            src="https://i.imgur.com/iS5wVPz.png"
            alt="Universe Archive"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-wider text-zinc-100 font-sans">
                ARCHIVE
              </span>
            </div>
          </div>
        </div>

        {/* Global Fuzzy Search & Actions */}
        <div className="flex items-center space-x-3 relative" ref={searchRef}>
          <div className="relative hidden md:block w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Fuzzy search name, tag, desc..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setIsDropdownOpen(true);
              }}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-9 pr-8 py-2 text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-yellow-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Global Search Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                <div className="p-2 border-b border-white/5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex justify-between items-center">
                  <span>
                    Global Fuzzy Search Results ({searchResults.length})
                  </span>
                  <span className="text-yellow-400">Press Esc to close</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">
                    No matching entities found across categories for "
                    {searchQuery}".
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
                          className="p-3 hover:bg-yellow-400/5 transition-colors cursor-pointer flex items-start space-x-3 group"
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
                              className="w-10 h-10 object-cover rounded-2xl border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-yellow-300 shrink-0">
                              {getTitle(item).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-yellow-400 font-mono uppercase tracking-wider">
                                {res.type}{" "}
                                {getSubtitle(item)
                                  ? `• ${getSubtitle(item)}`
                                  : ""}
                              </span>
                              {item.canonStatus && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-zinc-300">
                                  {item.canonStatus}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-zinc-100 group-hover:text-yellow-300 truncate mt-0.5">
                              {getTitle(item)}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {item.description ||
                                item.synopsis ||
                                item.biography ||
                                "No description provided."}
                            </p>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {item.tags.map((tag: string, tIdx: number) => (
                                  <span
                                    key={tIdx}
                                    className="inline-flex items-center space-x-1 bg-white/5 text-zinc-300 text-[9px] px-1.5 py-0.5 rounded font-mono"
                                  >
                                    <Tag className="w-2.5 h-2.5 text-yellow-400" />
                                    <span>{tag}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center space-x-1.5 bg-zinc-900 hover:bg-white/10 text-zinc-400 text-xs px-3 py-2 rounded-2xl border border-white/5 transition-all cursor-pointer"
            title="Command Palette"
          >
            <Terminal className="w-4 h-4 text-zinc-400" />
            <kbd className="bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded text-[10px] border border-white/10">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={onOpenQuickCreate}
            className="flex items-center space-x-1.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-3 py-2 rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Entity</span>
          </button>

          <button
            onClick={onOpenBibleExport}
            className="flex items-center space-x-1.5 bg-zinc-900 hover:bg-white/10 text-zinc-300 text-xs font-medium px-3 py-2 rounded-2xl border border-white/5 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-yellow-400" />
            <span className="hidden sm:inline">Universe Bible</span>
          </button>

          <button
            onClick={onRefreshData}
            title="Refresh records"
            className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenGuide}
            title="Open navigation guide"
            className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          {role === "god" && (
            <button
              onClick={onOpenInvite}
              title="Invite admin"
              className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onSignOut}
            title={`Sign out ${userEmail || "account"}`}
            className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subnav Tabs */}
      <div className="bg-white/[0.03] border-t border-white/5 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 py-1.5">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-yellow-400 text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${isActive ? "text-zinc-950" : "text-zinc-400"}`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};
