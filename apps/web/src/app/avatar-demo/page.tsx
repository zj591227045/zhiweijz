'use client';

import { useState } from 'react';
import { AvatarUploaderSimple } from '@/components/profile/avatar-uploader-simple';
import type { AvatarData } from '@/components/profile/avatar-uploader-simple';
import '@/app/settings/profile/profile.css';

export default function AvatarDemoPage() {
  const [currentAvatar, setCurrentAvatar] = useState<string>('avatar-1');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');

  const handleAvatarChange = async (avatarData: AvatarData) => {
    setIsUploading(true);
    setUploadResult('');

    try {
      // 模拟上传过程
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (avatarData.type === 'preset') {
        setCurrentAvatar(avatarData.data.id);
        setUploadResult(`✅ 预设头像更新成功: ${avatarData.data.name}`);
      } else {
        // 模拟文件上传
        const fileName = avatarData.data.name;
        const fileSize = (avatarData.data.size / 1024 / 1024).toFixed(2);
        setCurrentAvatar('uploaded-avatar');
        setUploadResult(`✅ 文件上传成功: ${fileName} (${fileSize}MB)`);
      }
    } catch (error) {
      setUploadResult(`❌ 上传失败: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: '600', 
        marginBottom: '8px',
        color: '#1a1a1a'
      }}>
        🎨 头像上传功能演示
      </h1>
      
      <p style={{ 
        fontSize: '16px', 
        color: '#666', 
        marginBottom: '40px',
        lineHeight: '1.5'
      }}>
        这是头像上传功能的完整演示页面，展示了预设头像选择和文件上传功能。
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        alignItems: 'start'
      }}>
        {/* 头像上传组件 */}
        <div>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            marginBottom: '20px',
            color: '#1a1a1a'
          }}>
            头像上传组件
          </h2>
          
          <div style={{
            padding: '20px',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            backgroundColor: '#fafafa'
          }}>
            <AvatarUploaderSimple
              currentAvatar={currentAvatar}
              username="演示用户"
              registrationOrder={1}
              onAvatarChange={handleAvatarChange}
              isUploading={isUploading}
            />
          </div>
        </div>

        {/* 功能说明 */}
        <div>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            marginBottom: '20px',
            color: '#1a1a1a'
          }}>
            功能特性
          </h2>
          
          <div style={{
            padding: '20px',
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            backgroundColor: '#f8f9fa'
          }}>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <li style={{ marginBottom: '12px' }}>
                <span style={{ color: '#22c55e', marginRight: '8px' }}>✅</span>
                <strong>向后兼容性</strong>：保留预设头像选择功能
              </li>
              <li style={{ marginBottom: '12px' }}>
                <span style={{ color: '#22c55e', marginRight: '8px' }}>✅</span>
                <strong>文件上传</strong>：支持自定义图片上传
              </li>
              <li style={{ marginBottom: '12px' }}>
                <span style={{ color: '#22c55e', marginRight: '8px' }}>✅</span>
                <strong>文件验证</strong>：自动检查文件格式和大小
              </li>
              <li style={{ marginBottom: '12px' }}>
                <span style={{ color: '#22c55e', marginRight: '8px' }}>✅</span>
                <strong>实时预览</strong>：上传前可预览图片效果
              </li>
              <li style={{ marginBottom: '12px' }}>
                <span style={{ color: '#22c55e', marginRight: '8px' }}>✅</span>
                <strong>进度反馈</strong>：显示上传进度和状态
              </li>
              <li style={{ marginBottom: '12px' }}>
                <span style={{ color: '#22c55e', marginRight: '8px' }}>✅</span>
                <strong>错误处理</strong>：友好的错误提示信息
              </li>
              <li>
                <span style={{ color: '#22c55e', marginRight: '8px' }}>✅</span>
                <strong>响应式设计</strong>：适配各种屏幕尺寸
              </li>
            </ul>
          </div>

          {/* 上传结果 */}
          {uploadResult && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: uploadResult.includes('✅') ? '#f0f9ff' : '#fef2f2',
              border: `1px solid ${uploadResult.includes('✅') ? '#0ea5e9' : '#ef4444'}`,
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {uploadResult}
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '20px',
          color: '#1a1a1a'
        }}>
          使用说明
        </h2>
        
        <div style={{
          padding: '20px',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          backgroundColor: '#ffffff'
        }}>
          <ol style={{ 
            fontSize: '14px',
            lineHeight: '1.6',
            paddingLeft: '20px'
          }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>点击头像</strong>：打开头像选择器
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>选择预设头像</strong>：从多个分类中选择喜欢的头像
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>上传自定义头像</strong>：点击"上传自定义头像"按钮选择图片文件
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>支持的格式</strong>：JPG、PNG、WebP、GIF
            </li>
            <li>
              <strong>文件大小限制</strong>：最大5MB，系统会自动压缩优化
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
