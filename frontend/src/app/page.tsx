'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import UploadZone from '../components/UploadZone';
import ResultsDashboard from '../components/ResultsDashboard';
import { getJobStatus, JobStatusResponse } from '../lib/api';
import { Terminal, ShieldAlert, Cpu, RotateCcw } from 'lucide-react';

const POLLING_STEPS = [
  'Initializing verification pipeline...',
  'Computing SHA-256 cryptographic signature...',
  'Querying Redis deduplication registry...',
  'Deduplication check: registry miss. Allocating temp cache...',
  'Uploading payload stream to Gemini Multimodal engine...',
  'Gemini: Analyzing structural video frames for GAN artifacts...',
  'Gemini: Extracting vocal tract resonance curves (Voice-Clone check)...',
  'Gemini: Aligning phoneme timing coordinates to lip movements...',
  'Synthesizing multi-modal telemetry reports...',
  'Assembling final authenticity metrics dashboard...',
];

export default function Home() {
  const [appState, setAppState] = useState<'idle' | 'uploading' | 'polling' | 'completed' | 'error'>('idle');
  const [jobId, setJobId]         = useState<string>('');
  const [fileName, setFileName]   = useState<string>('');
  const [fileType, setFileType]   = useState<string>('');
  const [fileHash, setFileHash]   = useState<string>('');
  const [results, setResults]     = useState<any>(null);
  const [isDeduplicated, setIsDeduplicated] = useState<boolean>(false);
  const [errorMsg, setErrorMsg]   = useState<string>('');
  const [logIndex, setLogIndex]   = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  // Track if we already pushed the results state to avoid double-push
  const hashedHistory = useRef(false);

  /* ── Clean stale ?view=results on mount ── */
  useEffect(() => {
    if (typeof window !== 'undefined' &&
        window.location.search.includes('view=results')) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  /* ── URL history sync — push when entering results, handle back ── */
  useEffect(() => {
    if (appState === 'completed' && !hashedHistory.current) {
      hashedHistory.current = true;
      window.history.pushState({ appState: 'completed' }, '', '/?view=results');
    }
    if (appState !== 'completed') {
      hashedHistory.current = false;
    }

    const handlePopState = (e: PopStateEvent) => {
      // User hit back button — always go to idle
      handleReset();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [appState]);

  /* ── Terminal log simulation ── */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (appState === 'polling') {
      setLogIndex(0);
      setTerminalLogs([`[INFO] Starting forensic pipeline for payload: ${fileName}`]);
      interval = setInterval(() => {
        setLogIndex(prev => {
          const next = prev + 1;
          if (next < POLLING_STEPS.length) {
            setTerminalLogs(logs => [...logs, `[RUNNING] ${POLLING_STEPS[next]}`]);
            return next;
          }
          return prev;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [appState, fileName]);

  /* ── Auto-scroll terminal to bottom ── */
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  /* ── Job polling ── */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (appState === 'polling' && jobId) {
      const poll = async () => {
        try {
          const job: JobStatusResponse = await getJobStatus(jobId);
          if (job.status === 'completed' && job.results) {
            setResults(job.results);
            setFileHash(job.file_hash);
            setAppState('completed');
          } else if (job.status === 'failed') {
            setErrorMsg(job.error || 'Forensic analysis failed.');
            setAppState('error');
          } else {
            timer = setTimeout(poll, 1500);
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Error communicating with status server.');
          setAppState('error');
        }
      };
      timer = setTimeout(poll, 1500);
    }
    return () => clearTimeout(timer);
  }, [appState, jobId]);

  const handleUploadStart = () => { setAppState('uploading'); setErrorMsg(''); };

  const handleUploadSuccess = (id: string, isCached: boolean, data: any) => {
    setJobId(id);
    setFileName(data.file_name);
    setFileType(data.file_type);
    setFileHash(data.file_hash);
    if (isCached) {
      setResults(data.results);
      setIsDeduplicated(true);
      setAppState('completed');
    } else {
      setIsDeduplicated(false);
      setAppState('polling');
    }
  };

  const handleUploadError = (msg: string) => { setErrorMsg(msg); setAppState('error'); };

  const handleReset = () => {
    setAppState('idle');
    setJobId('');
    setFileName('');
    setFileType('');
    setFileHash('');
    setResults(null);
    setIsDeduplicated(false);
    setErrorMsg('');
    setTerminalLogs([]);
    hashedHistory.current = false;
    // Clean URL if still on results path
    if (typeof window !== 'undefined' &&
        window.location.search.includes('view=results')) {
      window.history.replaceState({}, '', '/');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(800px,90vw)] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-[min(400px,60vw)] h-[300px] bg-blue-600/8 blur-[100px] rounded-full" />
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="scan-overlay" />
      </div>

      <Header />

      <main className="relative z-10 flex-grow w-full flex flex-col min-w-0">

        {/* ── IDLE ── */}
        {appState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-16 sm:py-20 lg:py-24 animate-fade-in">
            <div className="container-app w-full">
              <div className="flex flex-col items-center gap-10 sm:gap-12 text-center max-w-4xl mx-auto">

                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase font-mono-custom shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-status-blink flex-shrink-0" />
                  <span>AI-Powered Forensic Analysis</span>
                </div>

                {/* Headline */}
                <div className="space-y-5 sm:space-y-6">
                  <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] text-balance">
                    Emergency{' '}
                    <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                      Media Audit
                    </span>
                    <br className="hidden sm:inline" /> Platform
                  </h2>
                  <p className="text-slate-300 text-base sm:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto text-balance">
                    Military-grade AI diagnostic suite for verifying audio and video authenticity. Detect generative deepfakes, face swaps, and voice cloning in real-time.
                  </p>
                </div>

                {/* Upload zone */}
                <div className="w-full">
                  <UploadZone
                    onUploadStart={handleUploadStart}
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                    isUploading={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {appState === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-12 sm:py-16">
            <div className="container-app w-full">
              <UploadZone
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                isUploading={true}
              />
            </div>
          </div>
        )}

        {/* ── POLLING ── */}
        {appState === 'polling' && (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-10 sm:py-16 animate-fade-in">
            <div className="container-app w-full">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">

                {/* Status card */}
                <div className="glass-card rounded-2xl p-5 sm:p-7 shadow-2xl">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                        <Cpu className="w-7 h-7 text-cyan-400" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl border-t-2 border-cyan-400/50 animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-white">Auditing Media Content...</h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-mono-custom mt-1 truncate-safe">
                        JOB ID: {jobId}
                      </p>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3 sm:mt-4 border border-slate-700">
                        <div
                          className="h-full rounded-full animate-pulse"
                          style={{
                            width: '66%',
                            background: 'linear-gradient(90deg,#0891b2,#22d3ee)',
                            boxShadow: '0 0 12px rgba(6,182,212,0.6)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terminal */}
                <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
                  <div className="bg-slate-900/90 px-4 sm:px-5 py-3 border-b border-slate-800/60 flex items-center gap-3">
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className="w-3 h-3 rounded-full bg-rose-500/70" />
                      <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <Terminal className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-slate-400 font-mono-custom truncate-safe">
                      secure-log-pipeline
                    </span>
                  </div>
                  <div
                    ref={terminalRef}
                    className="p-4 sm:p-5 space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto text-xs sm:text-sm text-cyan-400/90 leading-relaxed font-mono-custom scroll-smooth"
                  >
                    {terminalLogs.map((log, i) => (
                      <div key={i} className="flex gap-2 sm:gap-3 min-w-0">
                        <span className="text-slate-700 select-none flex-shrink-0">
                          [{String(i + 1).padStart(2, '0')}]
                        </span>
                        <span
                          className={`break-anywhere ${log.startsWith('[INFO]') ? 'text-slate-400' : 'text-cyan-400'}`}
                        >
                          {log}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2 sm:gap-3 items-center text-cyan-300 font-bold">
                      <span className="text-slate-700 flex-shrink-0">[--]</span>
                      <span className="break-anywhere">&gt; Executing forensic checks</span>
                      <span
                        className="inline-block w-2 h-3.5 sm:w-2.5 sm:h-4 bg-cyan-400 ml-0.5 flex-shrink-0"
                        style={{ animation: 'cursor 1s step-end infinite' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPLETED ── */}
        {appState === 'completed' && results && (
          <div className="w-full py-6 sm:py-10 animate-fade-in">
            <ResultsDashboard
              fileName={fileName}
              fileType={fileType}
              fileHash={fileHash}
              results={results}
              onReset={() => {
                // If we pushed results history entry, go back through history
                if (window.location.search.includes('view=results')) {
                  window.history.back();
                } else {
                  handleReset();
                }
              }}
              isDeduplicated={isDeduplicated}
            />
          </div>
        )}

        {/* ── ERROR ── */}
        {appState === 'error' && (
          <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 animate-fade-in">
            <div className="w-full max-w-md glass-card rounded-2xl p-8 sm:p-10 space-y-7 text-center shadow-2xl border border-rose-900/40 risk-critical">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-black text-white">Verification Engine Failure</h3>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed break-anywhere">{errorMsg}</p>
              </div>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-3.5 sm:py-4 rounded-xl text-sm sm:text-base transition-all shadow-lg hover:shadow-rose-500/25 cursor-pointer touch-target"
              >
                <RotateCcw className="w-4 h-4" />
                Reset &amp; Try Again
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/40 bg-slate-950/90 py-4 px-4 sm:px-6 text-center font-mono-custom text-slate-600 uppercase tracking-widest">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 flex-shrink-0" />
          <span className="text-balance">
            Restricted Platform &nbsp;·&nbsp; Authorized Government Use Only &nbsp;·&nbsp; FIPS 140-2 Compliant
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 flex-shrink-0" />
        </div>
      </footer>
    </div>
  );
}
