import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { saveRules } from "../../actions";

const t = strings.points;
const REASONS = ["visit", "preparation", "achievement"] as const;

export default async function PointRulesPage({
  params,
}: PageProps<"/s/[serviceId]/manage/points/rules">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("point_rules")
    .select("reason, points")
    .eq("service_id", serviceId);
  const value = (reason: string) => rules?.find((r) => r.reason === reason)?.points ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.rules}</CardTitle>
        <CardDescription>{t.rulesHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={saveRules.bind(null, serviceId)} className="flex flex-col gap-4">
          {REASONS.map((reason) => (
            <div key={reason} className="flex items-center justify-between gap-3">
              <Label htmlFor={reason}>{t.ruleLabels[reason]}</Label>
              <Input
                id={reason}
                name={reason}
                type="number"
                min={0}
                inputMode="numeric"
                dir="ltr"
                defaultValue={value(reason)}
                className="w-24"
              />
            </div>
          ))}
          <SubmitButton className="self-start">{t.saveRules}</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
