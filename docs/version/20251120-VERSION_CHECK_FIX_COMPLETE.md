# 版本检测重复提示问题 - 完整修复方案

## 问题描述

当前前端的版本检测功能存在问题：
- 管理端发布了 0.9.0 版本
- 客户端从 0.8.0 更新到 0.9.0 后
- 每次运行前端仍然弹出版本更新提示
- 除非用户选择"跳过该版本"

## 根本原因分析

### ⚠️ 主要原因：BuildNumber 配置错误

**错误的环境变量配置：**
```env
NEXT_PUBLIC_APP_VERSION=0.9.0
NEXT_PUBLIC_BUILD_NUMBER=90  # ❌ 错误：应该是 900
```

**数据库中的版本记录：**
```
version: 0.9.0
versionCode: 900
buildNumber: 900
```

**问题分析：**
- 版本比较逻辑：`latestVersion.versionCode > currentBuildNumber`
- 实际比较：`900 > 90 = true`
- 结果：系统认为需要更新，即使版本号相同

**BuildNumber 规范：**
对于版本 `0.x.y`，buildNumber = `x * 100 + y`
- `0.9.0` → `900`
- `0.8.0` → `800`
- `0.7.2` → `702`

详见：[版本号规范说明](./VERSION_NUMBER_SPECIFICATION.md)

### 次要原因：前端缓存未清理

在 `apps/web/src/lib/services/versionCheckService.ts` 中：
- localStorage 存储用户跳过/推迟的版本记录
- 更新后旧版本记录未清理
- 可能导致误判

### 次要原因：后端状态未清理

在 `server/src/services/version.service.ts` 中：
- 数据库中的用户版本状态记录未清理
- 可能导致状态不一致

## 完整修复方案

### 1. 修正 BuildNumber 配置（必须）✅

**修改文件：** `apps/web/.env.local`

```env
# 修改前
NEXT_PUBLIC_APP_VERSION=0.9.0
NEXT_PUBLIC_BUILD_NUMBER=90  # ❌

# 修改后
NEXT_PUBLIC_APP_VERSION=0.9.0
NEXT_PUBLIC_BUILD_NUMBER=900  # ✅
```

### 2. 添加前端缓存清理逻辑 ✅

**修改文件：** `apps/web/src/lib/services/versionCheckService.ts`

添加 `cleanupOldVersionRecords()` 方法：

```typescript
/**
 * 清理当前版本及更低版本的跳过和推迟记录
 */
private cleanupOldVersionRecords(currentVersion: string): void {
  const data = this.getVersionCheckData();
  let hasChanges = false;

  // 清理跳过列表
  const filteredSkippedVersions = data.skippedVersions.filter((skippedVersion) => {
    const comparison = this.compareVersions(currentVersion, skippedVersion);
    return comparison < 0; // 只保留大于当前版本的记录
  });

  if (filteredSkippedVersions.length !== data.skippedVersions.length) {
    data.skippedVersions = filteredSkippedVersions;
    hasChanges = true;
  }

  // 清理推迟记录
  if (data.postponedVersion) {
    const comparison = this.compareVersions(currentVersion, data.postponedVersion);
    if (comparison >= 0) {
      delete data.postponedVersion;
      delete data.postponedUntil;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    this.saveVersionCheckData(data);
  }
}
```

在 `checkVersion()` 中调用：

```typescript
async checkVersion(): Promise<VersionCheckResult> {
  // ... 获取版本信息 ...
  
  // 清理旧版本记录
  this.cleanupOldVersionRecords(version);
  
  // ... 继续版本检查 ...
}
```

### 3. 改进后端版本比较逻辑 ✅

**修改文件：** `server/src/services/version.service.ts`

添加版本字符串比较方法：

```typescript
// 比较版本号字符串
private compareVersionStrings(current: string, latest: string): number {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < maxLength; i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
}
```

改进版本检查逻辑：

