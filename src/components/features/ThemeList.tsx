"use client";

import { useState, useTransition } from "react";
import { ThemeWithAuthor } from "@/types";
import { deleteTheme, updateThemeStatus } from "@/actions/themes";
import { getThemeDisplay } from "@/lib/themeDisplay";
import { MarkdownRenderer } from "@/components/features/MarkdownRenderer";

interface ThemeListProps {
  themes: ThemeWithAuthor[];
  currentUserId: string;
  canViewOthers: boolean;
  canDeleteOthers: boolean;
  isAdmin: boolean;
}

type FilterStatus = "all" | "unused" | "used";

export function ThemeList({
  themes,
  currentUserId,
  canViewOthers,
  canDeleteOthers,
  isAdmin,
}: ThemeListProps) {
  const [filter, setFilter] = useState<FilterStatus>("unused");
  const [isPending, startTransition] = useTransition();

  const filteredThemes = themes.filter((theme) => {
    if (filter === "used") return theme.isUsed;
    if (filter === "unused") return !theme.isUsed;
    return true;
  });

  const handleDelete = (id: string) => {
    if (!confirm("このお題を削除しますか？")) return;
    startTransition(async () => {
      await deleteTheme(id);
    });
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await updateThemeStatus(id, !currentStatus);
    });
  };

  const getCorrectedDuration = (theme: ThemeWithAuthor): string => {
    const k = theme.author.timeBiasCoefficient;
    const corrected = theme.expectedDuration * Math.exp(k);
    return corrected.toFixed(1);
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "all", label: "すべて", count: themes.length },
          { key: "unused", label: "未消化", count: themes.filter((t) => !t.isUsed).length },
          { key: "used", label: "消化済み", count: themes.filter((t) => t.isUsed).length },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Theme list */}
      {filteredThemes.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>表示するお題がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThemes.map((theme) => {
            const isOwnPost = theme.authorId === currentUserId;
            const canViewDetail = isOwnPost || canViewOthers;
            const canDelete = isOwnPost || canDeleteOthers;

            return (
              <div
                key={theme.id}
                className={`card animate-slide-up ${
                  theme.isUsed ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={getThemeDisplay(theme.type).badgeClass}>
                        {getThemeDisplay(theme.type).longLabel}
                      </span>
                      <span
                        className={
                          theme.isUsed ? "badge-used" : "badge-unused"
                        }
                      >
                        {theme.isUsed ? "✅ 消化済み" : "🔥 未消化"}
                      </span>
                      {canViewDetail && (
                        <span className="text-xs text-gray-400">
                          ⏱ 予想: {theme.expectedDuration}分
                          {canViewOthers && (
                            <span className="ml-1">
                              (補正: {getCorrectedDuration(theme)}分)
                            </span>
                          )}
                        </span>
                      )}
                      {theme.actualDuration && (
                        <span className="text-xs text-blue-500">
                          📊 実績: {theme.actualDuration}分
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-1">
                      {theme.subject}
                    </h3>

                    {canViewDetail ? (
                      <>
                        <div className="text-sm text-gray-600">
                          <MarkdownRenderer content={theme.content} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          投稿者:{" "}
                          {theme.author.deletedAt
                            ? "削除されたユーザー"
                            : theme.author.name}
                          {" · "}
                          {new Date(theme.createdAt).toLocaleDateString("ja-JP")}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(theme.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {isAdmin && (
                      <button
                        onClick={() =>
                          handleToggleStatus(theme.id, theme.isUsed)
                        }
                        disabled={isPending}
                        className="text-xs px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {theme.isUsed ? "未消化に戻す" : "消化済みにする"}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(theme.id)}
                        disabled={isPending}
                        className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
