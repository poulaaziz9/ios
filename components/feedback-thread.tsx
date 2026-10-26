import Link from "next/link";
import type { ReactNode } from "react";

import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-result";
import type { Database } from "@/lib/database.types";
import { formatDateTime, formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const t = strings.feedback;
type Status = Database["public"]["Enums"]["feedback_status"];

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline"> = {
  open: "default",
  answered: "secondary",
  closed: "outline",
};

export function FeedbackStatus({ status }: { status: Status }) {
  return <Badge variant={STATUS_VARIANT[status]}>{t.statuses[status]}</Badge>;
}

/** List of threads; `hrefFor` builds each thread's link. */
export function FeedbackList({
  items,
  hrefFor,
  showChurch,
}: {
  items: {
    id: string;
    kind: "complaint" | "suggestion";
    subject: string;
    status: Status;
    last_message_at: string;
    church_seen_at: string;
    churches?: { name: string } | null;
  }[];
  hrefFor: (id: string) => string;
  showChurch?: boolean;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{t.none}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((f) => {
        const unseen = !showChurch && f.status === "answered" && f.last_message_at > f.church_seen_at;
        return (
          <li key={f.id}>
            <Link
              href={hrefFor(f.id)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm hover:bg-accent",
                (unseen || (showChurch && f.status === "open")) && "border-primary/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{f.subject}</span>
                <FeedbackStatus status={f.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{t.kinds[f.kind]}</span>
                {showChurch && f.churches && <span>· {t.from(f.churches.name)}</span>}
                <span>· {formatRelative(f.last_message_at)}</span>
                {unseen && <Badge className="bg-destructive text-white">{t.newReply}</Badge>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** One thread as a conversation, with a reply box and optional extra actions. */
export async function FeedbackThread({
  feedbackId,
  replyAction,
  viewer,
  actions,
}: {
  feedbackId: string;
  replyAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Whose side "me" is: the platform (super admin) or the church. */
  viewer: "platform" | "church";
  actions?: ReactNode;
}) {
  const supabase = await createClient();
  const [{ data: f }, { data: replies }] = await Promise.all([
    supabase
      .from("feedback")
      .select("kind, subject, body, status, created_at, churches(name), author:profiles!feedback_author_id_fkey(full_name)")
      .eq("id", feedbackId)
      .maybeSingle(),
    supabase
      .from("feedback_replies")
      .select("id, body, from_platform, created_at, author:profiles!feedback_replies_author_id_fkey(full_name)")
      .eq("feedback_id", feedbackId)
      .order("created_at"),
  ]);
  if (!f) return null;

  const messages = [
    { id: "first", body: f.body, from_platform: false, created_at: f.created_at, name: f.author?.full_name },
    ...(replies ?? []).map((r) => ({ ...r, name: r.from_platform ? t.platform : r.author?.full_name })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t.kinds[f.kind]}</Badge>
          <FeedbackStatus status={f.status} />
        </div>
        <h2 className="text-xl font-bold">{f.subject}</h2>
        {viewer === "platform" && f.churches && <p className="text-sm text-muted-foreground">{t.from(f.churches.name)}</p>}
      </div>

      <ol className="flex flex-col gap-3">
        {messages.map((m) => {
          const mine = (viewer === "platform") === m.from_platform;
          return (
            <li
              key={m.id}
              className={cn(
                "flex max-w-[85%] flex-col gap-1 rounded-2xl border p-3 shadow-sm",
                mine ? "self-start bg-primary/10" : "self-end bg-card",
              )}
            >
              <span className="text-xs font-semibold text-muted-foreground">{m.name}</span>
              <p className="whitespace-pre-line">{m.body}</p>
              <span className="text-[11px] text-muted-foreground">{formatDateTime(m.created_at)}</span>
            </li>
          );
        })}
      </ol>

      {f.status === "closed" && <p className="text-sm text-muted-foreground">{t.closedNote}</p>}
      <ActionForm action={replyAction} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <Textarea name="body" rows={3} placeholder={t.reply} aria-label={t.reply} required />
        <SubmitButton className="self-start">{t.sendReply}</SubmitButton>
      </ActionForm>
      {actions}
    </div>
  );
}
