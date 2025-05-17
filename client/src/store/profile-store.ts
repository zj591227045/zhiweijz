import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { UserProfile } from "@/lib/api/user-service";

// 头像裁剪区域
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 提交状态
export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

// 个人资料状态
export interface ProfileState {
  // 用户资料数据
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // 表单数据
  username: string;
  bio: string;
  birthDate: string;

  // 头像数据
  avatarFile: File | null;
  avatarPreview: string | null;

  // 裁剪工具状态
  showUploadOptions: boolean;
  showImageCropper: boolean;
  cropArea: CropArea | null;

  // 表单验证状态
  usernameError: string | null;
  bioError: string | null;

  // 提交状态
  submitStatus: SubmitStatus;

  // 操作方法
  setProfile: (profile: UserProfile) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  setUsername: (username: string) => void;
  setBio: (bio: string) => void;
  setBirthDate: (birthDate: string) => void;

  setAvatarFile: (file: File | null) => void;
  setAvatarPreview: (preview: string | null) => void;

  setShowUploadOptions: (show: boolean) => void;
  setShowImageCropper: (show: boolean) => void;
  setCropArea: (area: CropArea | null) => void;

  setUsernameError: (error: string | null) => void;
  setBioError: (error: string | null) => void;

  setSubmitStatus: (status: SubmitStatus) => void;

  // 重置状态
  resetForm: () => void;
  resetErrors: () => void;
}

// 创建个人资料状态仓库
export const useProfileStore = create<ProfileState>()(
  devtools(
    (set) => ({
      // 初始状态
      profile: null,
      isLoading: false,
      error: null,

      username: '',
      bio: '',
      birthDate: '',

      avatarFile: null,
      avatarPreview: null,

      showUploadOptions: false,
      showImageCropper: false,
      cropArea: null,

      usernameError: null,
      bioError: null,

      submitStatus: 'idle',

      // 操作方法
      setProfile: (profile) => set((state) => ({
        profile,
        username: profile.username || state.username,
        bio: profile.bio || state.bio,
        birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : state.birthDate,
      })),

      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      setUsername: (username) => set({ username }),
      setBio: (bio) => set({ bio }),
      setBirthDate: (birthDate) => set({ birthDate }),

      setAvatarFile: (avatarFile) => set({ avatarFile }),
      setAvatarPreview: (avatarPreview) => set({ avatarPreview }),

      setShowUploadOptions: (showUploadOptions) => set({ showUploadOptions }),
      setShowImageCropper: (showImageCropper) => set({ showImageCropper }),
      setCropArea: (cropArea) => set({ cropArea }),

      setUsernameError: (usernameError) => set({ usernameError }),
      setBioError: (bioError) => set({ bioError }),

      setSubmitStatus: (submitStatus) => set({ submitStatus }),

      // 重置表单
      resetForm: () => set((state) => ({
        username: state.profile?.username || '',
        bio: state.profile?.bio || '',
        birthDate: state.profile?.birthDate ? new Date(state.profile.birthDate).toISOString().split('T')[0] : '',
        avatarFile: null,
        avatarPreview: null,
        showUploadOptions: false,
        showImageCropper: false,
        cropArea: null,
        usernameError: null,
        bioError: null,
        submitStatus: 'idle',
      })),

      // 重置错误
      resetErrors: () => set({
        usernameError: null,
        bioError: null,
        error: null,
      }),
    }),
    { name: 'profile-store' }
  )
);
