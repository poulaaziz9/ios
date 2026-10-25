import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./(auth)/actions";

// Post-login landing. Phase 2+ turns this into the "اختار الخدمة" picker
// (memberships list, remembered last choice).
export default async function HomePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {strings.home.welcome(profile?.full_name ?? "")}
        </h1>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            {strings.auth.logout}
          </Button>
        </form>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{strings.home.pickService}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {strings.home.noMemberships}
        </CardContent>
      </Card>
    </main>
  );
}
