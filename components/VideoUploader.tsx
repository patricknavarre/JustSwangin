"use client";

import { useCallback, useState } from "react";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

type Props = {
  maxMb: number;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
};

export function VideoUploader({ maxMb, file, onFile, disabled }: Props) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (f: File) => {
      setError(null);
      if (f.size > maxMb * 1024 * 1024) {
        setError(`Video must be under ${maxMb} MB.`);
        return false;
      }
      return true;
    },
    [maxMb],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f && validate(f)) onFile(f);
    },
    [disabled, onFile, validate],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f && validate(f)) onFile(f);
    },
    [onFile, validate],
  );

  return (
    <div
      onDragEnter={() => setDrag(true)}
      onDragLeave={() => setDrag(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`card p-8 text-center transition-shadow sm:p-10 ${
        drag ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--app-bg)]" : ""
      } ${disabled ? "opacity-60" : ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--section-label)]">
        Video
      </p>
      <p className="font-display mt-2 text-2xl text-[var(--text)]">Upload</p>
      <p className="mt-2 text-base leading-snug text-[var(--text-secondary)] sm:text-sm">
        Drag and drop or browse — MP4, MOV, WebM · max {maxMb} MB
      </p>
      <label className="mt-6 inline-block min-h-[48px]">
        <input
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={onPick}
        />
        <span className="btn-primary inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-2xl px-8 py-3 text-base font-bold">
          Choose file
        </span>
      </label>
      {file && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Selected: <span className="font-medium text-[var(--text)]">{file.name}</span>
        </p>
      )}
      {error && <p className="mt-3 text-sm text-[var(--bad)]">{error}</p>}
    </div>
  );
}
