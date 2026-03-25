"use client";

import { useState, useTransition } from "react";
import { ThemeWithAuthor } from "@/types";
import { ThemeStatus } from "@prisma/client";
import { deleteTheme, updateThemeStatus, updateTheme } from "@/actions/themes";
import { getThemeDisplay } from "@/lib/themeDisplay";
import { MarkdownRenderer } from "@/components/features/MarkdownRenderer";
import { ThemeForm } from "@/components/features/ThemeForm";
import { CommentModal } from "@/components/features/CommentModal";

interface ThemeListProps {
  themes: ThemeWithAuthor[];
  currentUserId: string;
  canViewOthers: boolean;
  canDeleteOthers: boolean;
  isAdmin: boolean;
}

type FilterStatus = "all" | "pending" | "in_progress" | "completed";

const statusDisplay: Record<ThemeStatus, { label: string; badge: string }> = {
  PENDING: { label: "🔥 未消化", badge: "badge-unused" },
  IN_PROGRESS: { label: "🎙️ 発表中", badge: "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" },
  COMPLETED: { label: "✅ 消化済み", badge: "badge-used" },
};

export function ThemeList({
  themes,
  currentUserId,
  canViewOthers,
  canDeleteOthers,
  isAdmin,
}: ThemeListProps) {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [isPending, startTransition] = useTransition();
  const [editingTheme, setEditingTheme] = useState<ThemeWithAuthor | null>(null);
  const [commentingTheme, setCommentingTheme] = useState<ThemeWithAuthor | null>(null);

  const filteredThemes = themes.filter((theme) => {
    if (filter === "completed") return theme.status === "COMPLETED";
    if (filter === "pending") return theme.status === "PENDING";
    if (filter === "in_progress") return theme.status === "IN_PROGRESS";
    return true;
  });

  const handleDelete = (id: string) => {
    if (!confirm("このお題を削除しますか？")) return;
    startTransition(async () => {
      await deleteTheme(id);
    });
  };

  const handleToggleStatus = (id: string, currentStatus: ThemeStatus) => {
    const newStatus: ThemeStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    startTransition(async () => {
      await updateThemeStatus(id, newStatus);
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
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { key: "all" as FilterStatus, label: "すべて", count: themes.length },
          { key: "pending" as FilterStatus, label: "未消化", count: themes.filter((t) => t.status === "PENDING").length },
          { key: "in_progress" as FilterStatus, label: "発表中", count: themes.filter((t) => t.status === "IN_PROGRESS").length },
          { key: "completed" as FilterStatus, label: "消化済み", count: themes.filter((t) => t.status === "COMPLETED").length },
        ]).map((tab) => (
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
            const sd = statusDisplay[theme.status];

            return (
              <div
                key={theme.id}
                className={`card animate-slide-up ${
                  theme.status === "COMPLETED" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={getThemeDisplay(theme.type).badgeClass}>
                        {getThemeDisplay(theme.type).longLabel}
                      </span>
                      <span className={sd.badge}>
                        {sd.label}
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
                      </>
                    ) : null}
                    <p className="text-xs text-gray-400 mt-2">
                      投稿者:{" "}
                      {theme.author.deletedAt
                        ? "削除されたユーザー"
                        : theme.author.displayName}
                      {" · "}
                      {new Date(theme.createdAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {theme.status !== "PENDING" && (
                      <button
                        onClick={() => setCommentingTheme(theme)}
                        className="text-xs px-3 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors relative"
                      >
                        💬 コメント
                        {theme._count.comments > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                            {theme._count.comments}
                          </span>
                        )}
                      </button>
                    )}
                    {isOwnPost && theme.status === "PENDING" && (
                      <button
                        onClick={() => setEditingTheme(theme)}
                        disabled={isPending}
                        className="text-xs px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        編集
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() =>
                          handleToggleStatus(theme.id, theme.status)
                        }
                        disabled={isPending}
                        className="text-xs px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {theme.status === "COMPLETED" ? "未消化に戻す" : "消化済みにする"}
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

      {/* Edit Modal */}
      {editingTheme && (
        <ThemeEditModal
          theme={editingTheme}
          onClose={() => setEditingTheme(null)}
        />
      )}

      {/* Comment Modal */}
      {commentingTheme && (
        <CommentModal
          themeId={commentingTheme.id}
          themeSubject={commentingTheme.subject}
          currentUserId={currentUserId}
          canDeleteOthers={canDeleteOthers}
          commentCount={commentingTheme._count.comments}
          onClose={() => setCommentingTheme(null)}
        />
      )}
    </div>
  );
}

function ThemeEditModal({
  theme,
  onClose,
}: {
  theme: ThemeWithAuthor;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">📝 お題を編集</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <ThemeForm
            initialValues={{
              subject: theme.subject,
              content: theme.content,
              type: theme.type,
              expectedDuration: theme.expectedDuration,
            }}
            onSubmit={async (data) => {
              const result = await updateTheme(theme.id, data);
              if (result.success) {
                onClose();
              }
              return result;
            }}
            onCancel={onClose}
            submitLabel="💾 更新する"
            pendingLabel="更新中..."
          />
        </div>
      </div>
    </div>
  );
}
