'use client';

import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  ShieldAlert, ShieldCheck, ShieldX, RefreshCw, FileText, Cpu,
  Hash, Clock, FileCheck, ArrowLeft, TrendingDown, TrendingUp, Minus,
} from 'lucide-react';
import { AnalysisResults } from '../lib/api';

interface ResultsDashboardProps {
  fileName: string;
  fileType: string;
  fileHash: string;
  results: AnalysisResults;
  onReset: () => void;
  isDeduplicated: boolean;
}

/* ── Risk vector config ── */
const VECTORS = [
  {
    key: 'visual_artifacts' as const,
    label: 'Visual Artifacts',
    sublabel: 'GAN / FaceSwap',
    okColor: '#22d3ee',
    badColor: '#f43f5e',
    glowOk: 'rgba(34,211,238,0.5)',
    glowBad: 'rgba(244,63,94,0.5)',
  },
  {
    key: 'audio_manipulation' as const,
    label: 'Audio Cloning',
    sublabel: 'Synthesis / Voice Clone',
    okColor: '#f59e0b',
    badColor: '#f43f5e',
    glowOk: 'rgba(245,158,11,0.5)',
    glowBad: 'rgba(244,63,94,0.5)',
  },
  {
    key: 'lip_sync_variance' as const,
    label: 'Lip-Sync Drift',
    sublabel: 'Phoneme Desync',
    okColor: '#a78bfa',
    badColor: '#f43f5e',
    glowOk: 'rgba(167,139,250,0.5)',
    glowBad: 'rgba(244,63,94,0.5)',
  },
] as const;

