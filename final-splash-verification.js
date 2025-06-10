const fs = require('fs');
const path = require('path');

console.log('🔍 最终启动图修复验证...\n');

// 文件路径
const sourceStartup = 'apps/web/public/startup.png';
const apkFile = 'apps/android/app/build/outputs/apk/debug/app-debug.apk';
const capacitorConfig = 'apps/web/capacitor.config.ts';
const splashBackground = 'apps/android/app/src/main/res/drawable/splash_background.xml';
const colorsXml = 'apps/android/app/src/main/res/values/colors.xml';

// 需要验证的启动图文件
const splashFiles = [
  'apps/android/app/src/main/res/drawable/splash.png',
  'apps/android/app/src/main/res/drawable-port-hdpi/splash.png',
  'apps/android/app/src/main/res/drawable-port-xhdpi/splash.png',
  'apps/android/app/src/main/res/drawable-port-xxhdpi/splash.png',
  'apps/android/app/src/main/res/drawable-port-xxxhdpi/splash.png',
  'apps/android/app/src/main/res/drawable-land-hdpi/splash.png',
  'apps/android/app/src/main/res/drawable-land-xhdpi/splash.png',
  'apps/android/app/src/main/res/drawable-land-xxhdpi/splash.png',
  'apps/android/app/src/main/res/drawable-land-xxxhdpi/splash.png'
];

// 验证函数
const verifyFileExists = (filePath, description) => {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`  ✅ ${description}: ${size} KB`);
    return true;
  } else {
    console.log(`  ❌ ${description}: 文件不存在`);
    return false;
  }
};

const verifyFileContent = (filePath, searchText, description) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchText)) {
      console.log(`  ✅ ${description}: 配置正确`);
      return true;
    } else {
      console.log(`  ❌ ${description}: 配置错误`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${description}: 读取失败`);
    return false;
  }
};

const compareWithSource = (filePath, description) => {
  try {
    const sourceContent = fs.readFileSync(sourceStartup);
    const targetContent = fs.readFileSync(filePath);
    
    if (sourceContent.equals(targetContent)) {
      console.log(`  ✅ ${description}: 与源文件一致`);
      return true;
    } else {
      console.log(`  ❌ ${description}: 与源文件不一致`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${description}: 比较失败`);
    return false;
  }
};

// 开始验证
console.log('📱 验证基础文件:');
const basicFiles = [
  verifyFileExists(sourceStartup, '源启动图文件'),
  verifyFileExists(apkFile, '新构建的APK文件')
];

console.log('\n🖼️  验证所有启动图文件:');
let splashFileChecks = [];
for (const splashFile of splashFiles) {
  const folderName = path.basename(path.dirname(splashFile));
  splashFileChecks.push(compareWithSource(splashFile, `${folderName}/splash.png`));
}

console.log('\n⚙️  验证配置文件:');
const configChecks = [
  verifyFileContent(splashBackground, 'fill_horizontal|fill_vertical', 'splash_background.xml填充模式'),
  verifyFileContent(colorsXml, '#00000000', 'colors.xml透明背景'),
  verifyFileContent(capacitorConfig, 'androidScaleType: "MATRIX"', 'Capacitor MATRIX缩放'),
  verifyFileContent(capacitorConfig, 'backgroundColor: "#00000000"', 'Capacitor透明背景'),
  verifyFileContent(capacitorConfig, 'splashFullScreen: true', 'Capacitor全屏模式')
];

// 计算总体结果
console.log('\n📊 验证结果总结:');
const allChecks = [...basicFiles, ...splashFileChecks, ...configChecks];
const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;
const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

console.log(`  📈 验证通过率: ${successRate}% (${passedChecks}/${totalChecks})`);
console.log(`  📱 启动图文件: ${splashFileChecks.filter(Boolean).length}/${splashFiles.length} 个正确`);
console.log(`  ⚙️  配置文件: ${configChecks.filter(Boolean).length}/${configChecks.length} 个正确`);

// 显示APK信息
console.log('\n📦 APK文件信息:');
try {
  const apkStats = fs.statSync(apkFile);
  const apkSize = (apkStats.size / (1024 * 1024)).toFixed(2);
  console.log(`  📱 APK大小: ${apkSize} MB`);
  console.log(`  📅 构建时间: ${apkStats.mtime.toLocaleString()}`);
} catch (error) {
  console.log('  ❌ 无法读取APK信息');
}

// 最终结果
if (passedChecks === totalChecks) {
  console.log('\n🎉 启动图修复完全成功！');
  console.log('✅ 所有配置正确，启动图应该显示为指定的startup.png');
  console.log('✅ 已解决Capacitor配置冲突问题');
  console.log('✅ 所有密度文件夹都使用正确的启动图');
  
  console.log('\n🚀 现在可以测试新的APK:');
  console.log('adb install app/build/outputs/apk/debug/app-debug.apk');
  
  console.log('\n🎯 预期效果:');
  console.log('1. 启动时显示完整的startup.png内容');
  console.log('2. 全屏显示，无紫色背景');
  console.log('3. 无白色背景或图标叠加');
  console.log('4. 启动图与指定文件完全一致');
  
} else {
  console.log('\n⚠️  部分验证失败，请检查上述输出');
  console.log('❌ 可能仍存在配置问题');
}

console.log('\n📋 修复历程总结:');
console.log('1. 🔧 识别问题: Capacitor配置覆盖了原生启动图');
console.log('2. 📱 复制文件: 将startup.png复制到所有密度文件夹');
console.log('3. ⚙️  更新配置: 修改Capacitor和Android配置');
console.log('4. 🎨 透明背景: 移除白色和紫色背景');
console.log('5. 📐 全屏显示: 使用MATRIX缩放和全屏模式');
console.log('6. 🔄 重新构建: 生成包含修复的新APK');

console.log('\n✅ 验证完成！');
