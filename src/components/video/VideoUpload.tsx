"use client";

import { useMemo, useState } from "react";

const maxFileSizeBytes = 500 * 1024 * 1024;
const supportedTypes = ["video/mp4", "video/quicktime", "video/webm"];

export default function VideoUpload() {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const acceptedText = useMemo(() => supportedTypes.join(", "), []);

  function validate(file: File): string | null {
    if (!supportedTypes.includes(file.type)) return "Unsupported file format.";
    if (file.size > maxFileSizeBytes) return "File exceeds 500MB limit.";
    return null;
  }

  function handleFile(file: File | null): void {
    if (!file) return;
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      setFileName(null);
      return;
    }
    setError(null);
    setFileName(file.name);
  }

  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <input
        type="file"
        accept={acceptedText}
        className="mb-3 block w-full text-sm"
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
      <p className="text-xs text-neutral-500">Accepted: {acceptedText}</p>
      {fileName ? <p className="mt-2 text-sm text-green-600">Selected: {fileName}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
