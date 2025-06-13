#!/bin/bash

# 只为记账 Android 正式版构建脚本
echo "开始构建只为记账 Android 正式版..."

# 显示当前版本信息
echo ""
echo "📋 当前版本信息:"
VERSION_CODE=$(grep -o 'versionCode [0-9]*' app/build.gradle | grep -o '[0-9]*')
VERSION_NAME=$(grep -o 'versionName "[^"]*"' app/build.gradle | grep -o '"[^"]*"' | tr -d '"')
echo "📱 Android versionCode: $VERSION_CODE"
echo "📱 Android versionName: $VERSION_NAME"
echo ""

# 检查签名配置文件是否存在
if [ ! -f "keystore.properties" ]; then
    echo "错误: keystore.properties 文件不存在！"
    echo "请先配置签名信息。"
    exit 1
fi

# 检查密钥库文件是否存在
if [ ! -f "zhiweijz-release-key.keystore" ]; then
    echo "错误: zhiweijz-release-key.keystore 文件不存在！"
    echo "请先生成签名密钥库。"
    exit 1
fi

# 清理之前的构建
echo "清理之前的构建..."
./gradlew clean

# 构建正式版APK
echo "构建正式版APK..."
./gradlew assembleRelease

# 检查构建结果
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ 构建成功！"
    echo "APK文件位置: app/build/outputs/apk/release/app-release.apk"
    
    # 显示APK信息
    echo ""
    echo "APK信息:"
    ls -lh app/build/outputs/apk/release/app-release.apk
    
    # 验证签名
    echo ""
    echo "验证APK签名..."
    jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
else
    echo "❌ 构建失败！"
    exit 1
fi 