"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold">只为记账</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              简单、高效的个人记账应用，帮助您更好地管理财务。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">快速链接</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground"
                >
                  仪表盘
                </Link>
              </li>
              <li>
                <Link
                  href="/transactions"
                  className="text-muted-foreground hover:text-foreground"
                >
                  交易记录
                </Link>
              </li>
              <li>
                <Link
                  href="/statistics"
                  className="text-muted-foreground hover:text-foreground"
                >
                  统计分析
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="text-muted-foreground hover:text-foreground"
                >
                  设置
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">联系我们</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="text-muted-foreground">
                邮箱: support@zhiweijz.com
              </li>
              <li className="text-muted-foreground">
                微信: zhiweijz_support
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {currentYear} 只为记账. 保留所有权利.</p>
        </div>
      </div>
    </footer>
  );
}
