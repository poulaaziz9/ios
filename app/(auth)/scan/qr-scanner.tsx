"use client";

import { Scanner, setZXingModuleOverrides } from "@yudiel/react-qr-scanner";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { strings } from "@/lib/strings";

// Use our self-hosted decoder (public/zxing, copied on postinstall) on
// browsers without a native BarcodeDetector, instead of a CDN.
setZXingModuleOverrides({
  locateFile: (path: string, prefix: string) =>
    path.endsWith(".wasm") ? `/zxing/${path}` : prefix + path,
});

const t = strings.join;

/** Accepts our join URLs (any host) or a bare code. */
export function codeFromScan(value: string): string | null {
  const text = value.trim();
  try {
    const fromUrl = new URL(text).searchParams.get("code");
    if (fromUrl) return fromUrl;
  } catch {
    // Not a URL: maybe the code itself.
  }
  return /^[A-Za-z0-9]{4,16}$/.test(text) ? text : null;
}

export function QrScanner() {
  const router = useRouter();
  const [cameraError, setCameraError] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const handled = useRef(false);

  const go = (code: string) => {
    if (handled.current) return;
    handled.current = true;
    router.push(`/join?code=${encodeURIComponent(code.toUpperCase())}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {cameraError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t.cameraError}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-black">
          <Scanner
            formats={["qr_code"]}
            constraints={{ facingMode: "environment" }}
            onScan={(codes) => {
              const code = codes.map((c) => codeFromScan(c.rawValue)).find(Boolean);
              if (code) go(code);
              else setUnknown(true);
            }}
            onError={() => setCameraError(true)}
          />
        </div>
      )}
      {unknown && <p className="text-sm text-destructive">{t.errors.invalid_code}</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const code = codeFromScan(String(new FormData(e.currentTarget).get("code") ?? ""));
          if (code) go(code);
          else setUnknown(true);
        }}
      >
        <Input
          name="code"
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t.codePlaceholder}
          aria-label={t.enterCode}
          className="font-mono text-lg tracking-widest uppercase"
          required
        />
        <Button type="submit">{t.continue}</Button>
      </form>
    </div>
  );
}
