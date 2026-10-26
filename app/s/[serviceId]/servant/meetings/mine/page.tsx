import { MeetingsTimeline } from "@/components/meetings-timeline";
import { requireUserId } from "@/lib/auth/session";
import { strings } from "@/lib/strings";

const t = strings.meetings;

export default async function MyLessonsPage({ params }: PageProps<"/s/[serviceId]/servant/meetings/mine">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  return (
    <>
      <p className="text-sm text-muted-foreground">{t.mineHint}</p>
      <MeetingsTimeline serviceId={serviceId} viewerId={userId} speakerId={userId} emptyText={t.noneMine} />
    </>
  );
}
