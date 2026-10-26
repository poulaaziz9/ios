/* eslint-disable @next/next/no-img-element -- short-lived signed URLs */
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

/**
 * Service timeline. RLS decides which posts the viewer sees (served kids:
 * service-wide + their class; servants/admins: everything).
 * `actions` renders extra controls per post (e.g. delete for admins).
 */
export async function Timeline({
  serviceId,
  limit = 30,
  actions,
}: {
  serviceId: string;
  limit?: number;
  actions?: (postId: string) => ReactNode;
}) {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, body, image_url, created_at, classes(name), author:profiles!posts_author_id_fkey(full_name)")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!posts?.length) {
    return <p className="text-sm text-muted-foreground">{strings.served.noPosts}</p>;
  }
  const images = await signedUrls("service-media", posts.map((p) => p.image_url));

  return (
    <ul className="flex flex-col gap-3">
      {posts.map((p) => (
        <li key={p.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {p.image_url && images.get(p.image_url) && (
            <img src={images.get(p.image_url)} alt="" className="max-h-96 w-full object-cover" loading="lazy" />
          )}
          <div className="flex flex-col gap-2 p-4">
            {p.body && <p className="whitespace-pre-line">{p.body}</p>}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {p.author?.full_name && <span>{p.author.full_name}</span>}
              <span>{formatRelative(p.created_at)}</span>
              {p.classes?.name && <Badge variant="secondary">{p.classes.name}</Badge>}
              {actions && <span className="ms-auto">{actions(p.id)}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
