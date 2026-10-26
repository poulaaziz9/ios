import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toCairoDateTimeInput } from "@/lib/format";
import { strings } from "@/lib/strings";

const t = strings.competitions;

/** Shared inputs for creating/editing a competition (times in Cairo). */
export function CompetitionFields({
  classes,
  values,
}: {
  classes: { id: string; name: string }[];
  values?: {
    title: string;
    description: string | null;
    class_id: string | null;
    starts_at: string | null;
    ends_at: string | null;
    max_points: number;
  };
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t.titleLabel}</Label>
        <Input id="title" name="title" defaultValue={values?.title} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t.description}</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="class_id">{t.forClass}</Label>
          <NativeSelect id="class_id" name="class_id" defaultValue={values?.class_id ?? ""}>
            <option value="">{t.wholeService}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="max_points">{t.maxPoints}</Label>
          <Input
            id="max_points"
            name="max_points"
            type="number"
            min={0}
            dir="ltr"
            defaultValue={values?.max_points ?? 0}
            aria-describedby="max_points_hint"
          />
          <p id="max_points_hint" className="text-xs text-muted-foreground">
            {t.maxPointsHint}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="starts_at">{t.startsAt}</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={values?.starts_at ? toCairoDateTimeInput(values.starts_at) : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ends_at">{t.endsAt2}</Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={values?.ends_at ? toCairoDateTimeInput(values.ends_at) : undefined}
          />
        </div>
      </div>
    </>
  );
}
