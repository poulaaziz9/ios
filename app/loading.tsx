export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
