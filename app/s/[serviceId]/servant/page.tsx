import { ServicePlaceholder } from "@/components/service-placeholder";

export default async function ServiceServantPage({ params }: PageProps<"/s/[serviceId]/servant">) {
  const { serviceId } = await params;
  return <ServicePlaceholder serviceId={serviceId} area="servant" />;
}
