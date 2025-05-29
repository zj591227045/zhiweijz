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
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/auth-store';
import { NavigationProps, AuthStackParamList } from '../../navigation/types';

// 表单验证模式
const registerSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "密码不匹配",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterScreenProps extends NavigationProps<'Register'> {}

/**
 * 注册屏幕
 * 复用web端的注册逻辑，适配移动端UI
 */
const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // 处理注册提交
  const onSubmit = async (data: RegisterFormData) => {
    if (!agreeTerms) {
      Alert.alert('提示', '请先同意用户协议和隐私政策');
      return;
    }

    try {
      clearError();
      await register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      // 成功后会自动跳转到主界面（由AppNavigator处理）
    } catch (err) {
      // 错误已在store中处理
      console.error('注册失败:', err);
    }
  };

  // 显示错误提示
  useEffect(() => {
    if (error) {
      Alert.alert('注册失败', error, [{ text: '确定', onPress: clearError }]);
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
          {/* 注册表单 */}
          <Surface style={styles.formContainer} elevation={1}>
            <Text style={[styles.formTitle, { color: theme.colors.onSurface }]}>
              创建账户
            </Text>
            <Text style={[styles.formSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              加入只为记账，开始您的记账之旅
            </Text>

            {/* 姓名输入 */}
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="姓名"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  autoCapitalize="words"
                  autoComplete="name"
                  error={!!errors.name}
                  style={styles.input}
                  left={<TextInput.Icon icon="account" />}
                />
              )}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.name.message}
              </Text>
            )}

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
                  autoComplete="new-password"
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

            {/* 确认密码输入 */}
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="确认密码"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? "eye-off" : "eye"}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
              )}
            />
            {errors.confirmPassword && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.confirmPassword.message}
              </Text>
            )}

            {/* 同意条款 */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <Icon
                name={agreeTerms ? "checkbox-marked" : "checkbox-blank-outline"}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={[styles.termsText, { color: theme.colors.onSurface }]}>
                我同意
                <Text style={{ color: theme.colors.primary }}> 用户协议 </Text>
                和
                <Text style={{ color: theme.colors.primary }}> 隐私政策</Text>
              </Text>
            </TouchableOpacity>

            {/* 注册按钮 */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.registerButton}
              contentStyle={styles.registerButtonContent}
            >
              {isLoading ? '注册中...' : '注册'}
            </Button>

            {/* 登录链接 */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: theme.colors.onSurfaceVariant }]}>
                已有账户？
              </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                  立即登录
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
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    termsText: {
      marginLeft: 8,
      fontSize: 14,
      flex: 1,
    },
    registerButton: {
      marginBottom: 16,
    },
    registerButtonContent: {
      paddingVertical: 8,
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loginText: {
      fontSize: 14,
      marginRight: 4,
    },
    linkText: {
      fontSize: 14,
      fontWeight: '500',
    },
  });

export default RegisterScreen;
