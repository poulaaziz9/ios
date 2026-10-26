import { ACHIEVEMENT_ICONS, AchievementIcon } from "@/components/achievement-icon";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { createAchievement, deleteAchievement } from "../actions";

const t = strings.achievementsAdmin;
type Criteria = { type: keyof typeof t.types; gte: number };

export default async function ManageAchievementsPage({
  params,
}: PageProps<"/s/[serviceId]/manage/achievements">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const [{ data: achievements }, { data: counts }] = await Promise.all([
    supabase
      .from("achievements")
      .select("id, name, description, icon, criteria")
      .eq("service_id", serviceId)
      .order("created_at"),
    supabase.rpc("achievement_counts", { p_service: serviceId }),
  ]);
  const earned = new Map((counts ?? []).map((c) => [c.achievement_id, c.earned]));

  return (
    <>
      {!achievements?.length ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {achievements.map((a) => {
            const c = a.criteria as Criteria;
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <AchievementIcon icon={a.icon} className="size-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.rule(t.types[c.type] ?? c.type, c.gte)} · {t.earnedBy(earned.get(a.id) ?? 0)}
                  </div>
                  {a.description && <div className="text-sm">{a.description}</div>}
                </div>
                <form action={deleteAchievement.bind(null, serviceId, a.id)}>
                  <SubmitButton variant="ghost" size="sm" confirm={t.deleteConfirm}>
                    {t.deleteAchievement}
                  </SubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.newAchievement}</CardTitle>
          <CardDescription>{t.hint}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={createAchievement.bind(null, serviceId)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">{t.description}</Label>
              <Input id="description" name="description" />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t.icon}</legend>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ACHIEVEMENT_ICONS).map((key, i) => (
                  <label
                    key={key}
                    className="cursor-pointer rounded-lg border p-2 has-checked:border-primary has-checked:bg-primary/10"
                  >
                    <input type="radio" name="icon" value={key} defaultChecked={i === 0} className="sr-only" />
                    <AchievementIcon icon={key} className="size-6" />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">{t.type}</Label>
                <NativeSelect id="type" name="type" defaultValue="points_total">
                  {Object.entries(t.types).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gte">{t.threshold}</Label>
                <Input id="gte" name="gte" type="number" min={1} dir="ltr" required />
              </div>
            </div>
            <SubmitButton className="self-start">{t.create}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
