import { requireSuperAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireSuperAdmin();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-6">
      {children}
    </main>
  );
}
