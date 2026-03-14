"use client";

import { useState, useActionState, useRef, useEffect } from "react";
import { changePassword, updateProfile } from "@/actions/settings";

type SettingsTab = "profile" | "password";

interface SettingsPanelProps {
  displayName: string;
  email: string;
}

export function SettingsPanel({ displayName, email }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [passwordState, passwordAction, isPasswordPending] = useActionState(changePassword, null);
  const [profileState, profileAction, isProfilePending] = useActionState(updateProfile, null);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  // パスワード変更成功時にフォームをリセット
  useEffect(() => {
    if (passwordState?.success) {
      passwordFormRef.current?.reset();
    }
  }, [passwordState]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">設定</h1>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "profile"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            👤 プロフィール
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "password"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🔑 パスワード変更
          </button>
        </nav>
      </div>

      {/* プロフィールセクション */}
      {activeTab === "profile" && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">プロフィール</h2>
          <p className="text-sm text-gray-500 mb-6">
            表示名やメールアドレスを変更できます。
          </p>

          {profileState?.success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              プロフィールを更新しました。
            </div>
          )}

          {profileState?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {profileState.error}
            </div>
          )}

          <form action={profileAction} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                表示名
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                required
                defaultValue={displayName}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-gray-400 font-normal">(任意)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                defaultValue={email}
                className="input-field"
                placeholder="example@example.com"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isProfilePending}
                className="btn-primary"
              >
                {isProfilePending ? "更新中..." : "プロフィールを更新"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* パスワード変更セクション */}
      {activeTab === "password" && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">パスワード変更</h2>
          <p className="text-sm text-gray-500 mb-6">
            セキュリティのため、現在のパスワードを入力してから新しいパスワードを設定してください。
          </p>

          {passwordState?.success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              パスワードを変更しました。
            </div>
          )}

          {passwordState?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {passwordState.error}
            </div>
          )}

          <form ref={passwordFormRef} action={passwordAction} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                現在のパスワード
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                required
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                required
                minLength={4}
                className="input-field"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-400">4文字以上で入力してください</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={4}
                className="input-field"
                autoComplete="new-password"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPasswordPending}
                className="btn-primary"
              >
                {isPasswordPending ? "変更中..." : "パスワードを変更"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
