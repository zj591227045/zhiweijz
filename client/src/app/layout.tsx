import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "只为记账 - 简单高效的个人记账应用",
  description: "只为记账是一款简单、高效的个人记账应用，帮助您更好地管理财务。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        {/* 添加meta标签，防止浏览器缓存CSS */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* 早期主题应用脚本，避免闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const themeStorage = localStorage.getItem('theme-storage');
                  if (themeStorage) {
                    const themeData = JSON.parse(themeStorage);
                    if (themeData.state) {
                      const theme = themeData.state.theme || 'light';
                      const themeColor = themeData.state.themeColor || 'blue';
                      
                      const html = document.documentElement;
                      
                      if (theme === 'dark') {
                        html.classList.add('dark');
                        html.classList.add('dark-theme');
                        html.classList.remove('light', 'light-theme');
                        html.setAttribute('data-theme', 'dark');
                        
                        // 立即设置暗色主题的CSS变量
                        html.style.setProperty('--background-color', 'rgb(17, 24, 39)');
                        html.style.setProperty('--card-background', 'rgb(31, 41, 55)');
                        html.style.setProperty('--text-primary', 'rgb(243, 244, 246)');
                        html.style.setProperty('--text-secondary', 'rgb(156, 163, 175)');
                        html.style.setProperty('--border-color', 'rgb(55, 65, 81)');
                        html.style.setProperty('--primary-color', 'rgb(96, 165, 250)');
                      } else {
                        html.classList.add('light');
                        html.classList.add('light-theme');
                        html.classList.remove('dark', 'dark-theme');
                        html.setAttribute('data-theme', themeColor === 'blue' ? 'default' : themeColor);
                        
                        // 立即设置亮色主题的CSS变量
                        html.style.setProperty('--background-color', 'rgb(249, 250, 251)');
                        html.style.setProperty('--card-background', 'rgb(255, 255, 255)');
                        html.style.setProperty('--text-primary', 'rgb(31, 41, 55)');
                        html.style.setProperty('--text-secondary', 'rgb(107, 114, 128)');
                        html.style.setProperty('--border-color', 'rgb(229, 231, 235)');
                        
                        if (themeColor === 'blue') {
                          html.style.setProperty('--primary-color', 'rgb(59, 130, 246)');
                        } else if (themeColor === 'green') {
                          html.style.setProperty('--primary-color', 'rgb(16, 185, 129)');
                        } else if (themeColor === 'purple') {
                          html.style.setProperty('--primary-color', 'rgb(139, 92, 246)');
                        }
                      }
                      
                      html.classList.add('theme-' + themeColor);
                      
                      // 延迟处理预算元素，确保DOM加载完成
                      setTimeout(function() {
                        const budgetElements = document.querySelectorAll('.dashboard-category-name, .dashboard-budget-amount, .dashboard-budget-amount .current, .dashboard-budget-amount .total, .dashboard-separator');
                        budgetElements.forEach(function(element) {
                          if (element instanceof HTMLElement) {
                            // 根据主题强制设置颜色
                            if (element.classList.contains('dashboard-category-name') || 
                                element.classList.contains('dashboard-budget-amount') ||
                                element.classList.contains('current')) {
                              element.style.color = theme === 'dark' ? 'rgb(243, 244, 246)' : 'rgb(31, 41, 55)';
                            } else if (element.classList.contains('total') || element.classList.contains('dashboard-separator')) {
                              element.style.color = theme === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)';
                            }
                            
                            // 短暂延迟后移除内联样式，让CSS变量接管
                            setTimeout(function() {
                              element.style.removeProperty('color');
                            }, 100);
                          }
                        });
                      }, 500);
                    }
                  }
                } catch (e) {
                  console.warn('Failed to apply early theme:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
