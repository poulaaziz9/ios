import { notFound } from "next/navigation";

import { FeedbackThread } from "@/components/feedback-thread";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { isUuid } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { replyToFeedback, setFeedbackStatus } from "../../actions";

const t = strings.feedback;

export default async function AdminFeedbackThreadPage({ params }: PageProps<"/admin/feedback/[feedbackId]">) {
  const { feedbackId } = await params;
  if (!isUuid(feedbackId)) notFound();
  const supabase = await createClient();
  const { data: f } = await supabase.from("feedback").select("status").eq("id", feedbackId).maybeSingle();
  if (!f) notFound();
  const closed = f.status === "closed";

  return (
    <>
      <PageHeader title={t.title} backHref="/admin/feedback" />
      <FeedbackThread
        feedbackId={feedbackId}
        viewer="platform"
        replyAction={replyToFeedback.bind(null, feedbackId)}
        actions={
          <form action={setFeedbackStatus.bind(null, feedbackId, closed ? "open" : "closed")}>
            <SubmitButton variant="outline">{closed ? t.reopen : t.close}</SubmitButton>
          </form>
        }
      />
    </>
  );
}
