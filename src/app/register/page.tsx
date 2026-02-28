"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/actions/auth";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "おだいボックス"}
          </h1>
          <p className="text-gray-500 mt-2">新しいアカウントを作成</p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={20}
              className="input-field"
              placeholder="2〜20文字で入力"
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={4}
              className="input-field"
              placeholder="4文字以上で入力"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={4}
              className="input-field"
              placeholder="パスワードを再入力"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full"
          >
            {isPending ? "登録中..." : "登録する"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
          >
            ← 既にアカウントをお持ちの方はこちら
          </Link>
        </div>
      </div>
    </div>
  );
}
