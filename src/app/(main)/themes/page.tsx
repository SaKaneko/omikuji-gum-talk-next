import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getThemesPaginated } from "@/actions/themes";
import { getThemesPerPage } from "@/actions/settings";
import { ThemeList } from "@/components/features/ThemeList";
import Link from "next/link";

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const canViewOthers = hasPermission(user, "view_others_posts");
  const canDeleteOthers = hasPermission(user, "delete_others_posts");

  const perPage = await getThemesPerPage();
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const rawFilter = params.filter;
  const ALLOWED_FILTERS = ["all", "pending", "in_progress", "completed"] as const;
  type ThemeFilter = (typeof ALLOWED_FILTERS)[number];
  let filter: ThemeFilter;

  if (rawFilter === undefined) {
    // No filter specified in query: keep existing default behavior.
    filter = "pending";
  } else if (ALLOWED_FILTERS.includes(rawFilter as ThemeFilter)) {
    // Valid filter from query.
    filter = rawFilter as ThemeFilter;
  } else {
    // Invalid filter from query: normalize to "all" to match backend behavior.
    filter = "all";
  }
  const paginatedThemes = await getThemesPaginated(page, perPage, filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📋 お題一覧</h1>
        <Link href="/post" className="btn-primary">
          ✏️ 投稿する
        </Link>
      </div>

      <ThemeList
        themes={paginatedThemes.themes}
        currentUserId={user?.id || ""}
        canViewOthers={canViewOthers}
        canDeleteOthers={canDeleteOthers}
        isAdmin={user?.roleName === "admin"}
        currentPage={paginatedThemes.page}
        totalPages={paginatedThemes.totalPages}
        totalCount={paginatedThemes.totalCount}
        currentFilter={filter}
      />
    </div>
  );
}
