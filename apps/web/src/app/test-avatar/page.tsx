'use client';

import { useState } from 'react';

export default function TestAvatarPage() {
  const [message, setMessage] = useState('头像上传功能测试页面');

  return (
    <div style={{ padding: '20px' }}>
      <h1>头像上传功能测试</h1>
      <p>{message}</p>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => setMessage('功能正常工作！')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          测试按钮
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>功能状态</h2>
        <ul>
          <li>✅ React 组件渲染正常</li>
          <li>✅ 状态管理正常</li>
          <li>✅ 事件处理正常</li>
        </ul>
      </div>
    </div>
  );
}
