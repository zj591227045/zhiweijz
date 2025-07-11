const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

async function detailedBaiduAPITest() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 [详细测试] 开始详细测试百度云语音识别API...');
    
    // 获取配置
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['speech_api_key', 'speech_secret_key']
        }
      }
    });
    
    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});
    
    // 获取Token
    console.log('🔑 [Token] 获取访问令牌...');
    const tokenResponse = await axios.post('https://aip.baidubce.com/oauth/2.0/token', null, {
      params: {
        grant_type: 'client_credentials',
        client_id: configMap.speech_api_key,
        client_secret: configMap.speech_secret_key
      }
    });
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ [Token] 获取成功');
    
    // 测试不同的API端点
    const endpoints = [
      'https://vop.baidu.com/server_api',  // 标准版
      'https://vop.baidu.com/pro_api'      // 极速版
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\\n🎤 [API测试] 测试端点: ${endpoint}`);
      
      try {
        // 创建一个简单的测试音频数据（实际上这不是有效音频，但可以测试API连通性）
        const testAudioData = Buffer.from('RIFF').toString('base64');
        
        const requestData = {
          format: 'wav',
          rate: 16000,
          channel: 1,
          cuid: 'test-device-12345',
          token: accessToken,
          speech: testAudioData,
          len: 4,
          dev_pid: 1537  // 普通话模型
        };
        
        console.log('📝 [请求] 参数:', {
          format: requestData.format,
          rate: requestData.rate,
          channel: requestData.channel,
          cuid: requestData.cuid,
          token: `${requestData.token.substring(0, 20)}...`,
          speech_length: requestData.speech.length,
          len: requestData.len,
          dev_pid: requestData.dev_pid
        });
        
        const response = await axios.post(endpoint, requestData, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });
        
        console.log('✅ [响应] 成功:', response.data);
        
      } catch (error) {
        console.log('⚠️  [响应] 错误:');
        if (error.response && error.response.data) {
          const errorData = error.response.data;
          console.log('  - 错误码:', errorData.err_no);
          console.log('  - 错误信息:', errorData.err_msg);
          console.log('  - SN:', errorData.sn);
          
          // 分析错误码
          switch (errorData.err_no) {
            case 3300:
              console.log('  💡 [分析] 输入参数不正确');
              break;
            case 3301:
              console.log('  💡 [分析] 音频质量过差（这是预期的，因为我们使用的是测试数据）');
              break;
            case 3302:
              console.log('  💡 [分析] 鉴权失败，可能的原因:');
              console.log('    - Token已过期');
              console.log('    - API Key/Secret Key权限不足');
              console.log('    - 应用未开通对应服务');
              break;
            case 3303:
              console.log('  💡 [分析] 语音服务器后端问题');
              break;
            case 3304:
              console.log('  💡 [分析] 请求QPS超限');
              break;
            case 3305:
              console.log('  💡 [分析] 日调用量超限');
              break;
            default:
              console.log('  💡 [分析] 未知错误码');
          }
        } else {
          console.log('  - 网络错误:', error.message);
        }
      }
    }
    
    // 检查应用权限
    console.log('\\n🔍 [权限检查] Token详情:');
    console.log('- 权限范围包含语音识别:', tokenResponse.data.scope.includes('brain_enhanced_asr') ? '✅' : '❌');
    console.log('- 权限范围包含ASR:', tokenResponse.data.scope.includes('brain_asr') ? '✅' : '❌');
    console.log('- 完整权限列表:', tokenResponse.data.scope.split(' ').filter(s => s.includes('asr') || s.includes('speech') || s.includes('audio')));
    
  } catch (error) {
    console.error('❌ [异常] 测试失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行详细测试
detailedBaiduAPITest();