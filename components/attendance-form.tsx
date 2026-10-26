"use client";

import { Search } from "lucide-react";
import { startTransition, useActionState, useMemo, useState } from "react";

import { Avatar } from "@/components/avatar";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/action-result";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const t = strings.attendance;

export type AttendanceRow = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  group: string;
  present: boolean;
};

/** Tick the kids who came, grouped by class, then save the whole sheet. */
export function AttendanceForm({
  action,
  rows,
  aboveBottomNav = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  rows: AttendanceRow[];
  /** Keep the save bar clear of the app's bottom tab bar. */
  aboveBottomNav?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [present, setPresent] = useState(() => new Set(rows.filter((r) => r.present).map((r) => r.id)));
  const [query, setQuery] = useState("");
  // Hide "saved" once the sheet is changed again after saving.
  const [dirty, setDirty] = useState(false);
  const mark = (next: Set<string>) => {
    setPresent(next);
    setDirty(true);
  };

  const groups = useMemo(() => {
    const q = query.trim();
    const map = new Map<string, AttendanceRow[]>();
    for (const r of rows) {
      if (q && !r.name.includes(q)) continue;
      map.set(r.group, [...(map.get(r.group) ?? []), r]);
    }
    return [...map.entries()];
  }, [rows, query]);

  const toggle = (id: string) => {
    const next = new Set(present);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    mark(next);
  };

  if (!rows.length) return <p className="text-sm text-muted-foreground">{t.noServed}</p>;

  return (
    <form
      // Submitted by hand: a plain form action would reset the inputs after
      // saving, unticking the boxes on screen.
      onSubmit={(e) => {
        e.preventDefault();
        setDirty(false);
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="flex flex-col gap-4"
    >
      {/* Hidden inputs, so kids hidden by the search are still saved. */}
      {[...present].map((id) => (
        <input key={id} type="hidden" name="served" value={id} />
      ))}

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="ps-9"
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{t.presentCount(present.size, rows.length)}</span>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => mark(new Set(rows.map((r) => r.id)))}>
            {t.selectAll}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => mark(new Set())}>
            {t.clearAll}
          </Button>
        </div>
      </div>

      {groups.map(([group, members]) => (
        <section key={group} className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-muted-foreground">{group}</h3>
          <ul className="flex flex-col gap-1">
            {members.map((r) => {
              const on = present.has(r.id);
              return (
                <li key={r.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors",
                      on && "border-primary/40 bg-primary/10",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(r.id)}
                      className="size-5 accent-primary"
                    />
                    <Avatar url={r.avatarUrl} name={r.name} className="size-8" />
                    <span className={cn("flex-1", on && "font-medium")}>{r.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div
        className={cn(
          "sticky flex flex-col gap-2 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur",
          aboveBottomNav ? "bottom-20" : "bottom-3",
        )}
      >
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? strings.common.loading : t.save}
        </Button>
        {state.ok && !dirty && <p className="text-center text-sm font-medium text-emerald-600">{t.saved(present.size)}</p>}
        <FormError message={state.error} />
      </div>
    </form>
  );
}
