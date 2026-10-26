import { NavTabs } from "@/components/nav-tabs";
import { strings } from "@/lib/strings";

export default async function ServantMeetingsLayout({
  children,
  params,
}: LayoutProps<"/s/[serviceId]/servant/meetings">) {
  const { serviceId } = await params;
  const base = `/s/${serviceId}/servant/meetings`;
  const t = strings.meetings.tabs;
  return (
    <>
      <NavTabs
        tabs={[
          { href: base, label: t.schedule, exact: true },
          { href: `${base}/mine`, label: t.mine },
        ]}
      />
      {children}
    </>
  );
}
