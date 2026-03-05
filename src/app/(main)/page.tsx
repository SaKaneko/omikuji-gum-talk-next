import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  const menuItems = [
    {
      href: "/themes",
      icon: "📋",
      title: "お題一覧を見る",
      description: "投稿されたお題を一覧で確認",
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/post",
      icon: "✏️",
      title: "お題を投稿する",
      description: "新しいトークテーマを投稿",
      color: "from-green-500 to-green-600",
    },
    ...(user?.permissions.includes("draw_omikuji")
      ? [
          {
            href: "/draw",
            icon: "🎰",
            title: "お題を引く（くじ引き）",
            description: "ランダムにお題を抽選！",
            color: "from-amber-500 to-orange-600",
          },
        ]
      : []),
    ...(user?.roleName === "admin"
      ? [
          {
            href: "/admin",
            icon: "⚙️",
            title: "管理画面",
            description: "ユーザー・お題の管理",
            color: "from-purple-500 to-purple-600",
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/title.png`}
            alt="ガムトーク"
            width={320}
            height={120}
            priority
          />
        </div>
        <p className="text-gray-500 text-lg">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "おだいボックス"}
        </p>
      </div>

      <div className="grid gap-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                {item.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <div className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors">
                →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
