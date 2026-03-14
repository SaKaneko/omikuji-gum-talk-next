import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsPanel } from "@/components/features/SettingsPanel";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { displayName: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsPanel
      displayName={user.displayName}
      email={user.email ?? ""}
    />
  );
}
