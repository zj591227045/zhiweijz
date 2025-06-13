# Android 正式版构建指南

## 前置条件

1. 确保已安装 Java 8 或更高版本
2. 确保已安装 Android SDK
3. 确保已配置 ANDROID_HOME 环境变量

## 签名配置

### 1. 密钥库文件
- 文件名: `zhiweijz-release-key.keystore`
- 别名: `zhiweijz`
- 有效期: 10000天

### 2. 配置文件
编辑 `keystore.properties` 文件，填入实际的密码信息：

```properties
storePassword=你的密钥库密码
keyPassword=你的密钥密码
keyAlias=zhiweijz
storeFile=zhiweijz-release-key.keystore
```

**⚠️ 重要提醒：**
- `keystore.properties` 和 `*.keystore` 文件已被添加到 `.gitignore`
- 请妥善保管这些文件，丢失后无法恢复
- 不要将密码信息提交到版本控制系统

## 构建步骤

### 方法一：使用构建脚本（推荐）

```bash
./build-release.sh
```

### 方法二：手动构建

```bash
# 清理之前的构建
./gradlew clean

# 构建正式版APK
./gradlew assembleRelease
```

## 输出文件

构建成功后，APK文件将生成在：
```
app/build/outputs/apk/release/app-release.apk
```

## 验证签名

```bash
# 验证APK签名
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk

# 查看APK详细信息
aapt dump badging app/build/outputs/apk/release/app-release.apk
```

## 版本管理

在 `app/build.gradle` 中更新版本信息：

```gradle
defaultConfig {
    versionCode 1      // 每次发布递增
    versionName "1.0"  // 语义化版本号
}
```

## 发布前检查清单

- [ ] 更新版本号
- [ ] 测试所有核心功能
- [ ] 验证签名配置
- [ ] 检查APK大小
- [ ] 验证权限配置
- [ ] 测试安装和卸载

## 常见问题

### 1. 签名验证失败
- 检查密钥库文件路径
- 确认密码正确
- 验证别名是否匹配

### 2. 构建失败
- 清理项目：`./gradlew clean`
- 检查 Android SDK 配置
- 确认 Java 版本兼容性

### 3. APK 无法安装
- 检查目标设备的 Android 版本
- 确认应用签名
- 验证权限配置 