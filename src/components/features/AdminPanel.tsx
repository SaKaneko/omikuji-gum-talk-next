"use client";

import { useState, useTransition } from "react";
import { ThemeWithAuthor } from "@/types";
import { ThemeStatus } from "@prisma/client";
import { updateUserRole, deleteUser } from "@/actions/users";
import { deleteTheme, updateThemeStatus } from "@/actions/themes";
import { createApiKey, revokeApiKey, deleteApiKey, ApiKeyInfo } from "@/actions/apiKeys";
import { updateSystemSetting } from "@/actions/settings";
import { getThemeDisplay } from "@/lib/themeDisplay";

interface User {
  id: string;
  name: string;
  displayName: string;
  role: { id: string; name: string };
  timeBiasCoefficient: number;
}

interface AdminPanelProps {
  users: User[];
  themes: ThemeWithAuthor[];
  apiKeys: ApiKeyInfo[];
  systemSettings: Record<string, string>;
}

type Tab = "users" | "themes" | "apikeys" | "appsettings";

const THEMES_PER_PAGE_OPTIONS = ["10", "20", "50", "100"];

export function AdminPanel({ users, themes, apiKeys, systemSettings }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [isPending, startTransition] = useTransition();
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [themeStatusError, setThemeStatusError] = useState<string | null>(null);

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

  const handleToggleThemeStatus = (themeId: string, currentStatus: ThemeStatus) => {
    const newStatus: ThemeStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    setThemeStatusError(null);
    startTransition(async () => {
      const result = await updateThemeStatus(themeId, newStatus);
      if (!result.success) {
        setThemeStatusError(result.error ?? "エラーが発生しました。");
      }
    });
  };

  const handleStartPresentation = (themeId: string) => {
    if (!confirm("このお題を発表中にしますか？")) return;
    setThemeStatusError(null);
    startTransition(async () => {
      const result = await updateThemeStatus(themeId, "IN_PROGRESS");
      if (!result.success) {
        setThemeStatusError(result.error ?? "エラーが発生しました。");
      }
    });
  };

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) return;
    setApiKeyError(null);
    setGeneratedKey(null);
    startTransition(async () => {
      const result = await createApiKey(newKeyName.trim());
      if (result.success && result.apiKey) {
        setGeneratedKey(result.apiKey);
        setNewKeyName("");
      } else {
        setApiKeyError(result.error ?? "エラーが発生しました。");
      }
    });
  };

  const handleRevokeApiKey = (keyId: string) => {
    if (!confirm("このAPIキーを無効化しますか？")) return;
    startTransition(async () => {
      await revokeApiKey(keyId);
    });
  };

  const handleDeleteApiKey = (keyId: string) => {
    if (!confirm("このAPIキーを完全に削除しますか？")) return;
    startTransition(async () => {
      await deleteApiKey(keyId);
    });
  };

  const handleUpdateSetting = (key: string, value: string) => {
    setSettingsMessage(null);
    startTransition(async () => {
      const result = await updateSystemSetting(key, value);
      if (result.success) {
        setSettingsMessage({ type: "success", text: "設定を更新しました。" });
      } else {
        setSettingsMessage({ type: "error", text: result.error ?? "エラーが発生しました。" });
      }
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
        <button
          onClick={() => setActiveTab("apikeys")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "apikeys"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          🔑 APIキー ({apiKeys.filter((k) => !k.revokedAt).length})
        </button>
        <button
          onClick={() => setActiveTab("appsettings")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "appsettings"
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          🛠️ アプリ設定
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
                    <span className="font-semibold">{u.displayName}</span>
                    <span className="text-xs text-gray-400">@{u.name}</span>
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
                    onClick={() => handleDeleteUser(u.id, u.displayName)}
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
          {(() => {
            const unusedThemes = themes.filter((t) => t.status === "PENDING");
            const totalCorrectedDuration = unusedThemes.reduce((sum, t) => {
              return sum + t.expectedDuration * Math.exp(t.author.timeBiasCoefficient);
            }, 0);
            return (
              <div className="card bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  📊 未消化のお題: <span className="font-bold">{unusedThemes.length}件</span>
                  {" · "}
                  補正後の合計所要時間: <span className="font-bold">{totalCorrectedDuration.toFixed(1)}分</span>
                </p>
              </div>
            );
          })()}
          {themeStatusError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {themeStatusError}
            </div>
          )}
          {themes.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              お題がありません
            </div>
          ) : (
            themes.map((theme) => (
              <div
                key={theme.id}
                className="card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={getThemeDisplay(theme.type).badgeClass}>
                        {getThemeDisplay(theme.type).longLabel}
                      </span>
                      <span
                        className={
                          theme.status === "COMPLETED"
                            ? "badge-used"
                            : theme.status === "IN_PROGRESS"
                            ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                            : "badge-unused"
                        }
                      >
                        {theme.status === "COMPLETED"
                          ? "消化済み"
                          : theme.status === "IN_PROGRESS"
                          ? "発表中"
                          : "未消化"}
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
                        : theme.author.displayName}
                      {" · "}
                      予想: {theme.expectedDuration}分
                      {theme.actualDuration && ` · 実績: ${theme.actualDuration}分`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {theme.status === "PENDING" && (
                      <button
                        onClick={() => handleStartPresentation(theme.id)}
                        disabled={isPending}
                        className="text-xs px-3 py-1 rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                      >
                        🎙️ 発表中にする
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleToggleThemeStatus(theme.id, theme.status)
                      }
                      disabled={isPending}
                      className="text-xs px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {theme.status === "COMPLETED" ? "未消化へ" : "消化済みへ"}
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

      {/* API Keys management */}
      {activeTab === "apikeys" && (
        <div className="space-y-4">
          {/* Create new key */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">新しいAPIキーを発行</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="APIキーの名前（例: CI/CD用）"
                className="input-field flex-1"
                maxLength={100}
              />
              <button
                onClick={handleCreateApiKey}
                disabled={isPending || !newKeyName.trim()}
                className="btn-primary whitespace-nowrap"
              >
                {isPending ? "発行中..." : "発行"}
              </button>
            </div>
            {apiKeyError && (
              <p className="text-sm text-red-600 mt-2">{apiKeyError}</p>
            )}
          </div>

          {/* Show generated key */}
          {generatedKey && (
            <div className="card bg-green-50 border border-green-200">
              <p className="text-sm font-semibold text-green-800 mb-2">
                APIキーが発行されました。この値は一度だけ表示されます。安全な場所に保存してください。
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white p-2 rounded border border-green-300 break-all select-all">
                  {generatedKey}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKey);
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors whitespace-nowrap"
                >
                  コピー
                </button>
              </div>
              <p className="text-xs text-green-600 mt-2">
                使用方法: <code className="bg-white px-1 rounded">Authorization: Bearer {generatedKey.substring(0, 12)}...</code> または{" "}
                <code className="bg-white px-1 rounded">X-API-Key: {generatedKey.substring(0, 12)}...</code>
              </p>
            </div>
          )}

          {/* Key list */}
          {apiKeys.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              APIキーがありません
            </div>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className={`card ${key.revokedAt ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{key.name}</span>
                      <code className="text-xs text-gray-400">{key.prefix}...</code>
                      {key.revokedAt ? (
                        <span className="badge bg-red-100 text-red-700">無効</span>
                      ) : (
                        <span className="badge bg-green-100 text-green-700">有効</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      作成: {new Date(key.createdAt).toLocaleDateString("ja-JP")}
                      {key.lastUsedAt && (
                        <>
                          {" · "}最終使用: {new Date(key.lastUsedAt).toLocaleDateString("ja-JP")}
                        </>
                      )}
                      {key.revokedAt && (
                        <>
                          {" · "}無効化: {new Date(key.revokedAt).toLocaleDateString("ja-JP")}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!key.revokedAt && (
                      <button
                        onClick={() => handleRevokeApiKey(key.id)}
                        disabled={isPending}
                        className="text-xs px-3 py-1.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        無効化
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteApiKey(key.id)}
                      disabled={isPending}
                      className="text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
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

      {/* App Settings */}
      {activeTab === "appsettings" && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 一覧表示件数</h3>
            <p className="text-xs text-gray-500 mb-3">
              お題一覧画面の1ページあたりの表示件数を設定します。
            </p>
            <div className="flex items-center gap-3">
              <select
                value={systemSettings.themes_per_page ?? "20"}
                onChange={(e) => handleUpdateSetting("themes_per_page", e.target.value)}
                disabled={isPending}
                className="input-field w-auto py-1.5"
              >
                {THEMES_PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}件
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">/ ページ</span>
            </div>
          </div>
          {settingsMessage && (
            <div
              className={`card ${
                settingsMessage.type === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-sm ${
                  settingsMessage.type === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {settingsMessage.text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
