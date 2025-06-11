const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android图标尺寸配置
const androidSizes = [
  { size: 48, folder: 'mipmap-mdpi' },
  { size: 72, folder: 'mipmap-hdpi' },
  { size: 96, folder: 'mipmap-xhdpi' },
  { size: 144, folder: 'mipmap-xxhdpi' },
  { size: 192, folder: 'mipmap-xxxhdpi' }
];

// iOS图标尺寸配置 - 与generate-app-icons.js保持一致
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

// 转换SVG到PNG的函数
async function convertSvgToPng(svgPath, outputPath, size) {
  try {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error(`转换失败 ${svgPath} -> ${outputPath}:`, error.message);
    return false;
  }
}

// 主转换函数
async function convertAllIcons() {
  console.log('开始转换SVG图标为PNG格式...\n');

  // 转换Android图标
  console.log('🤖 转换Android图标:');
  for (const { size, folder } of androidSizes) {
    const androidDir = `apps/android/app/src/main/res/${folder}`;
    
    // 转换主图标
    const svgPath = path.join(androidDir, 'ic_launcher.svg');
    const pngPath = path.join(androidDir, 'ic_launcher.png');
    
    if (fs.existsSync(svgPath)) {
      const success = await convertSvgToPng(svgPath, pngPath, size);
      if (success) {
        console.log(`  ✓ ${folder}/ic_launcher.png (${size}x${size})`);
      }
    }
    
    // 转换圆形图标
    const roundSvgPath = path.join(androidDir, 'ic_launcher_round.svg');
    const roundPngPath = path.join(androidDir, 'ic_launcher_round.png');
    
    if (fs.existsSync(roundSvgPath)) {
      const success = await convertSvgToPng(roundSvgPath, roundPngPath, size);
      if (success) {
        console.log(`  ✓ ${folder}/ic_launcher_round.png (${size}x${size})`);
      }
    }
    
    // 转换前景图标
    const foregroundSvgPath = path.join(androidDir, 'ic_launcher_foreground.svg');
    const foregroundPngPath = path.join(androidDir, 'ic_launcher_foreground.png');
    
    if (fs.existsSync(foregroundSvgPath)) {
      const success = await convertSvgToPng(foregroundSvgPath, foregroundPngPath, size);
      if (success) {
        console.log(`  ✓ ${folder}/ic_launcher_foreground.png (${size}x${size})`);
      }
    }
  }

  // 转换iOS图标
  console.log('\n🍎 转换iOS图标:');
  const iosDir = 'apps/ios/App/App/Assets.xcassets/AppIcon.appiconset';
  
  for (const { size, name } of iosSizes) {
    const svgName = name.replace('.png', '.svg');
    const svgPath = path.join(iosDir, svgName);
    const pngPath = path.join(iosDir, name);
    
    if (fs.existsSync(svgPath)) {
      const success = await convertSvgToPng(svgPath, pngPath, size);
      if (success) {
        console.log(`  ✓ ${name} (${size}x${size})`);
      }
    }
  }

  console.log('\n✅ 所有图标转换完成！');
  console.log('\n📱 生成的图标文件:');
  console.log('  • Android: apps/android/app/src/main/res/mipmap-*/');
  console.log('  • iOS: apps/ios/App/App/Assets.xcassets/AppIcon.appiconset/');
}

// 运行转换
convertAllIcons().catch(console.error);
