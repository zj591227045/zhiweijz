import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from '@zhiweijz/mobile/src/navigation/app-navigator';
import { theme } from './theme';

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Android应用根组件
 * 配置主题、状态管理和导航
 */
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={theme.colors.surface}
            translucent={false}
          />
          <AppNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
};

export default App;
