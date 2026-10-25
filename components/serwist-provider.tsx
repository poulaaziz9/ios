"use client";

import { SerwistProvider as Provider } from "@serwist/turbopack/react";
import type { ComponentProps } from "react";

// Pages are per-user, so don't cache them on navigation: on a shared phone
// one kid must never see another kid's cached screens.
export function SerwistProvider(props: ComponentProps<typeof Provider>) {
  return <Provider cacheOnNavigation={false} {...props} />;
}
