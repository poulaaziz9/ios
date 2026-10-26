import { ActionForm } from "@/components/action-form";
import { FeedbackList } from "@/components/feedback-thread";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { sendFeedback } from "../actions";

const t = strings.feedback;

export default async function ChurchFeedbackPage({ params }: PageProps<"/church/[churchId]/feedback">) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("feedback")
    .select("id, kind, subject, status, last_message_at, church_seen_at")
    .eq("church_id", churchId)
    .order("last_message_at", { ascending: false });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.newTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">{t.hint}</p>
        </CardHeader>
        <CardContent>
          <ActionForm action={sendFeedback.bind(null, churchId)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">{t.kind}</Label>
              <NativeSelect id="kind" name="kind" defaultValue="suggestion" className="w-40">
                <option value="suggestion">{t.kinds.suggestion}</option>
                <option value="complaint">{t.kinds.complaint}</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject">{t.subject}</Label>
              <Input id="subject" name="subject" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body">{t.body}</Label>
              <Textarea id="body" name="body" rows={4} required />
            </div>
            <SubmitButton className="self-start">{t.send}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <FeedbackList items={items ?? []} hrefFor={(id) => `/church/${churchId}/feedback/${id}`} />
    </>
  );
}
