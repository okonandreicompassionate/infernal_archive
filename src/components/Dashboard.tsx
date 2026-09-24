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
    <div className="dashboard-page max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Hero Welcome Banner */}
      <div className="dashboard-hero relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 bg-zinc-900/70 backdrop-blur-xl p-5 sm:p-8">
        <div className="absolute -top-10 -right-10 opacity-20 pointer-events-none">
          <Globe className="w-48 h-48 sm:w-64 sm:h-64 text-yellow-400" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs px-2.5 py-1 rounded-full font-mono">
            <Bot className="w-3.5 h-3.5" />
            <span>Workspace overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Welcome, {displayName || "Admin"}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Keep your characters, locations, issues, and production work in one
            place.
          </p>
          <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => setActiveTab("writer")}
              className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-yellow-400/10 flex items-center space-x-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Open Writer Studio</span>
            </button>
            <button
              onClick={() => setActiveTab("lorekeeper")}
              className="bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-yellow-400" />
              <span>Ask AI Lorekeeper</span>
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className="bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-yellow-400" />
              <span>Explore Knowledge Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((item, idx) => {
          const Icon = item.icon;
          const featured = idx === 0;
          return (
            <div
              key={idx}
              onClick={() => setActiveTab(item.tab)}
              className={`dashboard-stat p-4 rounded-2xl transition-all cursor-pointer group border ${
                featured
                  ? "bg-yellow-400 border-yellow-300 hover:bg-yellow-300"
                  : "bg-zinc-900/70 backdrop-blur-xl border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  className={`w-5 h-5 ${featured ? "text-zinc-950" : "text-yellow-400"}`}
                />
                <ArrowUpRight
                  className={`w-4 h-4 transition-colors ${
                    featured
                      ? "text-zinc-950/50 group-hover:text-zinc-950"
                      : "text-zinc-600 group-hover:text-zinc-300"
                  }`}
                />
              </div>
              <div className="mt-3">
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono ${featured ? "text-zinc-950" : "text-zinc-100"}`}
                >
                  {item.count || 0}
                </div>
                <div
                  className={`text-xs mt-0.5 ${featured ? "text-zinc-900/70" : "text-zinc-400"}`}
                >
                  {item.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
        {/* Recent Audit & Canon Logs */}
        <div className="dashboard-panel lg:col-span-2 bg-zinc-900/70 backdrop-blur-xl border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span>Recent activity</span>
            </h2>
            <span className="text-xs text-zinc-400 font-mono">Live Sync</span>
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
          {/* Canon Alerts Box */}
          <div className="dashboard-panel bg-zinc-900/70 backdrop-blur-xl border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center space-x-2 border-b border-white/5 pb-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
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
          <div className="dashboard-panel dashboard-pipeline bg-zinc-900/70 backdrop-blur-xl border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center space-x-2 border-b border-white/5 pb-3">
              <FileText className="w-4 h-4 text-yellow-400" />
              <span>
                {primaryIssue
                  ? `Issue ${primaryIssue.issueNumber || ""} production`
                  : "Production pipeline"}
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
