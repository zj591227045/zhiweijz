/**
 * 导航类型定义
 */

// 认证导航参数类型
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// 主导航参数类型
export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Statistics: undefined;
  More: undefined;
};

// 记账导航参数类型
export type TransactionsStackParamList = {
  TransactionList: undefined;
  TransactionAdd: undefined;
  TransactionEdit: { transactionId: string };
  TransactionDetail: { transactionId: string };
};

// 更多导航参数类型
export type MoreStackParamList = {
  MoreList: undefined;
  Settings: undefined;
  Profile: undefined;
  Security: undefined;
  AccountBooks: undefined;
  Categories: undefined;
  Budgets: undefined;
  About: undefined;
};

// 根导航参数类型
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// 导航属性类型
export type NavigationProps<T extends keyof any> = {
  navigation: any;
  route: any;
};
