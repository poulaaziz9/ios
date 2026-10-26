import { Clock, Mic } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { cairoToday, dayParts, formatTime } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const t = strings.meetings;
const PAST_LIMIT = 6;

/**
 * Meetings as a vertical timeline: upcoming first (soonest on top), then the
 * last few that passed. Rows are filtered by RLS (kids see their class only).
 * `speakerId` limits it to one servant's lessons; `actions` adds admin links.
 */
export async function MeetingsTimeline({
  serviceId,
  viewerId,
  speakerId,
  actions,
  emptyText = t.none,
}: {
  serviceId: string;
  viewerId?: string;
  speakerId?: string;
  actions?: (meetingId: string) => ReactNode;
  emptyText?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select(
      "id, meeting_date, start_time, topic, details, speaker_id, classes(name), speaker:profiles!meetings_speaker_id_fkey(full_name, avatar_url)",
    )
    .eq("service_id", serviceId)
    .order("meeting_date")
    .order("start_time", { nullsFirst: true });
  if (speakerId) query = query.eq("speaker_id", speakerId);
  const { data: meetings } = await query;

  if (!meetings?.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  const today = cairoToday();
  const upcoming = meetings.filter((m) => m.meeting_date >= today);
  // A servant's own list keeps the whole year; others show only the latest past ones.
  const past = meetings.filter((m) => m.meeting_date < today).reverse();
  const shownPast = speakerId ? past : past.slice(0, PAST_LIMIT);
  const avatars = await signedUrls("avatars", meetings.map((m) => m.speaker?.avatar_url));

  const item = (m: (typeof meetings)[number], faded: boolean) => {
    const parts = dayParts(m.meeting_date);
    const isToday = m.meeting_date === today;
    const mine = !!viewerId && m.speaker_id === viewerId;
    return (
      <li key={m.id} className="relative flex gap-3 ps-1">
        <div
          className={cn(
            "z-10 flex w-14 shrink-0 flex-col items-center self-start rounded-xl border bg-card py-1.5 shadow-sm",
            isToday && "border-primary bg-primary text-primary-foreground",
            faded && "opacity-60",
          )}
        >
          <span className="text-xl leading-none font-bold">{parts.day}</span>
          <span className="text-xs">{parts.month}</span>
        </div>
        <div
          className={cn(
            "flex flex-1 flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm",
            mine && "border-primary/40 bg-primary/5",
            faded && "opacity-70",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{parts.weekday}</span>
            {m.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatTime(m.start_time)}
              </span>
            )}
            {isToday && <Badge>{t.today}</Badge>}
            {m.classes && <Badge variant="secondary">{m.classes.name}</Badge>}
          </div>
          <div className="font-semibold">{m.topic}</div>
          {m.details && <p className="text-sm whitespace-pre-line text-muted-foreground">{m.details}</p>}
          <div className="flex items-center gap-2 text-sm">
            <Mic className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t.speaker}:</span>
            {m.speaker ? (
              <span className="flex items-center gap-1.5 font-medium">
                <Avatar
                  url={m.speaker.avatar_url ? avatars.get(m.speaker.avatar_url) : null}
                  name={m.speaker.full_name}
                  className="size-6 text-xs"
                />
                {m.speaker.full_name}
                {mine && <Badge variant="outline">{t.you}</Badge>}
              </span>
            ) : (
              <span className="text-muted-foreground">{t.noSpeaker}</span>
            )}
          </div>
          {actions && <div className="flex justify-end">{actions(m.id)}</div>}
        </div>
      </li>
    );
  };

  const list = (items: typeof meetings, faded: boolean) => (
    <ol className="relative flex flex-col gap-3 before:absolute before:inset-y-2 before:start-8 before:w-px before:bg-border">
      {items.map((m) => item(m, faded))}
    </ol>
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.upcoming}</h2>
        {upcoming.length ? list(upcoming, false) : <p className="text-sm text-muted-foreground">{emptyText}</p>}
      </section>
      {shownPast.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-muted-foreground">{t.past}</h2>
          {list(shownPast, true)}
        </section>
      )}
    </div>
  );
}
