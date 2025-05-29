import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { MoreStackParamList } from './types';

// 占位组件
const PlaceholderScreen = () => null;

const Stack = createStackNavigator<MoreStackParamList>();

/**
 * 更多导航器
 * 处理设置、个人资料等更多功能页面的导航
 */
const MoreNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="MoreList"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="MoreList" 
        component={PlaceholderScreen} 
        options={{ title: '更多' }} 
      />
      <Stack.Screen 
        name="Settings" 
        component={PlaceholderScreen} 
        options={{ title: '设置' }} 
      />
      <Stack.Screen 
        name="Profile" 
        component={PlaceholderScreen} 
        options={{ title: '个人资料' }} 
      />
      <Stack.Screen 
        name="Security" 
        component={PlaceholderScreen} 
        options={{ title: '账户安全' }} 
      />
      <Stack.Screen 
        name="AccountBooks" 
        component={PlaceholderScreen} 
        options={{ title: '账本管理' }} 
      />
      <Stack.Screen 
        name="Categories" 
        component={PlaceholderScreen} 
        options={{ title: '分类管理' }} 
      />
      <Stack.Screen 
        name="Budgets" 
        component={PlaceholderScreen} 
        options={{ title: '预算管理' }} 
      />
      <Stack.Screen 
        name="About" 
        component={PlaceholderScreen} 
        options={{ title: '关于应用' }} 
      />
    </Stack.Navigator>
  );
};

export default MoreNavigator;
