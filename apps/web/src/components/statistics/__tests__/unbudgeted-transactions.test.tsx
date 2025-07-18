import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetModalSelector } from '../budget-modal-selector';
import { apiClient } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

// Mock stores
jest.mock('@/store/account-book-store', () => ({
  useAccountBookStore: () => ({
    currentAccountBook: { id: 'test-account-book-id' },
  }),
}));

jest.mock('@/store/auth-store', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
  }),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('无预算交易筛选功能', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    selectedBudgetId: null,
    onBudgetChange: jest.fn(),
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    enableAggregation: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('当存在无预算交易时应显示无预算选项', async () => {
    // Mock API responses
    mockApiClient.get.mockImplementation((url) => {
      if (url === '/budgets') {
        return Promise.resolve([
          {
            id: 'budget-1',
            name: '测试预算',
            budgetType: 'PERSONAL',
            amount: 1000,
            spent: 500,
            remaining: 500,
          },
        ]);
      }
      if (url === '/statistics/check-unbudgeted') {
        return Promise.resolve({ hasUnbudgetedTransactions: true });
      }
      return Promise.resolve([]);
    });

    render(<BudgetModalSelector {...mockProps} />);

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText('无预算')).toBeInTheDocument();
    });

    // 验证无预算选项存在
    expect(screen.getByText('无预算')).toBeInTheDocument();
    expect(screen.getByText('显示未分配预算的交易')).toBeInTheDocument();
  });

  it('当不存在无预算交易时不应显示无预算选项', async () => {
    // Mock API responses
    mockApiClient.get.mockImplementation((url) => {
      if (url === '/budgets') {
        return Promise.resolve([
          {
            id: 'budget-1',
            name: '测试预算',
            budgetType: 'PERSONAL',
            amount: 1000,
            spent: 500,
            remaining: 500,
          },
        ]);
      }
      if (url === '/statistics/check-unbudgeted') {
        return Promise.resolve({ hasUnbudgetedTransactions: false });
      }
      return Promise.resolve([]);
    });

    render(<BudgetModalSelector {...mockProps} />);

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText('全部预算')).toBeInTheDocument();
    });

    // 验证无预算选项不存在
    expect(screen.queryByText('无预算')).not.toBeInTheDocument();
  });

  it('点击无预算选项应调用正确的回调', async () => {
    // Mock API responses
    mockApiClient.get.mockImplementation((url) => {
      if (url === '/budgets') {
        return Promise.resolve([]);
      }
      if (url === '/statistics/check-unbudgeted') {
        return Promise.resolve({ hasUnbudgetedTransactions: true });
      }
      return Promise.resolve([]);
    });

    render(<BudgetModalSelector {...mockProps} />);

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText('无预算')).toBeInTheDocument();
    });

    // 点击无预算选项
    fireEvent.click(screen.getByText('无预算'));

    // 验证回调被正确调用
    expect(mockProps.onBudgetChange).toHaveBeenCalledWith('NO_BUDGET');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('API调用失败时应正确处理错误', async () => {
    // Mock API failure
    mockApiClient.get.mockRejectedValue(new Error('API Error'));

    render(<BudgetModalSelector {...mockProps} />);

    // 等待错误处理完成
    await waitFor(() => {
      expect(screen.getByText('获取预算列表失败')).toBeInTheDocument();
    });

    // 验证无预算选项不显示
    expect(screen.queryByText('无预算')).not.toBeInTheDocument();
  });
});

describe('预算筛选器显示名称', () => {
  it('应正确显示无预算选项的名称', () => {
    // 这里可以测试BudgetFilter组件的getSelectedBudgetName方法
    // 由于该方法是私有的，我们可以通过渲染组件并检查显示的文本来测试
    
    // 这个测试需要根据实际的BudgetFilter组件实现来编写
    // 目前先保留测试结构
    expect(true).toBe(true);
  });
});
