# 只为记账 - React Native 实施指南

本文档提供了从零开始实施React Native项目的详细步骤，包括环境搭建、项目初始化、依赖安装和关键功能实现。

## 1. 开发环境搭建

### 1.1 安装必要工具

1. **Node.js和npm**
   ```bash
   # 推荐使用Node.js 18.x或更高版本
   # 检查版本
   node -v
   npm -v
   ```

2. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

3. **Android开发环境**
   - 安装Android Studio
   - 安装Android SDK (推荐API级别33)
   - 配置ANDROID_HOME环境变量
   - 添加platform-tools到PATH

4. **iOS开发环境** (仅macOS)
   - 安装Xcode
   - 安装CocoaPods
   ```bash
   sudo gem install cocoapods
   ```

5. **开发工具**
   - 安装Visual Studio Code
   - 安装推荐扩展:
     - React Native Tools
     - ESLint
     - Prettier
     - TypeScript

### 1.2 配置环境变量

**Windows (Android开发)**
```
ANDROID_HOME=C:\Users\USERNAME\AppData\Local\Android\Sdk
PATH=%PATH%;%ANDROID_HOME%\platform-tools
```

**macOS (Android和iOS开发)**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 2. 项目初始化

### 2.1 创建新项目

```bash
# 使用TypeScript模板创建项目
npx react-native init ZhiWeiJiZhang --template react-native-template-typescript

# 进入项目目录
cd ZhiWeiJiZhang
```

### 2.2 项目结构调整

```bash
# 创建src目录及子目录
mkdir -p src/{api,components,hooks,navigation,screens,store,styles,types,utils}
mkdir -p src/screens/{auth,dashboard,transactions,categories,budgets,statistics,books,settings}
mkdir -p src/components/{ui,auth,dashboard,transactions,categories,budgets,statistics,books,settings}
```

### 2.3 基础配置文件

1. **tsconfig.json** (调整)
   ```json
   {
     "extends": "@tsconfig/react-native/tsconfig.json",
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       },
       "strict": true
     }
   }
   ```

2. **.eslintrc.js** (调整)
   ```js
   module.exports = {
     root: true,
     extends: '@react-native',
     rules: {
       'prettier/prettier': ['error', { singleQuote: true }],
     },
   };
   ```

3. **babel.config.js** (调整)
   ```js
   module.exports = {
     presets: ['module:metro-react-native-babel-preset'],
     plugins: [
       [
         'module-resolver',
         {
           root: ['./src'],
           extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
           alias: {
             '@': './src',
           },
         },
       ],
     ],
   };
   ```

## 3. 安装核心依赖

### 3.1 UI和导航依赖

```bash
# UI组件库
npm install react-native-paper react-native-vector-icons

# 导航
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs @react-navigation/material-top-tabs
npm install react-native-screens react-native-safe-area-context
```

### 3.2 状态管理和API依赖

```bash
# 状态管理
npm install zustand

# API请求
npm install axios @tanstack/react-query

# 表单处理
npm install react-hook-form @hookform/resolvers zod
```

### 3.3 工具和功能依赖

```bash
# 图表
npm install react-native-chart-kit react-native-svg

# 日期处理
npm install dayjs

# 存储
npm install @react-native-async-storage/async-storage

# 其他工具
npm install react-native-gesture-handler react-native-reanimated
```

### 3.4 链接原生模块

```bash
# 链接图标库
npx react-native-asset

# 配置原生模块
npx pod-install ios  # 仅macOS
```

## 4. 项目配置

### 4.1 配置React Native Paper

**src/App.tsx**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './styles/theme';
import AppNavigator from './navigation/AppNavigator';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </QueryClientProvider>
  );
};

export default App;
```

### 4.2 配置主题

**src/styles/theme.ts**
```tsx
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

// 自定义颜色
const colors = {
  primary: '#1976D2',
  secondary: '#FF5722',
  error: '#D32F2F',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#000000',
};

// 自定义暗色主题颜色
const darkColors = {
  primary: '#90CAF9',
  secondary: '#FFAB91',
  error: '#EF9A9A',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
};

// 创建自定义亮色主题
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...colors,
  },
};

// 创建自定义暗色主题
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
};

