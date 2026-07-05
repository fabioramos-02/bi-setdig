import { Sidebar } from "@/components/ds/Sidebar";

export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64">{children}</div>
    </div>
  );
}
