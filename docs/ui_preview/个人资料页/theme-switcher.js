// 主题切换功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取主题选项元素
    const themeOptions = document.querySelectorAll('.theme-option');
    
    // 从本地存储中获取当前主题
    const currentTheme = localStorage.getItem('theme') || 'default';
    
    // 应用当前主题
    applyTheme(currentTheme);
    
    // 为每个主题选项添加点击事件
    themeOptions.forEach(option => {
        // 如果是当前主题，添加active类
        if (option.dataset.theme === currentTheme) {
            option.classList.add('active');
        }
        
        option.addEventListener('click', function() {
            const theme = this.dataset.theme;
            
            // 移除所有选项的active类
            themeOptions.forEach(opt => opt.classList.remove('active'));
            
            // 为当前选项添加active类
            this.classList.add('active');
            
            // 应用主题
            applyTheme(theme);
            
            // 保存主题到本地存储
            localStorage.setItem('theme', theme);
        });
    });
    
    // 应用主题函数
    function applyTheme(theme) {
        // 设置文档的data-theme属性
        document.documentElement.setAttribute('data-theme', theme);
    }
});

// 自定义主题相关功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取自定义主题相关元素
    const createThemeButton = document.getElementById('create-theme-button');
    const themeEditor = document.getElementById('theme-editor');
    const saveThemeButton = document.getElementById('save-theme-button');
    const cancelThemeButton = document.getElementById('cancel-theme-button');
    const themeNameInput = document.getElementById('theme-name-input');
    const colorPickers = document.querySelectorAll('.color-picker');
    const customThemeList = document.querySelector('.custom-theme-list');
    const importButton = document.querySelector('.import-button');
    const exportButton = document.querySelector('.export-button');
    
    // 如果页面上有这些元素，则添加相应的事件处理
    if (createThemeButton) {
        createThemeButton.addEventListener('click', function() {
            // 显示主题编辑器
            themeEditor.style.display = 'block';
            // 清空主题名称输入框
            themeNameInput.value = '';
            // 重置颜色选择器
            resetColorPickers();
        });
    }
    
    if (saveThemeButton) {
        saveThemeButton.addEventListener('click', function() {
            // 获取主题名称
            const themeName = themeNameInput.value.trim();
            
            if (!themeName) {
                alert('请输入主题名称');
                return;
            }
            
            // 收集颜色值
            const themeColors = {};
            colorPickers.forEach(picker => {
                const colorName = picker.dataset.color;
                const colorValue = picker.value;
                themeColors[colorName] = colorValue;
            });
            
            // 保存自定义主题
            saveCustomTheme(themeName, themeColors);
            
            // 隐藏主题编辑器
            themeEditor.style.display = 'none';
            
            // 刷新自定义主题列表
            refreshCustomThemeList();
        });
    }
    
    if (cancelThemeButton) {
        cancelThemeButton.addEventListener('click', function() {
            // 隐藏主题编辑器
            themeEditor.style.display = 'none';
        });
    }
    
    if (importButton) {
        importButton.addEventListener('click', function() {
            // 创建文件输入元素
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const themeData = JSON.parse(e.target.result);
                        if (themeData.name && themeData.colors) {
                            saveCustomTheme(themeData.name, themeData.colors);
                            refreshCustomThemeList();
                            alert('主题导入成功');
                        } else {
                            alert('无效的主题文件格式');
                        }
                    } catch (error) {
                        alert('导入失败: ' + error.message);
                    }
                };
                reader.readAsText(file);
            });
            
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        });
    }
    
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            // 获取所有自定义主题
            const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
            
            // 创建下载链接
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customThemes));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "custom_themes.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    }
    
    // 初始化自定义主题列表
    if (customThemeList) {
        refreshCustomThemeList();
    }
    
    // 保存自定义主题
    function saveCustomTheme(name, colors) {
        // 获取现有的自定义主题
        const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
        
        // 添加或更新主题
        customThemes[name] = colors;
        
        // 保存回本地存储
        localStorage.setItem('customThemes', JSON.stringify(customThemes));
    }
    
    // 刷新自定义主题列表
    function refreshCustomThemeList() {
        if (!customThemeList) return;
        
        // 获取所有自定义主题
        const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
        
        // 清空列表
        customThemeList.innerHTML = '';
        
        // 添加每个自定义主题
        Object.keys(customThemes).forEach(themeName => {
            const themeItem = document.createElement('div');
            themeItem.className = 'custom-theme-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'custom-theme-name';
            nameSpan.textContent = themeName;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'custom-theme-actions';
            
            const editButton = document.createElement('button');
            editButton.className = 'custom-theme-action edit';
            editButton.textContent = '编辑';
            editButton.addEventListener('click', function() {
                editCustomTheme(themeName, customThemes[themeName]);
            });
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'custom-theme-action delete';
            deleteButton.textContent = '删除';
            deleteButton.addEventListener('click', function() {
                deleteCustomTheme(themeName);
            });
            
            actionsDiv.appendChild(editButton);
            actionsDiv.appendChild(deleteButton);
            
            themeItem.appendChild(nameSpan);
            themeItem.appendChild(actionsDiv);
            
            customThemeList.appendChild(themeItem);
        });
    }
    
    // 编辑自定义主题
    function editCustomTheme(name, colors) {
        if (!themeEditor || !themeNameInput) return;
        
        // 显示主题编辑器
        themeEditor.style.display = 'block';
        
        // 设置主题名称
        themeNameInput.value = name;
        
        // 设置颜色选择器的值
        colorPickers.forEach(picker => {
            const colorName = picker.dataset.color;
            if (colors[colorName]) {
                picker.value = colors[colorName];
            }
        });
    }
    
    // 删除自定义主题
    function deleteCustomTheme(name) {
        if (confirm(`确定要删除主题 "${name}" 吗？`)) {
            // 获取现有的自定义主题
            const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
            
            // 删除指定主题
            delete customThemes[name];
            
            // 保存回本地存储
            localStorage.setItem('customThemes', JSON.stringify(customThemes));
            
            // 刷新自定义主题列表
            refreshCustomThemeList();
        }
    }
    
    // 重置颜色选择器
    function resetColorPickers() {
        colorPickers.forEach(picker => {
            const defaultColors = {
                primary: '#3B82F6',
                secondary: '#10B981',
                background: '#F9FAFB',
                card: '#FFFFFF',
                foreground: '#1F2937',
                border: '#E5E7EB'
            };
            
            const colorName = picker.dataset.color;
            if (defaultColors[colorName]) {
                picker.value = defaultColors[colorName];
            }
        });
    }
});
