import { ServicePlaceholder } from "@/components/service-placeholder";

export default async function ServiceManagePage({ params }: PageProps<"/s/[serviceId]/manage">) {
  const { serviceId } = await params;
  return <ServicePlaceholder serviceId={serviceId} area="manage" />;
}
