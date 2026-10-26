import { NavTabs } from "@/components/nav-tabs";
import { areaBadges } from "@/lib/alerts";
import { areaSections, withBadges } from "@/lib/nav";

/** الكنائس | الشكاوى والمقترحات, with the count of threads waiting for a reply. */
export async function AdminTabs() {
  return <NavTabs tabs={withBadges(areaSections("admin"), await areaBadges("admin"))} />;
}
