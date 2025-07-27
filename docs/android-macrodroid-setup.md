# Android MacroDroid 自动截图记账配置指南

本指南将详细介绍如何在Android设备上使用MacroDroid应用配置自动截图记账功能，实现与iOS快捷指令相同的体验。

## 前置要求

### 系统要求
- Android 7.0 或更高版本
- 至少2GB可用存储空间
- 稳定的网络连接

### 必需应用
1. **MacroDroid** - Android自动化应用
   - [Google Play Store下载](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid)
   - 免费版本即可满足需求

2. **只为记账App** - 已安装并完成登录
   - 确保已创建至少一个账本
   - 确保网络连接正常

## 配置步骤

### 第一步：获取配置信息

1. 在只为记账App中，访问快捷指令设置页面
2. 切换到"Android MacroDroid"标签页
3. 点击"获取MacroDroid配置信息"按钮
4. 复制显示的配置信息，包括：
   - Token（认证令牌）
   - 上传URL
   - HTTP请求参数

### 第二步：安装和设置MacroDroid

1. **下载安装MacroDroid**
   ```
   从Google Play Store搜索"MacroDroid"并安装
   ```

2. **授予必要权限**
   - 打开MacroDroid应用
   - 按照提示授予以下权限：
     - 设备管理员权限
     - 无障碍服务权限
     - 存储权限
     - 网络权限

3. **创建新的Macro**
   - 点击右下角的"+"按钮
   - 选择"Add Macro"

### 第三步：配置触发器（Trigger）

1. **选择触发器类型**
   - 点击"Triggers"
   - 推荐选择以下触发器之一：
     - **Quick Settings Tile** - 快速设置磁贴
     - **Gesture** - 手势触发
     - **Button** - 音量键组合
     - **Notification Button** - 通知栏按钮

2. **配置Quick Settings Tile（推荐）**
   ```
   Trigger: Quick Settings Tile
   Name: 截图记账
   Icon: 选择合适的图标
   ```

3. **配置手势触发（备选）**
   ```
   Trigger: Gesture
   Gesture Type: Shake Device（摇晃设备）
   Sensitivity: Medium
   ```

### 第四步：配置动作（Actions）

#### 动作1：截取屏幕截图

1. **添加截图动作**
   ```
   Action: Take Screenshot
   File Name: screenshot_[timestamp]
   Format: PNG
   Quality: High
   Location: /sdcard/MacroDroid/Screenshots/
   ```

2. **设置变量**
   ```
   Action: Set Variable
   Variable Name: screenshot_path
   Value: [screenshot_file_path]
   ```

#### 动作2：HTTP请求上传

1. **添加HTTP Request动作**
   ```
   Action: HTTP Request
   Method: POST
   URL: [从配置信息中复制的上传URL]
   Content Type: multipart/form-data
   ```

2. **配置请求头部**
   ```
   Headers:
   Authorization: [从配置信息中复制的Authorization值]
   Content-Type: multipart/form-data
   ```

3. **配置请求体**
   ```
   Body Type: Form Data
   
   Form Fields:
   - Field Name: image
   - Field Type: File
   - File Path: [screenshot_path]
   
   - Field Name: accountBookId (可选)
   - Field Type: Text
   - Value: [留空使用默认账本]
   ```

#### 动作3：处理响应结果

1. **显示成功通知**
   ```
   Action: Notification
   Title: 截图记账
   Text: 正在处理截图...
   Icon: 选择合适图标
   ```

2. **解析响应（可选）**
   ```
   Action: Set Variable
   Variable Name: response_result
   Value: [http_response]
   ```

### 第五步：测试配置

1. **保存Macro**
   - 为Macro命名："截图记账"
   - 点击保存

2. **测试运行**
   - 打开一个包含支付信息的页面
   - 触发配置的触发器
   - 观察是否成功截图并上传

3. **检查结果**
   - 查看只为记账App中是否出现新的记账记录
   - 检查MacroDroid的日志是否有错误

## 高级配置

### 自动重试机制

```
Action: If/Then/Else
Condition: HTTP Response Code != 200
Then Actions:
  - Wait 2 seconds
  - Retry HTTP Request (最多3次)
Else Actions:
  - Show success notification
```

### 错误处理

```
Action: If/Then/Else
Condition: HTTP Response contains "error"
Then Actions:
  - Notification: "记账失败，请检查网络连接"
  - Log Error to file
```

### 批量处理

```
Action: For Each Loop
Items: All screenshots in folder
Actions:
  - Upload each screenshot
  - Delete after successful upload
```

## 故障排除

### 常见问题

1. **截图失败**
   - 检查MacroDroid是否有截图权限
   - 确认存储路径可写
   - 重启MacroDroid服务

2. **上传失败**
   - 检查网络连接
   - 验证Token是否过期
   - 确认URL配置正确

3. **记账不准确**
   - 确保截图清晰
   - 检查图片中是否包含完整的支付信息
   - 尝试不同的截图时机

### 调试方法

1. **启用详细日志**
   ```
   MacroDroid Settings → Logging → Enable Verbose Logging
   ```

2. **查看HTTP响应**
   ```
   Action: Flash Text
   Text: [http_response]
   Duration: Long
   ```

3. **保存调试信息**
   ```
   Action: Write to File
   File: /sdcard/MacroDroid/debug.log
   Content: [timestamp] - [http_response]
   ```

## 性能优化

### 减少电池消耗
- 使用Quick Settings Tile而非持续监听的触发器
- 设置合理的截图质量（不需要过高）
- 及时清理临时截图文件

### 提高识别准确率
- 确保截图包含完整的支付信息
- 避免在弱光环境下截图
- 等待页面完全加载后再截图

## 安全注意事项

1. **Token安全**
   - 定期更新Token
   - 不要分享Token给他人
   - 如发现异常使用立即重新生成

2. **隐私保护**
   - 截图文件会临时存储在设备上
   - 建议定期清理截图缓存
   - 确保设备锁屏密码安全

3. **网络安全**
   - 仅在可信网络环境下使用
   - 避免在公共WiFi下进行敏感操作

## 更新维护

### Token更新
- Token有效期为24小时
- 过期前会收到提醒通知
- 重新获取配置信息并更新MacroDroid设置

### 功能更新
- 关注只为记账App的更新通知
- 及时更新MacroDroid应用
- 根据新版本调整配置参数

---

如有问题，请联系技术支持或查看在线帮助文档。
