import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/features/Header";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
      <footer className="text-center py-4 text-gray-400 text-sm">
        ガムトーク おだいボックス
      </footer>
    </div>
  );
}
