'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileVideo, FileAudio, AlertCircle, Scan, Zap } from 'lucide-react';

interface UploadZoneProps {
  onUploadStart: () => void;
  onUploadSuccess: (jobId: string, isCached: boolean, initialStatus: any) => void;
  onUploadError: (errMsg: string) => void;
  isUploading: boolean;
}

export default function UploadZone({
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  isUploading,
}: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.mp4', '.mp3', '.wav'];
  const maxFileSizeBytes = 50 * 1024 * 1024;

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const validateAndProcessFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      onUploadError(`Invalid format '${ext}'. Accepted: MP4, MP3, WAV.`);
      return;
    }
    if (file.size > maxFileSizeBytes) {
      onUploadError(`File exceeds 50 MB (${(file.size / 1048576).toFixed(1)} MB).`);
      return;
    }
    setFileName(file.name);
    uploadFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndProcessFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndProcessFile(e.target.files[0]);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current && !isUploading) fileInputRef.current.click();
  };

  const uploadFile = async (file: File) => {
    onUploadStart();
    setUploadProgress(10);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/verify`, true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.min(Math.round((e.loaded / e.total) * 100), 95));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setUploadProgress(100);
            onUploadSuccess(data.job_id, data.status === 'completed', data);
          } catch {
            onUploadError('Failed to parse server response.');
          }
        } else {
          try {
            onUploadError(JSON.parse(xhr.responseText).detail || 'Upload failed.');
          } catch {
            onUploadError(`Upload failed with status ${xhr.status}.`);
          }
        }
      };
      xhr.onerror = () => onUploadError('Network connection to the API backend failed.');
      xhr.send(formData);
    } catch (err: any) {
      onUploadError(err.message || 'Unexpected error during upload.');
    }
  };

  return (
    <div className="w-full">
      {/* ── Drop Zone ── */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-label="Upload media file for forensic analysis"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerFileInput(); }}
        className={[
          'relative group border-2 border-dashed rounded-2xl sm:rounded-3xl transition-all duration-500 overflow-hidden w-full',
          isDragActive
            ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_60px_rgba(6,182,212,0.18)]'
            : isUploading
            ? 'border-slate-700 bg-slate-900/20 cursor-default'
            : 'border-slate-700/60 bg-slate-900/20 cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900/40 hover:shadow-[0_0_40px_rgba(6,182,212,0.07)] focus:outline-none focus:border-cyan-500/70',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".mp4,.mp3,.wav"
          onChange={handleFileChange}
          disabled={isUploading}
          aria-hidden="true"
        />

        {/* Background grid */}
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" aria-hidden="true" />

        {/* Corner accents */}
        {[
          'top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl sm:rounded-tl-3xl',
          'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl sm:rounded-tr-3xl',
          'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl sm:rounded-bl-3xl',
          'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl sm:rounded-br-3xl',
        ].map((pos, i) => (
          <div
            key={i}
            className={`absolute w-8 h-8 sm:w-10 sm:h-10 border-cyan-500/30 pointer-events-none ${pos}`}
            aria-hidden="true"
          />
        ))}

        {/* ── UPLOADING STATE ── */}
        {isUploading ? (
          <div className="relative px-6 sm:px-10 py-14 sm:py-20 space-y-6 sm:space-y-8 text-center">
            {/* Double spinner */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
              <div
                className="absolute inset-3 rounded-full border-t-2 border-cyan-600/50 animate-spin"
                style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xl sm:text-2xl font-bold text-white">Transmitting payload...</p>
              <p className="text-xs sm:text-sm text-slate-500 font-mono-custom truncate-safe max-w-xs sm:max-w-md mx-auto px-2">
                {fileName}
              </p>
            </div>

            {/* Progress */}
            <div className="max-w-xs sm:max-w-sm mx-auto space-y-2.5 sm:space-y-3 px-2">
              <div className="w-full h-2.5 sm:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg,#0891b2,#22d3ee,#0891b2)',
                    backgroundSize: '200% auto',
                    animation: 'progressShimmer 1.5s linear infinite',
                    boxShadow: '0 0 16px rgba(6,182,212,0.7)',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm font-mono-custom text-slate-500">
                <span>UPLOADING</span>
                <span className="text-cyan-400 font-bold">{uploadProgress}%</span>
              </div>
            </div>
          </div>

        ) : (
          /* ── IDLE STATE ── */
          <div className="relative px-6 sm:px-10 py-12 sm:py-16 space-y-6 sm:space-y-8 text-center">
            {/* Icon */}
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 mx-auto animate-float">
              <div className="absolute -inset-3 sm:-inset-4 rounded-2xl sm:rounded-3xl border border-cyan-500/10 group-hover:border-cyan-500/20 transition-all duration-500" />
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/12 to-slate-900 border border-cyan-500/20 group-hover:border-cyan-500/40 group-hover:from-cyan-500/18 transition-all duration-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <UploadCloud className="w-10 h-10 sm:w-14 sm:h-14 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2 sm:space-y-3">
              <p className="text-lg sm:text-2xl font-semibold text-white group-hover:text-cyan-100 transition-colors leading-tight">
                Drag &amp; drop your media file here
              </p>
              <p className="text-sm sm:text-base text-slate-500">
                or{' '}
                <span className="text-cyan-400 font-semibold underline decoration-cyan-400/40 underline-offset-4 hover:decoration-cyan-400 transition-all">
                  browse from device
                </span>
              </p>
            </div>

            {/* Format badges */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {[
                { icon: FileVideo,  label: 'MP4 · H.264 / H.265', color: 'text-cyan-400' },
                { icon: FileAudio,  label: 'MP3 · WAV Audio',      color: 'text-amber-400' },
                { icon: Zap,        label: 'Max 50 MB',            color: 'text-purple-400' },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-400 hover:border-slate-700 transition-colors font-mono-custom whitespace-nowrap"
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color} flex-shrink-0`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Security notice */}
            <div className="flex items-start sm:items-center justify-center gap-2 text-[10px] sm:text-xs text-slate-600 font-mono-custom uppercase tracking-wider max-w-sm mx-auto">
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span className="text-balance">
                Files are SHA-256 hashed &amp; deduplicated — never stored permanently
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Feature row ── */}
      {!isUploading && (
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 animate-fade-in-d">
          {[
            {
              icon: Scan,
              label: 'GAN Artifact Detection',
              sub: 'Video deepfakes',
              color: 'text-cyan-400',
              bg: 'bg-cyan-500/10',
              border: 'border-cyan-500/20',
            },
            {
              icon: FileAudio,
              label: 'Voice Clone Analysis',
              sub: 'Audio synthesis',
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
              border: 'border-amber-500/20',
            },
            {
              icon: FileVideo,
              label: 'Lip-Sync Verification',
              sub: 'Phoneme alignment',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
              border: 'border-purple-500/20',
            },
          ].map(({ icon: Icon, label, sub, color, bg, border }) => (
            <div
              key={label}
              className={`flex items-center sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl ${bg} border ${border} hover:scale-[1.02] transition-transform`}
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
              </div>
              <div className="sm:text-center min-w-0">
                <span className="block text-sm font-semibold text-slate-200 leading-tight">{label}</span>
                <span className="block text-xs text-slate-500 font-mono-custom mt-0.5">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
