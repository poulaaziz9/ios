import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FeedbackThread } from "@/components/feedback-thread";
import { isUuid } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { replyFromChurch } from "../../actions";

export default async function ChurchFeedbackThreadPage({
  params,
}: PageProps<"/church/[churchId]/feedback/[feedbackId]">) {
  const { churchId, feedbackId } = await params;
  if (!isUuid(feedbackId)) notFound();
  const supabase = await createClient();
  // Opening the thread clears its "new reply" mark.
  await supabase.rpc("mark_feedback_seen", { p_feedback: feedbackId });

  return (
    <>
      <Link
        href={`/church/${churchId}/feedback`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {strings.feedback.back}
      </Link>
      <FeedbackThread
        feedbackId={feedbackId}
        viewer="church"
        replyAction={replyFromChurch.bind(null, churchId, feedbackId)}
      />
    </>
  );
}
