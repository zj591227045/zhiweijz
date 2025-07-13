@echo off
REM Capacitor配置同步脚本 (Windows版本)
REM 用于将更新的capacitor.config.ts同步到Android和iOS项目

echo 🔄 开始同步Capacitor配置...

REM 检查是否在正确的目录
if not exist "capacitor.config.ts" (
    echo ❌ 错误：请在apps/web目录下运行此脚本
    exit /b 1
)

REM 检查npm是否可用
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误：npm命令不可用，请确保已安装Node.js
    exit /b 1
)

echo 📱 同步Android配置...
if exist "..\android" (
    npx cap sync android
    if %errorlevel% equ 0 (
        echo ✅ Android配置同步成功
    ) else (
        echo ❌ Android配置同步失败
        exit /b 1
    )
) else (
    echo ⚠️ Android项目目录不存在，跳过Android同步
)

echo 🍎 同步iOS配置...
if exist "..\ios" (
    npx cap sync ios
    if %errorlevel% equ 0 (
        echo ✅ iOS配置同步成功
    ) else (
        echo ❌ iOS配置同步失败
        exit /b 1
    )
) else (
    echo ⚠️ iOS项目目录不存在，跳过iOS同步
)

echo 🎉 Capacitor配置同步完成！
echo.
echo 📋 接下来的步骤：
echo 1. 重新构建应用：npm run build
echo 2. 在移动设备上测试缩放功能
echo 3. 访问 /test-viewport 页面进行详细测试
echo.
echo 🔍 测试方法：
echo - 在移动设备上尝试双指缩放页面
echo - 尝试双击页面进行缩放
echo - 如果页面无法缩放，说明配置成功

pause
