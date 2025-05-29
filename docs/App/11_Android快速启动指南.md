# Android快速启动指南

## 环境要求

### 必需软件
- **Node.js**: 18.0.0 或更高版本
- **npm**: 随Node.js安装
- **Android Studio**: 最新版本
- **Android SDK**: API Level 21 (Android 5.0) 或更高
- **JDK**: 11 或更高版本

### 可选软件
- **React Native CLI**: `npm install -g @react-native-community/cli`
- **Android模拟器**: 或真实Android设备

## 项目结构说明

当前项目采用以下结构：
- `/c/Code/ZhiWeiJiZhangAndroid/`: 完整的React Native Android项目
- `/c/Code/zhiweijz/`: 原始项目代码库
- 后端服务运行在端口3000

## 快速启动

### 1. 启动后端服务

首先启动后端API服务：
```bash
cd /c/Code/zhiweijz/server
npm start
```

后端服务将在 `http://localhost:3000` 启动。

### 2. 进入Android项目目录

```bash
cd /c/Code/ZhiWeiJiZhangAndroid
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置Android环境

确保Android Studio已正确安装并配置：

1. 打开Android Studio
2. 安装Android SDK (API Level 21+)
3. 配置Android Virtual Device (AVD)
4. 确保环境变量正确设置：
   - `ANDROID_HOME`
   - `JAVA_HOME`

## APK构建方法

### 方法一：命令行构建

#### 构建Debug APK
```bash
cd /c/Code/ZhiWeiJiZhangAndroid/android
./gradlew assembleDebug
```

构建完成后，APK文件位置：
`/c/Code/ZhiWeiJiZhangAndroid/android/app/build/outputs/apk/debug/app-debug.apk`

#### 构建Release APK
```bash
cd /c/Code/ZhiWeiJiZhangAndroid/android
./gradlew assembleRelease
```

构建完成后，APK文件位置：
`/c/Code/ZhiWeiJiZhangAndroid/android/app/build/outputs/apk/release/app-release.apk`

### 方法二：Android Studio构建

1. 打开Android Studio
2. 选择 "Open an existing Android Studio project"
3. 导航到 `/c/Code/ZhiWeiJiZhangAndroid/android` 目录
4. 等待项目同步完成
5. 在菜单栏选择 `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`
6. 构建完成后，点击通知中的 "locate" 链接查看APK文件

## 运行和测试

### 启动Metro服务器

```bash
cd /c/Code/ZhiWeiJiZhangAndroid
npm start
```

### 在模拟器中运行

1. 启动Android模拟器：
   ```bash
   # 列出可用的AVD
   emulator -list-avds

   # 启动指定的AVD（替换AVD_NAME为实际名称）
   emulator -avd AVD_NAME
   ```

2. 运行应用：
   ```bash
   cd /c/Code/ZhiWeiJiZhangAndroid
   npx react-native run-android
   ```

### 在真实设备上运行

1. 启用开发者选项和USB调试
2. 连接设备到电脑
3. 验证设备连接：
   ```bash
   adb devices
   ```
4. 运行应用：
   ```bash
   cd /c/Code/ZhiWeiJiZhangAndroid
   npx react-native run-android
   ```

### 安装APK到设备

```bash
# 安装到连接的设备
adb install /c/Code/ZhiWeiJiZhangAndroid/android/app/build/outputs/apk/debug/app-debug.apk

# 或者安装到指定设备
adb -s DEVICE_ID install app-debug.apk
```

## 开发模式

### 热重载
React Native支持热重载，修改代码后会自动刷新应用。

### 调试
- **Chrome DevTools**: 在模拟器中按 `Ctrl+M` (Android)，选择 "Debug"
- **Flipper**: Facebook的移动应用调试工具
- **React Native Debugger**: 专门的React Native调试工具

### 日志查看
```bash
# Android日志
adb logcat

# React Native日志
npx react-native log-android
```

## 配置说明

### API配置
在 `/c/Code/ZhiWeiJiZhangAndroid/App.tsx` 中配置API地址：

```typescript
// 开发环境API地址
const DEV_API_BASE_URL = 'http://localhost:3000/api';

// 如果使用真实设备，需要使用电脑的IP地址
const DEV_API_BASE_URL = 'http://192.168.1.100:3000/api';
```

### 主题配置
在 `/c/Code/ZhiWeiJiZhangAndroid/theme.ts` 中自定义主题：

```typescript
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563eb', // 自定义主色调
    // 其他颜色配置...
  },
};
```

## 项目更新流程

### 从原项目同步代码

当原项目 `/c/Code/zhiweijz/` 有更新时，可以按以下步骤同步：

1. **更新核心逻辑**：
   ```bash
   # 复制更新的组件和逻辑
   cp -r /c/Code/zhiweijz/packages/mobile/src/* /c/Code/ZhiWeiJiZhangAndroid/src/
   ```

2. **更新依赖**：
   ```bash
   cd /c/Code/ZhiWeiJiZhangAndroid
   npm install
   ```

3. **重新构建**：
   ```bash
   cd /c/Code/ZhiWeiJiZhangAndroid/android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

## 常见问题

### 1. Metro服务器启动失败
```bash
# 清除Metro缓存
npx react-native start --reset-cache
```

### 2. Android构建失败
```bash
# 清理Android构建
cd android
./gradlew clean
cd ..
yarn android
```

### 3. 依赖安装问题
```bash
# 删除node_modules重新安装
rm -rf node_modules
yarn install
```

### 4. 模拟器连接问题
```bash
# 检查ADB连接
adb devices

# 重启ADB服务
adb kill-server
adb start-server
```

### 5. 网络请求失败
- 检查后端服务是否正常运行
- 确认API地址配置正确
- 如果使用真实设备，确保设备和电脑在同一网络

## 生产构建

### 1. 构建Release版本

```bash
# 生成签名密钥
keytool -genkeypair -v -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 构建Release APK
cd android
./gradlew assembleRelease
```

### 2. 安装Release版本

```bash
# 安装到设备
adb install app/build/outputs/apk/release/app-release.apk
```

## 性能优化

### 1. 启用Hermes引擎
在 `android/app/build.gradle` 中：

```gradle
project.ext.react = [
    enableHermes: true
]
```

### 2. 启用ProGuard
在 `android/app/build.gradle` 中：

```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

### 3. 图片优化
- 使用WebP格式图片
- 为不同密度提供对应的图片资源

## 下一步

1. **完善功能**: 根据开发计划继续实现交易管理、统计分析等功能
2. **测试**: 编写单元测试和集成测试
3. **优化**: 性能优化和用户体验改进
4. **发布**: 准备应用商店发布

## 技术支持

如果遇到问题，可以参考：
- [React Native官方文档](https://reactnative.dev/)
- [React Native Paper文档](https://reactnativepaper.com/)
- [React Navigation文档](https://reactnavigation.org/)
- 项目内的其他文档和代码注释
