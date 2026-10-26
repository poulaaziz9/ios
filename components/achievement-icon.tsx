import {
  Award,
  BookOpen,
  Crown,
  Flame,
  Heart,
  Medal,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Icons an admin can pick for an achievement (stored by key). */
export const ACHIEVEMENT_ICONS = {
  star: Star,
  sparkles: Sparkles,
  trophy: Trophy,
  medal: Medal,
  award: Award,
  crown: Crown,
  flame: Flame,
  heart: Heart,
  book: BookOpen,
} satisfies Record<string, LucideIcon>;

export type AchievementIconKey = keyof typeof ACHIEVEMENT_ICONS;

export function AchievementIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = ACHIEVEMENT_ICONS[(icon ?? "") as AchievementIconKey] ?? Award;
  return <Icon className={cn("text-amber-500", className)} />;
}
