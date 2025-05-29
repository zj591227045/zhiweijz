import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/auth-store';
import { NavigationProps, AuthStackParamList } from '../../navigation/types';

// 表单验证模式
const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginScreenProps extends NavigationProps<'Login'> {}

/**
 * 登录屏幕
 * 复用web端的登录逻辑，适配移动端UI
 */
const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 处理登录提交
  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data);
      // 成功后会自动跳转到主界面（由AppNavigator处理）
    } catch (err) {
      // 错误已在store中处理
      console.error('登录失败:', err);
    }
  };

  // 显示错误提示
  useEffect(() => {
    if (error) {
      Alert.alert('登录失败', error, [{ text: '确定', onPress: clearError }]);
    }
  }, [error, clearError]);

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo区域 */}
          <View style={styles.logoContainer}>
            <Surface style={styles.logoSurface} elevation={2}>
              <Icon name="wallet" size={48} color={theme.colors.primary} />
            </Surface>
            <Text style={[styles.appTitle, { color: theme.colors.primary }]}>
              只为记账
            </Text>
            <Text style={[styles.appSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              简单、高效，AI驱动的记账工具
            </Text>
          </View>

          {/* 登录表单 */}
          <Surface style={styles.formContainer} elevation={1}>
            <Text style={[styles.formTitle, { color: theme.colors.onSurface }]}>
              欢迎回来
            </Text>
            <Text style={[styles.formSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              登录您的账户
            </Text>

            {/* 邮箱输入 */}
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
                  autoComplete="email"
                  error={!!errors.email}
                  style={styles.input}
                  left={<TextInput.Icon icon="email" />}
                />
              )}
            />
            {errors.email && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.email.message}
              </Text>
            )}

            {/* 密码输入 */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="密码"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  error={!!errors.password}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              )}
            />
            {errors.password && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.password.message}
              </Text>
            )}

            {/* 记住我和忘记密码 */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <Icon
                  name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.rememberMeText, { color: theme.colors.onSurface }]}>
                  记住我
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                  忘记密码？
                </Text>
              </TouchableOpacity>
            </View>

            {/* 登录按钮 */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>

            {/* 注册链接 */}
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: theme.colors.onSurfaceVariant }]}>
                还没有账户？
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                  立即注册
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoSurface: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: theme.colors.surfaceVariant,
    },
    appTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    appSubtitle: {
      fontSize: 16,
      textAlign: 'center',
    },
    formContainer: {
      padding: 24,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    formTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
    },
    formSubtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    input: {
      marginBottom: 8,
    },
    errorText: {
      fontSize: 12,
      marginBottom: 16,
      marginLeft: 12,
    },
    optionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rememberMeText: {
      marginLeft: 8,
      fontSize: 14,
    },
    linkText: {
      fontSize: 14,
      fontWeight: '500',
    },
    loginButton: {
      marginBottom: 16,
    },
    loginButtonContent: {
      paddingVertical: 8,
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    registerText: {
      fontSize: 14,
      marginRight: 4,
    },
  });

export default LoginScreen;
