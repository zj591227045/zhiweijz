#!/bin/bash
# 支付模块集成脚本

set -e

# 配置
PAYMENT_MODULE_REPO="./zhiweijz-payment-premium"
PROJECT_ROOT=$(pwd)
PAYMENT_MODULE_TYPE=${1:-"mock"}

echo "🚀 集成支付模块: $PAYMENT_MODULE_TYPE"

# 检查是否在主项目根目录
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ 请在 ZhiWeiJZ 主项目根目录运行此脚本"
    exit 1
fi

# 1. 检查权限和认证
check_access() {
    echo "检查支付模块访问权限..."
    
    if [ "$PAYMENT_MODULE_TYPE" = "premium" ]; then
        if [ ! -d "$PAYMENT_MODULE_REPO" ]; then
            echo "❌ 找不到高级支付模块目录: $PAYMENT_MODULE_REPO"
            echo "请确保已正确克隆高级支付模块"
            exit 1
        fi
        echo "✅ 高级支付模块已找到"
    fi
}

# 2. 设置环境变量
setup_environment() {
    echo "设置环境变量..."
    
    case $PAYMENT_MODULE_TYPE in
        "premium")
            cat >> .env.local << EOF

# Premium Payment Module Configuration
PAYMENT_PROVIDER=full
ENABLE_PAYMENT_MODULE=true
PAYMENT_MODULE_PATH=./zhiweijz-payment-premium/dist

# 支付模块开发配置
PAYMENT_DEBUG=true
PAYMENT_LOG_LEVEL=debug
EOF
            echo "✅ 高级支付模块环境变量已设置"
            ;;
            
        "mock")
            cat >> .env.local << EOF

# Mock Payment Module Configuration
PAYMENT_PROVIDER=mock
ENABLE_PAYMENT_MODULE=false
PAYMENT_MODULE_PATH=

# 开源版本配置
DEFAULT_MEMBERSHIP_LEVEL=regular
ALLOW_MANUAL_UPGRADE=true
EOF
            echo "✅ Mock支付模块环境变量已设置"
            ;;
            
        "disabled")
            cat >> .env.local << EOF

# Disabled Payment Configuration
PAYMENT_PROVIDER=disabled
ENABLE_PAYMENT_MODULE=false
EOF
            echo "✅ 支付功能已禁用"
            ;;
            
        *)
            echo "❌ 未知的支付模块类型: $PAYMENT_MODULE_TYPE"
            echo "可用选项: premium, mock, disabled"
            exit 1
            ;;
    esac
}

# 3. 安装和构建支付模块
build_payment_module() {
    if [ "$PAYMENT_MODULE_TYPE" = "premium" ]; then
        echo "构建高级支付模块..."
        
        cd $PAYMENT_MODULE_REPO
        
        # 检查并安装依赖
        if [ ! -d "node_modules" ]; then
            echo "安装支付模块依赖..."
            npm install
        fi
        
        # 运行测试
        echo "运行支付模块测试..."
        npm test
        
        # 构建模块
        echo "构建支付模块..."
        npm run build
        
        cd $PROJECT_ROOT
        echo "✅ 高级支付模块构建完成"
    fi
}

# 4. 集成到主项目
integrate_module() {
    echo "集成支付模块到主项目..."
    
    if [ "$PAYMENT_MODULE_TYPE" = "premium" ]; then
        # 确保主项目的支付接口目录存在
        mkdir -p server/src/interfaces
        mkdir -p server/src/services/payment
        mkdir -p apps/web/src/lib/payment
        mkdir -p apps/web/src/components/payment/premium
        
        # 复制接口定义 (如果不存在)
        if [ ! -f "server/src/interfaces/payment.interface.ts" ]; then
            cp $PAYMENT_MODULE_REPO/src/types/payment.types.ts server/src/interfaces/payment.interface.ts
            echo "✅ 支付接口定义已复制"
        fi
        
        # 创建支付插件管理器
        create_payment_plugin_manager
        
        # 创建前端集成组件
        create_frontend_integration
        
        echo "✅ 高级支付模块集成完成"
    else
        # 确保开源版本的基础结构存在
        create_opensource_payment_structure
        echo "✅ 开源支付结构已设置"
    fi
}

