import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight, Shield, Globe } from 'lucide-react';

export const VisualTimeline: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
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
        Loading Universe Chronology...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
          Chronological Universe Timeline
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Standard Galactic Epoch (SGE) sequence of historical milestones and major conflicts.
        </p>
      </div>

      <div className="relative border-l border-yellow-400/30 ml-4 sm:ml-8 space-y-8 py-4">
        {events.map((evt, idx) => (
          <div key={evt.id} className="relative pl-8 sm:pl-10 group">
            {/* Timeline dot */}
            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-yellow-400 border-4 border-zinc-950 shadow-md group-hover:scale-125 transition-transform"></div>

            <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono bg-yellow-400/10 text-yellow-300 px-2.5 py-1 rounded-full border border-yellow-400/20">
                  {evt.date}
                </span>
                <span className="text-xs text-zinc-400 flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{evt.location}</span>
                </span>
              </div>

              <h3 className="text-lg font-bold text-zinc-100">{evt.name}</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">{evt.consequences}</p>

              {evt.characters?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {evt.characters.map((c: string, i: number) => (
                    <span key={i} className="text-[10px] bg-white/5 text-zinc-300 px-2 py-0.5 rounded font-mono">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
