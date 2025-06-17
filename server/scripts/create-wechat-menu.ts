#!/usr/bin/env ts-node

/**
 * 创建微信自定义菜单的脚本
 *
 * 使用方法：
 * npm run create-wechat-menu
 *
 * 或者直接运行：
 * npx ts-node -r tsconfig-paths/register scripts/create-wechat-menu.ts
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 获取微信访问令牌
 */
async function getAccessToken(appId: string, appSecret: string): Promise<string> {
  try {
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: appId,
        secret: appSecret
      }
    });

    if (response.data.errcode) {
      throw new Error(`获取access_token失败: ${response.data.errmsg}`);
    }

    return response.data.access_token;
  } catch (error) {
    console.error('获取微信access_token失败:', error);
    throw error;
  }
}

/**
 * 创建微信菜单
 */
async function createWechatMenu() {
  console.log('🚀 开始创建微信自定义菜单...\n');

  try {
    // 从环境变量获取配置
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    const token = process.env.WECHAT_TOKEN;

    // 检查配置
    if (!appId || !appSecret || !token) {
      console.error('❌ 微信配置不完整');
      console.log('请检查 .env 文件中的微信配置：');
      console.log('- WECHAT_APP_ID:', appId ? '✅' : '❌');
      console.log('- WECHAT_APP_SECRET:', appSecret ? '✅' : '❌');
      console.log('- WECHAT_TOKEN:', token ? '✅' : '❌');
      process.exit(1);
    }

    console.log('✅ 微信配置检查通过');

    // 构建微信授权URL
    const redirectUri = encodeURIComponent('https://wxapp.zhiweijz.cn/api/wechat/binding-page');
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=binding#wechat_redirect`;

    console.log('📋 菜单配置：');
    console.log('1. 访问官网 -> https://www.zhiweijz.cn');
    console.log('2. 账号绑定 -> 微信授权页面 (snsapi_base)');
    console.log('3. 下载App -> https://www.zhiweijz.cn/downloads');
    console.log('');

    // 获取访问令牌
    console.log('🔑 获取微信访问令牌...');
    const accessToken = await getAccessToken(appId, appSecret);
    console.log('✅ 访问令牌获取成功');

    // 菜单配置
    const menuConfig = {
      button: [
        {
          type: "view",
          name: "访问官网",
          url: "https://www.zhiweijz.cn"
        },
        {
          type: "view",
          name: "账号绑定",
          url: authUrl
        },
        {
          type: "view",
          name: "下载App",
          url: "https://www.zhiweijz.cn/downloads"
        }
      ]
    };

    // 创建菜单
    console.log('📱 创建微信菜单...');
    const response = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${accessToken}`,
      menuConfig
    );

    if (response.data.errcode === 0) {
      console.log('🎉 微信菜单创建成功！');
      console.log('📱 用户现在可以在微信公众号中看到新的菜单');
      console.log('⏰ 菜单更新可能需要几分钟时间生效');
      console.log('💡 提示：用户可以取消关注后重新关注来立即看到新菜单');
    } else {
      console.error('❌ 微信菜单创建失败：', response.data.errmsg);

      // 提供一些常见错误的解决建议
      if (response.data.errcode === 40013) {
        console.log('\n💡 错误40013：AppID无效');
        console.log('- 检查 WECHAT_APP_ID 是否正确');
      } else if (response.data.errcode === 40001) {
        console.log('\n💡 错误40001：AppSecret无效');
        console.log('- 检查 WECHAT_APP_SECRET 是否正确');
      } else if (response.data.errcode === 42001) {
        console.log('\n💡 错误42001：access_token超时');
        console.log('- 重新运行脚本获取新的access_token');
      }

      process.exit(1);
    }

  } catch (error) {
    console.error('💥 创建菜单时发生异常：', error);

    if (error instanceof Error) {
      console.error('错误详情：', error.message);
    }

    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  createWechatMenu()
    .then(() => {
      console.log('\n✨ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败：', error);
      process.exit(1);
    });
}

export { createWechatMenu };
