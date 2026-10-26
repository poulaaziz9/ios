"use client";

import { useState } from "react";

import { strings } from "@/lib/strings";

type Member = { id: string; name: string; classId: string | null; role: string };

/**
 * Checkbox list of members grouped by class, with "select all" per group.
 * Submits each checked member as a `user_id` field.
 */
export function MemberPicker({
  classes,
  members,
}: {
  classes: { id: string; name: string }[];
  members: Member[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const groups = [
    ...classes.map((c) => ({ key: c.id, name: c.name, members: members.filter((m) => m.classId === c.id) })),
    {
      key: "none",
      name: strings.manage.noClass,
      members: members.filter((m) => !m.classId || !classes.some((c) => c.id === m.classId)),
    },
  ].filter((g) => g.members.length);

  const toggle = (ids: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
      {groups.map((g) => {
        const ids = g.members.map((m) => m.id);
        const all = ids.every((id) => checked.has(id));
        return (
          <fieldset key={g.key} className="flex flex-col gap-1">
            <legend className="flex w-full items-center justify-between text-sm font-semibold">
              {g.name}
              <button
                type="button"
                className="text-xs font-medium text-primary"
                onClick={() => toggle(ids, !all)}
              >
                {strings.points.selectAll}
              </button>
            </legend>
            {g.members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 py-0.5 text-sm">
                <input
                  type="checkbox"
                  name="user_id"
                  value={m.id}
                  checked={checked.has(m.id)}
                  onChange={(e) => toggle([m.id], e.target.checked)}
                  className="size-4 accent-primary"
                />
                {m.name}
                {m.role === "servant" && (
                  <span className="text-xs text-muted-foreground">({strings.home.roles.servant})</span>
                )}
              </label>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}