```typescript
// 比较版本 - 优先使用 buildNumber
let hasUpdate = false;
if (data.currentBuildNumber !== undefined) {
  hasUpdate = latestVersion.versionCode > data.currentBuildNumber;
} else if (data.currentVersion) {
  hasUpdate = this.compareVersionStrings(data.currentVersion, latestVersion.version) < 0;
} else {
  hasUpdate = true;
}

// 如果已是最新版本，清理用户状态记录
if (!hasUpdate && userId) {
  await this.cleanupUserVersionStatus(userId, data.platform, latestVersion.id);
}
```

添加清理方法：

```typescript
// 清理用户版本状态
private async cleanupUserVersionStatus(
  userId: string,
  platform: 'web' | 'ios' | 'android',
  appVersionId: string
): Promise<void> {
  try {
    await prisma.userVersionStatus.deleteMany({
      where: { userId, platform: platform.toUpperCase() as any, appVersionId }
    });
  } catch (error) {
    console.error('清理用户版本状态失败:', error);
  }
}
```

## 验证步骤

### 1. 验证配置

```bash
# 检查环境变量
cat apps/web/.env.local | grep BUILD_NUMBER

# 应该输出：NEXT_PUBLIC_BUILD_NUMBER=900
```

### 2. 验证数据库

```bash
# 检查数据库版本记录
node server/scripts/check-web-versions.js
```

预期输出：
```
版本: 0.9.0
  versionCode: 900
  buildNumber: 900
```

### 3. 测试版本检查逻辑

```bash
# 运行测试脚本
node server/scripts/test-version-check-logic.js
```

预期所有测试通过：
```
✅ 旧版本应该提示更新
✅ 相同版本不应该提示更新
✅ buildNumber错误应该提示更新
✅ 更高版本不应该提示更新
```

### 4. 清理浏览器缓存

```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

### 5. 重启应用测试

```bash
# 重启开发服务器
npm run dev
```

访问应用，验证：
- ✅ 当前版本 0.9.0 不再弹出更新提示
- ✅ 如果发布 1.0.0，应该正常提示更新

## 预防措施

### 1. 使用版本同步脚本

**不要手动修改版本号**，始终使用同步脚本：

```bash
# 编辑 scripts/sync-version.js
const VERSION = '0.9.0';
const BUILD_NUMBER = '900';  # 确保匹配

# 运行同步
node scripts/sync-version.js

# 同步数据库
cd server && node scripts/create-current-version.js
```

### 2. 添加版本验证

在 CI/CD 流程中添加验证：

```bash
# 验证 buildNumber 是否匹配版本号
node scripts/validate-version.js
```

### 3. 文档化版本规范

参考：[版本号规范说明](./VERSION_NUMBER_SPECIFICATION.md)

## 相关文件

### 修改的文件
- ✅ `apps/web/.env.local` - 修正 buildNumber
- ✅ `apps/web/src/lib/services/versionCheckService.ts` - 添加缓存清理
- ✅ `server/src/services/version.service.ts` - 改进版本比较

### 新增的文件
- ✅ `docs/version/VERSION_NUMBER_SPECIFICATION.md` - 版本号规范
- ✅ `docs/version/VERSION_CHECK_FIX_COMPLETE.md` - 本文档
- ✅ `server/scripts/check-web-versions.js` - 版本检查脚本
- ✅ `server/scripts/test-version-check-logic.js` - 测试脚本

## 总结

问题的根本原因是 **BuildNumber 配置错误**（90 vs 900），导致版本比较逻辑认为需要更新。

修复后的效果：
1. ✅ 版本号和 buildNumber 正确对应
2. ✅ 前端自动清理旧版本缓存
3. ✅ 后端自动清理用户状态记录
4. ✅ 版本检查逻辑更加健壮

**重要提醒：** 以后更新版本时，务必确保 buildNumber 与版本号匹配！
