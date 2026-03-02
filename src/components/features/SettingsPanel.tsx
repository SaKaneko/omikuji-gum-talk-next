"use client";

import { useActionState, useRef, useEffect } from "react";
import { changePassword } from "@/actions/settings";

export function SettingsPanel() {
  const [state, formAction, isPending] = useActionState(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  // パスワード変更成功時にフォームをリセット
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">設定</h1>

      {/* タブナビゲーション（将来的な拡張用） */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            className="px-4 py-2 text-sm font-medium border-b-2 border-primary-600 text-primary-700 -mb-px"
          >
            🔑 パスワード変更
          </button>
          {/* 将来的にここにタブを追加 */}
        </nav>
      </div>

      {/* パスワード変更セクション */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">パスワード変更</h2>
        <p className="text-sm text-gray-500 mb-6">
          セキュリティのため、現在のパスワードを入力してから新しいパスワードを設定してください。
        </p>

        {state?.success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            パスワードを変更しました。
          </div>
        )}

        {state?.error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {state.error}
          </div>
        )}

        <form ref={formRef} action={formAction} className="space-y-4">
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
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? "変更中..." : "パスワードを変更"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
