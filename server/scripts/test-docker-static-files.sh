#!/bin/bash

# 测试Docker容器中静态文件是否正确部署的脚本

echo "🔍 测试Docker容器中的微信静态文件部署..."

# 检查是否在Docker环境中运行
if [ "$DOCKER_ENV" = "true" ]; then
    echo "✅ 检测到Docker环境"
    
    # 检查public目录是否存在
    if [ -d "/app/public" ]; then
        echo "✅ public目录存在"
        
        # 检查微信绑定页面文件
        if [ -f "/app/public/wechat-binding.html" ]; then
            echo "✅ wechat-binding.html 文件存在"
            echo "📄 文件大小: $(stat -c%s /app/public/wechat-binding.html) bytes"
        else
            echo "❌ wechat-binding.html 文件不存在"
            exit 1
        fi
        
        # 检查是否存在不应该包含的测试文件
        if [ -f "/app/public/test-binding.html" ]; then
            echo "⚠️ 发现测试文件 test-binding.html，建议移除"
        fi

        if [ -f "/app/public/MP_verify_Yi7FVl296ZYnLCCw.txt" ]; then
            echo "⚠️ 发现微信验证文件，建议验证完成后移除"
        fi
        
        # 列出public目录内容
        echo "📁 public目录内容:"
        ls -la /app/public/
        
    else
        echo "❌ public目录不存在"
        exit 1
    fi
    
    # 测试静态文件服务是否工作
    echo "🌐 测试静态文件HTTP访问..."
    
    # 等待服务器启动
    sleep 5
    
    # 测试微信绑定页面访问
    if curl -f -s http://localhost:3000/wechat-binding.html > /dev/null; then
        echo "✅ 微信绑定页面HTTP访问正常"
    else
        echo "❌ 微信绑定页面HTTP访问失败"
    fi
    
    # 测试API路由访问
    if curl -f -s http://localhost:3000/api/wechat/binding-page > /dev/null; then
        echo "✅ 微信绑定API路由访问正常"
    else
        echo "❌ 微信绑定API路由访问失败"
    fi
    
else
    echo "⚠️ 非Docker环境，跳过容器特定检查"
    
    # 在开发环境中检查文件
    if [ -f "public/wechat-binding.html" ]; then
        echo "✅ 开发环境中wechat-binding.html文件存在"
    else
        echo "❌ 开发环境中wechat-binding.html文件不存在"
        exit 1
    fi
fi

echo "🎉 静态文件部署测试完成"
