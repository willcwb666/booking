"use client";

import { useRef, useState } from "react";

type Props = {
  /** Nome do input hidden submetido no form (recebe a URL pública) */
  name?: string;
  initialUrl?: string | null;
  label?: string;
  disabled?: boolean;
};

/**
 * Upload de logo via presigned URL (R2). Faz o upload no ato da seleção e
 * expõe a URL pública num input hidden para o form pai submeter.
 */
export function LogoUpload({ name = "logoUrl", initialUrl = null, label = "Logo", disabled = false }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use uma imagem JPG, PNG ou WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Imagem muito grande (máx. 2 MB)");
      return;
    }

    setUploading(true);
    try {
      const presign = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "logo", contentType: file.type }),
      });
      if (!presign.ok) {
        const body = await presign.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao preparar upload");
      }
      const { uploadUrl, publicUrl } = (await presign.json()) as { uploadUrl: string; publicUrl: string };

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Erro ao enviar a imagem");

      setUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar a imagem");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="hidden" name={name} value={url ?? ""} />
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo da empresa" className="w-full h-full object-cover" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? "Enviando..." : url ? "Trocar logo" : "Enviar logo"}
            </button>
            {url && !disabled && (
              <button
                type="button"
                onClick={() => setUrl(null)}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                Remover
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG ou WebP · máx. 2 MB</p>
          {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
