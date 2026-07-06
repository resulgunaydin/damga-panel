import { AppNav } from "@/components/shell/app-nav";

export default function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-full flex-col">
      <AppNav />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">{children}</div>
    </div>
  );
}
