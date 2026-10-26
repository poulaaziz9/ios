import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { Timeline } from "@/components/timeline";
import { requireUserId } from "@/lib/auth/session";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.served;

export default async function ServedHomePage({ params }: PageProps<"/s/[serviceId]/home">) {
  const { serviceId } = await params;
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: profile }, { data: points }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.rpc("my_points", { p_service: serviceId }),
  ]);
  const mine = points?.find((p) => p.role === "served");
  const avatars = await signedUrls("avatars", [profile?.avatar_url]);
  const avatarUrl = profile?.avatar_url ? avatars.get(profile.avatar_url) : null;

  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/profile" aria-label={t.editProfile}>
            <Avatar url={avatarUrl} name={profile?.full_name ?? ""} className="size-16 text-2xl ring-2 ring-primary-foreground/40" />
          </Link>
          <div>
            <div className="text-sm opacity-80">{t.myPoints}</div>
            <div className="text-xl font-bold">{profile?.full_name}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t.inService, total: mine?.service_total, rank: mine?.service_rank },
            { label: t.inClass, total: mine?.class_total, rank: mine?.class_rank },
          ].map((box) => (
            <div key={box.label} className="rounded-xl bg-primary-foreground/10 p-3">
              <div className="text-xs opacity-80">{box.label}</div>
              <div className="text-3xl font-bold">{(box.total ?? 0).toLocaleString("ar-EG")}</div>
              {box.rank ? <div className="text-xs opacity-90">{t.rank(box.rank)}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.timeline}</h2>
        <Timeline serviceId={serviceId} />
      </section>
    </>
  );
}
