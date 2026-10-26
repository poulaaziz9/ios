import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireUserId } from "@/lib/auth/session";
import { formatDate, isPast } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.competitions;

export default async function ServedCompetitionsPage({
  params,
}: PageProps<"/s/[serviceId]/home/competitions">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  const supabase = await createClient();
  // RLS: only published, started competitions for the kid's class / service.
  const { data: comps } = await supabase
    .from("competitions")
    .select("id, title, description, ends_at, competition_questions(id), competition_entries(user_id, score)")
    .eq("service_id", serviceId)
    .order("starts_at", { ascending: false });

  const list = (comps ?? []).map((c) => ({
    ...c,
    entry: c.competition_entries.find((e) => e.user_id === userId),
    ended: isPast(c.ends_at),
  }));
  const open = list.filter((c) => !c.entry && !c.ended);
  const past = list.filter((c) => c.entry || c.ended);

  const Item = ({ c }: { c: (typeof list)[number] }) => (
    <li>
      <Link
        href={`/s/${serviceId}/home/competitions/${c.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-accent"
      >
        <span className="min-w-0">
          <span className="block font-semibold">{c.title}</span>
          <span className="block text-sm text-muted-foreground">
            {t.questions(c.competition_questions.length)}
            {c.ends_at && !c.ended && ` · ${t.endsAt(formatDate(c.ends_at))}`}
          </span>
        </span>
        {c.entry ? (
          <Badge>{t.yourScore(c.entry.score)}</Badge>
        ) : c.ended ? (
          <Badge variant="secondary">{t.closed}</Badge>
        ) : (
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">
            {t.start}
            <ChevronLeft className="size-4" />
          </span>
        )}
      </Link>
    </li>
  );

  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.open}</h2>
        {open.length ? (
          <ul className="flex flex-col gap-2">
            {open.map((c) => (
              <Item key={c.id} c={c} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t.none}</p>
        )}
      </section>
      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.done}</h2>
          <ul className="flex flex-col gap-2">
            {past.map((c) => (
              <Item key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
