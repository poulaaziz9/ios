import { NavTabs } from "@/components/nav-tabs";
import { strings } from "@/lib/strings";

export default async function GiftsLayout({ children, params }: LayoutProps<"/s/[serviceId]/manage/gifts">) {
  const { serviceId } = await params;
  const base = `/s/${serviceId}/manage/gifts`;
  const t = strings.gifts.tabs;
  return (
    <>
      <NavTabs
        tabs={[
          { href: base, label: t.requests, exact: true },
          { href: `${base}/catalog`, label: t.catalog },
        ]}
      />
      {children}
    </>
  );
}
