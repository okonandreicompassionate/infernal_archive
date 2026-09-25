import React, { useEffect, useState } from "react";
import {
  Users,
  Shield,
  Globe,
  BookOpen,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FileText,
  Bot,
  Sword,
} from "lucide-react";
import { subscribeToTables } from "../utils/supabase";

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onSelectItem: (type: string, id: string) => void;
  displayName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  onSelectItem,
  displayName,
}) => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = () => {
    fetch("/api/overview")
      .then((res) => res.json())
      .then((data) => {
        setOverview(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOverview();
    // Live updates: instantly reflect edits made anywhere else in the archive.
    const unsubscribe = subscribeToTables(
      [
        "characters",
        "teams",
        "planets",
        "artifacts",
        "events",
        "issues",
        "tasks",
        "retcons",
        "audit_logs",
      ],
      loadOverview,
    );
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mr-3"></div>
        Loading workspace...
      </div>
    );
  }

  const stats = overview?.stats || {};
  const recentEdits = overview?.recentEdits || [];
  const pendingTasks = overview?.pendingTasks || [];
  const pendingRetcons = overview?.pendingRetcons || [];
  const timelineEvents = overview?.timelineEvents || [];
  const activeIssues = overview?.activeIssues || [];
  const primaryIssue = activeIssues[0];

  const statCards = [
    {
      label: "Characters",
      count: stats.characters,
      icon: Users,
      tab: "characters",
    },
    { label: "Teams & Orgs", count: stats.teams, icon: Shield, tab: "teams" },
    {
      label: "Planets & Locs",
      count: stats.planets,
      icon: Globe,
      tab: "planets",
    },
    {
      label: "Artifacts",
      count: stats.artifacts,
      icon: Sword,
      tab: "artifacts",
    },
    { label: "Events", count: stats.events, icon: Calendar, tab: "events" },
    { label: "Issues", count: stats.issues, icon: BookOpen, tab: "issues" },
  ];

  return (
    <div className="dashboard-page max-w-[1200px] mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="dashboard-hero flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <h1 className="text-4xl font-normal leading-none tracking-[-0.04em] text-[#f3ebdf] sm:text-5xl xl:text-[4rem]">
            Welcome, {displayName || "levi0"}
          </h1>
          <p className="max-w-2xl text-sm text-[#b7afa5]">
            Keep your characters, locations, issues, and production work in one
            place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("writer")}
            className="flex items-center gap-2 rounded-xl bg-[#d05b48] px-4 py-3 text-sm font-medium text-[#fff8f4] transition hover:bg-[#c74c3d]"
          >
            <FileText className="h-4 w-4" />
            <span>Open Writer Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("lorekeeper")}
            className="flex items-center gap-2 rounded-xl border border-[#3a312e] bg-[#1d1a18] px-4 py-3 text-sm font-medium text-[#f3ebdf] transition hover:bg-[#27221f]"
          >
            <Bot className="h-4 w-4 text-[#d4b280]" />
            <span>Ask AI Lorekeeper</span>
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            className="flex items-center gap-2 rounded-xl border border-[#3a312e] bg-[#1d1a18] px-4 py-3 text-sm font-medium text-[#f3ebdf] transition hover:bg-[#27221f]"
          >
            <Globe className="h-4 w-4 text-[#d4b280]" />
            <span>Explore Knowledge Graph</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((item, idx) => {
          const Icon = item.icon;
          const featured = idx === 0;
          return (
            <div
              key={idx}
              onClick={() => setActiveTab(item.tab)}
              className={`dashboard-stat group flex min-h-[142px] cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                featured
                  ? "border-[#ef7c6a] bg-[#d15d48] text-[#fffaf7]"
                  : "border-[#312d2a] bg-[#1a1715] text-[#f5efe9] hover:border-[#3a312e]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-md ${featured ? "bg-[#e97d68]/20" : "bg-[#221f1d]"}`}
                >
                  <Icon
                    className={`h-5 w-5 ${featured ? "text-[#fffaf7]" : "text-[#d4b280]"}`}
                  />
                </div>
                <ArrowUpRight
                  className={`h-4 w-4 ${featured ? "text-[#ffeae3]" : "text-[#8a817b]"}`}
                />
              </div>
              <div>
                <div
                  className={`text-3xl font-medium leading-none tracking-[-0.06em] ${featured ? "text-[#fffaf7]" : "text-[#f5efe9]"}`}
                >
                  {item.count || 0}
                </div>
                <div
                  className={`mt-3 text-sm ${featured ? "text-[#ffeae3]" : "text-[#b7afa5]"}`}
                >
                  {item.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-8">
        <div className="dashboard-panel xl:col-span-2 rounded-2xl border border-[#312d2a] bg-[#1a1715] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[#312d2a] pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#f3ebdf]">
              <Clock className="h-4 w-4 text-[#d4b280]" />
              <span>Recent activity</span>
            </h2>
            <span className="text-xs font-mono text-[#a89d93]">Live Sync</span>
          </div>

          <div className="space-y-3">
            {recentEdits.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">
                No recent activity recorded.
              </p>
            ) : (
              recentEdits.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-300 truncate">
                        {log.user}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{log.details}</p>
                    <span className="inline-block mt-2 text-[10px] bg-white/5 text-zinc-300 px-2 py-0.5 rounded-md font-mono border border-white/10">
                      {log.action}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Production Pipeline & Canon Alerts */}
        <div className="space-y-5 sm:space-y-6">
          <div className="dashboard-panel rounded-2xl border border-[#312d2a] bg-[#1a1715] p-5 sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#312d2a] pb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#f3ebdf]">
              <AlertTriangle className="h-4 w-4 text-[#d4b280]" />
              <span>Workspace status</span>
            </h2>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-xs text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {timelineEvents.length
                      ? "Timeline active"
                      : "No timeline data"}
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  {timelineEvents.length
                    ? `${timelineEvents.length} event${timelineEvents.length === 1 ? "" : "s"} currently tracked.`
                    : "Add an event record to begin tracking continuity."}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-xs text-yellow-300 space-y-1">
                <div className="font-semibold flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                  <span>
                    {pendingRetcons.length} Pending Review
                    {pendingRetcons.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  {pendingRetcons.length
                    ? "Review the pending continuity changes in the archive."
                    : "No pending continuity changes."}
                </p>
              </div>
            </div>
          </div>

          {/* Active Production Tasks */}
          <div className="dashboard-panel dashboard-pipeline rounded-2xl border border-[#312d2a] bg-[#1a1715] p-5 sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#312d2a] pb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#f3ebdf]">
              <FileText className="h-4 w-4 text-[#d4b280]" />
              <span>
                {primaryIssue
                  ? `Issue ${primaryIssue.issueNumber || ""} production`
                  : "Issue 1 production"}
              </span>
            </h2>
            <div className="space-y-2.5">
              {pendingTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-200 truncate">
                      {task.stage}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      Assigned: {task.assignee}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono border whitespace-nowrap ${
                      task.status === "IN_PROGRESS"
                        ? "bg-blue-400/10 text-blue-300 border-blue-400/30"
                        : "bg-white/5 text-zinc-400 border-white/10"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
