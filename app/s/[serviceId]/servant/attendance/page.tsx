import { AttendanceSheet } from "@/components/attendance-sheet";

export default async function ServantAttendancePage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/servant/attendance">) {
  const { serviceId } = await params;
  const date = String((await searchParams).date ?? "");
  return (
    <AttendanceSheet
      serviceId={serviceId}
      date={date}
      basePath={`/s/${serviceId}/servant/attendance`}
      aboveBottomNav
    />
  );
}
