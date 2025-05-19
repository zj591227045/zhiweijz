// 浏览器中测试分类数据
// 将此文件复制到浏览器控制台中执行

(async function() {
  try {
    console.log('开始测试分类数据...');
    
    // 获取支出分类
    console.log('获取支出分类...');
    const response = await fetch('/api/categories?type=EXPENSE', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const categories = await response.json();
    console.log('支出分类数据:', categories);
    
    // 检查分类数据结构
    if (categories && categories.length > 0) {
      console.log('分类数量:', categories.length);
      console.log('第一个分类:', categories[0]);
      
      // 检查必要的字段
      const firstCategory = categories[0];
      const requiredFields = ['id', 'name', 'icon', 'type'];
      const missingFields = requiredFields.filter(field => !firstCategory.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        console.error('分类数据缺少必要字段:', missingFields);
      } else {
        console.log('分类数据包含所有必要字段');
      }
      
      // 检查图标字段
      if (firstCategory.icon) {
        console.log('图标字段值:', firstCategory.icon);
      } else {
        console.error('图标字段为空');
      }
      
      // 检查颜色字段
      if (firstCategory.color) {
        console.log('颜色字段值:', firstCategory.color);
      } else {
        console.warn('颜色字段为空，前端将使用默认颜色');
      }
      
      // 测试图标映射函数
      console.log('测试图标映射函数...');
      const getCategoryIconClass = (icon) => {
        console.log('获取图标类名，传入的图标值:', icon);
        
        // 根据图标名称映射到Font Awesome图标
        const iconMap = {
          restaurant: "fa-utensils",
          shopping: "fa-shopping-bag",
          transport: "fa-bus",
          home: "fa-home",
          clothing: "fa-tshirt",
          entertainment: "fa-gamepad",
          medical: "fa-heartbeat",
          education: "fa-graduation-cap",
          gift: "fa-gift",
          travel: "fa-plane",
          communication: "fa-mobile-alt",
          daily: "fa-shopping-basket",
          sports: "fa-running",
          beauty: "fa-spa",
          child: "fa-baby",
          elder: "fa-user-friends",
          social: "fa-users",
          digital: "fa-laptop",
          car: "fa-car",
          repayment: "fa-hand-holding-usd",
          insurance: "fa-shield-alt",
          office: "fa-briefcase",
          repair: "fa-tools",
          interest: "fa-percentage",
          salary: "fa-money-bill-wave",
          "part-time": "fa-coins",
          investment: "fa-chart-line",
          bonus: "fa-gift",
          // 默认图标
          default: "fa-tag"
        };
        
        // 如果图标名称包含 "fa-"，则直接使用
        if (icon && icon.includes('fa-')) {
          return `fas ${icon}`;
        }
        
        const result = `fas ${iconMap[icon] || iconMap.default}`;
        console.log('映射后的图标类名:', result);
        return result;
      };
      
      // 测试每个分类的图标映射
      console.log('测试所有分类的图标映射...');
      categories.forEach((category, index) => {
        console.log(`分类 ${index + 1} (${category.name}) 的图标映射:`, getCategoryIconClass(category.icon));
      });
    } else {
      console.error('没有获取到分类数据');
    }
    
    console.log('测试完成');
  } catch (error) {
    console.error('测试失败:', error);
  }
})();
