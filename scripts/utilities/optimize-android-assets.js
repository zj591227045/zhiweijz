const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('🔧 优化Android资源文件...\n');

// 源文件路径
const startupImagePath = '/Users/jackson/Documents/Code/zhiweijz/apps/web/public/startup.png';

// 创建目录函数
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 生成图片函数
const generateImage = async (inputPath, outputPath, width, height, options = {}) => {
  try {
    const { fit = 'contain', background = '#FFFFFF' } = options;
    
    await sharp(inputPath)
      .resize(width, height, {
        fit: fit,
        background: background
      })
      .png({ quality: 90, compressionLevel: 6 })
      .toFile(outputPath);
    
    const stats = fs.statSync(outputPath);
    const fileSize = (stats.size / 1024).toFixed(2);
    return { success: true, size: fileSize };
  } catch (error) {
    console.error(`生成失败 ${outputPath}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Android启动图配置
const androidSplashSizes = [
  { folder: 'drawable', width: 480, height: 800 },
  { folder: 'drawable-port-hdpi', width: 480, height: 800 },
  { folder: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { folder: 'drawable-port-xxhdpi', width: 1080, height: 1920 },
  { folder: 'drawable-port-xxxhdpi', width: 1440, height: 2560 },
  { folder: 'drawable-land-hdpi', width: 800, height: 480 },
  { folder: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { folder: 'drawable-land-xxhdpi', width: 1920, height: 1080 },
  { folder: 'drawable-land-xxxhdpi', width: 2560, height: 1440 }
];

// 优化的App图标配置 - 增加边距避免显示不全
const androidIconSizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

// iOS图标配置 - 优化尺寸
const iosIconSizes = [
  { name: 'AppIcon-20', size: 20 },
  { name: 'AppIcon-29', size: 29 },
  { name: 'AppIcon-40', size: 40 },
  { name: 'AppIcon-58', size: 58 },
  { name: 'AppIcon-60', size: 60 },
  { name: 'AppIcon-76', size: 76 },
  { name: 'AppIcon-80', size: 80 },
  { name: 'AppIcon-87', size: 87 },
  { name: 'AppIcon-120', size: 120 },
  { name: 'AppIcon-152', size: 152 },
  { name: 'AppIcon-167', size: 167 },
  { name: 'AppIcon-180', size: 180 },
  { name: 'AppIcon-512@2x', size: 1024 },
  { name: 'AppIcon-1024', size: 1024 }
];

// 创建优化的SVG图标 - 增加边距和调整尺寸
const createOptimizedSVG = (size) => {
  // 计算内容区域，留出10%的边距
  const margin = size * 0.1;
  const contentSize = size - (margin * 2);
  const hexagonSize = contentSize * 0.6; // 六边形占内容区域的60%
  const centerX = size / 2;
  const centerY = size / 2;
  
  // 六边形路径计算
  const hexRadius = hexagonSize / 2;
  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * Math.PI / 180;
    const x = centerX + hexRadius * Math.cos(angle);
    const y = centerY + hexRadius * Math.sin(angle);
    hexPoints.push(`${x},${y}`);
  }
  const hexPath = `M${hexPoints.join('L')}Z`;
  
  // 文字大小调整
  const fontSize1 = contentSize * 0.15; // "只为"
  const fontSize2 = contentSize * 0.15; // "记账"
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 背景渐变 -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
    
    <!-- 六边形渐变 -->
    <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
    </linearGradient>
    
    <!-- 文字阴影滤镜 -->
    <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- 背景 -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bgGradient)"/>
  
  <!-- 科技装饰点 -->
  <circle cx="${margin}" cy="${margin}" r="2" fill="#3B82F6" opacity="0.6"/>
  <circle cx="${size - margin}" cy="${margin}" r="2" fill="#3B82F6" opacity="0.6"/>
  <circle cx="${margin}" cy="${size - margin}" r="2" fill="#3B82F6" opacity="0.6"/>
  <circle cx="${size - margin}" cy="${size - margin}" r="2" fill="#3B82F6" opacity="0.6"/>
  
  <!-- 六边形主体 -->
  <path d="${hexPath}" fill="url(#hexGradient)" stroke="#1E40AF" stroke-width="2"/>
  
  <!-- 中文文字 -->
  <text x="${centerX}" y="${centerY - fontSize1 * 0.3}" 
        font-family="PingFang SC, Helvetica, Arial, sans-serif" 
        font-size="${fontSize1}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
        filter="url(#textShadow)">只为</text>
  
  <text x="${centerX}" y="${centerY + fontSize2 * 0.7}" 
        font-family="PingFang SC, Helvetica, Arial, sans-serif" 
        font-size="${fontSize2}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
        filter="url(#textShadow)">记账</text>
</svg>`;
};

// 主函数
async function optimizeAndroidAssets() {
  console.log('📱 检查源文件...');
  
  // 检查启动图源文件
  if (!fs.existsSync(startupImagePath)) {
    console.error(`❌ 启动图源文件不存在: ${startupImagePath}`);
    return;
  }
  
  const startupStats = fs.statSync(startupImagePath);
  console.log(`✅ 启动图源文件: ${(startupStats.size / 1024).toFixed(2)} KB\n`);
  
  // 1. 生成Android启动图
  console.log('🚀 生成Android启动图...');
  let splashSuccess = 0;
  
  for (const { folder, width, height } of androidSplashSizes) {
    const androidDir = `apps/android/app/src/main/res/${folder}`;
    createDir(androidDir);
    
    const outputPath = path.join(androidDir, 'splash.png');
    const result = await generateImage(startupImagePath, outputPath, width, height, {
      fit: 'contain',
      background: '#FFFFFF'
    });
    
    if (result.success) {
      splashSuccess++;
      console.log(`  ✅ ${folder}/splash.png (${width}x${height}) - ${result.size} KB`);
    } else {
      console.log(`  ❌ ${folder}/splash.png - ${result.error}`);
    }
  }
  
  // 2. 生成优化的Android图标
  console.log('\n📱 生成优化的Android图标...');
  let iconSuccess = 0;
  
  for (const { folder, size } of androidIconSizes) {
    const androidDir = `apps/android/app/src/main/res/${folder}`;
    createDir(androidDir);
    
    // 生成优化的SVG
    const svgContent = createOptimizedSVG(size);
    const svgPath = path.join(androidDir, 'temp_icon.svg');
    fs.writeFileSync(svgPath, svgContent);
    
    // 转换为PNG
    const iconFiles = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];
    
    for (const iconFile of iconFiles) {
      const outputPath = path.join(androidDir, iconFile);
      const result = await generateImage(svgPath, outputPath, size, size, {
        fit: 'contain',
        background: 'transparent'
      });
      
      if (result.success) {
        iconSuccess++;
        console.log(`  ✅ ${folder}/${iconFile} (${size}x${size}) - ${result.size} KB`);
      } else {
        console.log(`  ❌ ${folder}/${iconFile} - ${result.error}`);
      }
    }
    
    // 删除临时SVG文件
    fs.unlinkSync(svgPath);
  }
  
  // 3. 生成优化的iOS图标
  console.log('\n🍎 生成优化的iOS图标...');
  const iosDir = 'apps/ios/App/App/Assets.xcassets/AppIcon.appiconset';
  createDir(iosDir);
  
  let iosIconSuccess = 0;
  
  for (const { name, size } of iosIconSizes) {
    // 生成优化的SVG
    const svgContent = createOptimizedSVG(size);
    const svgPath = path.join(iosDir, 'temp_icon.svg');
    fs.writeFileSync(svgPath, svgContent);
    
    // 转换为PNG
    const outputPath = path.join(iosDir, `${name}.png`);
    const result = await generateImage(svgPath, outputPath, size, size, {
      fit: 'contain',
      background: 'transparent'
    });
    
    if (result.success) {
      iosIconSuccess++;
      console.log(`  ✅ ${name}.png (${size}x${size}) - ${result.size} KB`);
    } else {
      console.log(`  ❌ ${name}.png - ${result.error}`);
    }
    
    // 删除临时SVG文件
    fs.unlinkSync(svgPath);
  }
  
  // 4. 更新启动图配置
  console.log('\n⚙️  更新启动图配置...');
  
  // 更新Android启动图背景drawable
  const splashBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- 白色背景 -->
    <item android:drawable="@color/splash_background" />
    
    <!-- 启动图 -->
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash" />
    </item>
</layer-list>`;
  
  const drawableDir = 'apps/android/app/src/main/res/drawable';
  createDir(drawableDir);
  fs.writeFileSync(path.join(drawableDir, 'splash_background.xml'), splashBackgroundXml);
  console.log('  ✅ 更新Android启动图背景配置');
  
  // 总结
  console.log('\n📊 优化总结:');
  console.log(`  🚀 Android启动图: ${splashSuccess}/${androidSplashSizes.length} 个成功`);
  console.log(`  📱 Android图标: ${iconSuccess}/${androidIconSizes.length * 3} 个成功`);
  console.log(`  🍎 iOS图标: ${iosIconSuccess}/${iosIconSizes.length} 个成功`);
  
  const totalFiles = androidSplashSizes.length + (androidIconSizes.length * 3) + iosIconSizes.length;
  const totalSuccess = splashSuccess + iconSuccess + iosIconSuccess;
  const successRate = ((totalSuccess / totalFiles) * 100).toFixed(1);
  
  console.log(`  📈 总体成功率: ${successRate}% (${totalSuccess}/${totalFiles})`);
  
  console.log('\n🎯 优化特点:');
  console.log('  1. 使用指定的startup.png作为启动图');
  console.log('  2. 图标增加10%边距，避免显示不全');
  console.log('  3. 优化六边形尺寸和文字大小');
  console.log('  4. 支持所有Android和iOS设备尺寸');
  console.log('  5. 保持高质量PNG输出');
  
  console.log('\n🔄 下一步操作:');
  console.log('  1. 同步Capacitor配置');
  console.log('  2. 重新构建Android应用');
  console.log('  3. 测试图标和启动图显示效果');
  
  console.log('\n✅ Android资源优化完成！');
}

// 运行优化
optimizeAndroidAssets().catch(console.error);
