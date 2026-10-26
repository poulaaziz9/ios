import { Pencil } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { MeetingFields } from "@/components/meeting-fields";
import { MeetingsTimeline } from "@/components/meetings-timeline";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/lib/strings";
import { saveMeeting } from "../actions";
import { meetingFormOptions } from "./options";

const t = strings.meetings;

export default async function ManageMeetingsPage({ params }: PageProps<"/s/[serviceId]/manage/meetings">) {
  const { serviceId } = await params;
  const options = await meetingFormOptions(serviceId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.newMeeting}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveMeeting.bind(null, serviceId, null)} className="flex flex-col gap-3">
            <MeetingFields {...options} />
            <SubmitButton className="self-start">{t.create}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <MeetingsTimeline
        serviceId={serviceId}
        actions={(id) => (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/s/${serviceId}/manage/meetings/${id}`}>
              <Pencil />
              {t.edit}
            </Link>
          </Button>
        )}
      />
    </>
  );
}
