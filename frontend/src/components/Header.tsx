'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, Activity, Lock, Menu, X } from 'lucide-react';

export default function Header() {
  const [timeStr, setTimeStr] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setSessionId(Math.random().toString(36).slice(2, 10).toUpperCase());
    const update = () => setTimeStr(new Date().toUTCString().replace('GMT', 'UTC'));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const statusItems = [
    {
      icon: <Cpu className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />,
      label: 'AI',
      value: 'GEMINI',
      valueClass: 'text-emerald-300 font-bold tracking-wider',
    },
    {
      icon: <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />,
      label: 'STATUS',
      value: 'Operational',
      valueClass: 'text-emerald-400 font-bold uppercase',
    },
    {
      icon: <Lock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />,
      label: null,
      value: 'AES-256',
      valueClass: 'text-cyan-300 font-bold',
    },
  ];

  return (
    <header className="relative z-50 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-xl sticky top-0">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

      <div className="container-app">
        <div className="flex items-center justify-between gap-3 py-3 sm:py-4">

          {/* ── Brand ── */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 flex items-center justify-center animate-glow-pulse">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-status-blink" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-[0.2em] text-cyan-400 uppercase font-mono-custom whitespace-nowrap">
                  Intel-Verify
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded tracking-wider uppercase whitespace-nowrap">
                  Emergency
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded tracking-wider uppercase">
                  Classified
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white mt-0.5 leading-tight">
                <span className="hidden sm:inline">Media Authenticity Verification Platform</span>
                <span className="sm:hidden">Media Auth Platform</span>
              </h1>
            </div>
          </div>

          {/* ── Desktop Status bar ── */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono-custom text-slate-400 flex-shrink-0">
            {statusItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap"
              >
                {item.icon}
                {item.label && <span className="text-slate-400 font-medium">{item.label}:</span>}
                <span className={item.valueClass}>{item.value}</span>
              </div>
            ))}

            <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 whitespace-nowrap">
              <span className="text-slate-400 font-medium">SID:</span>
              <span className="text-cyan-400 font-bold">{sessionId || 'SYNCING...'}</span>
            </div>

            <div className="hidden xl:block text-slate-400 text-xs max-w-[200px] truncate-safe font-mono-custom">
              {timeStr || 'SYNCING UTC...'}
            </div>
          </div>

          {/* ── Mobile menu toggle ── */}
          <button
            className="md:hidden touch-target flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-colors flex-shrink-0"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen
              ? <X className="w-4 h-4 text-slate-400" />
              : <Menu className="w-4 h-4 text-slate-400" />
            }
          </button>
        </div>

        {/* ── Mobile dropdown status bar ── */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-3 border-t border-slate-800/60 pt-3 animate-fade-in-fast">
            <div className="flex flex-col gap-2 text-xs font-mono-custom">
              {statusItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  {item.icon}
                  {item.label && <span className="text-slate-400 font-medium">{item.label}:</span>}
                  <span className={item.valueClass}>{item.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 font-medium">SESSION:</span>
                <span className="text-cyan-400 font-bold">{sessionId || 'SYNCING...'}</span>
              </div>
              <div className="px-3 py-2 text-slate-400 text-xs break-all">
                {timeStr || 'SYNCING UTC...'}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
