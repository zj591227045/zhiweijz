// 分类数据调试脚本
// 在浏览器控制台中运行此脚本以诊断分类数据问题

(async function() {
  try {
    console.log('开始分类数据调试...');
    
    // 检查localStorage中的token
    const token = localStorage.getItem('auth-token');
    console.log('Token存在:', !!token);
    if (!token) {
      console.error('未找到认证token，请先登录');
      return;
    }
    
    // 直接使用fetch API获取分类数据
    console.log('使用fetch API获取分类数据...');
    const fetchResponse = await fetch('/api/categories?type=EXPENSE', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`);
    }
    
    const fetchData = await fetchResponse.json();
    console.log('Fetch API响应:', fetchData);
    
    if (Array.isArray(fetchData)) {
      console.log('Fetch API返回数组，长度:', fetchData.length);
      if (fetchData.length > 0) {
        console.log('第一个分类项:', fetchData[0]);
        
        // 检查必要字段
        const requiredFields = ['id', 'name', 'icon', 'type'];
        const missingFields = requiredFields.filter(field => !fetchData[0].hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          console.error('分类数据缺少必要字段:', missingFields);
        } else {
          console.log('分类数据包含所有必要字段');
        }
      }
    } else {
      console.warn('Fetch API未返回数组:', typeof fetchData);
    }
    
    // 使用axios获取分类数据
    console.log('\n使用axios获取分类数据...');
    const axios = window.axios;
    if (!axios) {
      console.error('未找到axios库，请确保已加载');
      return;
    }
    
    try {
      const axiosResponse = await axios.get('/api/categories', {
        params: { type: 'EXPENSE' },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Axios响应:', axiosResponse);
      
      if (axiosResponse.data) {
        console.log('Axios数据:', axiosResponse.data);
        
        if (Array.isArray(axiosResponse.data)) {
          console.log('Axios返回数组，长度:', axiosResponse.data.length);
          if (axiosResponse.data.length > 0) {
            console.log('第一个分类项:', axiosResponse.data[0]);
          }
        } else {
          console.warn('Axios未返回数组:', typeof axiosResponse.data);
        }
      }
    } catch (axiosError) {
      console.error('Axios请求失败:', axiosError);
    }
    
    // 检查store中的分类数据
    console.log('\n检查React组件中的分类数据...');
    console.log('请在React组件中添加以下调试代码:');
    console.log(`
    useEffect(() => {
      console.log('组件中的分类数据:', categories);
    }, [categories]);
    `);
    
    // 检查网络请求
    console.log('\n检查网络请求...');
    console.log('请在浏览器开发者工具的Network标签页中查看/api/categories请求');
    console.log('确保请求成功并返回了正确的数据格式');
    
    console.log('\n调试完成');
  } catch (error) {
    console.error('调试过程中发生错误:', error);
  }
})();
