import React, { useState, useEffect } from 'react';
import { Layers, Download, Plus, CheckCircle2 } from 'lucide-react';

export const ArtistWorkspace: React.FC = () => {
  const [artwork, setArtwork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/artwork')
      .then(res => res.json())
      .then(data => {
        setArtwork(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-xs">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mr-2"></div>
        Loading Artist Reference System...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
            Artist Studio & Character Reference System
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Official character sheets, costume versions, color palettes, and sketch galleries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {artwork.map(art => (
          <div key={art.id} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
            <div>
              <div className="h-64 w-full bg-zinc-950 relative overflow-hidden">
                <img src={art.url} alt={art.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border shadow-sm ${
                    art.stage === 'OFFICIAL' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {art.stage}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-yellow-400 font-mono">
                  <span>Artist: {art.artist}</span>
                  <span>Version {art.version}</span>
                </div>
                <h3 className="text-base font-bold text-zinc-100">{art.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{art.notes}</p>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-white/5 bg-zinc-950/50 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">Entity ID: {art.entityId}</span>
              <a
                href={art.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 text-xs text-yellow-400 hover:text-yellow-300 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Asset</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
