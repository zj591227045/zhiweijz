import { create } from 'zustand';
import { StorageAdapter } from '../models/common';
import type { OnboardingStep, AccountType, FamilyAction } from './create-onboarding-store';

// 引导状态接口（简化版，不使用 persist）
export interface SimpleOnboardingState {
  // 基础状态
  isCompleted: boolean;
  currentStep: OnboardingStep;
  isVisible: boolean;
  
  // 用户选择
  selectedAccountType: AccountType | null;
  selectedFamilyAction: FamilyAction | null;
  familyName: string;
  inviteCode: string;
  budgetEnabled: boolean | null;
  personalBudgetAmount: number;
  familyBudgets: Record<string, number>;
  
  // 创建结果
  createdFamilyId: string | null;
  createdInviteCode: string | null;

  // 托管成员相关
  showCustodialMemberStep: boolean;
  custodialMembers: Array<{
    name: string;
    gender?: 'male' | 'female' | 'other';
    birthDate?: string;
  }>;
  
  // 操作方法
  startOnboarding: () => void;
  startOnboardingFromStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  setCurrentStep: (step: OnboardingStep) => void;
  goToStep: (step: OnboardingStep) => void;
  
  // 数据设置方法
  setAccountType: (type: AccountType) => void;
  setFamilyAction: (action: FamilyAction) => void;
  setFamilyName: (name: string) => void;
  setInviteCode: (code: string) => void;
  setBudgetEnabled: (enabled: boolean | null) => void;
  setPersonalBudgetAmount: (amount: number) => void;
  setFamilyBudgets: (budgets: Record<string, number>) => void;
  setCreatedFamilyId: (id: string) => void;
  setCreatedInviteCode: (code: string) => void;
  setShowCustodialMemberStep: (show: boolean) => void;
  setCustodialMembers: (members: Array<{
    name: string;
    gender?: 'male' | 'female' | 'other';
    birthDate?: string;
  }>) => void;
  addCustodialMember: (member: {
    name: string;
    gender?: 'male' | 'female' | 'other';
    birthDate?: string;
  }) => void;

  // 重置方法
  resetOnboarding: () => void;
  
  // 手动持久化方法
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

// 创建简单的引导状态管理（不使用 persist）
export function createSimpleOnboardingStore(storage: StorageAdapter) {
  const STORAGE_KEY = 'simple-onboarding-storage';
  
  return create<SimpleOnboardingState>()((set, get) => {
    // 初始状态
    const initialState = {
      isCompleted: false,
      currentStep: 'account-type' as OnboardingStep,
      isVisible: false,
      
      selectedAccountType: null,
      selectedFamilyAction: null,
      familyName: '',
      inviteCode: '',
      budgetEnabled: null,
      personalBudgetAmount: 0,
      familyBudgets: {},
      
      createdFamilyId: null,
      createdInviteCode: null,

      showCustodialMemberStep: false,
      custodialMembers: [],
    };

    // 手动保存状态到存储
    const saveToStorage = async () => {
      try {
        const currentState = get();
        const stateToSave = {
          isCompleted: currentState.isCompleted,
          currentStep: currentState.currentStep,
          isVisible: currentState.isVisible,
          selectedAccountType: currentState.selectedAccountType,
          selectedFamilyAction: currentState.selectedFamilyAction,
          familyName: currentState.familyName,
          inviteCode: currentState.inviteCode,
          budgetEnabled: currentState.budgetEnabled,
          personalBudgetAmount: currentState.personalBudgetAmount,
          familyBudgets: currentState.familyBudgets,
          createdFamilyId: currentState.createdFamilyId,
          createdInviteCode: currentState.createdInviteCode,
          showCustodialMemberStep: currentState.showCustodialMemberStep,
          custodialMembers: currentState.custodialMembers,
        };
        await storage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        console.log('✅ [SimpleOnboardingStore] State saved to storage');
      } catch (error) {
        console.error('❌ [SimpleOnboardingStore] Failed to save state:', error);
      }
    };

    // 从存储加载状态
    const loadFromStorage = async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedState = JSON.parse(saved);
          // 确保 custodialMembers 是数组
          if (!Array.isArray(parsedState.custodialMembers)) {
            parsedState.custodialMembers = [];
          }
          set(parsedState);
          console.log('✅ [SimpleOnboardingStore] State loaded from storage:', parsedState);
        }
      } catch (error) {
        console.error('❌ [SimpleOnboardingStore] Failed to load state:', error);
      }
    };

