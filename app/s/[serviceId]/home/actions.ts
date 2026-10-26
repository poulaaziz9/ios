"use server";

import { revalidatePath } from "next/cache";

import { fromError, type ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

export type QuizState = {
  error?: string;
  result?: { score: number; correct: number; total: number };
};

const ERRORS = strings.competitions.errors;

/** Answers arrive as fields `q:<question id>` = option index. Graded in SQL. */
export async function submitQuiz(
  competitionId: string,
  _prev: QuizState,
  formData: FormData,
): Promise<QuizState> {
  const answers: Record<string, number> = {};
  for (const [key, value] of formData) {
    if (key.startsWith("q:")) answers[key.slice(2)] = Number(value);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_competition", {
    p_competition: competitionId,
    p_answers: answers,
  });
  // No revalidatePath: it would re-render the page into its "already
  // submitted" state and replace the result screen. Other pages are dynamic
  // and refetch on navigation.
  if (error) {
    const key = error.message as keyof typeof ERRORS;
    return { error: ERRORS[key] ?? strings.common.genericError };
  }
  const row = data?.[0];
  return row ? { result: row } : { error: strings.common.genericError };
}

export async function redeemGift(serviceId: string, giftId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_gift", { p_gift: giftId });
  revalidatePath(`/s/${serviceId}/home/gifts`);
  const known = strings.gifts.errors[error?.message as keyof typeof strings.gifts.errors];
  return known ? { error: known } : fromError(error);
}
