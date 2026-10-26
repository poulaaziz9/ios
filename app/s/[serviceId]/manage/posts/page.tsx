import { ActionForm } from "@/components/action-form";
import { ImageInput } from "@/components/image-input";
import { SubmitButton } from "@/components/submit-button";
import { Timeline } from "@/components/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { createPost, deletePost } from "../actions";

const t = strings.posts;

export default async function ManagePostsPage({ params }: PageProps<"/s/[serviceId]/manage/posts">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("service_id", serviceId)
    .order("sort_order");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.newPost}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createPost.bind(null, serviceId)} className="flex flex-col gap-3">
            <Textarea name="body" rows={3} placeholder={t.body} aria-label={t.body} />
            <ImageInput name="image" label={t.image} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="class_id">{t.audience}</Label>
              <NativeSelect id="class_id" name="class_id" defaultValue="" className="w-56">
                <option value="">{strings.competitions.wholeService}</option>
                {(classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <SubmitButton className="self-start">{t.publish}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Timeline
        serviceId={serviceId}
        actions={(postId) => (
          <form action={deletePost.bind(null, serviceId, postId)}>
            <SubmitButton variant="ghost" size="sm" confirm={t.deleteConfirm}>
              {t.deletePost}
            </SubmitButton>
          </form>
        )}
      />
    </>
  );
}
