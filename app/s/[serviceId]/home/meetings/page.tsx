import { MeetingsTimeline } from "@/components/meetings-timeline";
import { requireUserId } from "@/lib/auth/session";

export default async function ServedMeetingsPage({ params }: PageProps<"/s/[serviceId]/home/meetings">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  return <MeetingsTimeline serviceId={serviceId} viewerId={userId} />;
}
