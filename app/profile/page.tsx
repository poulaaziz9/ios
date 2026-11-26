import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { PushToggle } from "@/components/push-toggle";
import { formatPhone } from "@/lib/auth/identifier";
import { requireUserId } from "@/lib/auth/session";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const [{ data: profile }, { data: phone }, { data: pushKey }, { data: churches }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, church_id").eq("id", userId).maybeSingle(),
    supabase.rpc("visible_phone", { p_user: userId }),
    supabase.rpc("vapid_public_key"),
    supabase.rpc("signup_churches"),
  ]);
  const avatars = await signedUrls("avatars", [profile?.avatar_url]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-6">
      <PageHeader title={strings.profile.title} subtitle={formatPhone(phone)} backHref="/" />
      <ProfileForm
        fullName={profile?.full_name ?? ""}
        avatarUrl={profile?.avatar_url ? avatars.get(profile.avatar_url) : null}
        churchId={profile?.church_id ?? null}
        churches={churches ?? []}
      />
      <PushToggle publicKey={pushKey} />
      <div className="flex flex-col gap-2 border-t pt-6">
        <LogoutButton />
        <p className="text-center text-xs text-muted-foreground">{strings.profile.logoutHint}</p>
      </div>
    </main>
  );
}
