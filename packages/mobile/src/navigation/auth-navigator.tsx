import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import LoginScreen from '../screens/auth/login-screen';
import RegisterScreen from '../screens/auth/register-screen';
import ForgotPasswordScreen from '../screens/auth/forgot-password-screen';
import { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

/**
 * 认证导航器
 * 处理登录、注册、找回密码等认证相关页面的导航
 */
const AuthNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
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
        headerBackTitleVisible: false,
        gestureEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ 
          title: '登录',
          headerShown: false, // 登录页面不显示头部
        }} 
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ 
          title: '注册账号',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen} 
        options={{ 
          title: '找回密码',
          headerShown: true,
        }} 
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
