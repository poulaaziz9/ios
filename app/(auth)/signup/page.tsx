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
import { SignupForm } from "./signup-form";

const t = strings.auth;

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const next = safeNextPath((await searchParams).next);
  const loginHref =
    next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t.signupTitle}</CardTitle>
        <CardDescription>{t.signupSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm next={next} />
      </CardContent>
      <CardFooter className="justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{t.haveAccount}</span>
        <Link href={loginHref} className="font-medium text-primary">
          {t.goLogin}
        </Link>
      </CardFooter>
    </Card>
  );
}
