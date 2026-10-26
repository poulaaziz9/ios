import { AppLogo } from "@/components/app-logo";
import { strings } from "@/lib/strings";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-3 text-3xl font-bold text-primary">
          <AppLogo className="size-11" />
          {strings.app.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {strings.app.description}
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
