"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4 bg-white">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">只为记账</div>
          <div className="space-x-4">
            <Link href="/login" className="text-blue-600 hover:underline">登录</Link>
            <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">注册</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 英雄区 */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-100">
          <div className="container mx-auto text-center px-4">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              简单、高效的个人记账应用
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              只为记账帮助您轻松管理个人财务，追踪收支，制定预算，分析消费习惯，让您的财务状况一目了然。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700">
                免费注册
              </Link>
              <Link href="/login" className="border border-gray-300 px-6 py-3 rounded-lg text-lg font-medium hover:bg-gray-50">
                登录账号
              </Link>
            </div>
          </div>
        </section>

        {/* 特性区 */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              为什么选择只为记账
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">轻松记账</h3>
                <p className="text-gray-600">
                  简洁直观的界面设计，让记账变得简单快捷，随时随地记录您的收支情况。
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600"
                  >
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">数据分析</h3>
                <p className="text-gray-600">
                  智能分析您的消费习惯，生成直观的图表和报告，帮助您了解自己的财务状况。
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600"
                  >
                    <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
                    <path d="M12 12H3" />
                    <path d="M16 6h2" />
                    <path d="M19 19a2 2 0 1 1-4 0c0-1.1.9-2 2-2a2 2 0 0 1 2 2Z" />
                    <path d="M17 17v-1" />
                    <path d="M17 21v-1" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">预算管理</h3>
                <p className="text-gray-600">
                  设置个性化的预算目标，实时监控支出，帮助您控制消费，养成良好的理财习惯。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 号召行动区 */}
        <section className="py-20 bg-gray-100">
          <div className="container mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              立即开始您的记账之旅
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              加入成千上万的用户，开始使用只为记账，让财务管理变得简单而高效。
            </p>
            <Link href="/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700">
              免费注册
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 bg-white">
        <div className="container mx-auto text-center text-gray-600">
          <p>© {new Date().getFullYear()} 只为记账. 保留所有权利.</p>
        </div>
      </footer>
    </div>
  );
}
