import React, { useState, useEffect } from "react";
import {
  Search,
  Globe,
  Users,
  Shield,
  BookOpen,
  Network,
  Bot,
  FileText,
  X,
} from "lucide-react";

interface CommandPaletteProps {
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  onOpenQuickCreate: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onClose,
  setActiveTab,
  onOpenQuickCreate,
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const commands = [
    {
      label: "Go to Dashboard",
      icon: Globe,
      action: () => {
        setActiveTab("dashboard");
        onClose();
      },
    },
    {
      label: "Browse Characters",
      icon: Users,
      action: () => {
        setActiveTab("characters");
        onClose();
      },
    },
    {
      label: "Browse Teams & Orgs",
      icon: Shield,
      action: () => {
        setActiveTab("teams");
        onClose();
      },
    },
    {
      label: "Browse Issues & Arcs",
      icon: BookOpen,
      action: () => {
        setActiveTab("issues");
        onClose();
      },
    },
    {
      label: "Open Knowledge Graph",
      icon: Network,
      action: () => {
        setActiveTab("graph");
        onClose();
      },
    },
    {
      label: "Open Writer Studio",
      icon: FileText,
      action: () => {
        setActiveTab("writer");
        onClose();
      },
    },
    {
      label: "Ask AI Lorekeeper",
      icon: Bot,
      action: () => {
        setActiveTab("lorekeeper");
        onClose();
      },
    },
    {
      label: "Create New Entity",
      icon: Users,
      action: () => {
        onOpenQuickCreate();
        onClose();
      },
    },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4">
      <div className="bg-zinc-950 border border-white/5 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center space-x-3">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search universe..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-white/5">
            ESC
          </kbd>
        </div>

        <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={cmd.action}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-2xl text-xs text-zinc-300 hover:text-white hover:bg-yellow-400 transition-all text-left cursor-pointer group"
                >
                  <Icon className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  <span>{cmd.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
