const fs = require('fs');
const path = require('path');

// Android图标SVG模板（保持不变）
const createAndroidSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- 定义渐变和效果 -->
  <defs>
    <!-- 科技感浅色渐变背景 -->
    <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0f4f8;stop-opacity:1" />
      <stop offset="25%" style="stop-color:#e2e8f0;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#cbd5e0;stop-opacity:1" />
      <stop offset="75%" style="stop-color:#a0aec0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#718096;stop-opacity:1" />
    </linearGradient>
    
    <!-- 六边形蓝色渐变 -->
    <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3182ce;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2b77cb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e6bb8;stop-opacity:1" />
    </linearGradient>
    
    <!-- 文字阴影效果 -->
    <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
    
    <!-- 科技光效 -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge> 
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- 圆角正方形背景 - 科技感浅色渐变 -->
  <rect x="0" y="0" width="512" height="512" rx="80" ry="80" fill="url(#techGradient)"/>
  
  <!-- 科技装饰网格线 -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="80" ry="80" fill="url(#grid)"/>

  <!-- 六边形主体 - 蓝色渐变，增大10% -->
  <polygon points="256,35 436,133 436,379 256,477 76,379 76,133"
           fill="url(#hexGradient)"
           stroke="rgba(255,255,255,0.2)"
           stroke-width="2"
           filter="url(#glow)"/>

  <!-- 科技装饰元素 -->
  <!-- 左上角科技点 -->
  <circle cx="120" cy="120" r="3" fill="rgba(255,255,255,0.6)"/>
  <circle cx="140" cy="100" r="2" fill="rgba(255,255,255,0.4)"/>

  <!-- 右上角科技点 -->
  <circle cx="392" cy="120" r="3" fill="rgba(255,255,255,0.6)"/>
  <circle cx="372" cy="100" r="2" fill="rgba(255,255,255,0.4)"/>

  <!-- 左下角科技点 -->
  <circle cx="120" cy="392" r="3" fill="rgba(255,255,255,0.6)"/>
  <circle cx="140" cy="412" r="2" fill="rgba(255,255,255,0.4)"/>

  <!-- 右下角科技点 -->
  <circle cx="392" cy="392" r="3" fill="rgba(255,255,255,0.6)"/>
  <circle cx="372" cy="412" r="2" fill="rgba(255,255,255,0.4)"/>

  <!-- 文字：只为 -->
  <text x="256" y="200"
        font-family="PingFang SC, Microsoft YaHei, Helvetica, sans-serif"
        font-size="80"
        font-weight="600"
        fill="white"
        text-anchor="middle"
        filter="url(#textShadow)">只为</text>

  <!-- 文字：记账 -->
  <text x="256" y="320"
        font-family="PingFang SC, Microsoft YaHei, Helvetica, sans-serif"
        font-size="80"
        font-weight="600"
        fill="white"
        text-anchor="middle"
        filter="url(#textShadow)">记账</text>
</svg>`;

// iOS图标SVG模板（减少留白，放大主要元素）
const createIOSSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- 定义渐变和效果 -->
  <defs>
    <!-- 科技感浅色渐变背景 -->
    <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0f4f8;stop-opacity:1" />
      <stop offset="25%" style="stop-color:#e2e8f0;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#cbd5e0;stop-opacity:1" />
      <stop offset="75%" style="stop-color:#a0aec0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#718096;stop-opacity:1" />
    </linearGradient>
    
    <!-- 六边形蓝色渐变 -->
    <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3182ce;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2b77cb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e6bb8;stop-opacity:1" />
    </linearGradient>
    
    <!-- 文字阴影效果 -->
    <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
    
    <!-- 科技光效 -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge> 
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- 圆角正方形背景 - 科技感浅色渐变 -->
  <rect x="0" y="0" width="512" height="512" rx="90" ry="90" fill="url(#techGradient)"/>
  
  <!-- 科技装饰网格线 -->
  <defs>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="90" ry="90" fill="url(#grid)"/>

  <!-- 六边形主体 - 蓝色渐变，大幅放大减少留白 -->
  <polygon points="256,10 470,120 470,392 256,502 42,392 42,120"
           fill="url(#hexGradient)"
           stroke="rgba(255,255,255,0.25)"
           stroke-width="3"
           filter="url(#glow)"/>

  <!-- 科技装饰元素 - 调整位置适应更大的六边形 -->
  <!-- 左上角科技点 -->
  <circle cx="80" cy="80" r="4" fill="rgba(255,255,255,0.7)"/>
  <circle cx="105" cy="60" r="2.5" fill="rgba(255,255,255,0.5)"/>

  <!-- 右上角科技点 -->
  <circle cx="432" cy="80" r="4" fill="rgba(255,255,255,0.7)"/>
  <circle cx="407" cy="60" r="2.5" fill="rgba(255,255,255,0.5)"/>

  <!-- 左下角科技点 -->
  <circle cx="80" cy="432" r="4" fill="rgba(255,255,255,0.7)"/>
  <circle cx="105" cy="452" r="2.5" fill="rgba(255,255,255,0.5)"/>

  <!-- 右下角科技点 -->
  <circle cx="432" cy="432" r="4" fill="rgba(255,255,255,0.7)"/>
  <circle cx="407" cy="452" r="2.5" fill="rgba(255,255,255,0.5)"/>

  <!-- 文字：只为 - 放大字体并调整位置 -->
  <text x="256" y="210"
        font-family="PingFang SC, Microsoft YaHei, Helvetica, sans-serif"
        font-size="110"
        font-weight="700"
        fill="white"
        text-anchor="middle"
        filter="url(#textShadow)">只为</text>

  <!-- 文字：记账 - 放大字体并调整位置 -->
  <text x="256" y="350"
        font-family="PingFang SC, Microsoft YaHei, Helvetica, sans-serif"
        font-size="110"
        font-weight="700"
        fill="white"
        text-anchor="middle"
        filter="url(#textShadow)">记账</text>
</svg>`;

