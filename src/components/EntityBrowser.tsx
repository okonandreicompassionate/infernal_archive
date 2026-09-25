import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  Shield,
  Globe,
  Users,
  BookOpen,
  Sword,
  Zap,
  Calendar,
  ExternalLink,
  Trash2,
  Tag,
  CheckSquare,
  Square,
  X,
  LayoutGrid,
} from "lucide-react";
import { subscribeToTable } from "../utils/supabase";
import { getEntityDescription } from "../utils/entitySummary";

interface EntityBrowserProps {
  entityType: string; // 'characters', 'teams', 'planets', 'locations', 'powers', 'artifacts', 'events', 'issues'
  onSelectItem: (type: string, id: string) => void;
  onOpenQuickCreate: (entityType?: string) => void;
}

export const EntityBrowser: React.FC<EntityBrowserProps> = ({
  entityType,
  onSelectItem,
  onOpenQuickCreate,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [canonFilter, setCanonFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [columns, setColumns] = useState<4 | 8 | 12>(4);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const endpointMap: Record<string, string> = {
    characters: "characters",
    species: "species",
    teams: "teams",
    planets: "planets",
    locations: "locations",
    powers: "powers",
    artifacts: "artifacts",
    events: "events",
    issues: "issues",
  };

  const apiPath = endpointMap[entityType] || "characters";

  const loadData = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setSelectedIds([]);
    }
    fetch(`/api/${apiPath}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    // Live updates: refresh instantly when anyone creates/edits/deletes a record of this type.
    const unsubscribe = subscribeToTable(apiPath, () => loadData(true));
    return unsubscribe;
  }, [entityType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, canonFilter, entityType]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`/api/${apiPath}/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (
      !confirm(
        `Delete ${selectedIds.length} selected ${entityType} record${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    try {
      const responses = await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/${apiPath}/${id}`, { method: "DELETE" }),
        ),
      );
      const failed = responses.filter((response) => !response.ok).length;
      if (failed)
        alert(
          `${failed} record${failed === 1 ? "" : "s"} could not be deleted.`,
        );
      loadData();
    } catch (error) {
      console.error("Bulk delete failed", error);
      alert("The selected records could not be deleted.");
    }
  };

  const handleBulkAddTag = async () => {
    if (!bulkTagInput.trim() || selectedIds.length === 0) return;
    const tagToAdd = bulkTagInput.trim();

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const item = items.find((i) => i.id === id);
          if (!item) return;
          const currentTags = item.tags || [];
          if (currentTags.includes(tagToAdd)) return;
          const updatedTags = [...currentTags, tagToAdd];

          await fetch(`/api/${apiPath}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...item, tags: updatedTags }),
          });
        }),
      );
      setBulkTagInput("");
      loadData();
    } catch (err) {
      console.error("Bulk tag assign failed", err);
    }
  };

  const handleBulkRemoveTag = async (tagToRemove: string) => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const item = items.find((i) => i.id === id);
          if (!item) return;
          const currentTags = item.tags || [];
          if (!currentTags.includes(tagToRemove)) return;
          const updatedTags = currentTags.filter(
            (t: string) => t !== tagToRemove,
          );

          await fetch(`/api/${apiPath}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...item, tags: updatedTags }),
          });
        }),
      );
      loadData();
    } catch (err) {
      console.error("Bulk tag remove failed", err);
    }
  };

  const filteredItems = items.filter((item) => {
    const name = item.name || item.title || item.codeName || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getEntityDescription(item)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (item.tags &&
        item.tags.some((t: string) =>
          t.toLowerCase().includes(searchQuery.toLowerCase()),
        ));

    const matchesCanon =
      canonFilter === "ALL" || item.canonStatus === canonFilter;
    return matchesSearch && matchesCanon;
  });

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, pageCount));
  }, [pageCount]);

  const visibleItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const getTitle = (item: any) =>
    item.name || item.title || item.codeName || "Untitled Entity";
  const getSubtitle = (item: any) =>
    item.codeName ||
    item.designation ||
    item.type ||
    item.storyArc ||
    item.category ||
    item.universeId ||
    "";

  // Gather unique tags across selected items for quick removal
  const selectedItemsList = items.filter((i) => selectedIds.includes(i.id));
  const commonTags = Array.from(
    new Set(selectedItemsList.flatMap((i) => i.tags || [])),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-28">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight capitalize font-sans">
            {entityType.replace(/([A-Z])/g, " $1")} Records
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Browse and manage {entityType} records in this workspace.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onOpenQuickCreate(entityType)}
            className="flex items-center space-x-1.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-2xl transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New {entityType.slice(0, -1)}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/70 backdrop-blur-xl p-4 rounded-2xl border border-white/5">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={handleSelectAll}
            className="flex items-center space-x-1.5 bg-white/5 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-2 rounded-2xl transition-colors cursor-pointer border border-white/10"
          >
            {selectedIds.length > 0 &&
            selectedIds.length === filteredItems.length ? (
              <CheckSquare className="w-4 h-4 text-yellow-400" />
            ) : (
              <Square className="w-4 h-4 text-zinc-400" />
            )}
            <span>
              {selectedIds.length > 0
                ? `${selectedIds.length} Selected`
                : "Select All"}
            </span>
          </button>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={`Search ${entityType} or tags...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-yellow-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <div className="flex items-center space-x-2 text-xs text-zinc-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Canon State:</span>
          </div>
          <select
            value={canonFilter}
            onChange={(e) => setCanonFilter(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-400"
          >
            <option value="ALL">All States</option>
            <option value="CANON">Canon</option>
            <option value="APPROVED">Approved</option>
            <option value="DRAFT">Draft</option>
            <option value="ALTERNATE">Alternate</option>
          </select>
          <div className="record-density-control" aria-label="Records per row">
            <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
            {[4, 8, 12].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setColumns(value as 4 | 8 | 12)}
                className={
                  columns === value ? "density-option active" : "density-option"
                }
                title={`${value} records per row`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-zinc-400 text-xs">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mr-2"></div>
          Loading {entityType}...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-medium text-zinc-300">
            No records found
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            No matching records found for your search criteria.
          </p>
        </div>
      ) : (
        <>
          <div
            className="record-grid"
            style={{ "--record-columns": columns } as React.CSSProperties}
          >
            {visibleItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(entityType, item.id)}
                  className={`bg-zinc-900/70 backdrop-blur-xl hover:bg-zinc-900 border transition-all cursor-pointer group flex flex-col justify-between shadow-md rounded-2xl overflow-hidden relative ${
                    isSelected
                      ? "border-yellow-400 ring-2 ring-yellow-400/30 bg-indigo-950/20"
                      : "border-white/5 hover:border-yellow-400/50"
                  }`}
                >
                  <div>
                    {(item.portrait ||
                      item.cover ||
                      item.image ||
                      item.logo) && (
                      <div className="h-44 w-full overflow-hidden bg-zinc-950 relative">
                        <img
                          src={
                            item.portrait ||
                            item.cover ||
                            item.image ||
                            item.logo
                          }
                          alt={getTitle(item)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80"></div>
                        <div className="absolute top-3 left-3 z-10">
                          <button
                            onClick={(e) => handleToggleSelect(e, item.id)}
                            className="p-1 rounded bg-black/60 backdrop-blur border border-white/10 text-white hover:bg-yellow-400 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-yellow-400" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-400" />
                            )}
                          </button>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border shadow-sm ${
                              item.canonStatus === "CANON"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : item.canonStatus === "APPROVED"
                                  ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/30"
                                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {item.canonStatus}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-5 space-y-2">
                      {!item.portrait &&
                        !item.cover &&
                        !item.image &&
                        !item.logo && (
                          <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={(e) => handleToggleSelect(e, item.id)}
                              className="p-1 rounded bg-white/5 border border-white/10 text-white hover:bg-yellow-400 transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-400" />
                              )}
                            </button>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                                item.canonStatus === "CANON"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {item.canonStatus}
                            </span>
                          </div>
                        )}

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-yellow-400 font-mono uppercase tracking-widest">
                          {getSubtitle(item)}
                        </span>
                        {entityType === "issues" && item.finalFileUrl && (
                          <span
                            className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono border border-emerald-500/30"
                            title="Final comic file uploaded"
                          >
                            📖 Final
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-zinc-100 group-hover:text-yellow-300 transition-colors">
                        {getTitle(item)}
                      </h3>

                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {getEntityDescription(item) ||
                          "No description provided."}
                      </p>

                      {/* Custom Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center space-x-1 bg-white/5 text-zinc-300 text-[10px] px-2 py-0.5 rounded font-mono"
                            >
                              <Tag className="w-2.5 h-2.5 text-yellow-400" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-white/5 bg-zinc-950/40 flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-mono text-[11px]">ID: {item.id}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-1 hover:text-rose-400 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-yellow-400 group-hover:translate-x-1 transition-transform inline-flex items-center space-x-1">
                        <span>View Record</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs text-zinc-400">
              <p>
                Showing{" "}
                {Math.min(
                  (currentPage - 1) * pageSize + 1,
                  filteredItems.length,
                )}
                -{Math.min(currentPage * pageSize, filteredItems.length)} of{" "}
                {filteredItems.length} records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 hover:border-yellow-400/50 transition-colors"
                >
                  Prev
                </button>

                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900 px-2 py-1.5">
                  {Array.from(
                    { length: pageCount },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 min-w-[2rem] rounded-lg text-[11px] font-medium transition-colors ${
                        currentPage === page
                          ? "bg-yellow-400 text-zinc-950"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(pageCount, prev + 1))
                  }
                  disabled={currentPage === pageCount}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 hover:border-yellow-400/50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Bulk Management Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-yellow-400/50 shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 w-11/12 max-w-3xl backdrop-blur-md bg-opacity-95">
          <div className="flex items-center space-x-2 border-r border-white/5 pr-4">
            <span className="bg-yellow-400 text-zinc-950 text-xs font-bold px-2 py-1 rounded-2xl font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-zinc-200">
              Selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-zinc-400 hover:text-white p-1 ml-2"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full">
            <button
              onClick={handleBulkDelete}
              className="delete-button whitespace-nowrap"
              title="Delete selected records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete selected
            </button>
            <div className="flex items-center space-x-2 w-full">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Assign custom tag (e.g. Phase 1, Priority)..."
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBulkAddTag();
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <button
                onClick={handleBulkAddTag}
                className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-3 py-1.5 rounded-2xl transition-all cursor-pointer whitespace-nowrap"
              >
                Assign Tag
              </button>
            </div>

            {commonTags.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto max-w-xs py-1">
                <span className="text-[10px] text-zinc-400 font-mono uppercase whitespace-nowrap">
                  Remove Tag:
                </span>
                {commonTags.map((tag: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleBulkRemoveTag(tag)}
                    className="bg-white/5 hover:bg-rose-900/40 text-zinc-300 hover:text-rose-300 border border-white/10 text-[10px] px-2 py-0.5 rounded font-mono inline-flex items-center space-x-1 transition-colors cursor-pointer whitespace-nowrap"
                    title={`Remove tag "${tag}" from selected`}
                  >
                    <span>{tag}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
