"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

/**
 * Submit button that disables itself while its form is pending.
 * Pass `confirm` to ask before submitting (for destructive actions).
 */
export function SubmitButton({
  children,
  confirm,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {pending ? strings.common.loading : children}
    </Button>
  );
}
