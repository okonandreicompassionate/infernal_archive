import React, { useEffect, useState } from "react";
import { FileEdit, RefreshCw } from "lucide-react";
import { subscribeToTables } from "../utils/supabase";
import { getEntityDescription } from "../utils/entitySummary";

interface DraftsViewProps {
  onSelectItem: (type: string, id: string) => void;
}

const DRAFT_CATEGORIES = [
  "characters",
  "species",
  "teams",
  "planets",
  "locations",
  "powers",
  "artifacts",
  "events",
  "issues",
];

const CATEGORY_LABELS: Record<string, string> = {
  characters: "Character",
  species: "Species / Race",
  teams: "Team",
  planets: "Planet",
  locations: "Location",
  powers: "Power",
  artifacts: "Artifact",
  events: "Event",
  issues: "Issue",
};

export const DraftsView: React.FC<DraftsViewProps> = ({ onSelectItem }) => {
  const [drafts, setDrafts] = useState<{ type: string; item: any }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = () => {
    setLoading(true);
    Promise.all(
      DRAFT_CATEGORIES.map((type) =>
        fetch(`/api/${type}`)
          .then((res) => res.json())
          .then((data) => ({
            type,
            items: (Array.isArray(data) ? data : []).filter(
              (item: any) => item.canonStatus === "DRAFT",
            ),
          }))
          .catch(() => ({ type, items: [] })),
      ),
    ).then((results) => {
      const flattened = results.flatMap((r) =>
        r.items.map((item: any) => ({ type: r.type, item })),
      );
      setDrafts(flattened);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadDrafts();
    // Live updates: a draft saved or promoted anywhere shows up here instantly.
    const unsubscribe = subscribeToTables(DRAFT_CATEGORIES, loadDrafts);
    return unsubscribe;
  }, []);

  const getTitle = (item: any) =>
    item.name || item.title || item.codeName || "Untitled Draft";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mr-3"></div>
        Loading drafts...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-amber-400" />
            Drafts
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Every new addition saved as a draft, across all record types, in one
            place. Open a record to review and mark it canon when ready.
          </p>
        </div>
        <button
          onClick={loadDrafts}
          className="flex items-center space-x-1.5 bg-white/5 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-2 rounded-2xl transition-colors cursor-pointer border border-white/10"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-sm">
          No drafts yet. Use "Save as Draft" in Quick Create to stash a record
          here before it goes canon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map(({ type, item }) => (
            <div
              key={`${type}-${item.id}`}
              onClick={() => onSelectItem(type, item.id)}
              className="bg-zinc-900/70 backdrop-blur-xl hover:bg-zinc-900 border border-white/5 hover:border-amber-400/50 transition-all cursor-pointer group flex flex-col gap-2 shadow-md rounded-2xl p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-mono uppercase tracking-widest">
                  {CATEGORY_LABELS[type] || type}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-medium border border-amber-500/30">
                  DRAFT
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                {getTitle(item)}
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {getEntityDescription(item) || "No summary yet."}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
