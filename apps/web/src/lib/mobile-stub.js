// 移动端构建时的空模块，用于替换不需要的admin模块
// 这个文件在移动端构建时会替换admin相关的导入

export default function MobileStub() {
  return null;
}

// 导出一些可能被使用的常见导出
export const AdminLayout = MobileStub;
export const AdminPage = MobileStub;
export const AdminComponent = MobileStub;
export const AdminDashboard = MobileStub;
export const AdminHeader = MobileStub;
export const AdminSidebar = MobileStub;
export const AdminAuthGuard = MobileStub;
export const UserManagement = MobileStub;
export const AnnouncementList = MobileStub;
export const AnnouncementEditor = MobileStub;
export const AnnouncementStats = MobileStub;
export const MobileNotSupported = MobileStub;

// 导出常见的hooks
export const useAdminAuth = () => ({
  isAuthenticated: false,
  token: null,
  login: () => Promise.resolve(),
  logout: () => {},
  checkAuth: () => Promise.resolve(),
  changePassword: () => Promise.resolve(false),
  isLoading: false,
  error: null,
  clearError: () => {}
});

// 导出管理端API客户端
export const adminApi = {
  get: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  post: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  put: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  delete: () => Promise.resolve({ json: () => Promise.resolve({}) })
};

export const ADMIN_API_ENDPOINTS = {};

export const useAdminDashboard = () => ({
  fetchOverview: () => {},
  fetchUserStats: () => {},
  fetchTransactionStats: () => {},
  fetchSystemResources: () => {}
});

export const useUserManagement = () => ({
  users: [],
  isLoading: false,
  pagination: {},
  registrationEnabled: false,
  fetchUsers: () => {},
  searchUsers: () => {},
  deleteUser: () => {},
  toggleUserStatus: () => {},
  batchOperation: () => {},
  getRegistrationStatus: () => {},
  toggleRegistration: () => {}
});

export const useAnnouncementManagement = () => ({
  announcements: [],
  stats: null,
  pagination: {},
  isLoading: false,
  searchTerm: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  fetchAnnouncements: () => {},
  fetchStats: () => {},
  setSearchTerm: () => {},
  setStatusFilter: () => {},
  setPriorityFilter: () => {},
  createAnnouncement: () => {},
  updateAnnouncement: () => {},
  publishAnnouncement: () => {},
  unpublishAnnouncement: () => {},
  archiveAnnouncement: () => {},
  deleteAnnouncement: () => {},
  batchOperation: () => {}
});
