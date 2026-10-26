import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { createClass, deleteClass, updateClass } from "../actions";

const t = strings.manage;

export default async function ManageClassesPage({
  params,
}: PageProps<"/s/[serviceId]/manage/classes">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const [{ data: classes }, { data: members }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, sort_order")
      .eq("service_id", serviceId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("service_members")
      .select("class_id, role")
      .eq("service_id", serviceId)
      .eq("status", "active")
      .not("class_id", "is", null),
  ]);

  const count = (classId: string, role: "servant" | "served") =>
    (members ?? []).filter((m) => m.class_id === classId && m.role === role).length;

  return (
    <>
      {!classes?.length ? (
        <p className="text-sm text-muted-foreground">{t.noClasses}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map((c) => (
            <li key={c.id} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t.classCounts(count(c.id, "servant"), count(c.id, "served"))}
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  {strings.common.edit}
                </summary>
                <div className="mt-3 flex flex-col gap-4">
                  <ActionForm
                    action={updateClass.bind(null, serviceId, c.id)}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex gap-2">
                      <div className="flex flex-1 flex-col gap-2">
                        <Label htmlFor={`name-${c.id}`}>{t.className}</Label>
                        <Input id={`name-${c.id}`} name="name" defaultValue={c.name} required />
                      </div>
                      <div className="flex w-20 flex-col gap-2">
                        <Label htmlFor={`order-${c.id}`}>{t.order}</Label>
                        <Input
                          id={`order-${c.id}`}
                          name="sort_order"
                          type="number"
                          inputMode="numeric"
                          defaultValue={c.sort_order}
                        />
                      </div>
                    </div>
                    <SubmitButton size="sm" className="self-start">
                      {strings.common.save}
                    </SubmitButton>
                  </ActionForm>
                  <form action={deleteClass.bind(null, serviceId, c.id)}>
                    <SubmitButton variant="destructive" size="sm" confirm={t.deleteClassConfirm}>
                      {t.deleteClass}
                    </SubmitButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.newClass}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createClass.bind(null, serviceId)} className="flex gap-2">
            <Input name="name" placeholder={t.className} aria-label={t.className} required />
            <SubmitButton>{t.createClass}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
