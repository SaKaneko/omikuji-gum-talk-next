import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getThemes } from "@/actions/themes";
import { ThemeList } from "@/components/features/ThemeList";
import Link from "next/link";

export default async function ThemesPage() {
  const user = await getCurrentUser();
  const themes = await getThemes();
  const canViewOthers = hasPermission(user, "view_others_posts");
  const canDeleteOthers = hasPermission(user, "delete_others_posts");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📋 お題一覧</h1>
        <Link href="/post" className="btn-primary">
          ✏️ 投稿する
        </Link>
      </div>

      <ThemeList
        themes={themes}
        currentUserId={user?.id || ""}
        canViewOthers={canViewOthers}
        canDeleteOthers={canDeleteOthers}
        isAdmin={user?.roleName === "admin"}
      />
    </div>
  );
}
