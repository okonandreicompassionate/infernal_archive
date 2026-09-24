import React, { useEffect, useState } from "react";
import { Lock, Skull, X, RefreshCw } from "lucide-react";

interface ForbiddenArchiveProps {
  onClose: () => void;
  onSelectItem: (type: string, id: string) => void;
}

const VAULT_CATEGORIES: [string, string][] = [
  ["characters", "🧟 Deleted / Cursed Characters"],
  ["species", "👽 Abandoned Species Concepts"],
  ["teams", "💀 Disbanded & Scrapped Teams"],
  ["planets", "🪐 Retconned Worlds"],
  ["locations", "🏚️ Erased Locations"],
  ["powers", "⚡ Ridiculous Power Ideas"],
  ["artifacts", "🗝️ Cursed Artifacts"],
  ["events", "📉 Scrapped Storylines"],
  ["issues", "📕 Unpublished / Killed Issues"],
];

export const ForbiddenArchive: React.FC<ForbiddenArchiveProps> = ({
  onClose,
  onSelectItem,
}) => {
  const [vault, setVault] = useState<{ type: string; item: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [glitching, setGlitching] = useState(false);

  const loadVault = () => {
    setLoading(true);
    Promise.all(
      VAULT_CATEGORIES.map(([type]) =>
        fetch(`/api/${type}`)
          .then((res) => res.json())
          .then((data) => ({
            type,
            items: (Array.isArray(data) ? data : []).filter(
              (item: any) =>
                item.canonStatus === "NON_CANON" ||
                item.canonStatus === "DEPRECATED",
            ),
          }))
          .catch(() => ({ type, items: [] })),
      ),
    ).then((results) => {
      setVault(
        results.flatMap((r) =>
          r.items.map((item: any) => ({ type: r.type, item })),
        ),
      );
      setLoading(false);
    });
  };

  useEffect(() => {
    loadVault();
    const glitchInterval = setInterval(
      () => {
        setGlitching(true);
        setTimeout(() => setGlitching(false), 180);
      },
      2600 + Math.random() * 2000,
    );
    return () => clearInterval(glitchInterval);
  }, []);

  const getTitle = (item: any) =>
    item.name || item.title || item.codeName || "[DATA EXPUNGED]";

  const grouped = VAULT_CATEGORIES.map(([type, label]) => ({
    type,
    label,
    items: vault.filter((v) => v.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-100 bg-black flex items-center justify-center p-4 overflow-y-auto forbidden-archive">
      <style>{`
        @keyframes forbidden-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes forbidden-glitch {
          0% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(10% 0 60% 0); transform: translate(-2px, 1px); }
          40% { clip-path: inset(70% 0 5% 0); transform: translate(2px, -1px); }
          60% { clip-path: inset(30% 0 40% 0); transform: translate(-1px, 2px); }
          80% { clip-path: inset(50% 0 20% 0); transform: translate(1px, -2px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0); }
        }
        .forbidden-archive {
          background-image: repeating-linear-gradient(
            0deg,
            rgba(255, 0, 0, 0.04) 0px,
            rgba(255, 0, 0, 0.04) 1px,
            transparent 1px,
            transparent 3px
          );
          animation: forbidden-flicker 6s infinite;
        }
        .forbidden-title {
          position: relative;
        }
        .forbidden-title.is-glitching::before,
        .forbidden-title.is-glitching::after {
          content: "THE FORBIDDEN ARCHIVE";
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .forbidden-title.is-glitching::before {
          color: #ff2b2b;
          animation: forbidden-glitch 180ms linear;
        }
        .forbidden-title.is-glitching::after {
          color: #2bdcff;
          animation: forbidden-glitch 180ms linear reverse;
        }
      `}</style>

      <div className="w-full max-w-4xl border border-red-900/60 bg-zinc-950/95 rounded-2xl shadow-2xl shadow-red-900/30 overflow-hidden">
        <div className="flex items-center justify-between border-b border-red-900/40 px-6 py-4 bg-red-950/10">
          <div className="flex items-center gap-3">
            <Skull className="w-5 h-5 text-red-500" />
            <h1
              className={`forbidden-title text-lg font-bold text-red-500 font-mono tracking-widest ${glitching ? "is-glitching" : ""}`}
            >
              THE FORBIDDEN ARCHIVE
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadVault}
              className="p-1.5 text-red-400/70 hover:text-red-300 bg-black/40 hover:bg-red-950/40 rounded-2xl border border-red-900/40 transition-all cursor-pointer"
              title="Re-scan the vault"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-red-400/70 hover:text-red-300 bg-black/40 hover:bg-red-950/40 rounded-2xl border border-red-900/40 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-red-400/60 font-mono leading-relaxed">
            UNAUTHORIZED ACCESS DETECTED... just kidding. Everything here is
            marked <span className="text-red-400">NON_CANON</span> or{" "}
            <span className="text-red-400">DEPRECATED</span> — the deleted
            characters, scrapped storylines, dead worlds, and cursed ideas that
            never made it into canon. Nothing is truly gone.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-red-400/60 font-mono text-xs">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mr-3"></div>
              Decrypting vault contents...
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-16 text-red-400/40 font-mono text-xs">
              <Lock className="w-6 h-6 mx-auto mb-3 opacity-50" />
              The vault is empty. Nothing has been struck from canon... yet.
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.type} className="space-y-2">
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-red-400/80 border-b border-red-900/30 pb-1">
                  {group.label} ({group.items.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map(({ type, item }) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectItem(type, item.id)}
                      className="text-left bg-black/40 hover:bg-red-950/20 border border-red-900/30 hover:border-red-700/60 rounded-xl px-3 py-2 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-red-200 group-hover:text-red-100 truncate">
                          {getTitle(item)}
                        </span>
                        <span className="text-[9px] font-mono text-red-500/70 border border-red-900/40 rounded px-1.5 py-0.5 shrink-0 ml-2">
                          {item.canonStatus}
                        </span>
                      </div>
                      {(item.description ||
                        item.biography ||
                        item.synopsis) && (
                        <p className="text-[10px] text-red-400/40 font-mono mt-1 line-clamp-1">
                          {item.description || item.biography || item.synopsis}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
