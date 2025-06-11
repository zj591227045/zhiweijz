import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageAdapter } from '../models/common';

// 引导步骤类型
export type OnboardingStep = 'account-type' | 'budget-setup' | 'theme-selection' | 'feature-intro';

// 账本类型选择
export type AccountType = 'personal' | 'family';

// 家庭操作类型
export type FamilyAction = 'create' | 'join';

// 引导状态接口
export interface OnboardingState {
  // 基础状态
  isCompleted: boolean;
  currentStep: OnboardingStep;
  isVisible: boolean;
  
  // 步骤数据
  selectedAccountType: AccountType | null;
  selectedFamilyAction: FamilyAction | null;
  familyName: string;
  inviteCode: string;
  budgetEnabled: boolean | null;
  personalBudgetAmount: number;
  familyBudgets: Record<string, number>; // 家庭成员ID -> 预算金额
  
  // 创建的数据
  createdFamilyId: string | null;
  createdInviteCode: string | null;

  // 托管用户相关
  showCustodialMemberStep: boolean;
  custodialMembers: Array<{
    name: string;
    gender?: 'male' | 'female' | 'other';
    birthDate?: string;
    role?: string;
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
    role?: string;
  }>) => void;
  addCustodialMember: (member: {
    name: string;
    gender?: 'male' | 'female' | 'other';
    birthDate?: string;
    role?: string;
  }) => void;

  // 重置方法
  resetOnboarding: () => void;
}

// 创建引导状态管理
export function createOnboardingStore(storage: StorageAdapter) {
  return create<OnboardingState>()(
    persist(
      (set, get) => ({
        // 初始状态
        isCompleted: false,
        currentStep: 'account-type',
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
        
        // 操作方法
        startOnboarding: () => {
          set({
            isVisible: true,
            currentStep: 'account-type',
            isCompleted: false,
          });
        },

        startOnboardingFromStep: (step: OnboardingStep) => {
          set({
            isVisible: true,
            currentStep: step,
            isCompleted: false,
          });
        },
        
        completeOnboarding: () => {
          set({
            isCompleted: true,
            isVisible: false,
          });
        },
        
        skipOnboarding: () => {
          set({
            isCompleted: true,
            isVisible: false,
          });
        },
        
        nextStep: () => {
          const { currentStep } = get();
          const steps: OnboardingStep[] = ['account-type', 'budget-setup', 'theme-selection', 'feature-intro'];
          const currentIndex = steps.indexOf(currentStep);

          console.log('🔄 [OnboardingStore] nextStep called:', {
            currentStep,
            currentIndex,
            nextIndex: currentIndex + 1,
            nextStep: steps[currentIndex + 1]
          });

          if (currentIndex < steps.length - 1) {
            const nextStepValue = steps[currentIndex + 1];

            // 添加步骤跳转验证逻辑
            console.log('🔄 [OnboardingStore] Attempting to change step from', currentStep, 'to', nextStepValue);

            set({ currentStep: nextStepValue });
            console.log('✅ [OnboardingStore] Step changed to:', nextStepValue);

            // 验证步骤是否正确设置
            const newState = get();
            console.log('🔍 [OnboardingStore] Verification - current step is now:', newState.currentStep);
          } else {
            console.log('⚠️ [OnboardingStore] Already at last step, not advancing');
          }
        },

        // 添加直接跳转到指定步骤的方法
        goToStep: (step: OnboardingStep) => {
          const { currentStep } = get();
          console.log('🎯 [OnboardingStore] goToStep called:', {
            from: currentStep,
            to: step
          });

          set({ currentStep: step });
          console.log('✅ [OnboardingStore] Direct step change to:', step);
        },

        previousStep: () => {
          const { currentStep } = get();
          const steps: OnboardingStep[] = ['account-type', 'budget-setup', 'theme-selection', 'feature-intro'];
          const currentIndex = steps.indexOf(currentStep);

          if (currentIndex > 0) {
            set({ currentStep: steps[currentIndex - 1] });
          }
        },
        
        setCurrentStep: (step: OnboardingStep) => {
          set({ currentStep: step });
        },
        
        // 数据设置方法
        setAccountType: (type: AccountType) => {
          set({ selectedAccountType: type });
        },
        
        setFamilyAction: (action: FamilyAction) => {
          set({ selectedFamilyAction: action });
        },
        
        setFamilyName: (name: string) => {
          set({ familyName: name });
        },
        
        setInviteCode: (code: string) => {
          set({ inviteCode: code });
        },
        
        setBudgetEnabled: (enabled: boolean | null) => {
          set({ budgetEnabled: enabled });
        },
        
        setPersonalBudgetAmount: (amount: number) => {
          set({ personalBudgetAmount: amount });
        },
        
        setFamilyBudgets: (budgets: Record<string, number>) => {
          set({ familyBudgets: budgets });
        },
        
        setCreatedFamilyId: (id: string) => {
          set({ createdFamilyId: id });
        },
        
        setCreatedInviteCode: (code: string) => {
          set({ createdInviteCode: code });
        },

        setShowCustodialMemberStep: (show: boolean) => {
          set({ showCustodialMemberStep: show });
        },

        setCustodialMembers: (members: Array<{
          name: string;
          gender?: 'male' | 'female' | 'other';
          birthDate?: string;
          role?: string;
        }>) => {
          set({ custodialMembers: members });
        },

        addCustodialMember: (member: {
          name: string;
          gender?: 'male' | 'female' | 'other';
          birthDate?: string;
          role?: string;
        }) => {
          const { custodialMembers } = get();
          set({ custodialMembers: [...custodialMembers, member] });
        },
        
        // 重置方法
        resetOnboarding: () => {
          set({
            isCompleted: false,
            currentStep: 'account-type',
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
          });
        },
      }),
      {
        name: 'onboarding-storage',
        storage: {
          getItem: async (name: string) => {
            const value = await storage.getItem(name);
            return value ? JSON.parse(value) : null;
          },
          setItem: async (name: string, value: any) => {
            await storage.setItem(name, JSON.stringify(value));
          },
          removeItem: async (name: string) => {
            await storage.removeItem(name);
          },
        },
      }
    )
  );
}