// 导航主题
export const navigationLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
  },
};

export const navigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.text,
  },
};

// 默认导出亮色主题
export const theme = lightTheme;
```

### 4.3 配置导航

**src/navigation/AppNavigator.tsx**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { useAuthStore } from '@/store/auth-store';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
```

**src/navigation/AuthNavigator.tsx**
```tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: '登录' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: '注册' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: '找回密码' }} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
```

**src/navigation/MainNavigator.tsx**
```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import TransactionsNavigator from './TransactionsNavigator';
import StatisticsScreen from '@/screens/statistics/StatisticsScreen';
import MoreNavigator from './MoreNavigator';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: '仪表盘',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsNavigator}
        options={{
          title: '交易',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="swap-horizontal" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: '统计',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-bar" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          title: '更多',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="dots-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
```

## 5. API客户端配置

### 5.1 API基础客户端

**src/api/api-client.ts**
```tsx
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 创建API客户端实例
const apiClient = axios.create({
  baseURL: 'http://your-api-url/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// 请求拦截器
apiClient.interceptors.request.use(
  async (config) => {
    // 从AsyncStorage获取token
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // 处理401错误
    if (error.response?.status === 401) {
      // 清除token
      await AsyncStorage.removeItem('auth_token');
      // 这里可以触发重定向到登录页面
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 5.2 API服务

**src/api/auth-service.ts**
```tsx
import apiClient from './api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

