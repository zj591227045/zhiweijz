import axios from 'axios';

async function testVolcengineVision() {
  console.log('🔍 测试火山方舟视觉识别...');

  const config = {
    apiKey: '3272aed8-e225-4e30-a1ad-7106a644f08e',
    model: 'ep-20250112212411-2kbkh',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  };

  // 先测试纯文本
  console.log('\n📝 1. 测试纯文本调用...');
  try {
    const textResponse = await axios.post(
      `${config.baseUrl}/chat/completions`,
      {
        model: config.model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    console.log('✅ 纯文本调用成功');
    console.log('响应:', textResponse.data.choices?.[0]?.message?.content);
  } catch (error) {
    console.log('❌ 纯文本调用失败');
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status);
      console.log('错误:', error.response?.data);
    }
    return;
  }

  // 测试视觉识别
  console.log('\n👁️ 2. 测试视觉识别...');
  const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  try {
    const visionResponse = await axios.post(
      `${config.baseUrl}/chat/completions`,
      {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: testImage },
              },
              {
                type: 'text',
                text: '描述这张图片',
              },
            ],
          },
        ],
        max_tokens: 50,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ 视觉识别成功');
    console.log('响应:', visionResponse.data.choices?.[0]?.message?.content);
  } catch (error) {
    console.log('❌ 视觉识别失败');
    if (axios.isAxiosError(error)) {
      console.log('状态码:', error.response?.status);
      console.log('错误详情:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

testVolcengineVision()
  .then(() => {
    console.log('\n✨ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
