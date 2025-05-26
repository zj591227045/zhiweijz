'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@zhiweijz/web';
import { PageContainer } from '@/components/layout/page-container';
import { feedbackService } from '@/lib/api-services';
import { toast } from 'sonner';
import './feedback.css';

type FeedbackType = 'bug' | 'feature' | 'other';

export default function FeedbackPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bug' as FeedbackType,
    title: '',
    content: '',
    contact: ''
  });

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('请输入反馈标题');
      return;
    }
    
    if (!formData.content.trim()) {
      toast.error('请输入反馈内容');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await feedbackService.submitFeedback({
        type: formData.type,
        title: formData.title.trim(),
        content: formData.content.trim(),
        contact: formData.contact.trim() || undefined
      });

      toast.success('反馈提交成功，感谢您的建议！');
      
      // 重置表单
      setFormData({
        type: 'bug',
        title: '',
        content: '',
        contact: ''
      });
      
      // 返回设置页面
      router.back();
    } catch (error) {
      console.error('提交反馈失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer title="意见反馈" showBackButton={true} showBottomNav={false}>
      <div className="feedback-container">
        <div className="feedback-header">
          <div className="feedback-icon">
            <i className="fas fa-comment-alt"></i>
          </div>
          <div className="feedback-info">
            <h3>意见反馈</h3>
            <p>您的反馈对我们非常重要，帮助我们改进产品体验。</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label className="form-label">反馈类型</label>
            <div className="feedback-types">
              <label className={`type-option ${formData.type === 'bug' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value="bug"
                  checked={formData.type === 'bug'}
                  onChange={(e) => handleInputChange('type', e.target.value as FeedbackType)}
                />
                <div className="type-content">
                  <i className="fas fa-bug"></i>
                  <span>问题反馈</span>
                </div>
              </label>

              <label className={`type-option ${formData.type === 'feature' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value="feature"
                  checked={formData.type === 'feature'}
                  onChange={(e) => handleInputChange('type', e.target.value as FeedbackType)}
                />
                <div className="type-content">
                  <i className="fas fa-lightbulb"></i>
                  <span>功能建议</span>
                </div>
              </label>

              <label className={`type-option ${formData.type === 'other' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value="other"
                  checked={formData.type === 'other'}
                  onChange={(e) => handleInputChange('type', e.target.value as FeedbackType)}
                />
                <div className="type-content">
                  <i className="fas fa-comment"></i>
                  <span>其他</span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="title">
              反馈标题 <span className="required">*</span>
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="请简要描述您的问题或建议"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              maxLength={100}
            />
            <div className="char-count">{formData.title.length}/100</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="content">
              详细描述 <span className="required">*</span>
            </label>
            <textarea
              id="content"
              className="form-textarea"
              placeholder="请详细描述您遇到的问题或建议的功能..."
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows={6}
              maxLength={1000}
            />
            <div className="char-count">{formData.content.length}/1000</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contact">
              联系方式 <span className="optional">(可选)</span>
            </label>
            <input
              id="contact"
              type="text"
              className="form-input"
              placeholder="邮箱或微信号，方便我们联系您"
              value={formData.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              maxLength={100}
            />
            <div className="form-hint">
              提供联系方式有助于我们更好地解决您的问题
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  提交中...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  提交反馈
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