    // 初始化时尝试加载状态
    loadFromStorage();

    return {
      ...initialState,
      
      // 操作方法
      startOnboarding: () => {
        set({
          isVisible: true,
          currentStep: 'account-type',
          isCompleted: false,
        });
        saveToStorage();
      },

      startOnboardingFromStep: (step: OnboardingStep) => {
        set({
          isVisible: true,
          currentStep: step,
          isCompleted: false,
        });
        saveToStorage();
      },
      
      completeOnboarding: () => {
        set({
          isCompleted: true,
          isVisible: false,
        });
        saveToStorage();
      },
      
      skipOnboarding: () => {
        set({
          isCompleted: true,
          isVisible: false,
        });
        saveToStorage();
      },
      
      nextStep: () => {
        const { currentStep } = get();
        const steps: OnboardingStep[] = ['account-type', 'invite-code-display', 'custodial-member-setup', 'budget-setup', 'theme-selection', 'feature-intro'];
        const currentIndex = steps.indexOf(currentStep);

        if (currentIndex < steps.length - 1) {
          const nextStepValue = steps[currentIndex + 1];
          set({ currentStep: nextStepValue });
          saveToStorage();
        }
      },

      goToStep: (step: OnboardingStep) => {
        set({ currentStep: step });
        saveToStorage();
      },

      previousStep: () => {
        const { currentStep } = get();
        const steps: OnboardingStep[] = ['account-type', 'invite-code-display', 'custodial-member-setup', 'budget-setup', 'theme-selection', 'feature-intro'];
        const currentIndex = steps.indexOf(currentStep);

        if (currentIndex > 0) {
          set({ currentStep: steps[currentIndex - 1] });
          saveToStorage();
        }
      },
      
      setCurrentStep: (step: OnboardingStep) => {
        set({ currentStep: step });
        saveToStorage();
      },
      
      // 数据设置方法
      setAccountType: (type: AccountType) => {
        set({ selectedAccountType: type });
        saveToStorage();
      },
      
      setFamilyAction: (action: FamilyAction) => {
        set({ selectedFamilyAction: action });
        saveToStorage();
      },
      
      setFamilyName: (name: string) => {
        set({ familyName: name });
        saveToStorage();
      },
      
      setInviteCode: (code: string) => {
        set({ inviteCode: code });
        saveToStorage();
      },
      
      setBudgetEnabled: (enabled: boolean | null) => {
        set({ budgetEnabled: enabled });
        saveToStorage();
      },
      
      setPersonalBudgetAmount: (amount: number) => {
        set({ personalBudgetAmount: amount });
        saveToStorage();
      },
      
      setFamilyBudgets: (budgets: Record<string, number>) => {
        set({ familyBudgets: budgets });
        saveToStorage();
      },
      
      setCreatedFamilyId: (id: string) => {
        set({ createdFamilyId: id });
        saveToStorage();
      },
      
      setCreatedInviteCode: (code: string) => {
        set({ createdInviteCode: code });
        saveToStorage();
      },

      setShowCustodialMemberStep: (show: boolean) => {
        set({ showCustodialMemberStep: show });
        saveToStorage();
      },

      setCustodialMembers: (members: Array<{
        name: string;
        gender?: 'male' | 'female' | 'other';
        birthDate?: string;
      }>) => {
        set({ custodialMembers: members });
        saveToStorage();
      },

      addCustodialMember: (member: {
        name: string;
        gender?: 'male' | 'female' | 'other';
        birthDate?: string;
      }) => {
        const { custodialMembers } = get();
        const newMembers = [...custodialMembers, member];
        set({ custodialMembers: newMembers });
        console.log('✅ [SimpleOnboardingStore] Added custodial member:', member, 'Total members:', newMembers.length);
        saveToStorage();
      },
      
      // 重置方法
      resetOnboarding: () => {
        set({
          ...initialState,
        });
        saveToStorage();
      },
      
      // 手动持久化方法
      saveToStorage,
      loadFromStorage,
    };
  });
}
