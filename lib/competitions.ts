import { strings } from "@/lib/strings";

const t = strings.competitions;

/** Admin-facing status badge for a competition. */
export function competitionStatus(c: { is_published: boolean; starts_at: string | null; ends_at: string | null }) {
  const now = Date.now();
  if (!c.is_published) return { label: t.draft, variant: "outline" as const };
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return { label: t.closed, variant: "secondary" as const };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: t.scheduled, variant: "outline" as const };
  return { label: t.published, variant: "default" as const };
}
