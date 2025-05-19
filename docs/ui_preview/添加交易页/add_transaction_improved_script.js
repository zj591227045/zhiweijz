// 这个脚本文件用于演示添加记账改进版的交互效果
// 在实际项目中，这些功能将使用React组件实现

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const expenseButton = document.querySelector('.type-button.expense');
    const incomeButton = document.querySelector('.type-button.income');
    const expenseCategories = document.getElementById('expense-categories');
    const incomeCategories = document.getElementById('income-categories');
    const stepCategory = document.getElementById('step-category');
    const stepDetails = document.getElementById('step-details');
    const nextButton = document.getElementById('next-button');
    const step2Buttons = document.querySelector('.step2-buttons');
    const backButton = document.querySelector('.back-button');
    const stepIndicators = document.querySelectorAll('.step');
    const categoryItems = document.querySelectorAll('.category-item');
    const changeButton = document.querySelector('.change-category-btn');
    
    // 交易类型切换
    expenseButton.addEventListener('click', function() {
        expenseButton.classList.add('active');
        incomeButton.classList.remove('active');
        expenseCategories.style.display = 'block';
        incomeCategories.style.display = 'none';
    });
    
    incomeButton.addEventListener('click', function() {
        incomeButton.classList.add('active');
        expenseButton.classList.remove('active');
        incomeCategories.style.display = 'block';
        expenseCategories.style.display = 'none';
    });
    
    // 分类选择
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除其他分类的active状态
            categoryItems.forEach(cat => cat.classList.remove('active'));
            // 添加当前分类的active状态
            this.classList.add('active');
            
            // 自动进入下一步
            setTimeout(() => {
                goToStep2();
            }, 300);
        });
    });
    
    // 下一步按钮
    nextButton.addEventListener('click', function() {
        goToStep2();
    });
    
    // 返回按钮
    backButton.addEventListener('click', function() {
        goToStep1();
    });
    
    // 更改分类按钮
    changeButton.addEventListener('click', function() {
        goToStep1();
    });
    
    // 进入第二步
    function goToStep2() {
        stepCategory.style.display = 'none';
        stepDetails.style.display = 'block';
        nextButton.style.display = 'none';
        step2Buttons.style.display = 'flex';
        stepIndicators[0].classList.remove('active');
        stepIndicators[1].classList.add('active');
    }
    
    // 返回第一步
    function goToStep1() {
        stepDetails.style.display = 'none';
        stepCategory.style.display = 'block';
        step2Buttons.style.display = 'none';
        nextButton.style.display = 'block';
        stepIndicators[1].classList.remove('active');
        stepIndicators[0].classList.add('active');
    }
});
