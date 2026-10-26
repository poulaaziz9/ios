import { MeetingsTimeline } from "@/components/meetings-timeline";
import { requireUserId } from "@/lib/auth/session";

export default async function ServantMeetingsPage({ params }: PageProps<"/s/[serviceId]/servant/meetings">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  return <MeetingsTimeline serviceId={serviceId} viewerId={userId} />;
}
