"use client";

import type { ComponentProps } from "react";

import { NativeSelect } from "@/components/ui/native-select";

/** A select that submits its form as soon as the value changes. */
export function AutoSubmitSelect(props: ComponentProps<typeof NativeSelect>) {
  return <NativeSelect {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
