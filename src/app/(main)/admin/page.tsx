import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsers } from "@/actions/users";
import { getThemes } from "@/actions/themes";
import { getApiKeys } from "@/actions/apiKeys";
import { AdminPanel } from "@/components/features/AdminPanel";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "admin") {
    redirect("/");
  }

  const [users, themes, apiKeys] = await Promise.all([
    getUsers(),
    getThemes(),
    getApiKeys(),
  ]);

  return <AdminPanel users={users} themes={themes} apiKeys={apiKeys} />;
}
