# Android构建指南

## 🚀 快速开始

### 1. 首次构建Android项目
```bash
npm run build:android
```
或
```bash
./scripts/build-android.sh
```

这将会：
- 构建Next.js静态文件
- 添加Android平台（如果不存在）
- 同步资源到Android项目
- 自动打开Android Studio

### 2. 直接运行Android应用
```bash
npm run run:android
```
或
```bash
./scripts/run-android.sh
```

这将会：
- 同步最新的web资源
- 在连接的设备或模拟器上直接运行应用

### 3. 生成APK文件
```bash
npm run build:apk
```
或
```bash
./scripts/build-apk.sh
```

这将会：
- 同步项目
- 构建debug版本APK
- 将APK复制到web目录

### 4. 清理构建文件
```bash
npm run clean:android
```
或
```bash
./scripts/clean-android.sh
```

这将会：
- 删除所有构建缓存和临时文件
- 清理不需要git跟踪的文件
- 为全新构建做准备

## 📱 Android Studio操作

### 运行应用
1. 确保模拟器已启动或设备已连接
2. 在Android Studio中点击 "Run" 按钮 (▶️)
3. 选择目标设备

### 生成APK
1. 在Android Studio中选择 `Build > Build Bundle(s)/APK(s) > Build APK(s)`
2. 等待构建完成
3. APK文件位置：`android/app/build/outputs/apk/debug/app-debug.apk`

### 生成签名APK（发布版本）
1. 选择 `Build > Generate Signed Bundle / APK`
2. 选择 `APK`
3. 配置或创建签名密钥
4. 选择 `release` 构建类型

## 🔧 故障排除

### 常见问题

1. **Gradle同步失败**
   ```bash
   cd android
   ./gradlew clean
   ```

2. **资源未更新**
   ```bash
   npx cap sync android
   ```

3. **模拟器无法启动**
   - 检查AVD Manager中的模拟器配置
   - 确保已启用虚拟化（VT-x/AMD-V）

4. **构建失败**
   - 检查Android SDK和build tools版本
   - 确保JAVA_HOME环境变量正确设置

### 环境要求
- Android Studio (已安装)
- Android SDK 
- Java JDK 11+
- 已配置的模拟器或连接的设备

## 📁 项目结构
```
apps/
├── web/              # Next.js Web应用
│   ├── scripts/      # 构建脚本
│   ├── out/          # Next.js构建输出
│   └── app-debug.apk # 生成的APK文件
├── android/          # Android原生项目
│   ├── app/          # Android应用代码
│   ├── build/        # 构建输出（git忽略）
│   └── .gradle/      # Gradle缓存（git忽略）
└── ios/              # iOS原生项目
``` 