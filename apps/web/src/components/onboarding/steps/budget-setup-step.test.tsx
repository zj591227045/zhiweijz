import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetSetupStep } from './budget-setup-step';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { BudgetApiService } from '@/api/budget-api';
import { FamilyApiService } from '@/api/family-api';

// Mock the stores and services
jest.mock('@/store/onboarding-store');
jest.mock('@/store/account-book-store');
jest.mock('@/api/budget-api');
jest.mock('@/api/family-api');

const mockUseOnboardingStore = useOnboardingStore as jest.MockedFunction<typeof useOnboardingStore>;
const mockUseAccountBookStore = useAccountBookStore as jest.MockedFunction<
  typeof useAccountBookStore
>;
const mockBudgetApiService = BudgetApiService as jest.Mocked<typeof BudgetApiService>;
const mockFamilyApiService = FamilyApiService as jest.Mocked<typeof FamilyApiService>;

describe('BudgetSetupStep', () => {
  const mockNextStep = jest.fn();
  const mockPreviousStep = jest.fn();
  const mockSetBudgetEnabled = jest.fn();
  const mockSetPersonalBudgetAmount = jest.fn();
  const mockSetFamilyBudgets = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseOnboardingStore.mockReturnValue({
      selectedAccountType: 'personal',
      budgetEnabled: null,
      personalBudgetAmount: 0,
      familyBudgets: {},
      createdFamilyId: null,
      setBudgetEnabled: mockSetBudgetEnabled,
      setPersonalBudgetAmount: mockSetPersonalBudgetAmount,
      setFamilyBudgets: mockSetFamilyBudgets,
      nextStep: mockNextStep,
      previousStep: mockPreviousStep,
    });

    mockUseAccountBookStore.mockReturnValue({
      currentAccountBook: {
        id: 'test-account-book',
        name: '测试账本',
        type: 'PERSONAL',
        familyId: null,
        transactionCount: 0,
        budgetCount: 0,
      },
    });

    mockBudgetApiService.getBudgets.mockResolvedValue([]);
  });

  it('应该正确渲染个人预算设置', async () => {
    render(<BudgetSetupStep />);

    expect(screen.getByText('预算控制设置')).toBeInTheDocument();
    expect(screen.getByText('科学的预算管理，让您的财务更加健康')).toBeInTheDocument();
  });

  it('应该显示智能跳过提示当存在当月预算时', async () => {
    const mockBudgets = [
      {
        id: 'budget-1',
        amount: 3000,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      },
    ];

    mockBudgetApiService.getBudgets.mockResolvedValue(mockBudgets);

    render(<BudgetSetupStep />);

    await waitFor(() => {
      expect(screen.getByText('检测到您已设置了本月预算')).toBeInTheDocument();
    });
  });

  it('应该根据用户角色显示不同的家庭预算设置界面', async () => {
    const mockFamilyData = {
      id: 'family-1',
      name: '测试家庭',
      members: [
        { id: 'member-1', name: '用户1', role: 'ADMIN', isCurrentUser: true },
        { id: 'member-2', name: '用户2', role: 'MEMBER', isCurrentUser: false },
      ],
    };

    mockUseOnboardingStore.mockReturnValue({
      selectedAccountType: 'family',
      budgetEnabled: true,
      personalBudgetAmount: 0,
      familyBudgets: {},
      createdFamilyId: 'family-1',
      setBudgetEnabled: mockSetBudgetEnabled,
      setPersonalBudgetAmount: mockSetPersonalBudgetAmount,
      setFamilyBudgets: mockSetFamilyBudgets,
      nextStep: mockNextStep,
      previousStep: mockPreviousStep,
    });

    mockFamilyApiService.getFamilyById.mockResolvedValue(mockFamilyData);

    render(<BudgetSetupStep />);

    await waitFor(() => {
      expect(screen.getByText('设置家庭成员预算')).toBeInTheDocument();
      expect(
        screen.getByText('作为管理员，您可以为每位家庭成员设置月度预算金额'),
      ).toBeInTheDocument();
    });
  });

  it('应该为普通家庭成员显示受限的预算设置界面', async () => {
    const mockFamilyData = {
      id: 'family-1',
      name: '测试家庭',
      members: [
        { id: 'member-1', name: '管理员', role: 'ADMIN', isCurrentUser: false },
        { id: 'member-2', name: '当前用户', role: 'MEMBER', isCurrentUser: true },
      ],
    };

    mockUseOnboardingStore.mockReturnValue({
      selectedAccountType: 'family',
      budgetEnabled: true,
      personalBudgetAmount: 0,
      familyBudgets: {},
      createdFamilyId: 'family-1',
      setBudgetEnabled: mockSetBudgetEnabled,
      setPersonalBudgetAmount: mockSetPersonalBudgetAmount,
      setFamilyBudgets: mockSetFamilyBudgets,
      nextStep: mockNextStep,
      previousStep: mockPreviousStep,
    });

    mockFamilyApiService.getFamilyById.mockResolvedValue(mockFamilyData);

    render(<BudgetSetupStep />);

    await waitFor(() => {
      expect(screen.getByText('设置您的个人预算')).toBeInTheDocument();
      expect(screen.getByText('设置您的月度预算金额')).toBeInTheDocument();
    });
  });

  it('应该正确格式化预算日期显示', async () => {
    const mockBudgets = [
      {
        id: 'budget-1',
        amount: 3000,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
        familyMemberId: null,
      },
    ];

    mockBudgetApiService.getBudgets.mockResolvedValue(mockBudgets);

    render(<BudgetSetupStep />);

    await waitFor(() => {
      expect(screen.getByText(/2024-01-01 至 2024-01-31/)).toBeInTheDocument();
    });
  });
});
