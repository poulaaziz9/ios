import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { isUuid } from "@/lib/auth/session";
import { cairoNoon, formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { deleteSession, markAttendance } from "../../actions";

const t = strings.prep;

export default async function PrepSessionPage({
  params,
}: PageProps<"/s/[serviceId]/manage/prep/[sessionId]">) {
  const { serviceId, sessionId } = await params;
  if (!isUuid(sessionId)) notFound();
  const supabase = await createClient();
  const [{ data: session }, { data: sheet }] = await Promise.all([
    supabase
      .from("prep_sessions")
      .select("title, session_date")
      .eq("id", sessionId)
      .eq("service_id", serviceId)
      .maybeSingle(),
    supabase.rpc("prep_attendance_sheet", { p_session: sessionId }),
  ]);
  if (!session) notFound();
  const present = (sheet ?? []).filter((r) => r.present).length;

  return (
    <>
      <Link
        href={`/s/${serviceId}/manage/prep`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {t.back}
      </Link>
      <div>
        <h2 className="text-xl font-bold">{session.title}</h2>
        <p className="text-sm text-muted-foreground">
          {formatDate(cairoNoon(session.session_date))} · {t.attendance(present, sheet?.length ?? 0)}
        </p>
      </div>
      <ul className="flex flex-col divide-y rounded-xl border bg-card px-4 shadow-sm">
        {(sheet ?? []).map((r) => (
          <li key={r.servant_id} className="flex items-center justify-between gap-3 py-3">
            <span className="font-medium">{r.full_name}</span>
            <form action={markAttendance.bind(null, serviceId, sessionId, r.servant_id, !r.present)}>
              <SubmitButton variant={r.present ? "default" : "outline"} size="sm" className="w-20">
                {r.present ? t.present : t.absent}
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
      <form action={deleteSession.bind(null, serviceId, sessionId)}>
        <SubmitButton variant="destructive" size="sm" confirm={t.deleteSessionConfirm}>
          {t.deleteSession}
        </SubmitButton>
      </form>
    </>
  );
}
