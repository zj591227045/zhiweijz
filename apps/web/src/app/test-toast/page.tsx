'use client';

import { toast } from 'sonner';

export default function TestToastPage() {
  const testToasts = () => {
    // 测试不同类型的toast
    toast.success('成功消息测试', { duration: 3000 });
    
    setTimeout(() => {
      toast.error('错误消息测试', { duration: 3000 });
    }, 500);
    
    setTimeout(() => {
      toast.info('信息消息测试', { duration: 3000 });
    }, 1000);
    
    setTimeout(() => {
      toast('普通消息测试', { duration: 3000 });
    }, 1500);
  };

  const testHighZIndex = () => {
    toast.success('高z-index测试', { 
      duration: 3000,
      style: {
        zIndex: 99999
      }
    });
  };

  const testPersistentToast = () => {
    toast.success('持久化toast测试', { 
      duration: Infinity,
      dismissible: true
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Toast 测试页面</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <button 
          onClick={testToasts}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          测试多个Toast
        </button>
        
        <button 
          onClick={testHighZIndex}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          测试高Z-Index Toast
        </button>
        
        <button 
          onClick={testPersistentToast}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          测试持久化Toast
        </button>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '5px' }}>
        <h3>测试说明：</h3>
        <ul>
          <li>点击"测试多个Toast"按钮，应该看到4个不同类型的toast依次出现</li>
          <li>每个toast应该显示3秒后自动消失</li>
          <li>点击"测试高Z-Index Toast"测试z-index设置</li>
          <li>点击"测试持久化Toast"测试不自动消失的toast</li>
        </ul>
      </div>
    </div>
  );
}