# 5. 创建支付插件管理器
create_payment_plugin_manager() {
    cat > server/src/services/payment/payment-plugin-manager.ts << 'EOF'
import { IPaymentProvider } from '../../interfaces/payment.interface';

export class PaymentPluginManager {
  private static instance: PaymentPluginManager;
  private provider: IPaymentProvider;

  private constructor() {
    this.initializeProvider();
  }

  static getInstance(): PaymentPluginManager {
    if (!PaymentPluginManager.instance) {
      PaymentPluginManager.instance = new PaymentPluginManager();
    }
    return PaymentPluginManager.instance;
  }

  private initializeProvider(): void {
    const paymentMode = process.env.PAYMENT_PROVIDER || 'mock';
    
    switch (paymentMode) {
      case 'full':
        this.provider = this.loadPremiumPaymentProvider();
        break;
      case 'disabled':
        this.provider = this.loadDisabledPaymentProvider();
        break;
      case 'mock':
      default:
        this.provider = this.loadMockPaymentProvider();
        break;
    }

    console.log(`支付提供者已初始化: ${paymentMode}`);
  }

  private loadPremiumPaymentProvider(): IPaymentProvider {
    try {
      const modulePath = process.env.PAYMENT_MODULE_PATH || './zhiweijz-payment-premium/dist';
      const PaymentModule = require(modulePath);
      
      return new PaymentModule.PremiumPaymentProvider({
        alipayConfig: {
          appId: process.env.ALIPAY_APP_ID,
          privateKey: process.env.ALIPAY_PRIVATE_KEY,
          publicKey: process.env.ALIPAY_PUBLIC_KEY,
          gateway: process.env.ALIPAY_GATEWAY
        },
        wechatConfig: {
          appId: process.env.WECHAT_APP_ID,
          mchId: process.env.WECHAT_MCH_ID,
          partnerKey: process.env.WECHAT_PARTNER_KEY
        },
        revenueCatConfig: {
          apiKey: process.env.REVENUECAT_API_KEY,
          webhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET
        }
      });
    } catch (error) {
      console.warn('加载高级支付模块失败，回退到Mock模式:', error.message);
      return this.loadMockPaymentProvider();
    }
  }

  private loadMockPaymentProvider(): IPaymentProvider {
    const { MockPaymentProvider } = require('./mock-payment-provider');
    return new MockPaymentProvider();
  }

  private loadDisabledPaymentProvider(): IPaymentProvider {
    const { DisabledPaymentProvider } = require('./disabled-payment-provider');
    return new DisabledPaymentProvider();
  }

  getProvider(): IPaymentProvider {
    return this.provider;
  }

  switchProvider(providerType: string): void {
    const oldProvider = this.provider;
    
    switch (providerType) {
      case 'mock':
        this.provider = this.loadMockPaymentProvider();
        break;
      case 'disabled':
        this.provider = this.loadDisabledPaymentProvider();
        break;
      default:
        console.error(`未知的提供者类型: ${providerType}`);
        return;
    }

    console.log(`支付提供者已切换: ${oldProvider.constructor.name} -> ${this.provider.constructor.name}`);
  }
}
EOF
    echo "✅ 支付插件管理器已创建"
}

# 6. 创建前端集成组件
create_frontend_integration() {
    cat > apps/web/src/lib/payment/payment-capabilities.hook.ts << 'EOF'
import { useState, useEffect } from 'react';
import { PaymentCapabilities } from '../../../types/payment.types';
import { paymentApi } from '../api/payment-api';

export const usePaymentCapabilities = () => {
  const [capabilities, setCapabilities] = useState<PaymentCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadCapabilities();
  }, []);

  const loadCapabilities = async () => {
    try {
      setIsLoading(true);
      const caps = await paymentApi.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    paymentCapabilities: capabilities,
    isLoading,
    error,
    reload: loadCapabilities,
    hasFullPayment: capabilities?.hasSubscription || false,
    isOpenSourceMode: capabilities?.isOpenSource || false
  };
};
EOF
    echo "✅ 前端支付能力Hook已创建"
}

# 7. 创建开源版本支付结构
create_opensource_payment_structure() {
    # 确保开源版本的目录结构存在
    mkdir -p server/src/services/payment
    mkdir -p apps/web/src/components/payment
    
    echo "✅ 开源版本支付结构已确保存在"
}

# 8. 验证集成
verify_integration() {
    echo "验证集成..."
    
    # 检查环境变量
    if grep -q "PAYMENT_PROVIDER" .env.local; then
        echo "✅ 环境变量配置正确"
    else
        echo "❌ 环境变量配置可能有问题"
        return 1
    fi
    
    # 检查必要文件
    if [ -f "server/src/services/payment/payment-plugin-manager.ts" ]; then
        echo "✅ 支付插件管理器已创建"
    else
        echo "❌ 支付插件管理器缺失"
        return 1
    fi
    
    echo "✅ 集成验证通过"
}

# 主执行流程
main() {
    echo "开始集成 ZhiWeiJZ 支付模块..."
    
    check_access
    setup_environment
    build_payment_module
    integrate_module
    verify_integration
    
    echo ""
    echo "🎉 支付模块集成完成！"
    echo ""
    echo "下一步操作:"
    echo "1. 配置支付提供商凭据 (如果使用高级模块)"
    echo "2. 运行 'npm run dev' 启动开发服务器"
    echo "3. 测试支付功能"
    
    if [ "$PAYMENT_MODULE_TYPE" = "premium" ]; then
        echo ""
        echo "⚠️  注意："
        echo "- 请在 .env.local 中配置真实的支付API密钥"
        echo "- 确保Webhook回调地址已正确配置"
        echo "- 建议先在测试环境中验证支付流程"
    fi
}

# 错误处理
trap 'echo "❌ 集成失败"; exit 1' ERR

# 执行主流程
main "$@"