import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompetitionReview } from "@/components/competition-review";
import { QuizForm } from "@/components/quiz-form";
import { isUuid, requireUserId } from "@/lib/auth/session";
import { isPast } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { submitQuiz } from "../../actions";

const t = strings.competitions;

export default async function CompetitionPage({
  params,
}: PageProps<"/s/[serviceId]/home/competitions/[competitionId]">) {
  const { serviceId, competitionId } = await params;
  if (!isUuid(competitionId)) notFound();
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: comp }, { data: entry }] = await Promise.all([
    supabase
      .from("competitions")
      .select(
        "id, title, description, ends_at, competition_questions(id, question, options, points, sort_order)",
      )
      .eq("id", competitionId)
      .eq("service_id", serviceId)
      .maybeSingle(),
    supabase
      .from("competition_entries")
      .select("score")
      .eq("competition_id", competitionId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (!comp) notFound();
  const ended = isPast(comp.ends_at);
  const questions = [...comp.competition_questions]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((q) => ({ id: q.id, question: q.question, options: q.options as string[], points: q.points }));

  return (
    <>
      <Link
        href={`/s/${serviceId}/home/competitions`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
        {t.backToList}
      </Link>
      <div>
        <h2 className="text-2xl font-bold">{comp.title}</h2>
        {comp.description && <p className="mt-1 text-muted-foreground">{comp.description}</p>}
      </div>
      {entry ? (
        <CompetitionReview competitionId={comp.id} score={entry.score} />
      ) : ended ? (
        <p className="text-muted-foreground">{t.errors.closed}</p>
      ) : (
        <QuizForm questions={questions} action={submitQuiz.bind(null, competitionId)} />
      )}
    </>
  );
}