const authService = {
  login: async (data: LoginRequest) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    // 保存token到AsyncStorage
    await AsyncStorage.setItem('auth_token', response.data.token);
    return response.data;
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    return true;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authService;
```

## 6. 状态管理配置

### 6.1 认证状态

**src/store/auth-store.ts**
```tsx
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { LoginRequest, RegisterRequest } from '@/api/auth-service';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || '登录失败',
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || '注册失败',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: '登出失败',
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const user = await authService.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      await AsyncStorage.removeItem('auth_token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
```

### 6.2 主题状态

**src/store/theme-store.ts**
```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '@/styles/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  theme: typeof lightTheme;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      theme: lightTheme,

      toggleTheme: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
          theme: state.mode === 'light' ? darkTheme : lightTheme,
        })),

      setThemeMode: (mode) =>
        set({
          mode,
          theme: mode === 'light' ? lightTheme : darkTheme,
        }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## 7. 页面实现示例

### 7.1 登录页面

**src/screens/auth/LoginScreen.tsx**
```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth-store';

// 表单验证模式
const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const { login, isLoading } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
    } catch (error) {
      console.error('登录失败:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>欢迎回来</Text>
      <Text style={styles.subtitle}>登录您的账户</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="邮箱"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!errors.email}
            style={styles.input}
          />
        )}
      />
      {errors.email && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {errors.email.message}
        </Text>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="密码"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            secureTextEntry
            error={!!errors.password}
            style={styles.input}
          />
        )}
      />
      {errors.password && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {errors.password.message}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotPassword}
      >
        <Text style={{ color: theme.colors.primary }}>忘记密码?</Text>
      </TouchableOpacity>

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
      >
        登录
      </Button>

      <View style={styles.registerContainer}>
        <Text>还没有账户? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={{ color: theme.colors.primary }}>立即注册</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
    marginTop: -8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  button: {
    marginBottom: 24,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default LoginScreen;
```

### 7.2 仪表盘页面

**src/screens/dashboard/DashboardScreen.tsx**
```tsx
import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, ProgressBar, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/api-client';
import { formatAmount } from '@/utils/format-utils';
import RecentTransactionsList from '@/components/dashboard/RecentTransactionsList';

const DashboardScreen = () => {
  const theme = useTheme();

  // 获取账户余额
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/balance');
      return response.data;
    },
  });

  // 获取预算进度
  const { data: budgetData, isLoading: isBudgetLoading } = useQuery({
    queryKey: ['budget-progress'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/budget-progress');
      return response.data;
    },
  });

  // 获取趋势数据
  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ['trend'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/trend');
      return response.data;
    },
  });

  // 图表配置
  const chartConfig = {
    backgroundColor: theme.colors.background,
    backgroundGradientFrom: theme.colors.background,
    backgroundGradientTo: theme.colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  return (
    <ScrollView style={styles.container}>
      {/* 余额卡片 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>当前余额</Text>
          <Text style={styles.balanceAmount}>
            {isBalanceLoading ? '加载中...' : formatAmount(balanceData?.balance || 0)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>本月收入</Text>
              <Text style={[styles.balanceValue, { color: '#4CAF50' }]}>
                {isBalanceLoading ? '加载中...' : formatAmount(balanceData?.income || 0)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>本月支出</Text>
              <Text style={[styles.balanceValue, { color: '#F44336' }]}>
                {isBalanceLoading ? '加载中...' : formatAmount(balanceData?.expense || 0)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 预算进度 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>预算进度</Text>
          {isBudgetLoading ? (
            <Text>加载中...</Text>
          ) : (
            budgetData?.budgets.map((budget) => {
              const progress = budget.spent / budget.amount;
              const isOverBudget = progress > 1;

              return (
                <View key={budget.id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text>{budget.name}</Text>
                    <Text>
                      {formatAmount(budget.spent)} / {formatAmount(budget.amount)}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={Math.min(progress, 1)}
                    color={isOverBudget ? theme.colors.error : theme.colors.primary}
                    style={styles.progressBar}
                  />
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      {/* 趋势图表 */}
      {!isTrendLoading && trendData && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>收支趋势</Text>
            <LineChart
              data={{
                labels: trendData.labels,
                datasets: [
                  {
                    data: trendData.income,
                    color: () => '#4CAF50',
                    strokeWidth: 2,
                  },
                  {
                    data: trendData.expense,
                    color: () => '#F44336',
                    strokeWidth: 2,
                  },
                ],
                legend: ['收入', '支出'],
              }}
              width={Dimensions.get('window').width - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>
      )}

      {/* 最近交易 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>最近交易</Text>
          <RecentTransactionsList />
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default DashboardScreen;
```

## 8. 运行和测试

### 8.1 运行Android应用

```bash
# 启动Metro服务器
npx react-native start

# 在另一个终端运行Android应用
npx react-native run-android
```

### 8.2 运行iOS应用 (仅macOS)

```bash
# 安装iOS依赖
cd ios && pod install && cd ..

# 启动Metro服务器
npx react-native start

# 在另一个终端运行iOS应用
npx react-native run-ios
```

### 8.3 调试技巧

1. **使用React Native Debugger**
   - 安装React Native Debugger
   - 在模拟器中按下Cmd+D (iOS) 或 Ctrl+M (Android)
   - 选择"Debug JS Remotely"

2. **使用Flipper**
   - 安装Flipper
   - 连接到运行中的应用
   - 使用网络、存储和布局检查器

## 9. 打包发布

### 9.1 Android打包

1. **生成签名密钥**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **配置gradle变量**
   在`android/gradle.properties`中添加:
   ```
   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=*****
   MYAPP_RELEASE_KEY_PASSWORD=*****
   ```

3. **配置签名**
   在`android/app/build.gradle`中添加:
   ```gradle
   signingConfigs {
       release {
           storeFile file(MYAPP_RELEASE_STORE_FILE)
           storePassword MYAPP_RELEASE_STORE_PASSWORD
           keyAlias MYAPP_RELEASE_KEY_ALIAS
           keyPassword MYAPP_RELEASE_KEY_PASSWORD
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```

4. **生成APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

### 9.2 iOS打包 (仅macOS)

1. **在Xcode中配置签名**
   - 打开`ios/YourApp.xcworkspace`
   - 选择项目 > Signing & Capabilities
   - 配置开发团队和Bundle Identifier

2. **构建归档**
   - 在Xcode中选择Product > Archive
   - 在归档管理器中选择Distribute App
   - 按照向导完成上传到App Store

## 10. 常见问题与解决方案

### 10.1 Metro服务器问题

**问题**: Metro服务器无法启动或频繁崩溃
**解决方案**:
```bash
# 清除缓存
npx react-native start --reset-cache
```

### 10.2 Android构建问题

**问题**: Gradle构建失败
**解决方案**:
```bash
# 清除Gradle缓存
cd android
./gradlew clean
```

### 10.3 iOS构建问题

**问题**: Pod安装失败
**解决方案**:
```bash
cd ios
pod deintegrate
pod install
```

### 10.4 样式问题

**问题**: 样式在不同平台表现不一致
**解决方案**:
```jsx
// 使用平台特定样式
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

## 11. 性能优化建议

1. **使用memo和useCallback**
   ```jsx
   import React, { memo, useCallback } from 'react';

   const ExpensiveComponent = memo(({ onPress, data }) => {
     // 组件实现
   });

   const ParentComponent = () => {
     const handlePress = useCallback(() => {
       // 处理点击
     }, []);

     return <ExpensiveComponent onPress={handlePress} data={data} />;
   };
   ```

2. **优化列表渲染**
   ```jsx
   <FlatList
     data={items}
     keyExtractor={(item) => item.id}
     getItemLayout={(data, index) => ({
       length: ITEM_HEIGHT,
       offset: ITEM_HEIGHT * index,
       index,
     })}
     initialNumToRender={10}
     maxToRenderPerBatch={10}
     windowSize={5}
     removeClippedSubviews={true}
     renderItem={renderItem}
   />
   ```

3. **使用Hermes引擎**
   在`android/app/build.gradle`中启用:
   ```gradle
   project.ext.react = [
       enableHermes: true
   ]
   ```



```

### 5.2 API服务

**src/api/auth-service.ts**
```tsx
import apiClient from './api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

const authService = {
  login: async (data: LoginRequest) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    // 保存token到AsyncStorage
    await AsyncStorage.setItem('auth_token', response.data.token);
    return response.data;
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    return true;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authService;
```

## 6. 状态管理配置

### 6.1 认证状态

**src/store/auth-store.ts**
```tsx
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { LoginRequest, RegisterRequest } from '@/api/auth-service';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || '登录失败',
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || '注册失败',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: '登出失败',
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const user = await authService.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      await AsyncStorage.removeItem('auth_token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
```

### 6.2 主题状态

**src/store/theme-store.ts**
```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '@/styles/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  theme: typeof lightTheme;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      theme: lightTheme,

      toggleTheme: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
          theme: state.mode === 'light' ? darkTheme : lightTheme,
        })),

      setThemeMode: (mode) =>
        set({
          mode,
          theme: mode === 'light' ? lightTheme : darkTheme,
        }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## 7. 运行和测试

### 7.1 运行Android应用

```bash
# 启动Metro服务器
npx react-native start

# 在另一个终端运行Android应用
npx react-native run-android
```

### 7.2 运行iOS应用 (仅macOS)

```bash
# 安装iOS依赖
cd ios && pod install && cd ..

# 启动Metro服务器
npx react-native start

# 在另一个终端运行iOS应用
npx react-native run-ios
```

### 7.3 调试技巧

1. **使用React Native Debugger**
   - 安装React Native Debugger
   - 在模拟器中按下Cmd+D (iOS) 或 Ctrl+M (Android)
   - 选择"Debug JS Remotely"

2. **使用Flipper**
   - 安装Flipper
   - 连接到运行中的应用
   - 使用网络、存储和布局检查器

## 8. 打包发布

### 8.1 Android打包

1. **生成签名密钥**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **配置gradle变量**
   在`android/gradle.properties`中添加:
   ```
   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=*****
   MYAPP_RELEASE_KEY_PASSWORD=*****
   ```

3. **配置签名**
   在`android/app/build.gradle`中添加:
   ```gradle
   signingConfigs {
       release {
           storeFile file(MYAPP_RELEASE_STORE_FILE)
           storePassword MYAPP_RELEASE_STORE_PASSWORD
           keyAlias MYAPP_RELEASE_KEY_ALIAS
           keyPassword MYAPP_RELEASE_KEY_PASSWORD
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```

4. **生成APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

### 8.2 iOS打包 (仅macOS)

1. **在Xcode中配置签名**
   - 打开`ios/YourApp.xcworkspace`
   - 选择项目 > Signing & Capabilities
   - 配置开发团队和Bundle Identifier

2. **构建归档**
   - 在Xcode中选择Product > Archive
   - 在归档管理器中选择Distribute App
   - 按照向导完成上传到App Store
