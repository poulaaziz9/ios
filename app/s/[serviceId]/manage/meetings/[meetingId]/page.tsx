import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { MeetingFields } from "@/components/meeting-fields";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { deleteMeeting, saveMeeting } from "../../actions";
import { meetingFormOptions } from "../options";

const t = strings.meetings;

export default async function EditMeetingPage({
  params,
}: PageProps<"/s/[serviceId]/manage/meetings/[meetingId]">) {
  const { serviceId, meetingId } = await params;
  const supabase = await createClient();
  const [{ data: meeting }, options] = await Promise.all([
    supabase
      .from("meetings")
      .select("meeting_date, start_time, topic, details, speaker_id, class_id")
      .eq("id", meetingId)
      .eq("service_id", serviceId)
      .maybeSingle(),
    meetingFormOptions(serviceId),
  ]);
  if (!meeting) notFound();

  return (
    <>
      <Link
        href={`/s/${serviceId}/manage/meetings`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {strings.manage.tabs.meetings}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t.editMeeting}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={saveMeeting.bind(null, serviceId, meetingId)} className="flex flex-col gap-3">
            <MeetingFields {...options} defaults={meeting} />
            <SubmitButton className="self-start">{t.save}</SubmitButton>
          </ActionForm>
          <form action={deleteMeeting.bind(null, serviceId, meetingId)} className="border-t pt-4">
            <SubmitButton variant="destructive" confirm={t.deleteConfirm}>
              {t.delete}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
