import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
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
const forgotPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordScreenProps extends NavigationProps<'ForgotPassword'> {}

/**
 * 找回密码屏幕
 * 复用web端的找回密码逻辑，适配移动端UI
 */
const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const [emailSent, setEmailSent] = useState(false);

  const { control, handleSubmit, formState: { errors }, getValues } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // 处理找回密码提交
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      clearError();
      await resetPassword(data.email);
      setEmailSent(true);
    } catch (err) {
      // 错误已在store中处理
      console.error('发送重置邮件失败:', err);
    }
  };

  // 重新发送邮件
  const handleResendEmail = async () => {
    const email = getValues('email');
    if (email) {
      try {
        clearError();
        await resetPassword(email);
        Alert.alert('邮件已重新发送', '请查收您的邮箱');
      } catch (err) {
        console.error('重新发送邮件失败:', err);
      }
    }
  };

  // 显示错误提示
  useEffect(() => {
    if (error) {
      Alert.alert('发送失败', error, [{ text: '确定', onPress: clearError }]);
    }
  }, [error, clearError]);

  const styles = createStyles(theme);

  if (emailSent) {
    // 邮件发送成功页面
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Surface style={styles.successContainer} elevation={1}>
            <View style={styles.successIconContainer}>
              <Icon name="email-check" size={64} color={theme.colors.primary} />
            </View>
            
            <Text style={[styles.successTitle, { color: theme.colors.onSurface }]}>
              邮件已发送
            </Text>
            
            <Text style={[styles.successMessage, { color: theme.colors.onSurfaceVariant }]}>
              我们已向您的邮箱发送了密码重置链接，请查收邮件并按照说明重置密码。
            </Text>

            <Text style={[styles.tipText, { color: theme.colors.onSurfaceVariant }]}>
              如果您没有收到邮件，请检查垃圾邮件文件夹，或点击下方按钮重新发送。
            </Text>

            <Button
              mode="outlined"
              onPress={handleResendEmail}
              loading={isLoading}
              disabled={isLoading}
              style={styles.resendButton}
            >
              重新发送邮件
            </Button>

            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              返回登录
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

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
          {/* 找回密码表单 */}
          <Surface style={styles.formContainer} elevation={1}>
            <View style={styles.iconContainer}>
              <Icon name="lock-reset" size={48} color={theme.colors.primary} />
            </View>

            <Text style={[styles.formTitle, { color: theme.colors.onSurface }]}>
              找回密码
            </Text>
            
            <Text style={[styles.formSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              请输入您的邮箱地址，我们将向您发送密码重置链接
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

            {/* 发送按钮 */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.sendButton}
              contentStyle={styles.sendButtonContent}
            >
              {isLoading ? '发送中...' : '发送重置邮件'}
            </Button>

            {/* 返回登录 */}
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={styles.backToLoginButton}
            >
              返回登录
            </Button>
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
    centeredContent: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    formContainer: {
      padding: 24,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
    },
    successContainer: {
      padding: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    successIconContainer: {
      marginBottom: 24,
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
      lineHeight: 22,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    successMessage: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 22,
    },
    tipText: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    input: {
      marginBottom: 8,
    },
    errorText: {
      fontSize: 12,
      marginBottom: 16,
      marginLeft: 12,
    },
    sendButton: {
      marginBottom: 16,
    },
    sendButtonContent: {
      paddingVertical: 8,
    },
    backToLoginButton: {
      marginTop: 8,
    },
    resendButton: {
      marginBottom: 16,
      width: '100%',
    },
    backButton: {
      width: '100%',
    },
  });

export default ForgotPasswordScreen;
