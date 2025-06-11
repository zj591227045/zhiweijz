const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 源启动图路径
const sourceImage = 'apps/web/public/startup.png';

// Android启动图配置
const androidSplashSizes = [
  { folder: 'drawable-port-mdpi', width: 320, height: 480 },
  { folder: 'drawable-port-hdpi', width: 480, height: 800 },
  { folder: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { folder: 'drawable-port-xxhdpi', width: 1080, height: 1920 },
  { folder: 'drawable-port-xxxhdpi', width: 1440, height: 2560 },
  { folder: 'drawable-land-mdpi', width: 480, height: 320 },
  { folder: 'drawable-land-hdpi', width: 800, height: 480 },
  { folder: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { folder: 'drawable-land-xxhdpi', width: 1920, height: 1080 },
  { folder: 'drawable-land-xxxhdpi', width: 2560, height: 1440 },
  { folder: 'drawable', width: 480, height: 800 } // 默认尺寸
];

// iOS启动图配置 (基于不同设备尺寸)
const iosSplashSizes = [
  // iPhone
  { name: 'Default@2x~iphone~anyany.png', width: 1334, height: 750 },
  { name: 'Default@3x~iphone~anyany.png', width: 2208, height: 1242 },
  { name: 'Default~iphone.png', width: 320, height: 480 },
  { name: 'Default@2x~iphone.png', width: 640, height: 960 },
  { name: 'Default-568h@2x~iphone.png', width: 640, height: 1136 },
  { name: 'Default-667h@2x~iphone.png', width: 750, height: 1334 },
  { name: 'Default-736h@3x~iphone.png', width: 1242, height: 2208 },
  { name: 'Default-812h@3x~iphone.png', width: 1125, height: 2436 },
  { name: 'Default-896h@2x~iphone.png', width: 828, height: 1792 },
  { name: 'Default-896h@3x~iphone.png', width: 1242, height: 2688 },
  
  // iPad
  { name: 'Default~ipad.png', width: 768, height: 1024 },
  { name: 'Default@2x~ipad.png', width: 1536, height: 2048 },
  { name: 'Default-Portrait~ipad.png', width: 768, height: 1024 },
  { name: 'Default-Portrait@2x~ipad.png', width: 1536, height: 2048 },
  { name: 'Default-Landscape~ipad.png', width: 1024, height: 768 },
  { name: 'Default-Landscape@2x~ipad.png', width: 2048, height: 1536 }
];

// 创建目录
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 生成启动图的函数
async function generateSplashScreen(inputPath, outputPath, width, height) {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // 白色背景
      })
      .png()
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error(`生成启动图失败 ${outputPath}:`, error.message);
    return false;
  }
}

// 主函数
async function setupSplashScreens() {
  console.log('🚀 开始设置应用启动图...\n');

  // 检查源文件是否存在
  if (!fs.existsSync(sourceImage)) {
    console.error(`❌ 源启动图文件不存在: ${sourceImage}`);
    return;
  }

  console.log(`📱 使用源文件: ${sourceImage}\n`);

  // 生成Android启动图
  console.log('🤖 生成Android启动图:');
  let androidSuccess = 0;
  
  for (const { folder, width, height } of androidSplashSizes) {
    const androidDir = `apps/android/app/src/main/res/${folder}`;
    createDir(androidDir);
    
    const outputPath = path.join(androidDir, 'splash.png');
    const success = await generateSplashScreen(sourceImage, outputPath, width, height);
    
    if (success) {
      androidSuccess++;
      console.log(`  ✅ ${folder}/splash.png (${width}x${height})`);
    } else {
      console.log(`  ❌ ${folder}/splash.png (${width}x${height})`);
    }
  }

  // 生成iOS启动图
  console.log('\n🍎 生成iOS启动图:');
  const iosDir = 'apps/ios/App/App/Assets.xcassets/Splash.imageset';
  createDir(iosDir);
  
  let iosSuccess = 0;
  
  for (const { name, width, height } of iosSplashSizes) {
    const outputPath = path.join(iosDir, name);
    const success = await generateSplashScreen(sourceImage, outputPath, width, height);
    
    if (success) {
      iosSuccess++;
      console.log(`  ✅ ${name} (${width}x${height})`);
    } else {
      console.log(`  ❌ ${name} (${width}x${height})`);
    }
  }

  // 创建iOS Contents.json文件
  const iosContentsPath = path.join(iosDir, 'Contents.json');
  const iosContentsData = {
    "images": [
      {
        "filename": "Default~iphone.png",
        "idiom": "iphone",
        "scale": "1x"
      },
      {
        "filename": "Default@2x~iphone.png",
        "idiom": "iphone",
        "scale": "2x"
      },
      {
        "filename": "Default@3x~iphone~anyany.png",
        "idiom": "iphone",
        "scale": "3x"
      },
      {
        "filename": "Default~ipad.png",
        "idiom": "ipad",
        "scale": "1x"
      },
      {
        "filename": "Default@2x~ipad.png",
        "idiom": "ipad",
        "scale": "2x"
      }
    ],
    "info": {
      "author": "xcode",
      "version": 1
    }
  };

  fs.writeFileSync(iosContentsPath, JSON.stringify(iosContentsData, null, 2));
  console.log(`  ✅ Contents.json 已创建`);

  // 总结
  console.log('\n📊 生成总结:');
  console.log(`  🤖 Android: ${androidSuccess}/${androidSplashSizes.length} 个启动图生成成功`);
  console.log(`  🍎 iOS: ${iosSuccess}/${iosSplashSizes.length} 个启动图生成成功`);

  const totalSuccess = androidSuccess + iosSuccess;
  const totalFiles = androidSplashSizes.length + iosSplashSizes.length;
  const successRate = ((totalSuccess / totalFiles) * 100).toFixed(1);

  console.log(`  📈 总体成功率: ${successRate}% (${totalSuccess}/${totalFiles})`);

  if (totalSuccess === totalFiles) {
    console.log('\n🎉 所有启动图生成完成！');
    console.log('\n📱 下一步操作:');
    console.log('  1. 重新构建Android应用以应用新启动图');
    console.log('  2. 重新构建iOS应用以应用新启动图');
    console.log('  3. 在设备上测试启动图显示效果');
  } else {
    console.log('\n⚠️  部分启动图生成失败，请检查错误信息');
  }
}

// 运行设置
setupSplashScreens().catch(console.error);
