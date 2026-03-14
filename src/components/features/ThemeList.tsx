"use client";

import { useState, useTransition, useCallback } from "react";
import { ThemeWithAuthor } from "@/types";
import { ThemeType, ThemeStatus } from "@prisma/client";
import { deleteTheme, updateThemeStatus, updateTheme } from "@/actions/themes";
import { getThemeDisplay } from "@/lib/themeDisplay";
import { MarkdownRenderer } from "@/components/features/MarkdownRenderer";

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ThemeType>(theme.type);
  const [content, setContent] = useState(theme.content);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const handleTabKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd } = textarea;
        const newValue =
          content.substring(0, selectionStart) +
          "\t" +
          content.substring(selectionEnd);
        setContent(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + 1;
          textarea.selectionEnd = selectionStart + 1;
        });
      }
    },
    [content]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const subject = formData.get("subject") as string;
    const expectedDuration = parseInt(
      formData.get("expectedDuration") as string
    );

    if (!subject || !content) {
      setError("件名と本文を入力してください。");
      return;
    }

    if (!expectedDuration || expectedDuration <= 0) {
      setError("予想所要時間は正の数を入力してください。");
      return;
    }

    if (type === "LIGHTNING_TALK" && expectedDuration > 10) {
      setError("ライトニングトークの場合は10分以内で設定してください。");
      return;
    }

    startTransition(async () => {
      const result = await updateTheme(theme.id, {
        subject,
        content,
        type,
        expectedDuration,
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "更新に失敗しました。");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="edit-subject"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                件名 <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-subject"
                name="subject"
                type="text"
                required
                defaultValue={theme.subject}
                className="input-field"
              />
            </div>

            <div>
              <label
                htmlFor="edit-content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                本文 <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-2">
                  Markdown記法に対応しています
                </span>
              </label>

              <div className="flex border-b border-gray-200 mb-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "edit"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  ✏️ 編集
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "preview"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  👁️ プレビュー
                </button>
              </div>

              {activeTab === "edit" ? (
                <textarea
                  id="edit-content"
                  name="content"
                  required
                  rows={5}
                  className="input-field resize-y rounded-t-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleTabKey}
                />
              ) : (
                <div className="input-field min-h-[8rem] rounded-t-none">
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-gray-400 text-sm">
                      プレビューする内容がありません
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                お題タイプ <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setType("LIGHTNING_TALK")}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    type === "LIGHTNING_TALK"
                      ? "border-yellow-500 bg-yellow-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-1">⚡️</div>
                  <div className="font-semibold text-sm">LT</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    10分以内
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType("PRESENTATION")}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    type === "PRESENTATION"
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-1">🎤</div>
                  <div className="font-semibold text-sm">PRESENTATION</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    1人が発表
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType("GROUP_TALK")}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    type === "GROUP_TALK"
                      ? "border-green-500 bg-green-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-1">💬</div>
                  <div className="font-semibold text-sm">GROUP TALK</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    みんなで話す
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-expectedDuration"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                予想所要時間（分） <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-expectedDuration"
                name="expectedDuration"
                type="number"
                required
                min={1}
                max={type === "LIGHTNING_TALK" ? 10 : 60}
                defaultValue={theme.expectedDuration}
                className="input-field w-32"
              />
              <p className="text-xs text-gray-400 mt-1">
                {type === "LIGHTNING_TALK"
                  ? "1〜10分の範囲で入力してください"
                  : "1〜60分の範囲で入力してください"}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary"
              >
                {isPending ? "更新中..." : "💾 更新する"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
