import { getCurrentUser, hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DrawMachine } from "@/components/features/DrawMachine";

export default async function DrawPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "draw_omikuji")) {
    redirect("/");
  }

  return <DrawMachine />;
}
