"use client";

import { useState, useTransition } from "react";
import { ThemeWithAuthor } from "@/types";
import { updateUserRole, deleteUser } from "@/actions/users";
import { deleteTheme, updateThemeStatus } from "@/actions/themes";

interface User {
  id: string;
  name: string;
  role: { id: string; name: string };
  timeBiasCoefficient: number;
}

interface AdminPanelProps {
  users: User[];
  themes: ThemeWithAuthor[];
}

type Tab = "users" | "themes";

export function AdminPanel({ users, themes }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (userId: string, newRole: string) => {
    startTransition(async () => {
      await updateUserRole(userId, newRole);
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (!confirm(`ユーザー「${userName}」を削除しますか？\n投稿されたお題は残ります。`))
      return;
    startTransition(async () => {
      await deleteUser(userId);
    });
  };

  const handleDeleteTheme = (themeId: string) => {
    if (!confirm("このお題を削除しますか？")) return;
    startTransition(async () => {
      await deleteTheme(themeId);
    });
  };

  const handleToggleThemeStatus = (themeId: string, isUsed: boolean) => {
    startTransition(async () => {
      await updateThemeStatus(themeId, !isUsed);
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ 管理画面</h1>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          👥 ユーザー管理 ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("themes")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "themes"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          📋 お題管理 ({themes.length})
        </button>
      </div>

      {/* Users management */}
      {activeTab === "users" && (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{u.name}</span>
                    <span
                      className={`badge ${
                        u.role.name === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.role.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    ズレ係数 k = {u.timeBiasCoefficient.toFixed(4)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role.name}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={isPending}
                    className="input-field text-sm w-auto py-1"
                  >
                    <option value="admin">admin</option>
                    <option value="general">general</option>
                  </select>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.name)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Themes management */}
      {activeTab === "themes" && (
        <div className="space-y-3">
          {themes.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              お題がありません
            </div>
          ) : (
            themes.map((theme) => (
              <div
                key={theme.id}
                className={`card ${theme.isUsed ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={
                          theme.type === "SOLO" ? "badge-solo" : "badge-group"
                        }
                      >
                        {theme.type}
                      </span>
                      <span
                        className={
                          theme.isUsed ? "badge-used" : "badge-unused"
                        }
                      >
                        {theme.isUsed ? "消化済み" : "未消化"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm">{theme.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {theme.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      投稿者:{" "}
                      {theme.author.deletedAt
                        ? "削除されたユーザー"
                        : theme.author.name}
                      {" · "}
                      予想: {theme.expectedDuration}分
                      {theme.actualDuration && ` · 実績: ${theme.actualDuration}分`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() =>
                        handleToggleThemeStatus(theme.id, theme.isUsed)
                      }
                      disabled={isPending}
                      className="text-xs px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {theme.isUsed ? "未消化へ" : "消化済みへ"}
                    </button>
                    <button
                      onClick={() => handleDeleteTheme(theme.id)}
                      disabled={isPending}
                      className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