export default function ResultsDashboard({
  fileName,
  fileType,
  fileHash,
  results,
  onReset,
  isDeduplicated,
}: ResultsDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  /* Animate the score number counting up */
  useEffect(() => {
    if (!mounted) return;
    let frame: number;
    const target = results.authenticity_score;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setAnimatedScore(Math.round(ease * target));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mounted, results.authenticity_score]);

  const { authenticity_score, breakdown, explanation, model_used, processed_at } = results;

  /* ── Risk level ── */
  type Risk = 'low' | 'moderate' | 'high';
  let risk: Risk = 'low';
  let riskLabel = 'VERIFIED AUTHENTIC';
  let riskClass = 'risk-authentic';
  let riskTextClass = 'text-emerald-300';
  let riskBgColor = '#10b981';
  let RiskIcon = ShieldCheck;
  let TrendIcon = TrendingUp;

  if (authenticity_score < 40) {
    risk = 'high';
    riskLabel = 'CRITICAL — MEDIA MANIPULATED';
    riskClass = 'risk-critical';
    riskTextClass = 'text-rose-300';
    riskBgColor = '#f43f5e';
    RiskIcon = ShieldX;
    TrendIcon = TrendingDown;
  } else if (authenticity_score < 80) {
    risk = 'moderate';
    riskLabel = 'SUSPICIOUS — MODERATE RISK';
    riskClass = 'risk-moderate';
    riskTextClass = 'text-amber-300';
    riskBgColor = '#f59e0b';
    RiskIcon = ShieldAlert;
    TrendIcon = Minus;
  }

  const gaugeData = [
    { name: 'Authentic', value: authenticity_score },
    { name: 'Gap',       value: 100 - authenticity_score },
  ];

  /* ── Markdown-like explanation renderer ── */
  const renderExplanation = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    return lines.map((line, i) => {
      // H3 Headers
      if (line.startsWith('### ')) {
        return (
          <h3
            key={i}
            className="text-sm sm:text-base font-bold text-white mt-6 first:mt-0 uppercase tracking-wider font-mono-custom border-b border-slate-800 pb-2 mb-3.5 leading-snug"
          >
            {line.replace('### ', '')}
          </h3>
        );
      }

      // H4 Subheaders
      if (line.startsWith('#### ')) {
        return (
          <h4
            key={i}
            className="text-xs sm:text-sm font-bold text-cyan-400 mt-4 mb-2 tracking-wide uppercase leading-snug"
          >
            {line.replace('#### ', '')}
          </h4>
        );
      }

      // Highlight Alerts (lines starting with **)
      if (line.startsWith('**')) {
        const parts = line.split('**');
        if (parts.length >= 3) {
          const tagRaw = parts[1];
          const tag = tagRaw.replace(/:$/, '').trim();
          const rest = parts.slice(2).join('').trim().replace(/^:\s*/, '');
          
          const isAlert = /alert|risk|manipulated|critical/i.test(tag);
          const isOk    = /verified|authentic|clean/i.test(tag);
          const isWarn  = /notice|suspicious|moderate/i.test(tag);
          
          let alertClass = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
          if (isAlert) alertClass = 'bg-rose-500/10 border-rose-500/20 text-rose-450 shadow-[0_0_15px_rgba(244,63,94,0.05)]';
          if (isOk)    alertClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]';
          if (isWarn)  alertClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.05)]';

          return (
            <div
              key={i}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border my-4 leading-relaxed ${alertClass}`}
            >
              <span className="px-2.5 py-1 rounded text-xs font-bold font-mono-custom tracking-wider uppercase bg-current/15 flex-shrink-0 w-fit">
                {tag}
              </span>
              <span className="text-sm font-semibold text-slate-100">
                {rest}
              </span>
            </div>
          );
        }
      }

      // List items
      if (line.startsWith('- ')) {
        const content = line.replace('- ', '');
        const parts = content.split('**');
        return (
          <div key={i} className="flex items-start gap-2.5 text-sm text-slate-300 py-1.5 leading-relaxed min-w-0">
            <span
              className="mt-2.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400/80"
              style={{ boxShadow: '0 0 6px rgba(34,211,238,0.8)' }}
            />
            <p className="flex-1 min-w-0 break-anywhere text-slate-300">
              {parts.map((p, pi) =>
                pi % 2 === 1
                  ? <strong key={pi} className="font-bold text-white">{p}</strong>
                  : p
              )}
            </p>
          </div>
        );
      }

      // Default paragraphs
      const parts = line.split('**');
      return (
        <p key={i} className="text-sm text-slate-300 leading-relaxed py-1 break-anywhere">
          {parts.map((p, pi) =>
            pi % 2 === 1
              ? <strong key={pi} className="font-bold text-white">{p}</strong>
              : p
          )}
        </p>
      );
    });
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="container-app">
        <div className="space-y-4 sm:space-y-6">

          {/* ── Top action bar ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 text-xs font-mono-custom font-bold text-slate-350 hover:text-cyan-400 active:text-cyan-300 transition-all uppercase tracking-widest bg-slate-900/80 hover:bg-slate-800 active:bg-slate-700 px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-750 shadow-md cursor-pointer touch-target font-semibold"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span>Back to Upload</span>
            </button>

            <div className="text-xs font-mono-custom font-semibold text-slate-400 uppercase tracking-wider self-end sm:self-auto flex items-center gap-2">
              Analysis Complete
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-status-blink" />
            </div>
          </div>

          {/* ── Risk alert banner ── */}
          <div
            className={`border rounded-2xl p-5 sm:p-6 shadow-2xl ${riskClass}`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">

              {/* Left: icon + label */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${riskTextClass} bg-current/10`}>
                    <div className={`absolute inset-0 rounded-2xl border-2 ${
                      risk === 'high'
                        ? 'border-rose-500/50'
                        : risk === 'moderate'
                        ? 'border-amber-500/50'
                        : 'border-emerald-500/50'
                    } animate-pulse`} />
                    <RiskIcon className={`w-7 h-7 ${riskTextClass} relative z-10`} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold tracking-wider uppercase font-mono-custom opacity-70 leading-none mb-1.5 text-slate-300">
                    Forensic Threat Assessment
                  </p>
                  <p className={`text-lg sm:text-xl lg:text-2xl font-black tracking-tight leading-tight break-anywhere ${riskTextClass}`}>
                    {riskLabel}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                    <TrendIcon className={`w-4 h-4 ${riskTextClass} opacity-80 flex-shrink-0`} />
                    <span className="text-xs sm:text-sm font-mono-custom text-slate-300">
                      Authenticity Score:{' '}
                      <strong className={riskTextClass}>{authenticity_score}%</strong>
                    </span>
                    {isDeduplicated && (
                      <span className="px-2.5 py-0.5 text-[10px] font-mono-custom font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full uppercase tracking-wider whitespace-nowrap">
                        ⚡ Cache Hit
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: re-analyze button */}
              <button
                onClick={onReset}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white active:bg-slate-850 transition-all text-xs font-bold shadow-md cursor-pointer flex-shrink-0 w-full sm:w-auto justify-center touch-target"
              >
                <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                Analyze Another File
              </button>
            </div>
          </div>

          {/* ── Main content grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">

            {/* ── Left: Gauge + Risk Vectors (5 cols on xl) ── */}
            <div className="xl:col-span-5 glass-card rounded-2xl p-6 sm:p-7 flex flex-col gap-6 shadow-xl">

              {/* Section header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-custom">
                  Authenticity Index
                </h3>
                <span className={`text-[10px] sm:text-xs font-bold font-mono-custom uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  risk === 'high'
                    ? 'bg-rose-950/60 border-rose-900/60 text-rose-450'
                    : risk === 'moderate'
                    ? 'bg-amber-950/60 border-amber-900/60 text-amber-400'
                    : 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400'
                }`}>
                  {risk === 'high' ? '⚠ HIGH RISK' : risk === 'moderate' ? '~ MODERATE' : '✓ CLEAN'}
                </span>
              </div>

              {/* Gauge chart */}
              <div className="relative w-full h-48 sm:h-56 flex items-center justify-center">
                {mounted ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gaugeData}
                          cx="50%"
                          cy="80%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius="65%"
                          outerRadius="85%"
                          paddingAngle={0}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          <Cell
                            fill={riskBgColor}
                            style={{ filter: `drop-shadow(0 0 10px ${riskBgColor}80)` }}
                          />
                          <Cell fill="#090d16" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Score overlay */}
                    <div className="absolute bottom-4 sm:bottom-5 text-center pointer-events-none animate-count-up w-full">
                      <span
                        className="block text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white"
                        style={{ textShadow: `0 0 35px ${riskBgColor}60` }}
                      >
                        {animatedScore}
                        <span className="text-xl sm:text-2xl text-slate-350">%</span>
                      </span>
                      <span className="text-xs font-bold font-mono-custom tracking-[0.2em] text-slate-400 uppercase">
                        Authenticity
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-slate-800 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Risk vectors */}
              <div className="space-y-4 sm:space-y-5 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold font-mono-custom text-slate-400 uppercase tracking-wider">
                  Forensic Risk Vectors
                </h4>

                {VECTORS.map(({ key, label, sublabel, okColor, badColor, glowOk, glowBad }) => {
                  const val = breakdown[key];
                  const isRisky = val > 50;
                  const barColor = isRisky ? badColor : okColor;
                  const barGlow  = isRisky ? glowBad  : glowOk;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-baseline gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-slate-200">{label}</span>
                          <span className="ml-2 text-xs font-mono-custom text-slate-400 uppercase hidden sm:inline">
                            {sublabel}
                          </span>
                        </div>
                        <span className={`text-xs sm:text-sm font-bold font-mono-custom flex-shrink-0 ${isRisky ? 'text-rose-400' : 'text-slate-300'}`}>
                          {val}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${val}%`,
                            background: barColor,
                            boxShadow: `0 0 8px ${barGlow}`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Right: AI Diagnosis + Metadata (7 cols on xl) ── */}
            <div className="xl:col-span-7 flex flex-col gap-4 sm:gap-6 min-w-0">

              {/* AI Forensic Report */}
              <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono-custom">
                      AI Forensic Diagnosis
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate-safe">Powered by {model_used}</p>
                  </div>
                </div>
                <div className="space-y-1 max-h-[280px] sm:max-h-[380px] lg:max-h-[420px] overflow-y-auto pr-1 min-w-0">
                  {renderExplanation(explanation)}
                </div>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

                {/* File Payload */}
                <div className="glass-card rounded-2xl p-5 sm:p-6 font-mono-custom text-xs space-y-4 shadow-lg min-w-0">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <span className="font-bold text-white uppercase tracking-wider text-xs truncate-safe">
                      Payload Metadata
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Name</span>
                      <span className="text-sm font-bold text-white break-anywhere block leading-snug" title={fileName}>
                        {fileName}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Type</span>
                      <span className="text-sm font-medium text-slate-300 block">{fileType}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">SHA-256</span>
                      </div>
                      <div className="bg-slate-950/90 p-3 rounded-xl text-xs text-cyan-300 break-all select-all border border-slate-800/80 leading-relaxed font-bold tracking-wide min-w-0">
                        {fileHash}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engine Log */}
                <div className="glass-card rounded-2xl p-5 sm:p-6 font-mono-custom text-xs space-y-4 shadow-lg min-w-0">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="font-bold text-white uppercase tracking-wider text-xs">Engine Log</span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Model</span>
                      <span className="text-sm font-bold text-amber-400 break-anywhere block">{model_used}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Processed</span>
                      </div>
                      <div className="bg-slate-950/90 px-3 py-2 rounded-xl border border-slate-800 text-slate-200 text-xs font-medium tracking-wide mt-1">
                        {new Date(processed_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-status-blink flex-shrink-0" />
                        <span className="text-emerald-400 font-bold uppercase text-xs tracking-wider">
                          Cryptographic Check: PASSED
                        </span>
                      </div>
                      {isDeduplicated && (
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0" />
                          <span className="text-cyan-400 font-bold uppercase text-xs tracking-wider">
                            Cache: Deduplication Hit
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
