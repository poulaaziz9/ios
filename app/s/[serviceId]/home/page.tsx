import { ServicePlaceholder } from "@/components/service-placeholder";

export default async function ServiceHomePage({ params }: PageProps<"/s/[serviceId]/home">) {
  const { serviceId } = await params;
  return <ServicePlaceholder serviceId={serviceId} area="home" />;
}
