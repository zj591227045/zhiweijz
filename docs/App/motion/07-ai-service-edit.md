# AI服务编辑页全屏模态框迁移方案

## 📋 **页面分析**

**当前路径**: `/settings/ai-services/edit/[id]`  
**文件位置**: `apps/web/src/app/settings/ai-services/edit/[id]/page.tsx`

### **当前功能**
- ✅ 编辑AI服务基本信息（名称、描述）
- ✅ API配置设置（API Key、Base URL）
- ✅ 服务类型选择
- ✅ 连接测试功能
- ✅ 启用/禁用状态切换

### **当前组件结构**
```tsx
<PageContainer title="编辑AI服务" showBackButton>
  <ServiceForm />          // 服务表单
  <ApiConfiguration />     // API配置
  <ConnectionTest />       // 连接测试
  <StatusToggle />         // 状态切换
</PageContainer>
```

## 🎯 **迁移目标**

### **预期效果**
1. 🎨 **全屏模态框** - 从AI服务设置页面弹出
2. 📱 **iOS 风格表单** - 分组卡片布局
3. 🔐 **安全输入** - API Key 密码输入
4. 🧪 **连接测试** - 实时测试反馈
5. 🔄 **状态切换** - iOS 风格开关

### **设计改进**
- 分组表单设计
- 安全信息输入
- 测试状态反馈
- 开关组件优化

## 🏗️ **实现方案**

### **1. 创建模态框组件**
```tsx
// apps/web/src/components/ai-service-edit-modal.tsx
interface AiServiceEditModalProps {
  serviceId: string | null;
  onClose: () => void;
  onSave: () => void;
}
```

### **2. API配置表单**
```tsx
<div className="api-config-section">
  <h3>API配置</h3>
  <div className="form-group">
    <label>API Key</label>
    <input 
      type="password" 
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
      placeholder="输入API Key"
    />
  </div>
  <div className="form-group">
    <label>Base URL</label>
    <input 
      type="url" 
      value={baseUrl}
      onChange={(e) => setBaseUrl(e.target.value)}
      placeholder="输入API Base URL"
    />
  </div>
</div>
```

### **3. 连接测试**
```tsx
<div className="connection-test">
  <button 
    onClick={handleTestConnection}
    disabled={isTestingConnection}
    className="test-button"
  >
    {isTestingConnection ? '测试中...' : '测试连接'}
  </button>
  {testResult && (
    <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
      {testResult.message}
    </div>
  )}
</div>
```

## 💻 **AI IDE 提示词**

```
请帮我创建AI服务编辑页的全屏模态框组件，要求：

1. **创建模态框组件** `apps/web/src/components/ai-service-edit-modal.tsx`：
   - 全屏覆盖，zIndex: 9999
   - 自动隐藏页面头部和底部导航
   - 显示专用头部：返回按钮 + "编辑AI服务" + 空白区域

2. **基本信息表单**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>基本信息</h3>
     <div style={{ marginBottom: '16px' }}>
       <label style={{
         display: 'block',
         fontSize: '14px',
         fontWeight: '500',
         color: 'var(--text-secondary)',
         marginBottom: '8px'
       }}>服务名称</label>
       <input
         type="text"
         placeholder="输入服务名称"
         value={name}
         onChange={(e) => setName(e.target.value)}
         style={{
           width: '100%',
           border: 'none',
           outline: 'none',
           backgroundColor: 'transparent',
           fontSize: '16px',
           color: 'var(--text-color)'
         }}
       />
     </div>
     <div>
       <label style={{
         display: 'block',
         fontSize: '14px',
         fontWeight: '500',
         color: 'var(--text-secondary)',
         marginBottom: '8px'
       }}>服务描述</label>
       <textarea
         placeholder="输入服务描述（可选）"
         value={description}
         onChange={(e) => setDescription(e.target.value)}
         rows={3}
         style={{
           width: '100%',
           border: 'none',
           outline: 'none',
           backgroundColor: 'transparent',
           fontSize: '16px',
           color: 'var(--text-color)',
           resize: 'none'
         }}
       />
     </div>
   </div>
   ```

