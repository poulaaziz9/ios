import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { formatPhone } from "@/lib/auth/identifier";
import { requireUserId } from "@/lib/auth/session";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: profile }, { data: phone }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.rpc("visible_phone", { p_user: userId }),
  ]);
  const avatars = await signedUrls("avatars", [profile?.avatar_url]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <PageHeader title={strings.profile.title} subtitle={formatPhone(phone)} backHref="/" />
      <ProfileForm
        fullName={profile?.full_name ?? ""}
        avatarUrl={profile?.avatar_url ? avatars.get(profile.avatar_url) : null}
      />
    </main>
  );
}
