import { QrCode } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { JoinConfirm } from "./join-confirm";

const t = strings.join;

function CodeEntry({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Plain GET form back to /join?code=… */}
      <form className="flex gap-2">
        <Input
          name="code"
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t.codePlaceholder}
          aria-label={t.enterCode}
          defaultValue={defaultValue}
          className="font-mono text-lg tracking-widest uppercase"
          required
        />
        <Button type="submit">{t.continue}</Button>
      </form>
      <Button asChild variant="outline">
        <Link href="/scan">
          <QrCode />
          {t.scan}
        </Link>
      </Button>
    </div>
  );
}

// /join?code=XXXX — the target of every join QR code.
// Logged out → signup/login with next=back here. Logged in → confirm → join.
export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const raw = (await searchParams).code;
  const code = (typeof raw === "string" ? raw : "").trim().toUpperCase();

  if (!code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <CardDescription>{t.enterCode}</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeEntry />
        </CardContent>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const back = encodeURIComponent(`/join?code=${code}`);

  if (!claims?.claims.sub) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t.title}</CardTitle>
          <CardDescription>{t.needAccount}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild size="lg">
            <Link href={`/signup?next=${back}`}>{t.signupToJoin}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/login?next=${back}`}>{t.loginToJoin}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data } = await supabase.rpc("join_code_preview", { p_code: code });
  const target = data?.[0];

  if (!target) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t.errors.invalid_code}
          </p>
          <CodeEntry defaultValue={code} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t.youWillJoin}</CardDescription>
        <CardTitle className="text-2xl">
          {t.classLabel} {target.class_name}
        </CardTitle>
        <CardDescription>
          {target.service_name} · {target.church_name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {target.already_member ? (
          <p className="text-sm text-muted-foreground">{t.alreadyMember}</p>
        ) : (
          <JoinConfirm code={code} />
        )}
      </CardContent>
      {target.already_member && (
        <CardFooter>
          <Button asChild className="w-full">
            <Link href={`/s/${target.service_id}/home`}>{t.goToService}</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
