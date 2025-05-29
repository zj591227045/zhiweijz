# Android快速启动指南

## 环境要求

### 必需软件
- **Node.js**: 18.0.0 或更高版本
- **Yarn**: 1.22.0 或更高版本
- **Android Studio**: 最新版本
- **Android SDK**: API Level 21 (Android 5.0) 或更高
- **JDK**: 11 或更高版本

### 可选软件
- **React Native CLI**: `npm install -g react-native-cli`
- **Android模拟器**: 或真实Android设备

## 快速启动

### 1. 安装依赖

```bash
# 在项目根目录安装所有依赖
yarn install

# 安装移动端特定依赖
cd packages/mobile
yarn install

# 安装Android应用依赖
cd ../../apps/android
yarn install
```

### 2. 构建核心包

```bash
# 返回项目根目录
cd ../..

# 构建核心包
cd packages/core
yarn build

# 构建移动端包
cd ../mobile
yarn build
```

### 3. 启动后端服务

```bash
# 返回项目根目录并启动后端
cd ../..
cd server
yarn dev
```

后端服务将在 `http://localhost:3001` 启动。

### 4. 配置Android环境

#### 4.1 设置环境变量

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### 4.2 创建Android项目

```bash
cd apps/android

# 初始化React Native项目
npx react-native init ZhiWeiJiZhangAndroid --template react-native-template-typescript

# 复制我们的源代码到新项目
cp -r src/* ZhiWeiJiZhangAndroid/
cp index.js ZhiWeiJiZhangAndroid/
cp app.json ZhiWeiJiZhangAndroid/
cp package.json ZhiWeiJiZhangAndroid/

# 进入项目目录
cd ZhiWeiJiZhangAndroid

# 安装依赖
yarn install
```

### 5. 启动Android应用

#### 5.1 启动Metro服务器

```bash
# 在Android项目目录中
yarn start
```

#### 5.2 运行Android应用

```bash
# 在另一个终端窗口中
yarn android
```

## 开发模式

### 热重载
React Native支持热重载，修改代码后会自动刷新应用。

### 调试
- **Chrome DevTools**: 在模拟器中按 `Cmd+M` (iOS) 或 `Ctrl+M` (Android)，选择 "Debug"
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
在 `packages/mobile/src/api/config.ts` 中配置API地址：

```typescript
// 开发环境API地址
const DEV_API_BASE_URL = 'http://localhost:3001/api';

// 如果使用真实设备，需要使用电脑的IP地址
const DEV_API_BASE_URL = 'http://192.168.1.100:3001/api';
```

### 主题配置
在 `apps/android/src/theme.ts` 中自定义主题：

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
