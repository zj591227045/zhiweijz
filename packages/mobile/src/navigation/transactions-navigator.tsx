import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import TransactionListScreen from '../screens/transactions/transaction-list-screen';
import TransactionAddScreen from '../screens/transactions/transaction-add-screen';
import TransactionEditScreen from '../screens/transactions/transaction-edit-screen';
import TransactionDetailScreen from '../screens/transactions/transaction-detail-screen';
import { TransactionsStackParamList } from './types';

const Stack = createStackNavigator<TransactionsStackParamList>();

/**
 * 记账导航器
 * 处理记账相关页面的导航
 */
const TransactionsNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="TransactionList"
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
        headerShown: false, // 让每个页面自己处理头部
      }}
    >
      <Stack.Screen
        name="TransactionList"
        component={TransactionListScreen}
        options={{ title: '记账记录' }}
      />
      <Stack.Screen
        name="TransactionAdd"
        component={TransactionAddScreen}
        options={{ title: '添加记账' }}
      />
      <Stack.Screen
        name="TransactionEdit"
        component={TransactionEditScreen}
        options={{ title: '编辑记账' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: '记账详情' }}
      />
    </Stack.Navigator>
  );
};

export default TransactionsNavigator;
