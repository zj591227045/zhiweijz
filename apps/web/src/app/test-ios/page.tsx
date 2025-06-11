'use client';

import { useEffect, useState } from 'react';
import { getPlatformInfo } from '@/lib/platform-detection';
import { PageContainer } from '@/components/layout/page-container';

export default function TestIOSPage() {
  const [platformInfo, setPlatformInfo] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const info = getPlatformInfo();
    setPlatformInfo(info);
    console.log('🔍 测试页面平台信息:', info);
  }, []);

  return (
    <>
      <PageContainer
        title="iOS测试页面"
        showBackButton={true}
        onBackClick={() => window.history.back()}
      >
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
          <div style={{
            background: '#007AFF',
            color: 'white',
            padding: '16px',
            marginBottom: '20px',
            borderRadius: '8px'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>iOS Dynamic Island适配测试</h2>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>平台检测结果:</h3>
            {platformInfo ? (
              <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
                <div>iOS: {platformInfo.isIOS ? '✅ 是' : '❌ 否'}</div>
                <div>Android: {platformInfo.isAndroid ? '✅ 是' : '❌ 否'}</div>
                <div>Capacitor: {platformInfo.isCapacitor ? '✅ 是' : '❌ 否'}</div>
                <div>Mobile: {platformInfo.isMobile ? '✅ 是' : '❌ 否'}</div>
                <div>Has Notch: {platformInfo.hasNotch ? '✅ 是' : '❌ 否'}</div>
                <div style={{ marginTop: '10px', fontSize: '12px' }}>
                  屏幕: {platformInfo.screenSize?.width} x {platformInfo.screenSize?.height}
                </div>
              </div>
            ) : (
              <div>加载中...</div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Header固定测试:</h3>
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <p>请滚动页面测试header是否固定在顶部</p>
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} style={{ padding: '10px', background: i % 2 ? '#e0e0e0' : '#f0f0f0', margin: '5px 0' }}>
                  测试内容行 {i + 1} - 这是用来测试滚动的内容
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>模态框测试:</h3>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              打开模态框
            </button>
          </div>


        </div>
      </PageContainer>

      {/* 测试模态框 */}
      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '80%',
            overflow: 'hidden'
          }}>
            <div className="modal-header" style={{
              background: '#007AFF',
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0 }}>测试模态框</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p>这是一个测试模态框，用来验证模态框的header是否正确适配iOS Dynamic Island。</p>
              <p>模态框的header应该正确显示在安全区域内。</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
