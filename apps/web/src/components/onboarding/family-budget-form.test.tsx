/**
 * 家庭预算表单组件测试
 * 用于验证家庭预算设置功能是否正常工作
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FamilyBudgetForm } from './family-budget-form';
import { BudgetApiService } from '@/api/budget-api';
import { FamilyApiService } from '@/api/family-api';

// Mock API services
jest.mock('@/api/budget-api');
jest.mock('@/api/family-api');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockBudgetApiService = BudgetApiService as jest.Mocked<typeof BudgetApiService>;
const mockFamilyApiService = FamilyApiService as jest.Mocked<typeof FamilyApiService>;

describe('FamilyBudgetForm', () => {
  const mockProps = {
    accountBookId: 'test-account-book-id',
    familyId: 'test-family-id',
    onBudgetsUpdated: jest.fn(),
    onLoading: jest.fn(),
  };

  const mockFamilyData = {
    id: 'test-family-id',
    name: 'Test Family',
    members: [
      {
        id: 'member-1',
        name: '张三',
        role: 'admin',
        isRegistered: true,
        isCustodial: false,
        userId: 'user-1',
        isCurrentUser: true,
      },
      {
        id: 'member-2',
        name: '李四',
        role: 'member',
        isRegistered: true,
        isCustodial: false,
        userId: 'user-2',
        isCurrentUser: false,
      },
      {
        id: 'member-3',
        name: '小明',
        role: 'member',
        isRegistered: false,
        isCustodial: true,
        isCurrentUser: false,
      },
    ],
  };

  const mockBudgets = [
    {
      id: 'budget-1',
      name: '张三的预算',
      familyMemberId: 'member-1',
      amount: 3000,
      spent: 1500,
      categoryId: null,
    },
    {
      id: 'budget-2',
      name: '李四的预算',
      familyMemberId: 'member-2',
      amount: 2000,
      spent: 800,
      categoryId: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFamilyApiService.getFamilyById.mockResolvedValue(mockFamilyData);
    mockBudgetApiService.getBudgets.mockResolvedValue(mockBudgets);
  });

  it('应该正确渲染家庭预算表单', async () => {
    render(<FamilyBudgetForm {...mockProps} />);

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText('设置家庭成员预算')).toBeInTheDocument();
    });

    // 验证家庭成员显示
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('小明')).toBeInTheDocument();

    // 验证当前用户标识
    expect(screen.getByText('（您）')).toBeInTheDocument();

    // 验证角色标识
    expect(screen.getByText('管理员')).toBeInTheDocument();
    expect(screen.getAllByText('成员')).toHaveLength(2);

    // 验证托管成员标识
    expect(screen.getByText('托管成员')).toBeInTheDocument();
  });

  it('应该显示现有预算信息', async () => {
    render(<FamilyBudgetForm {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('当前预算：¥3000')).toBeInTheDocument();
      expect(screen.getByText('已使用：¥1500')).toBeInTheDocument();
      expect(screen.getByText('当前预算：¥2000')).toBeInTheDocument();
      expect(screen.getByText('已使用：¥800')).toBeInTheDocument();
    });
  });

  it('应该支持批量设置预算', async () => {
    render(<FamilyBudgetForm {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('快速批量设置')).toBeInTheDocument();
    });

    // 点击批量设置按钮
    const batchButton = screen.getByText('全部设为 ¥3000');
    fireEvent.click(batchButton);

    // 验证回调函数被调用
    expect(mockProps.onBudgetsUpdated).toHaveBeenCalledWith({
      'member-1': 3000,
      'member-2': 3000,
      'member-3': 3000,
    });
  });

  it('应该支持单独设置成员预算', async () => {
    render(<FamilyBudgetForm {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
    });

    // 修改张三的预算
    const input = screen.getByDisplayValue('3000');
    fireEvent.change(input, { target: { value: '4000' } });

    // 验证回调函数被调用
    expect(mockProps.onBudgetsUpdated).toHaveBeenCalledWith({
      'member-1': 4000,
      'member-2': 2000,
      'member-3': 0,
    });
  });

  it('应该正确显示预算汇总', async () => {
    render(<FamilyBudgetForm {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('预算汇总')).toBeInTheDocument();
      expect(screen.getByText('2 / 3')).toBeInTheDocument(); // 设置成员数
      expect(screen.getByText('¥5000')).toBeInTheDocument(); // 总预算金额
    });
  });

  it('普通成员应该只能设置自己的预算', async () => {
    // 修改 mock 数据，让李四成为当前用户
    const memberFamilyData = {
      ...mockFamilyData,
      members: mockFamilyData.members.map(member => ({
        ...member,
        isCurrentUser: member.id === 'member-2',
      })),
    };
    mockFamilyApiService.getFamilyById.mockResolvedValue(memberFamilyData);

    render(<FamilyBudgetForm {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('设置您的个人预算')).toBeInTheDocument();
    });

    // 应该只显示当前用户（李四）的预算设置
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.queryByText('张三')).not.toBeInTheDocument();
    expect(screen.queryByText('小明')).not.toBeInTheDocument();

    // 不应该显示批量设置工具
    expect(screen.queryByText('快速批量设置')).not.toBeInTheDocument();
  });

  it('应该处理API错误', async () => {
    mockFamilyApiService.getFamilyById.mockRejectedValue(new Error('API Error'));

    render(<FamilyBudgetForm {...mockProps} />);

    await waitFor(() => {
      expect(mockProps.onLoading).toHaveBeenCalledWith(false);
    });
  });
});
