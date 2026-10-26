// Self-host the ZXing decoder used by the QR scanner on browsers without a
// native BarcodeDetector (iOS Safari), instead of loading it from a CDN.
// Runs on postinstall; output is git-ignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
mkdirSync("public/zxing", { recursive: true });
copyFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm"), "public/zxing/zxing_reader.wasm");
