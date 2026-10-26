import "server-only";

import { headers } from "next/headers";
import QRCode from "qrcode";

/** Public origin of the app, for links encoded in QR codes. */
export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function joinUrl(code: string) {
  return `${await siteOrigin()}/join?code=${encodeURIComponent(code)}`;
}

export function qrSvg(text: string) {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

export function qrPngDataUrl(text: string) {
  return QRCode.toDataURL(text, { margin: 2, width: 1024, errorCorrectionLevel: "M" });
}
