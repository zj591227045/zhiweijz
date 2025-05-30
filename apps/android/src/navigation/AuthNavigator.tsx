import React, { useState } from 'react';
import { View } from 'react-native';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// 简化的导航器，不使用React Navigation
const AuthNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'Login' | 'Register'>('Login');

  const navigation = {
    navigate: (screen: 'Login' | 'Register') => {
      setCurrentScreen(screen);
    },
  };

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'Login' ? (
        <LoginScreen navigation={navigation} />
      ) : (
        <RegisterScreen navigation={navigation} />
      )}
    </View>
  );
};

export default AuthNavigator;
