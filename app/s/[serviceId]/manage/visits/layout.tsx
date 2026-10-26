import { NavTabs } from "@/components/nav-tabs";
import { strings } from "@/lib/strings";

export default async function VisitsLayout({
  children,
  params,
}: LayoutProps<"/s/[serviceId]/manage/visits">) {
  const { serviceId } = await params;
  const base = `/s/${serviceId}/manage/visits`;
  const t = strings.visits.tabs;
  return (
    <>
      <NavTabs
        tabs={[
          { href: base, label: t.assign, exact: true },
          { href: `${base}/log`, label: t.log },
        ]}
      />
      {children}
    </>
  );
}
