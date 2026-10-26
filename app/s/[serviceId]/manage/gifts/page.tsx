/* eslint-disable @next/next/no-img-element -- short-lived signed URLs */
import { Gift } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ImageInput } from "@/components/image-input";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { createGift, deleteGift, setGiftActive } from "../actions";

const t = strings.gifts;

export default async function GiftCatalogPage({ params }: PageProps<"/s/[serviceId]/manage/gifts">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const { data: gifts } = await supabase
    .from("gifts")
    .select("id, name, image_url, cost_points, stock, is_active")
    .eq("service_id", serviceId)
    .order("cost_points");
  const images = await signedUrls("service-media", (gifts ?? []).map((g) => g.image_url));

  return (
    <>
      {!gifts?.length ? (
        <p className="text-sm text-muted-foreground">{t.noGifts}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {gifts.map((g) => (
            <li key={g.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
              <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {g.image_url && images.get(g.image_url) ? (
                  <img src={images.get(g.image_url)} alt="" className="size-full object-cover" />
                ) : (
                  <Gift className="size-7 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  {g.name}
                  <Badge variant={g.is_active ? "default" : "secondary"}>{g.is_active ? t.active : t.hidden}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {strings.manage.points(g.cost_points)} · {g.stock === null ? t.unlimited : t.left(g.stock)}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <form action={setGiftActive.bind(null, serviceId, g.id, !g.is_active)}>
                  <SubmitButton variant="outline" size="sm" className="w-full">
                    {g.is_active ? t.hide : t.show}
                  </SubmitButton>
                </form>
                <form action={deleteGift.bind(null, serviceId, g.id)}>
                  <SubmitButton variant="ghost" size="sm" className="w-full" confirm={t.deleteGiftConfirm}>
                    {t.deleteGift}
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.newGift}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createGift.bind(null, serviceId)} className="flex flex-col gap-3">
            <ImageInput name="image" label={t.image} maxSize={800} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t.name}</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cost_points">{t.cost}</Label>
                <Input id="cost_points" name="cost_points" type="number" min={1} dir="ltr" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="stock">{t.stock}</Label>
                <Input id="stock" name="stock" type="number" min={0} dir="ltr" />
              </div>
            </div>
            <SubmitButton className="self-start">{t.create}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
