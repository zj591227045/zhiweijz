'use client';

import { useEffect, useState } from 'react';

export default function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* 主要动态渐变背景 */}
      <div className="absolute inset-0 animated-gradient" />
      
      {/* 鼠标跟随光晕 */}
      <div 
        className="absolute inset-0 opacity-40 dark:opacity-25 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 400px at ${mousePosition.x}% ${mousePosition.y}%, 
            rgba(59, 130, 246, 0.08) 0%, 
            rgba(147, 51, 234, 0.04) 30%,
            transparent 70%)`,
        }}
      />

      {/* 流动的波纹效果 */}
      <div className="absolute inset-0">
        {[...Array(4)].map((_, i) => (
          <div
            key={`ripple-${i}`}
            className="absolute rounded-full border border-blue-300/10 dark:border-blue-400/5"
            style={{
              width: `${250 + i * 150}px`,
              height: `${250 + i * 150}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: `ripple ${12 + i * 3}s ease-in-out infinite`,
              animationDelay: `${i * 3}s`,
            }}
          />
        ))}
      </div>

      {/* 漂浮的光点 */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={`float-${i}`}
            className="absolute bg-gradient-to-r from-blue-400/20 to-purple-400/20 dark:from-blue-300/10 dark:to-purple-300/10 rounded-full blur-sm"
            style={{
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
              top: `${15 + (i * 12)}%`,
              left: `${8 + (i * 11)}%`,
              animation: `float ${15 + (i % 4) * 5}s ease-in-out infinite`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 偶尔出现的流星效果 */}
      <div className="absolute inset-0">
        {[...Array(2)].map((_, i) => (
          <div
            key={`meteor-${i}`}
            className="absolute w-1 h-16 bg-gradient-to-b from-blue-400/60 via-blue-300/30 to-transparent dark:from-blue-300/40 dark:via-blue-200/20 blur-sm"
            style={{
              top: '10%',
              left: '10%',
              animation: `meteor ${25 + i * 10}s linear infinite`,
              animationDelay: `${i * 15}s`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      {/* 背景纹理 */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 75% 25%, rgba(16, 185, 129, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 25% 75%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)
          `,
          backgroundSize: '400px 400px, 300px 300px, 350px 350px, 280px 280px',
          animation: 'slowRotate 120s linear infinite',
        }}
      />
    </div>
  );
} 