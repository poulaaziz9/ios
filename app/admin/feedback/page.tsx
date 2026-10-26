import { PageHeader } from "@/components/page-header";
import { FeedbackList } from "@/components/feedback-thread";
import { Segmented } from "@/components/segmented";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "../admin-tabs";

const t = strings.feedback;
const STATUSES = ["open", "answered", "closed"] as const;

export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin/feedback">) {
  const requested = String((await searchParams).status ?? "");
  const status = STATUSES.find((s) => s === requested);
  const supabase = await createClient();
  let query = supabase
    .from("feedback")
    .select("id, kind, subject, status, last_message_at, church_seen_at, churches(name)")
    .order("last_message_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: items } = await query;

  return (
    <>
      <PageHeader title={strings.admin.title} />
      <AdminTabs />
      <Segmented
        value={status ?? "all"}
        options={[
          { value: "all", label: t.filterAll, href: "/admin/feedback" },
          ...STATUSES.map((s) => ({ value: s, label: t.statuses[s], href: `/admin/feedback?status=${s}` })),
        ]}
      />
      <FeedbackList items={items ?? []} hrefFor={(id) => `/admin/feedback/${id}`} showChurch />
    </>
  );
}
