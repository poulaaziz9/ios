import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { isUuid, requireServiceArea } from "@/lib/auth/session";
import { joinUrl, qrSvg } from "@/lib/qr";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

const t = strings.manage;

// A one-page poster for a class's join code (outside the manage layout so it
// prints without navigation).
export default async function PrintCodePage({
  params,
}: PageProps<"/s/[serviceId]/print/codes/[codeId]">) {
  const { serviceId, codeId } = await params;
  await requireServiceArea(serviceId, "manage");
  if (!isUuid(codeId)) notFound();

  const supabase = await createClient();
  const { data: code } = await supabase
    .from("join_codes")
    .select("code, classes(name), services(name)")
    .eq("id", codeId)
    .eq("service_id", serviceId)
    .maybeSingle();
  if (!code) notFound();

  const svg = await qrSvg(await joinUrl(code.code));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 bg-white px-6 py-10 text-center text-black">
      <div>
        <p className="text-lg">{code.services?.name}</p>
        <h1 className="text-3xl font-bold">{t.printTitle(code.classes?.name ?? "")}</h1>
      </div>
      <div
        className="w-full max-w-xs"
        // SVG generated on the server by `qrcode` from our own URL.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-lg">{t.printScan}</p>
      <div>
        <p className="text-sm">{t.printOrType}</p>
        <p className="font-mono text-4xl font-bold tracking-[0.3em]" dir="ltr">
          {code.code}
        </p>
      </div>
      <PrintButton label={t.print} />
    </main>
  );
}