// Android图标尺寸配置
const androidSizes = [
  { size: 48, folder: 'mipmap-mdpi' },
  { size: 72, folder: 'mipmap-hdpi' },
  { size: 96, folder: 'mipmap-xhdpi' },
  { size: 144, folder: 'mipmap-xxhdpi' },
  { size: 192, folder: 'mipmap-xxxhdpi' }
];

// iOS图标尺寸配置 - 根据Xcode要求更新
const iosSizes = [
  // iPhone 通知图标
  { size: 40, name: 'AppIcon-20@2x.png' }, // 20pt @2x = 40px
  { size: 60, name: 'AppIcon-20@3x.png' }, // 20pt @3x = 60px
  
  // iPhone 设置图标
  { size: 58, name: 'AppIcon-29@2x.png' }, // 29pt @2x = 58px
  { size: 87, name: 'AppIcon-29@3x.png' }, // 29pt @3x = 87px
  
  // iPhone Spotlight搜索图标
  { size: 80, name: 'AppIcon-40@2x.png' }, // 40pt @2x = 80px
  { size: 120, name: 'AppIcon-40@3x.png' }, // 40pt @3x = 120px
  
  // iPhone 应用图标
  { size: 120, name: 'AppIcon-60@2x.png' }, // 60pt @2x = 120px
  { size: 180, name: 'AppIcon-60@3x.png' }, // 60pt @3x = 180px
  
  // iPad 通知图标
  { size: 20, name: 'AppIcon-20@1x.png' }, // 20pt @1x = 20px
  { size: 40, name: 'AppIcon-20@2x-ipad.png' }, // 20pt @2x = 40px (iPad)
  
  // iPad 设置图标
  { size: 29, name: 'AppIcon-29@1x.png' }, // 29pt @1x = 29px
  { size: 58, name: 'AppIcon-29@2x-ipad.png' }, // 29pt @2x = 58px (iPad)
  
  // iPad Spotlight搜索图标
  { size: 40, name: 'AppIcon-40@1x.png' }, // 40pt @1x = 40px
  { size: 80, name: 'AppIcon-40@2x-ipad.png' }, // 40pt @2x = 80px (iPad)
  
  // iPad 应用图标
  { size: 76, name: 'AppIcon-76@1x.png' }, // 76pt @1x = 76px
  { size: 152, name: 'AppIcon-76@2x.png' }, // 76pt @2x = 152px
  { size: 167, name: 'AppIcon-83.5@2x.png' }, // 83.5pt @2x = 167px
  
  // App Store 图标
  { size: 1024, name: 'AppIcon-1024@1x.png' } // 1024pt @1x = 1024px
];

// 创建目录
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 生成Android图标SVG文件（保持不变）
console.log('生成Android图标SVG文件...');
androidSizes.forEach(({ size, folder }) => {
  const androidDir = `apps/android/app/src/main/res/${folder}`;
  createDir(androidDir);
  
  const svgContent = createAndroidSVG(size);
  fs.writeFileSync(path.join(androidDir, 'ic_launcher.svg'), svgContent);
  fs.writeFileSync(path.join(androidDir, 'ic_launcher_round.svg'), svgContent);
  fs.writeFileSync(path.join(androidDir, 'ic_launcher_foreground.svg'), svgContent);
  
  console.log(`✓ 生成 ${folder} (${size}x${size})`);
});

// 生成iOS图标SVG文件（使用新的减少留白的模板）
console.log('\n生成iOS图标SVG文件（减少留白版本）...');
const iosDir = 'apps/ios/App/App/Assets.xcassets/AppIcon.appiconset';
createDir(iosDir);

iosSizes.forEach(({ size, name }) => {
  const svgContent = createIOSSVG(size);
  const svgName = name.replace('.png', '.svg');
  fs.writeFileSync(path.join(iosDir, svgName), svgContent);
  
  console.log(`✓ 生成 ${name} (${size}x${size}) - 减少留白版本`);
});

console.log('\n✅ 所有SVG图标文件生成完成！');
console.log('\n📝 注意：');
console.log('1. Android图标保持原有设计不变');
console.log('2. iOS图标已减少留白，放大了主要内容元素');
console.log('3. SVG文件已生成，如需PNG格式请使用图像转换工具');
console.log('4. 建议使用 sharp 或 ImageMagick 将SVG转换为PNG');
console.log('5. 转换命令示例：npx sharp-cli --input icon.svg --output icon.png --width 512 --height 512');
