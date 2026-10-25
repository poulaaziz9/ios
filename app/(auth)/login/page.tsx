import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/next-path";
import { strings } from "@/lib/strings";
import { LoginForm } from "./login-form";

const t = strings.auth;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  const signupHref =
    next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t.loginTitle}</CardTitle>
        <CardDescription>{t.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
      <CardFooter className="justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{t.noAccount}</span>
        <Link href={signupHref} className="font-medium text-primary">
          {t.createAccount}
        </Link>
      </CardFooter>
    </Card>
  );
}
