#!/bin/bash
# Android中文输入法测试脚本

set -e

echo "🧪 Android中文输入法兼容性测试"
echo "================================"

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在web应用根目录运行此脚本"
    exit 1
fi

echo "📋 测试步骤："
echo "1. 构建移动端版本"
echo "2. 同步到Android项目"
echo "3. 生成测试APK"
echo "4. 提供测试指南"
echo ""

# 1. 构建移动端版本
echo "🏗️ 构建移动端版本..."
if BUILD_MODE=mobile NEXT_PUBLIC_IS_MOBILE=true npm run build:mobile; then
    echo "✅ 移动端构建成功"
else
    echo "❌ 移动端构建失败"
    exit 1
fi

# 2. 同步到Android项目
echo "🔄 同步到Android项目..."
if npx cap sync android; then
    echo "✅ Android同步成功"
else
    echo "❌ Android同步失败"
    exit 1
fi

# 3. 进入Android目录并构建APK
echo "📱 构建测试APK..."
cd ../android

# 修改应用名称为测试版本
echo "🔧 设置测试版本标识..."
sed -i.backup 's/<string name="app_name">只为记账<\/string>/<string name="app_name">只为记账-输入法测试<\/string>/' app/src/main/res/values/strings.xml

# 构建调试版APK
echo "🏗️ 构建调试APK..."
if ./gradlew assembleDebug; then
    echo "✅ APK构建成功"
else
    echo "❌ APK构建失败"
    # 恢复原始文件
    mv app/src/main/res/values/strings.xml.backup app/src/main/res/values/strings.xml
    exit 1
fi

# 恢复原始文件
mv app/src/main/res/values/strings.xml.backup app/src/main/res/values/strings.xml

# 复制APK到web目录
cp app/build/outputs/apk/debug/app-debug.apk ../web/tag-input-test.apk

echo ""
echo "🎉 测试APK生成完成！"
echo "📱 APK文件: tag-input-test.apk"
echo "🏷️  应用名称: 只为记账-输入法测试"
echo ""

echo "📋 测试指南："
echo "============"
echo ""
echo "1. 安装测试APK："
echo "   adb install tag-input-test.apk"
echo ""
echo "2. 打开应用并导航到测试页面："
echo "   - 登录应用"
echo "   - 访问 /test/tag-input 页面"
echo "   - 或在新建/编辑记账页面测试标签输入"
echo ""
echo "3. 测试中文输入法："
echo "   - 切换到中文输入法（如搜狗、百度、讯飞等）"
echo "   - 在标签搜索框中输入中文字符"
echo "   - 观察是否显示'创建新标签'提示"
echo ""
echo "4. 测试场景："
echo "   ✅ 输入'家庭' - 应显示创建提示"
echo "   ✅ 输入'工作' - 应显示创建提示"
echo "   ✅ 输入'home' - 应显示创建提示"
echo "   ✅ 输入已存在标签名 - 不应显示创建提示"
echo "   ✅ 输入法切换过程 - 不应出现异常"
echo ""
echo "5. 问题排查："
echo "   - 如果仍有问题，请检查浏览器控制台日志"
echo "   - 可以通过Chrome DevTools远程调试Android WebView"
echo "   - 启用方法: chrome://inspect/#devices"
echo ""
echo "6. 对比测试："
echo "   - 在Chrome浏览器中访问相同页面进行对比"
echo "   - 确认问题是否仅在Android WebView中出现"
echo ""

echo "🔧 如需重新测试，请运行："
echo "   ./scripts/test-android-input.sh"
echo ""
echo "📞 如有问题，请提供以下信息："
echo "   - Android版本"
echo "   - 输入法类型和版本"
echo "   - 具体的输入内容和预期行为"
echo "   - 实际观察到的行为"
echo "   - 浏览器控制台错误信息（如有）"
