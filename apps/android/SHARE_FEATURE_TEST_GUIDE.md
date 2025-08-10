# 分享图片识别功能测试指南

## 功能概述

实现了"系统截图后分享至只为记账App"的功能，用户可以通过以下流程进行图片识别记账：

1. 使用系统/机型手势截屏
2. 在分享面板中选择"只为记账"
3. App自动接收图片并进行OCR识别
4. 自动创建记账记录

## 构建和安装

### 1. 构建Web层
```bash
cd apps/web
npm run build:capacitor
```

### 2. 同步到Android
```bash
cd apps/android
npx cap sync
```

### 3. 构建Android APK
```bash
# 开发版本
./gradlew assembleDebug

# 或者正式版本（需要签名配置）
./build-release.sh
```

### 4. 安装APK
APK文件位置：`app/build/outputs/apk/debug/app-debug.apk`

**方法1：使用adb命令（如果已配置）**
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

**方法2：手动安装**
1. 将APK文件传输到Android设备
2. 在设备上启用"未知来源"安装
3. 点击APK文件进行安装

**方法3：通过Android Studio**
1. 连接Android设备或启动模拟器
2. 在Android Studio中点击Run按钮

## 测试步骤

### 准备工作
1. 确保设备已安装只为记账App
2. 确保App已登录并选择了账本
3. 确保设备网络连接正常

### 测试流程

#### 步骤1：截图
- 使用系统截图功能（通常是音量下键+电源键）
- 或使用手机厂商的手势截图功能
- 确保截图内容包含账单信息（如购物小票、转账记录等）

#### 步骤2：分享
- 截图完成后，点击"分享"按钮
- 在分享面板中找到"只为记账"应用
- 点击选择"只为记账"

#### 步骤3：自动识别
- App应该自动启动并显示"正在识别分享的图片..."提示
- 等待识别完成（通常需要几秒钟）
- 识别成功后会显示成功提示

#### 步骤4：验证结果
- 检查App中是否自动创建了新的记账记录
- 验证识别的内容是否准确
- 检查是否正确分类和金额

## 预期行为

### 成功场景
1. **分享选择**：在系统分享面板中能看到"只为记账"选项
2. **App启动**：选择后App正确启动并显示主界面
3. **识别提示**：显示"正在识别分享的图片..."提示
4. **识别成功**：显示"分享图片识别记账成功！"提示
5. **记录创建**：在记账列表中能看到新创建的记录

### 错误处理
1. **未登录**：提示用户先登录
2. **未选择账本**：提示用户先选择账本，并导航到账本选择页面
3. **识别失败**：显示具体错误信息
4. **网络错误**：显示网络相关错误提示

## 调试信息

### Android日志
```bash
# 查看App日志
adb logcat | grep "MainActivity\|ShareTargetPlugin"

# 查看分享Intent日志
adb logcat | grep "Intent.*ACTION_SEND"
```

### Web层日志
在Chrome DevTools中查看Console，关键日志标识：
- `📷 [Capacitor]` - Capacitor层处理
- `📷 [ShareImageHandler]` - Web层处理
- `🖼️ [ImageRecognition]` - 图片识别相关

### 常见问题

#### 1. 分享面板中没有"只为记账"选项
- 检查AndroidManifest.xml中的intent-filter配置
- 确认App已正确安装
- 重启设备后重试

#### 2. 选择后App没有响应
- 检查MainActivity中的handleSharedIntent方法
- 查看Android日志确认Intent是否正确接收

#### 3. 图片识别失败
- 检查网络连接
- 确认用户已登录且有足够的记账点
- 查看Web层日志确认API调用情况

#### 4. 识别成功但没有创建记录
- 检查账本选择状态
- 查看API响应确认记账是否成功
- 检查记账列表刷新状态

## 技术实现细节

### Android层
- `AndroidManifest.xml`: 添加了ACTION_SEND的intent-filter
- `MainActivity.java`: 处理分享Intent并传递给Web层
- `ShareTargetPlugin.java`: 自定义Capacitor插件处理图片数据

### Web层
- `capacitor-integration.ts`: 监听分享事件并处理图片数据转换
- `share-image-handler.tsx`: 处理图片识别和记账逻辑
- `providers.tsx`: 集成分享处理组件到应用中

### API调用
1. `/ai/smart-accounting/vision` - 图片识别API
2. `/ai/account/{accountBookId}/smart-accounting/direct` - 直接记账API

## 版本信息

- 实现版本：当前开发版本
- 支持平台：Android
- 依赖：Capacitor, 现有图片识别API

## 后续优化

1. 添加图片预览功能
2. 支持批量图片分享
3. 优化识别准确率
4. 添加用户反馈机制
