import React, { useState, useEffect } from "react";
import { X, BookOpen, Download, CheckCircle2 } from "lucide-react";

interface UniverseBibleExportModalProps {
  onClose: () => void;
}

export const UniverseBibleExportModal: React.FC<
  UniverseBibleExportModalProps
> = ({ onClose }) => {
  const [bibleData, setBibleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/export/bible")
      .then((res) => res.json())
      .then((data) => {
        setBibleData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDownloadJSON = () => {
    if (!bibleData) return;
    const blob = new Blob([JSON.stringify(bibleData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Universe_Bible_U88.json";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/5 rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-yellow-400" />
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                Universe Bible Export
              </h2>
              <p className="text-xs text-zinc-400">
                Compile a documentation export for this workspace.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-2xl border border-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Compiling bible data across all relational entities...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 p-4 rounded-2xl space-y-2 text-xs text-zinc-300">
              <div className="flex justify-between">
                <span>Universes:</span>
                <strong className="text-white">
                  {bibleData.universes?.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Characters:</span>
                <strong className="text-white">
                  {bibleData.characters?.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Teams & Orgs:</span>
                <strong className="text-white">
                  {bibleData.teams?.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Planets & Locations:</span>
                <strong className="text-white">
                  {bibleData.planets?.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Artifacts & Tech:</span>
                <strong className="text-white">
                  {bibleData.artifacts?.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Events & Issues:</span>
                <strong className="text-white">
                  {bibleData.issues?.length}
                </strong>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleDownloadJSON}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-semibold py-2.5 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Bible JSON</span>
              </button>
              <button
                onClick={() => window.print()}
                className="bg-zinc-900 hover:bg-white/10 border border-white/10 text-zinc-200 font-semibold px-4 py-2.5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                Print / PDF View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
