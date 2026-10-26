import { NavTabs } from "@/components/nav-tabs";
import { strings } from "@/lib/strings";

export default async function PointsLayout({
  children,
  params,
}: LayoutProps<"/s/[serviceId]/manage/points">) {
  const { serviceId } = await params;
  const base = `/s/${serviceId}/manage/points`;
  const t = strings.points.tabs;
  return (
    <>
      <NavTabs
        tabs={[
          { href: base, label: t.ledger, exact: true },
          { href: `${base}/leaderboard`, label: t.leaderboard },
          { href: `${base}/rules`, label: t.rules },
        ]}
      />
      {children}
    </>
  );
}
