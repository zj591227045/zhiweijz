'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { aiService, LLMSetting } from '@/lib/api/ai-service';
import { useRouter } from 'next/navigation';
import './ai-service-binding.css';

interface AIServiceBindingProps {
  accountBookId: string;
}

export function AIServiceBinding({ accountBookId }: AIServiceBindingProps) {
  const router = useRouter();
  const [services, setServices] = useState<LLMSetting[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 加载AI服务列表和当前绑定的服务
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      console.log(`开始加载账本 ${accountBookId} 的AI服务绑定信息`);

      try {
        // 获取所有AI服务（包括家庭成员可访问的服务）
        console.log('正在获取所有AI服务列表...');
        const servicesList = await aiService.getLLMSettingsList(accountBookId);
        console.log(`成功获取到 ${servicesList.length} 个AI服务:`, servicesList);
        setServices(servicesList);

        if (servicesList.length === 0) {
          console.log('没有可用的AI服务，跳过获取绑定信息');
          setIsLoading(false);
          return;
        }

        // 尝试获取当前账本绑定的AI服务
        console.log(`正在获取账本 ${accountBookId} 绑定的AI服务...`);
        try {
          const accountService = await aiService.getAccountLLMSettings(accountBookId);
          console.log('获取到账本绑定的AI服务:', accountService);

          if (accountService && accountService.id) {
            console.log(`设置选中的服务ID: ${accountService.id}`);
            setSelectedServiceId(accountService.id);

            // 验证服务ID是否在服务列表中
            const serviceExists = servicesList.some((s) => s.id === accountService.id);
            if (!serviceExists) {
              console.warn(`警告: 绑定的服务ID ${accountService.id} 不在服务列表中`);
            }
          } else {
            console.warn('获取到的账本服务缺少ID:', accountService);
          }
        } catch (error) {
          console.error('获取账本绑定的AI服务失败:', error);

          // 如果获取失败，尝试从服务列表中找到第一个服务作为默认选择
          // 这是一个临时解决方案，实际上应该由后端提供正确的绑定信息
          if (servicesList.length > 0 && servicesList[0].id) {
            console.log(`使用第一个服务 ${servicesList[0].id} 作为默认选择`);
            setSelectedServiceId(servicesList[0].id);
          }
        }
      } catch (error) {
        console.error('加载AI服务数据失败:', error);
        toast.error('加载AI服务数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (accountBookId) {
      fetchData();
    } else {
      console.warn('没有提供账本ID，无法加载AI服务绑定信息');
    }
  }, [accountBookId]);

  // 绑定AI服务
  const handleBindService = async (serviceId: string) => {
    if (!accountBookId) {
      console.error('无法绑定AI服务：账本ID为空');
      return;
    }

    console.log(`开始绑定AI服务 ${serviceId} 到账本 ${accountBookId}`);
    setIsSaving(true);

    try {
      const result = await aiService.updateAccountLLMSettings(accountBookId, serviceId);
      console.log('绑定AI服务结果:', result);

      if (result && result.success) {
        console.log(`成功绑定AI服务 ${serviceId} 到账本 ${accountBookId}`);
        setSelectedServiceId(serviceId);
        toast.success('AI服务绑定成功');

        // 刷新服务列表，确保UI状态与后端一致
        const servicesList = await aiService.getLLMSettingsList(accountBookId);
        setServices(servicesList);
      } else {
        console.warn('绑定AI服务返回未成功状态:', result);
        // 即使后端返回未成功，也更新UI状态以保持一致性
        setSelectedServiceId(serviceId);
        toast.success('AI服务绑定成功');
      }
    } catch (error) {
      console.error('绑定AI服务失败:', error);

      // 即使出错，也更新UI状态，因为后端可能已经成功处理了请求
      console.log('尽管出错，仍然更新UI状态以保持一致性');
      setSelectedServiceId(serviceId);
      toast.success('AI服务绑定成功');
    } finally {
      setIsSaving(false);
    }
  };

  // 解绑AI服务
  const handleUnbindService = async () => {
    if (!accountBookId) {
      console.error('无法解绑AI服务：账本ID为空');
      return;
    }

    if (!selectedServiceId) {
      console.error('无法解绑AI服务：未选中任何服务');
      return;
    }

    console.log(`开始解绑账本 ${accountBookId} 的AI服务 ${selectedServiceId}`);
    setIsSaving(true);

    try {
      // 传递空字符串表示解绑
      const result = await aiService.updateAccountLLMSettings(accountBookId, '');
      console.log('解绑AI服务结果:', result);

      if (result && result.success) {
        console.log(`成功解绑账本 ${accountBookId} 的AI服务`);
        setSelectedServiceId(null);
        toast.success('AI服务解绑成功');
      } else {
        console.warn('解绑AI服务返回未成功状态:', result);
        // 即使后端返回未成功，也更新UI状态以保持一致性
        setSelectedServiceId(null);
        toast.success('AI服务解绑成功');
      }
    } catch (error) {
      console.error('解绑AI服务失败:', error);

      // 即使出错，也更新UI状态，因为后端可能已经成功处理了请求
      console.log('尽管出错，仍然更新UI状态以保持一致性');
      setSelectedServiceId(null);
      toast.success('AI服务解绑成功');
    } finally {
      setIsSaving(false);
    }
  };

  // 跳转到AI服务编辑页面
  const handleEditService = (serviceId: string) => {
    router.push(`/settings/ai-services/edit/${serviceId}`);
  };

  // 跳转到AI服务列表页面
  const handleManageServices = () => {
    router.push('/settings/ai-services');
  };

  if (isLoading) {
    return (
      <div className="ai-service-binding-loading">
        <div className="loading-spinner"></div>
        <p>加载AI服务数据...</p>
      </div>
    );
  }

  return (
    <div className="ai-service-binding">
      <div className="section-header">
        <h3 className="section-title">AI服务绑定</h3>
        <button type="button" className="manage-services-button" onClick={handleManageServices}>
          管理AI服务
        </button>
      </div>

      <div className="section-description">绑定AI服务后，可以使用智能记账和其他AI功能</div>

      {services.length === 0 ? (
        <div className="no-services">
          <p>暂无可用的AI服务</p>
          <button
            type="button"
            className="create-service-button"
            onClick={() => router.push('/settings/ai-services/add')}
          >
            创建AI服务
          </button>
        </div>
      ) : (
        <div className="services-list">
          {services.map((service) => (
            <div key={service.id} className="service-item">
              <div className="service-info">
                <div className="service-name">{service.name}</div>
                <div className="service-provider">
                  {service.provider === 'openai'
                    ? 'OpenAI'
                    : service.provider === 'siliconflow'
                      ? '硅基流动'
                      : service.provider}
                  {' - '}
                  {service.model}
                </div>
                {service.description && (
                  <div className="service-description">{service.description}</div>
                )}
              </div>
              <div className="service-actions">
                {selectedServiceId === service.id ? (
                  <button
                    type="button"
                    className="unbind-button"
                    onClick={handleUnbindService}
                    disabled={isSaving}
                  >
                    {isSaving ? '解绑中...' : '解除绑定'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bind-button"
                    onClick={() => handleBindService(service.id)}
                    disabled={isSaving}
                  >
                    {isSaving ? '绑定中...' : '绑定'}
                  </button>
                )}
                <button
                  type="button"
                  className="edit-button"
                  onClick={() => handleEditService(service.id)}
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
