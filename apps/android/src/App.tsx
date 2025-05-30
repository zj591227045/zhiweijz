import React, { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import AuthNavigator from './navigation/AuthNavigator';
import DashboardScreen from './screens/DashboardScreen';
import { useAuthStore } from './store/auth-store';

/**
 * Android应用根组件
 * 支持认证流程的完整应用
 */
const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  // 应用启动时初始化认证状态
  useEffect(() => {
    console.log('应用启动，认证状态:', isAuthenticated);
  }, [isAuthenticated]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />
      {isAuthenticated ? (
        <DashboardScreen />
      ) : (
        <AuthNavigator />
      )}
    </View>
  );
};

export default App;
