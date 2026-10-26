import { AttendanceSheet } from "@/components/attendance-sheet";

export default async function ManageAttendancePage({
  params,
  searchParams,
}: PageProps<"/s/[serviceId]/manage/attendance">) {
  const { serviceId } = await params;
  const date = String((await searchParams).date ?? "");
  return <AttendanceSheet serviceId={serviceId} date={date} basePath={`/s/${serviceId}/manage/attendance`} />;
}
