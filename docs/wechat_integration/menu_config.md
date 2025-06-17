# 微信公众号自定义菜单配置指南

本文档详细说明如何配置微信公众号的自定义菜单，以支持只为记账账号绑定和账本选择功能。

## 菜单结构设计

我们将设计以下菜单结构：

```
├── 账号管理
│   ├── 绑定账号
│   ├── 选择账本
│   └── 解除绑定
├── 记账助手
│   ├── 使用说明
│   ├── 记账模板
│   └── 查询余额
└── 更多服务
    ├── 联系客服
    ├── 常见问题
    └── 关于我们
```

## 菜单配置方法

### 方法一：通过微信公众平台配置

1. 登录微信公众平台
2. 进入"自定义菜单"
3. 点击"添加"按钮创建菜单
4. 配置菜单项的名称和对应的响应动作
5. 保存并发布菜单

### 方法二：通过API配置（推荐）

使用微信公众号API创建自定义菜单，这样可以通过代码管理菜单配置。

```javascript
const axios = require('axios');
require('dotenv').config();

// 获取access_token
async function getAccessToken() {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  
  try {
    const response = await axios.get(url);
    return response.data.access_token;
  } catch (error) {
    console.error('获取access_token失败:', error);
    throw error;
  }
}

// 创建自定义菜单
async function createMenu() {
  const accessToken = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${accessToken}`;
  
  const menuConfig = {
    button: [
      {
        name: "账号管理",
        sub_button: [
          {
            type: "view",
            name: "绑定账号",
            url: `https://your-domain.com/wechat/bind?action=bind`
          },
          {
            type: "view",
            name: "选择账本",
            url: `https://your-domain.com/wechat/bind?action=select_book`
          },
          {
            type: "view",
            name: "解除绑定",
            url: `https://your-domain.com/wechat/bind?action=unbind`
          }
        ]
      },
      {
        name: "记账助手",
        sub_button: [
          {
            type: "click",
            name: "使用说明",
            key: "USAGE_GUIDE"
          },
          {
            type: "click",
            name: "记账模板",
            key: "ACCOUNTING_TEMPLATE"
          },
          {
            type: "click",
            name: "查询余额",
            key: "CHECK_BALANCE"
          }
        ]
      },
      {
        name: "更多服务",
        sub_button: [
          {
            type: "click",
            name: "联系客服",
            key: "CUSTOMER_SERVICE"
          },
          {
            type: "view",
            name: "常见问题",
            url: `https://your-domain.com/wechat/faq`
          },
          {
            type: "click",
            name: "关于我们",
            key: "ABOUT_US"
          }
        ]
      }
    ]
  };
  
  try {
    const response = await axios.post(url, menuConfig);
    console.log('菜单创建结果:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建菜单失败:', error);
    throw error;
  }
}

// 执行创建菜单
createMenu().catch(console.error);
```

## 菜单项说明

### 1. 账号管理

#### 绑定账号
- **类型**: view
- **URL**: `https://your-domain.com/wechat/bind?action=bind`
- **功能**: 跳转到账号绑定页面，用户可以输入只为记账的账号和密码进行绑定

#### 选择账本
- **类型**: view
- **URL**: `https://your-domain.com/wechat/bind?action=select_book`
- **功能**: 跳转到账本选择页面，用户可以选择默认记账账本

#### 解除绑定
- **类型**: view
- **URL**: `https://your-domain.com/wechat/bind?action=unbind`
- **功能**: 跳转到解除绑定确认页面，用户可以解除当前绑定的账号

### 2. 记账助手

#### 使用说明
- **类型**: click
- **Key**: USAGE_GUIDE
- **功能**: 返回记账功能的使用说明文本

#### 记账模板
- **类型**: click
- **Key**: ACCOUNTING_TEMPLATE
- **功能**: 返回记账模板和示例

#### 查询余额
- **类型**: click
- **Key**: CHECK_BALANCE
- **功能**: 查询并返回当前账本余额

### 3. 更多服务

#### 联系客服
- **类型**: click
- **Key**: CUSTOMER_SERVICE
- **功能**: 返回客服联系方式

#### 常见问题
- **类型**: view
- **URL**: `https://your-domain.com/wechat/faq`
- **功能**: 跳转到常见问题页面

#### 关于我们
- **类型**: click
- **Key**: ABOUT_US
- **功能**: 返回关于我们的信息

## 菜单权限说明

1. **个性化菜单**
   - 可以根据用户标签、性别、地区等设置不同的菜单
   - 未绑定账号的用户可以显示简化版菜单

2. **菜单刷新**
   - 菜单创建后，24小时内生效
   - 可以通过删除再创建的方式立即更新菜单

3. **数量限制**
   - 一级菜单最多3个
   - 二级菜单每个一级菜单下最多5个

## 菜单响应处理

对于click类型的菜单，需要在服务器端处理菜单点击事件：

```javascript
// 处理菜单点击事件
app.post('/wechat/callback', (req, res) => {
  const message = req.body;
  
  // 判断是否为菜单点击事件
  if (message.MsgType === 'event' && message.Event === 'CLICK') {
    switch (message.EventKey) {
      case 'USAGE_GUIDE':
        return res.send(generateUsageGuideResponse(message));
      case 'ACCOUNTING_TEMPLATE':
        return res.send(generateTemplateResponse(message));
      case 'CHECK_BALANCE':
        return handleBalanceCheck(message, res);
      case 'CUSTOMER_SERVICE':
        return res.send(generateCustomerServiceResponse(message));
      case 'ABOUT_US':
        return res.send(generateAboutUsResponse(message));
      default:
        return res.send(generateDefaultResponse(message));
    }
  }
  
  // 处理其他类型的消息...
});
```

## 下一步

完成菜单配置后，请继续参考 `account_binding.md` 实现账号绑定功能。