import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardScreen from '../screens/dashboard/dashboard-screen';
import TransactionsNavigator from './transactions-navigator';
import StatisticsScreen from '../screens/statistics/statistics-screen';
import MoreNavigator from './more-navigator';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * 主导航器
 * 底部标签导航，包含仪表盘、交易、统计、更多等主要功能模块
 */
const MainNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          elevation: 8,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outline,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: '仪表盘',
          headerShown: false, // 仪表盘页面自己处理头部
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "view-dashboard" : "view-dashboard-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsNavigator}
        options={{
          title: '交易',
          headerShown: false, // 交易导航器自己处理头部
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "swap-horizontal" : "swap-horizontal"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: '统计',
          headerShown: false, // 统计页面自己处理头部
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "chart-bar" : "chart-bar"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          title: '更多',
          headerShown: false, // 更多导航器自己处理头部
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "dots-horizontal" : "dots-horizontal"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
