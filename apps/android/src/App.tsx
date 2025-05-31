import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';
import AuthNavigator from './navigation/AuthNavigator';
import DashboardScreen from './screens/DashboardScreen';
import { useAuthStore, initializeStores, performStorageHealthCheck } from './store';

/**
 * Android应用根组件
 * 支持认证流程的完整应用，包含状态管理初始化
 */
const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // 应用启动时初始化状态管理
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[App] 开始初始化应用...');

        // 执行存储健康检查
        const healthCheck = await performStorageHealthCheck();
        console.log('[App] 存储健康检查结果:', healthCheck);

        if (!healthCheck.storageWorking) {
          throw new Error('存储系统不可用: ' + healthCheck.errors.join(', '));
        }

        // 初始化状态管理
        await initializeStores();

        console.log('[App] 应用初始化完成');
        setInitError(null);
      } catch (error: any) {
        console.error('[App] 应用初始化失败:', error);
        setInitError(error.message || '应用初始化失败');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // 显示初始化加载界面
  if (isInitializing) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff'
      }}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={{
          marginTop: 16,
          fontSize: 16,
          color: '#666666',
          textAlign: 'center'
        }}>
          正在初始化应用...
        </Text>
      </View>
    );
  }

  // 显示初始化错误界面
  if (initError) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 20
      }}>
        <Text style={{
          fontSize: 18,
          color: '#d32f2f',
          textAlign: 'center',
          marginBottom: 16
        }}>
          应用初始化失败
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#666666',
          textAlign: 'center'
        }}>
          {initError}
        </Text>
      </View>
    );
  }

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
