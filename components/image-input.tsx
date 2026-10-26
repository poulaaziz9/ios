"use client";

/* eslint-disable @next/next/no-img-element -- local object-URL preview */
import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * File input for photos that shrinks the image in the browser (phone photos
 * are often 3–10 MB) before the form is submitted, then swaps the resized
 * JPEG into the input so the Server Action receives the small file.
 */
export function ImageInput({
  name,
  label,
  maxSize = 1280,
  defaultPreview,
  round = false,
}: {
  name: string;
  label: string;
  /** Longest edge in pixels after resizing. */
  maxSize?: number;
  defaultPreview?: string | null;
  round?: boolean;
}) {
  const id = useId();
  const [preview, setPreview] = useState(defaultPreview ?? null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const resized = await resize(file, maxSize);
      const dt = new DataTransfer();
      dt.items.add(resized);
      input.files = dt.files;
      setPreview(URL.createObjectURL(resized));
    } catch {
      // Unsupported format or old browser: send the original; the server
      // and storage limits still apply.
      setPreview(URL.createObjectURL(file));
    }
  }

  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <span
        className={cn(
          "flex size-20 shrink-0 items-center justify-center overflow-hidden border bg-muted text-muted-foreground",
          round ? "rounded-full" : "rounded-lg",
        )}
      >
        {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-7" />}
      </span>
      <span className="text-sm font-medium text-primary">{label}</span>
      <input id={id} name={name} type="file" accept="image/*" className="sr-only" onChange={onChange} />
    </label>
  );
}

async function resize(file: File, maxSize: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