3. **API配置表单**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>API配置</h3>
     <div style={{ marginBottom: '16px' }}>
       <label style={{
         display: 'block',
         fontSize: '14px',
         fontWeight: '500',
         color: 'var(--text-secondary)',
         marginBottom: '8px'
       }}>API Key</label>
       <div style={{ position: 'relative' }}>
         <input
           type={showApiKey ? 'text' : 'password'}
           placeholder="输入API Key"
           value={apiKey}
           onChange={(e) => setApiKey(e.target.value)}
           style={{
             width: '100%',
             border: 'none',
             outline: 'none',
             backgroundColor: 'transparent',
             fontSize: '16px',
             color: 'var(--text-color)',
             paddingRight: '40px'
           }}
         />
         <button
           type="button"
           onClick={() => setShowApiKey(!showApiKey)}
           style={{
             position: 'absolute',
             right: '8px',
             top: '50%',
             transform: 'translateY(-50%)',
             background: 'none',
             border: 'none',
             color: 'var(--text-secondary)',
             cursor: 'pointer'
           }}
         >
           <i className={`fas fa-${showApiKey ? 'eye-slash' : 'eye'}`}></i>
         </button>
       </div>
     </div>
     <div>
       <label style={{
         display: 'block',
         fontSize: '14px',
         fontWeight: '500',
         color: 'var(--text-secondary)',
         marginBottom: '8px'
       }}>Base URL</label>
       <input
         type="url"
         placeholder="输入API Base URL"
         value={baseUrl}
         onChange={(e) => setBaseUrl(e.target.value)}
         style={{
           width: '100%',
           border: 'none',
           outline: 'none',
           backgroundColor: 'transparent',
           fontSize: '16px',
           color: 'var(--text-color)'
         }}
       />
     </div>
   </div>
   ```

4. **连接测试区域**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>连接测试</h3>
     <button
       onClick={handleTestConnection}
       disabled={isTestingConnection || !apiKey.trim() || !baseUrl.trim()}
       style={{
         width: '100%',
         height: '40px',
         borderRadius: '8px',
         border: '1px solid var(--border-color)',
         backgroundColor: 'var(--background-secondary)',
         color: 'var(--text-color)',
         fontSize: '14px',
         fontWeight: '500',
         cursor: isTestingConnection || !apiKey.trim() || !baseUrl.trim() ? 'not-allowed' : 'pointer',
         opacity: isTestingConnection || !apiKey.trim() || !baseUrl.trim() ? 0.6 : 1,
         marginBottom: '12px'
       }}
     >
       {isTestingConnection ? (
         <>
           <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
           测试中...
         </>
       ) : (
         <>
           <i className="fas fa-plug" style={{ marginRight: '8px' }}></i>
           测试连接
         </>
       )}
     </button>
     
     {testResult && (
       <div style={{
         padding: '12px',
         borderRadius: '8px',
         backgroundColor: testResult.success ? '#d1fae5' : '#fee2e2',
         border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
         color: testResult.success ? '#065f46' : '#dc2626',
         fontSize: '14px',
         display: 'flex',
         alignItems: 'center',
         gap: '8px'
       }}>
         <i className={`fas fa-${testResult.success ? 'check-circle' : 'exclamation-circle'}`}></i>
         {testResult.message}
       </div>
     )}
   </div>
   ```

5. **服务状态开关**：
   ```tsx
   <div style={{
     backgroundColor: 'var(--background-color)',
     border: '1px solid var(--border-color)',
     borderRadius: '12px',
     padding: '16px',
     marginBottom: '20px'
   }}>
     <div style={{
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'space-between'
     }}>
       <div>
         <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>启用服务</div>
         <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
           启用后可在账本中使用此AI服务
         </div>
       </div>
       <label style={{
         position: 'relative',
         display: 'inline-block',
         width: '48px',
         height: '28px'
       }}>
         <input
           type="checkbox"
           checked={isEnabled}
           onChange={(e) => setIsEnabled(e.target.checked)}
           style={{ opacity: 0, width: 0, height: 0 }}
         />
         <span style={{
           position: 'absolute',
           cursor: 'pointer',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           backgroundColor: isEnabled ? 'var(--primary-color)' : '#ccc',
           borderRadius: '28px',
           transition: '0.4s'
         }}>
           <span style={{
             position: 'absolute',
             content: '',
             height: '20px',
             width: '20px',
             left: isEnabled ? '24px' : '4px',
             bottom: '4px',
             backgroundColor: 'white',
             borderRadius: '50%',
             transition: '0.4s'
           }}></span>
         </span>
       </label>
     </div>
   </div>
   ```

