import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    // Precache the offline fallback page alongside the static build output.
    additionalPrecacheEntries: [{ url: "/~offline", revision: "1" }],
  });
