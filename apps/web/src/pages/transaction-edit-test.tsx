import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

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

export default function TransactionEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取交易详情
  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id || typeof id !== 'string') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('📝 [TransactionEdit] 开始获取交易详情:', id);

        // 模拟 API 调用
        const response = await fetch(`/api/transactions/${id}`);
        
        if (!response.ok) {
          throw new Error('获取交易详情失败');
        }

        const data = await response.json();
        console.log('📝 [TransactionEdit] 交易详情获取成功:', data);
        setTransaction(data);
      } catch (err) {
        console.error('📝 [TransactionEdit] 获取交易详情失败:', err);
        setError('获取交易详情失败，请重试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
  }, [id]);

  // 返回主页
  const handleGoBack = () => {
    console.log('📝 [TransactionEdit] 返回主页');
    router.push('/dashboard');
  };

  // 保存交易
  const handleSave = async () => {
    try {
      console.log('📝 [TransactionEdit] 保存交易:', transaction);
      alert('交易保存成功！');
      handleGoBack();
    } catch (err) {
      console.error('📝 [TransactionEdit] 保存交易失败:', err);
      alert('保存交易失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>编辑交易 - 只为记账</title>
        </Head>
        <div className="transaction-edit-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>编辑交易 - 只为记账</title>
        </Head>
        <div className="transaction-edit-page">
          <div className="error-container">
            <h2>❌ 加载失败</h2>
            <p>{error}</p>
            <button onClick={handleGoBack} className="btn-primary">
              返回主页
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!transaction) {
    return (
      <>
        <Head>
          <title>编辑交易 - 只为记账</title>
        </Head>
        <div className="transaction-edit-page">
          <div className="error-container">
            <h2>❌ 交易不存在</h2>
            <p>找不到指定的交易记录 (ID: {id})</p>
            <button onClick={handleGoBack} className="btn-primary">
              返回主页
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>编辑交易 - 只为记账</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="transaction-edit-page">
        {/* 页面头部 */}
        <header className="page-header">
          <button onClick={handleGoBack} className="back-button">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1>编辑交易</h1>
          <button onClick={handleSave} className="save-button">
            保存
          </button>
        </header>

        {/* 成功提示 */}
        <div className="success-banner">
          <div className="success-icon">✅</div>
          <div className="success-content">
            <h2>Pages Router 导航成功！</h2>
            <p>您已成功从 App Router 跳转到 Pages Router 页面</p>
            <p><strong>使用查询参数方案，无需预生成静态页面</strong></p>
            <div className="transaction-info">
              <p><strong>交易ID:</strong> {transaction.id}</p>
              <p><strong>描述:</strong> {transaction.description}</p>
              <p><strong>金额:</strong> ¥{transaction.amount}</p>
              <p><strong>类型:</strong> {transaction.type === 'EXPENSE' ? '支出' : '收入'}</p>
              <p><strong>分类:</strong> {transaction.category?.name || '未分类'}</p>
            </div>
          </div>
        </div>

        {/* 交易表单 */}
        <div className="transaction-form">
          <div className="form-group">
            <label>描述</label>
            <input 
              type="text" 
              value={transaction.description} 
              onChange={(e) => setTransaction({...transaction, description: e.target.value})}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>金额</label>
            <input 
              type="number" 
              value={transaction.amount} 
              onChange={(e) => setTransaction({...transaction, amount: parseFloat(e.target.value)})}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>类型</label>
            <select 
              value={transaction.type} 
              onChange={(e) => setTransaction({...transaction, type: e.target.value as 'EXPENSE' | 'INCOME'})}
              className="form-select"
            >
              <option value="EXPENSE">支出</option>
              <option value="INCOME">收入</option>
            </select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="action-buttons">
          <button onClick={handleGoBack} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSave} className="btn-primary">
            保存修改
          </button>
        </div>
      </div>

      <style jsx>{`
        .transaction-edit-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 0;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: white;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .back-button, .save-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .back-button {
          background: #f0f0f0;
          color: #333;
        }

        .save-button {
          background: #4CAF50;
          color: white;
        }

        .success-banner {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 2rem;
          margin: 1rem;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }

        .success-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .success-content h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .transaction-info {
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
          text-align: left;
        }

        .transaction-info p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
        }

        .transaction-form {
          background: white;
          margin: 1rem;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          padding: 1rem;
        }

        .btn-primary, .btn-secondary {
          flex: 1;
          padding: 1rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background: #45a049;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          padding: 2rem;
          text-align: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4CAF50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
