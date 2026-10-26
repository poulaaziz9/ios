import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // Almost every page is per-user (Supabase session cookie + RLS), so we keep
  // the classic dynamic rendering model instead of Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Photos are resized in the browser first (components/image-input.tsx);
    // this leaves headroom for the multipart overhead.
    serverActions: { bodySizeLimit: "3mb" },
  },
  // Vercel sets VERCEL=1 while building; bake it into server and browser code
  // so lib/supabase/env.ts can pin deployed builds to the hosted project.
  env: { ON_VERCEL: process.env.VERCEL ? "1" : "" },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default withSerwist(nextConfig);
