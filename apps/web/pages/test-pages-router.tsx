import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// 交易类型
interface Transaction {
  id: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  description: string;
  date: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    icon: string;
  };
}

export default function TestPagesRouter() {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>('unknown');
  const [isCapacitor, setIsCapacitor] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoadingTransaction, setIsLoadingTransaction] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    // 检测平台
    const detectPlatform = async () => {
      try {
        // 检测是否在 Capacitor 环境
        if (typeof window !== 'undefined') {
          const capacitorModule = await import('@capacitor/core');
          const { Capacitor } = capacitorModule;
          
          const isCapacitorEnv = Capacitor.isNativePlatform();
          const platformName = Capacitor.getPlatform();
          
          setIsCapacitor(isCapacitorEnv);
          setPlatform(platformName);
          
          console.log('🧪 Pages Router 测试页面 - 平台检测:', {
            isCapacitor: isCapacitorEnv,
            platform: platformName,
            userAgent: navigator.userAgent
          });
        }
      } catch (error) {
        console.log('🧪 Pages Router 测试页面 - 非 Capacitor 环境');
        setPlatform('web');
      }
    };

    detectPlatform();

    // 从 localStorage 中提取交易ID
    const extractTransactionId = () => {
      if (typeof window !== 'undefined') {
        const pendingId = localStorage.getItem('pendingTransactionEdit');
        console.log('📝 [TestPagesRouter] 检查 localStorage 中的交易ID:', pendingId);

        if (pendingId) {
          console.log('📝 [TestPagesRouter] 找到待编辑的交易ID:', pendingId);
          setTransactionId(pendingId);

          // 清除 localStorage 中的数据，避免重复使用
          localStorage.removeItem('pendingTransactionEdit');
          console.log('📝 [TestPagesRouter] 已清除 localStorage 中的交易ID');
        }
      }
    };

    extractTransactionId();
  }, []);

  // 获取交易详情
  useEffect(() => {
    const fetchTransaction = async () => {
      if (!transactionId) {
        return;
      }

      try {
        setIsLoadingTransaction(true);
        setTransactionError(null);

        console.log('📝 [TestPagesRouter] 开始获取交易详情:', transactionId);

        // 模拟 API 调用
        const response = await fetch(`/api/transactions/${transactionId}`);

        if (!response.ok) {
          throw new Error('获取交易详情失败');
        }

        const data = await response.json();
        console.log('📝 [TestPagesRouter] 交易详情获取成功:', data);
        setTransaction(data);
      } catch (err) {
        console.error('📝 [TestPagesRouter] 获取交易详情失败:', err);
        setTransactionError('获取交易详情失败，请重试');
      } finally {
        setIsLoadingTransaction(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  const handleBackClick = () => {
    router.push('/dashboard');
  };

  const handleSave = async () => {
    try {
      console.log('📝 [TestPagesRouter] 保存交易:', transaction);
      alert('交易保存成功！');
      handleBackClick();
    } catch (err) {
      console.error('📝 [TestPagesRouter] 保存交易失败:', err);
      alert('保存交易失败，请重试');
    }
  };

  // 如果有交易ID，显示交易编辑界面
  if (transactionId) {
    if (isLoadingTransaction) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #0ea5e9',
            borderRadius: '8px',
            padding: '40px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #0ea5e9',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2 style={{ color: '#0369a1', margin: '0 0 10px 0' }}>加载中...</h2>
            <p style={{ margin: '0', color: '#0369a1' }}>正在获取交易详情</p>
          </div>
        </div>
      );
    }

    if (transactionError) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>❌ 加载失败</h2>
            <p style={{ margin: '0 0 20px 0', color: '#dc2626' }}>{transactionError}</p>
            <button
              onClick={handleBackClick}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              返回主页
            </button>
          </div>
        </div>
      );
    }

    if (!transaction) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>❌ 交易不存在</h2>
            <p style={{ margin: '0 0 20px 0', color: '#dc2626' }}>找不到指定的交易记录 (ID: {transactionId})</p>
            <button
              onClick={handleBackClick}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              返回主页
            </button>
          </div>
        </div>
      );
    }

    // 显示交易编辑界面
    return (
      <div style={{
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* 成功横幅 */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '2px solid #22c55e',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
          <h1 style={{ color: '#166534', margin: '0 0 10px 0' }}>
            Pages Router 导航成功！
          </h1>
          <p style={{ margin: '0 0 10px 0', color: '#166534' }}>
            您已成功从 App Router 跳转到 Pages Router 页面
          </p>
          <p style={{ margin: '0', color: '#166534', fontWeight: 'bold' }}>
            使用查询参数方案，无需预生成静态页面
          </p>
        </div>

        {/* 交易信息 */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>交易详情</h2>
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <p><strong>交易ID:</strong> {transaction.id}</p>
            <p><strong>描述:</strong> {transaction.description}</p>
            <p><strong>金额:</strong> ¥{transaction.amount}</p>
            <p><strong>类型:</strong> {transaction.type === 'EXPENSE' ? '支出' : '收入'}</p>
            <p><strong>分类:</strong> {transaction.category?.name || '未分类'}</p>
            <p><strong>日期:</strong> {new Date(transaction.date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleBackClick}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500',
              flex: 1
            }}
          >
            返回主页
          </button>

          <button
            onClick={handleSave}
            style={{
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500',
              flex: 1
            }}
          >
            保存修改
          </button>
        </div>
      </div>
    );
  }

  // 默认的测试页面
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ 
        backgroundColor: '#f0f9ff', 
        border: '2px solid #0ea5e9', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h1 style={{ color: '#0369a1', margin: '0 0 10px 0' }}>
          🧪 Pages Router 测试页面
        </h1>
        <p style={{ margin: '0', color: '#0369a1' }}>
          这是一个 Pages Router 测试页面，用于验证基础功能
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '6px', 
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>平台信息</h2>
        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
          <p><strong>当前平台:</strong> {platform}</p>
          <p><strong>Capacitor 环境:</strong> {isCapacitor ? '是' : '否'}</p>
          <p><strong>当前路由:</strong> {router.asPath}</p>
          <p><strong>路由器类型:</strong> Pages Router</p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: isCapacitor ? '#fef3c7' : '#f0fdf4', 
        border: `1px solid ${isCapacitor ? '#f59e0b' : '#22c55e'}`, 
        borderRadius: '6px', 
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '16px',
          color: isCapacitor ? '#92400e' : '#166534'
        }}>
          {isCapacitor ? '📱 移动端环境' : '🌐 Web 端环境'}
        </h3>
        <p style={{ 
          margin: '0', 
          fontSize: '14px',
          color: isCapacitor ? '#92400e' : '#166534'
        }}>
          {isCapacitor 
            ? '当前在 Capacitor 移动端环境中运行，Pages Router 应该能正常工作'
            : '当前在 Web 端环境中运行，Pages Router 和 App Router 都应该能正常工作'
          }
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        flexWrap: 'wrap' 
      }}>
        <button
          onClick={handleBackClick}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 20px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          返回仪表盘
        </button>
        
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 20px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          刷新页面
        </button>
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '16px',
        backgroundColor: '#fafafa',
        border: '1px solid #e5e5e5',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#666'
      }}>
        <h4 style={{ margin: '0 0 8px 0' }}>测试说明</h4>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>如果您能看到这个页面，说明 Pages Router 基础功能正常</li>
          <li>请在 Web 端和 iOS 端都测试访问此页面</li>
          <li>确认平台检测信息是否正确</li>
          <li>确认返回按钮是否正常工作</li>
        </ul>
      </div>
    </div>
  );
}
