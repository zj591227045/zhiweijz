import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/auth-store';
import { initializeApiClient } from '../api/api-client';
import AuthNavigator from './auth-navigator';
import MainNavigator from './main-navigator';
import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * 主应用导航器
 * 根据认证状态决定显示认证流程还是主应用界面
 */
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 初始化API客户端
        await initializeApiClient();
        
        // 初始化认证状态
        await initializeAuth();
        
        console.log('应用初始化完成');
      } catch (error) {
        console.error('应用初始化失败:', error);
      }
    };

    initializeApp();
  }, [initializeAuth]);

  // 显示加载状态
  if (isLoading) {
    return null; // 可以返回一个加载组件
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: false, // 禁用手势返回，避免意外退出
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{
              animationTypeForReplace: 'push', // 登录后的动画
            }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{
              animationTypeForReplace: 'pop', // 登出后的动画
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
