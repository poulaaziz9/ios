import Link from "next/link";

import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { SubmitButton } from "@/components/submit-button";
import { NativeSelect } from "@/components/ui/native-select";
import { formatPhone } from "@/lib/auth/identifier";
import type { Database } from "@/lib/database.types";
import { formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { approveMember, moveMember, setMemberStatus } from "../actions";

const t = strings.manage;

type Member = Database["public"]["Functions"]["service_roster"]["Returns"][number];
type ClassRow = { id: string; name: string };

function ClassOptions({ classes }: { classes: ClassRow[] }) {
  return (
    <>
      <option value="">{t.noClass}</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </>
  );
}

function MemberRow({
  member,
  classes,
  serviceId,
  children,
}: {
  member: Member;
  classes: ClassRow[];
  serviceId: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium">{member.full_name}</div>
        <div className="text-xs text-muted-foreground">
          <span dir="ltr">{formatPhone(member.phone)}</span>
          {" · "}
          {t.joined(formatDate(member.joined_at))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {member.status === "active" && (
          <form action={moveMember.bind(null, serviceId, member.member_id)}>
            <AutoSubmitSelect
              name="class_id"
              defaultValue={member.class_id ?? ""}
              aria-label={t.moveTo}
              className="h-9 w-40"
            >
              <ClassOptions classes={classes} />
            </AutoSubmitSelect>
          </form>
        )}
        {children}
      </div>
    </li>
  );
}

export default async function ManageMembersPage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/manage/members">) {
  const { serviceId } = await params;
  const filter = String((await searchParams).class ?? "");
  const supabase = await createClient();
  const [{ data: roster }, { data: classes }] = await Promise.all([
    supabase.rpc("service_roster", { p_service: serviceId }),
    supabase.from("classes").select("id, name").eq("service_id", serviceId).order("sort_order"),
  ]);

  const inFilter = (m: Member) =>
    !filter || (filter === "none" ? m.class_id === null : m.class_id === filter);
  const all = roster ?? [];
  const pending = all.filter((m) => m.role === "served" && m.status === "pending");
  const served = all.filter((m) => m.role === "served" && m.status === "active" && inFilter(m));
  const servants = all.filter((m) => m.role === "servant" && m.status === "active" && inFilter(m));
  const removed = all.filter((m) => m.role === "served" && m.status === "removed");
  const base = `/s/${serviceId}/manage/members`;

  const chips = [
    { key: "", label: t.allClasses },
    ...(classes ?? []).map((c) => ({ key: c.id, label: c.name })),
    { key: "none", label: t.noClass },
  ];

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {chips.map((c) => (
          <Link
            key={c.key || "all"}
            href={c.key ? `${base}?class=${c.key}` : base}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap",
              filter === c.key ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {pending.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 dark:bg-amber-950/30">
          <h2 className="pt-1 font-semibold">{t.pendingMembers}</h2>
          <ul className="divide-y">
            {pending.map((m) => (
              <MemberRow key={m.member_id} member={m} classes={classes ?? []} serviceId={serviceId}>
                <form action={approveMember.bind(null, serviceId, m.member_id)} className="flex gap-2">
                  <NativeSelect name="class_id" aria-label={t.moveTo} className="h-9 w-36" required defaultValue="">
                    <option value="" disabled>
                      {t.moveTo}
                    </option>
                    {(classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <SubmitButton size="sm">{t.approve}</SubmitButton>
                </form>
              </MemberRow>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-card px-4 py-2 shadow-sm">
        <h2 className="pt-1 font-semibold">
          {t.served} ({served.length.toLocaleString("ar-EG")})
        </h2>
        {!served.length ? (
          <p className="py-3 text-sm text-muted-foreground">{t.noMembers}</p>
        ) : (
          <ul className="divide-y">
            {served.map((m) => (
              <MemberRow key={m.member_id} member={m} classes={classes ?? []} serviceId={serviceId}>
                <form action={setMemberStatus.bind(null, serviceId, m.member_id, "removed")}>
                  <SubmitButton variant="ghost" size="sm" confirm={t.removeMemberConfirm}>
                    {strings.common.remove}
                  </SubmitButton>
                </form>
              </MemberRow>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card px-4 py-2 shadow-sm">
        <h2 className="pt-1 font-semibold">
          {t.servants} ({servants.length.toLocaleString("ar-EG")})
        </h2>
        <p className="text-xs text-muted-foreground">{t.servantsHint}</p>
        {!servants.length ? (
          <p className="py-3 text-sm text-muted-foreground">{t.noMembers}</p>
        ) : (
          <ul className="divide-y">
            {servants.map((m) => (
              <MemberRow key={m.member_id} member={m} classes={classes ?? []} serviceId={serviceId} />
            ))}
          </ul>
        )}
      </section>

      {removed.length > 0 && (
        <details className="rounded-xl border px-4 py-2">
          <summary className="cursor-pointer py-1 font-semibold text-muted-foreground">
            {t.removedMembers} ({removed.length.toLocaleString("ar-EG")})
          </summary>
          <ul className="divide-y">
            {removed.map((m) => (
              <MemberRow key={m.member_id} member={m} classes={classes ?? []} serviceId={serviceId}>
                <form action={setMemberStatus.bind(null, serviceId, m.member_id, "active")}>
                  <SubmitButton variant="outline" size="sm">
                    {t.restore}
                  </SubmitButton>
                </form>
              </MemberRow>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
