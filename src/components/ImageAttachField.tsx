"use client";

import { useRef, useState } from "react";
import { resizeImageFile } from "@/lib/image-client";

export default function ImageAttachField({
  name,
  label,
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(defaultValue ?? null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeImageFile(file);
      if (inputRef.current) inputRef.current.value = dataUrl;
      setPreview(dataUrl);
    } catch {
      setError("تعذّر معالجة الصورة، جرّب صورة أخرى");
    }
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a client-picked file */}
          <img src={preview} alt={label} className="h-24 rounded-lg border border-slate-200" />
          <button type="button" onClick={clear} className="text-xs font-medium text-red-600 hover:underline">
            إزالة
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="block w-full text-sm text-slate-600 file:ml-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input ref={inputRef} type="hidden" name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