6. **底部保存按钮**：
   ```tsx
   <div style={{
     position: 'fixed',
     bottom: '20px',
     left: '20px',
     right: '20px',
     zIndex: 10001
   }}>
     <button
       onClick={handleSave}
       disabled={isSubmitting || !name.trim() || !apiKey.trim() || !baseUrl.trim()}
       style={{
         width: '100%',
         height: '48px',
         borderRadius: '12px',
         backgroundColor: 'var(--primary-color)',
         color: 'white',
         fontSize: '16px',
         fontWeight: '600',
         border: 'none',
         cursor: 'pointer',
         opacity: isSubmitting || !name.trim() || !apiKey.trim() || !baseUrl.trim() ? 0.6 : 1
       }}
     >
       {isSubmitting ? '保存中...' : '保存'}
     </button>
   </div>
   ```

7. **连接测试逻辑**：
   ```tsx
   const handleTestConnection = async () => {
     setIsTestingConnection(true);
     setTestResult(null);
     
     try {
       const response = await fetch('/api/ai-services/test', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ apiKey, baseUrl })
       });
       
       const result = await response.json();
       setTestResult({
         success: response.ok,
         message: result.message || (response.ok ? '连接成功' : '连接失败')
       });
     } catch (error) {
       setTestResult({
         success: false,
         message: '连接测试失败，请检查网络连接'
       });
     } finally {
       setIsTestingConnection(false);
     }
   };
   ```

8. **数据获取和保存**：
   - 通过 serviceId 调用 fetchAiService API
   - 表单验证：名称、API Key、Base URL 必填
   - 保存时调用 updateAiService API
   - 成功后显示 toast 并触发 onSave 回调

请参考 `apps/web/src/components/transaction-edit-modal.tsx` 的实现模式，确保：
- 完整的样式迁移
- 真实数据加载和保存
- iOS 设计规范
- 表单验证和错误处理
- 安全的API Key处理
- 流畅的用户体验
```

## ✅ **验证清单**

### **功能验证**
- [ ] 从AI服务设置页面点击编辑弹出模态框
- [ ] 正确加载AI服务数据到表单
- [ ] 服务名称和描述输入正常
- [ ] API Key 密码输入和显示切换正常
- [ ] Base URL 输入正常
- [ ] 连接测试功能正常工作
- [ ] 服务状态开关正常
- [ ] 表单验证正确执行
- [ ] 保存功能正常工作

### **UI/UX 验证**
- [ ] 全屏模态框正确覆盖
- [ ] 分组表单布局清晰
- [ ] API Key 输入安全性良好
- [ ] 连接测试状态反馈清晰
- [ ] iOS 风格开关美观
- [ ] 底部保存按钮固定显示

### **数据验证**
- [ ] API 数据正确加载
- [ ] 表单数据正确提交
- [ ] 连接测试结果准确
- [ ] 加载和保存状态显示
- [ ] 错误处理友好提示

### **安全验证**
- [ ] API Key 默认隐藏显示
- [ ] 敏感信息不在控制台泄露
- [ ] 表单数据安全传输

### **交互验证**
- [ ] 所有操作有视觉反馈
- [ ] 动画过渡自然流畅
- [ ] 触摸目标大小合适
- [ ] 键盘交互体验良好

## 🔗 **相关文件**

- `apps/web/src/app/settings/ai-services/edit/[id]/page.tsx` - 原始组件
- `apps/web/src/app/settings/ai-services/page.tsx` - 集成位置
- `apps/web/src/store/ai-service-store.ts` - 数据管理
- `apps/web/src/components/transaction-edit-modal.tsx` - 参考实现
