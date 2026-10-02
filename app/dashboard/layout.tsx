import DashboardAuth from "./DashboardAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardAuth>{children}</DashboardAuth>;
}