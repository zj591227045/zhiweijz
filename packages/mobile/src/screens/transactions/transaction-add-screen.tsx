import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Appbar,
  TextInput,
  Button,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransactionStore } from '../../store/transaction-store';
import { useCategoryStore } from '../../store/category-store';
import { useAccountBookStore } from '../../store/account-book-store';
import { useBudgetStore } from '../../store/budget-store';
import { useAuthStore } from '../../store/auth-store';
import { NavigationProps, TransactionsStackParamList } from '../../navigation/types';
import { MobileAttachmentUpload, MobileAttachment } from '../../components/transactions/mobile-attachment-upload';
import { apiClient } from '../../lib/api-client';
import dayjs from 'dayjs';

// 交易类型枚举
export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

// 表单验证模式
const transactionSchema = z.object({
  amount: z.string().min(1, '请输入金额').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    '请输入有效的金额'
  ),
  type: z.nativeEnum(TransactionType),
  categoryId: z.string().min(1, '请选择分类'),
  description: z.string().optional(),
  date: z.string().min(1, '请选择日期'),
  time: z.string().min(1, '请选择时间'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionAddScreenProps extends NavigationProps<'TransactionAdd'> {}

/**
 * 添加交易屏幕
 * 复用web端的添加交易逻辑，适配移动端UI
 */
const TransactionAddScreen: React.FC<TransactionAddScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { isAuthenticated } = useAuthStore();
  const { createTransaction, isLoading } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { currentAccountBook, fetchAccountBooks } = useAccountBookStore();
  const { budgets, fetchActiveBudgets } = useBudgetStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [attachments, setAttachments] = useState<MobileAttachment[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: '',
      type: TransactionType.EXPENSE,
      categoryId: '',
      description: '',
      date: dayjs().format('YYYY-MM-DD'),
      time: dayjs().format('HH:mm'),
    },
  });

  const watchedType = watch('type');
  const watchedCategoryId = watch('categoryId');

  // 检查认证状态
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('用户未认证，需要登录');
      return;
    }
  }, [isAuthenticated]);

  // 获取数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      fetchAccountBooks();
    }
  }, [isAuthenticated]);

  // 获取预算数据
  useEffect(() => {
    if (currentAccountBook?.id) {
      fetchActiveBudgets(currentAccountBook.id);
    }
  }, [currentAccountBook?.id]);

  // 根据交易类型筛选分类
  const filteredCategories = categories.filter(category => category.type === watchedType);

  // 获取选中的分类
  const selectedCategory = categories.find(cat => cat.id === watchedCategoryId);

  // 处理返回
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  // 处理分类选择
  const handleCategorySelect = (categoryId: string) => {
    setValue('categoryId', categoryId);
    setCurrentStep(2);
  };

  // 处理表单提交
  const onSubmit = async (data: TransactionFormData) => {
    try {
      if (!currentAccountBook?.id) {
        Alert.alert('错误', '请先选择账本');
        return;
      }

      // 合并日期和时间
      const [hours, minutes] = data.time.split(':');
      const [year, month, day] = data.date.split('-');
      const transactionDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        0,
        0
      );

      const transactionData = {
        amount: parseFloat(data.amount),
        type: data.type,
        categoryId: data.categoryId,
        description: data.description || undefined,
        date: transactionDate.toISOString(),
        accountBookId: currentAccountBook.id,
        budgetId: selectedBudgetId || undefined,
      };

      const createdTransaction = await createTransaction(transactionData);

      if (createdTransaction) {
        // 如果有附件，关联到新创建的交易
        if (attachments.length > 0) {
          try {
            for (const attachment of attachments) {
              // 如果是临时附件，需要关联到交易
              if (attachment.id.startsWith('temp-') && attachment.fileId) {
                await apiClient.post(`/transactions/${createdTransaction.id}/attachments/link`, {
                  fileId: attachment.fileId,
                  attachmentType: attachment.attachmentType,
                  description: attachment.description
                });
              }
            }
            console.log('成功关联附件到交易:', attachments.length);
          } catch (error) {
            console.error('关联附件失败:', error);
            // 附件关联失败不影响交易创建成功的提示
          }
        }

        Alert.alert(
          '成功',
          '交易记录已添加',
          [
            {
              text: '确定',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('创建交易失败:', error);
      Alert.alert('错误', '创建交易失败，请重试');
    }
  };

  // 获取分类图标
  const getCategoryIcon = (iconName?: string) => {
    if (!iconName) return 'help-circle';
    const iconMap: Record<string, string> = {
      'fa-utensils': 'food',
      'fa-car': 'car',
      'fa-home': 'home',
      'fa-shopping-cart': 'cart',
      'fa-gamepad': 'gamepad-variant',
      'fa-plane': 'airplane',
      'fa-heart': 'heart',
      'fa-graduation-cap': 'school',
      'fa-briefcase': 'briefcase',
      'fa-gift': 'gift',
    };
    return iconMap[iconName] || 'help-circle';
  };

  const styles = createStyles(theme);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>请先登录</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 自定义头部 */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={handleBack} />
        <Appbar.Content 
          title="添加交易" 
          titleStyle={styles.headerTitle}
        />
      </Appbar.Header>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 交易类型切换 */}
        <Surface style={styles.typeContainer} elevation={1}>
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  {
                    value: TransactionType.EXPENSE,
                    label: '支出',
                    icon: 'minus',
                  },
                  {
                    value: TransactionType.INCOME,
                    label: '收入',
                    icon: 'plus',
                  },
                ]}
              />
            )}
          />
        </Surface>

        {/* 金额输入 */}
        <Surface style={styles.amountContainer} elevation={1}>
          <Text style={[styles.currencySymbol, { color: theme.colors.primary }]}>
            ¥
          </Text>
          <Controller
            control={control}
            name="amount"
            render={({ field: { value, onChange } }) => (
              <TextInput
                mode="flat"
                placeholder="0.00"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                style={styles.amountInput}
                contentStyle={styles.amountInputContent}
                error={!!errors.amount}
              />
            )}
          />
        </Surface>
        {errors.amount && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {errors.amount.message}
          </Text>
        )}

        {/* 步骤指示器 */}
        <View style={styles.stepIndicator}>
          <View style={[
            styles.stepDot, 
            { backgroundColor: currentStep >= 1 ? theme.colors.primary : theme.colors.outline }
          ]}>
            <Text style={[
              styles.stepText,
              { color: currentStep >= 1 ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }
            ]}>
              1
            </Text>
          </View>
          <View style={[
            styles.stepLine,
            { backgroundColor: currentStep >= 2 ? theme.colors.primary : theme.colors.outline }
          ]} />
          <View style={[
            styles.stepDot,
            { backgroundColor: currentStep >= 2 ? theme.colors.primary : theme.colors.outline }
          ]}>
            <Text style={[
              styles.stepText,
              { color: currentStep >= 2 ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }
            ]}>
              2
            </Text>
          </View>
        </View>

        {/* 第一步：分类选择 */}
        {currentStep === 1 && (
          <Surface style={styles.stepContainer} elevation={1}>
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              选择分类
            </Text>
            <View style={styles.categoryGrid}>
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    { 
                      backgroundColor: watchedCategoryId === category.id 
                        ? theme.colors.primaryContainer 
                        : theme.colors.surface 
                    }
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <View style={[
                    styles.categoryIcon,
                    { backgroundColor: theme.colors.surfaceVariant }
                  ]}>
                    <Icon 
                      name={getCategoryIcon(category.icon)} 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                  </View>
                  <Text style={[
                    styles.categoryName,
                    { 
                      color: watchedCategoryId === category.id 
                        ? theme.colors.onPrimaryContainer 
                        : theme.colors.onSurface 
                    }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.categoryId && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.categoryId.message}
              </Text>
            )}
          </Surface>
        )}

        {/* 第二步：交易详情 */}
        {currentStep === 2 && (
          <Surface style={styles.stepContainer} elevation={1}>
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              交易详情
            </Text>

            {/* 选中的分类 */}
            {selectedCategory && (
              <View style={styles.selectedCategory}>
                <View style={[styles.categoryIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Icon 
                    name={getCategoryIcon(selectedCategory.icon)} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </View>
                <Text style={[styles.selectedCategoryName, { color: theme.colors.onSurface }]}>
                  {selectedCategory.name}
                </Text>
                <TouchableOpacity onPress={() => setCurrentStep(1)}>
                  <Text style={[styles.changeButton, { color: theme.colors.primary }]}>
                    更改
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 备注输入 */}
            <Controller
              control={control}
              name="description"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  mode="outlined"
                  label="备注（可选）"
                  value={value}
                  onChangeText={onChange}
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                />
              )}
            />

            {/* 日期时间输入 */}
            <View style={styles.dateTimeRow}>
              <Controller
                control={control}
                name="date"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    mode="outlined"
                    label="日期"
                    value={value}
                    onChangeText={onChange}
                    style={[styles.input, styles.dateInput]}
                    error={!!errors.date}
                  />
                )}
              />
              <Controller
                control={control}
                name="time"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    mode="outlined"
                    label="时间"
                    value={value}
                    onChangeText={onChange}
                    style={[styles.input, styles.timeInput]}
                    error={!!errors.time}
                  />
                )}
              />
            </View>

            {/* 附件上传 */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>附件</Text>
              <MobileAttachmentUpload
                onChange={setAttachments}
                disabled={isLoading}
                maxFiles={10}
              />
            </View>

            {/* 提交按钮 */}
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      elevation: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    scrollView: {
      flex: 1,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorText: {
      fontSize: 14,
      marginTop: 8,
      marginLeft: 12,
    },
    typeContainer: {
      margin: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      marginTop: 0,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    currencySymbol: {
      fontSize: 32,
      fontWeight: 'bold',
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    amountInputContent: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 16,
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    stepLine: {
      width: 40,
      height: 2,
      marginHorizontal: 8,
    },
    stepContainer: {
      margin: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    stepTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    categoryItem: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: 12,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 1,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoryName: {
      fontSize: 12,
      textAlign: 'center',
      fontWeight: '500',
    },
    selectedCategory: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    selectedCategoryName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 12,
    },
    changeButton: {
      fontSize: 14,
      fontWeight: '600',
    },
    input: {
      marginBottom: 16,
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateInput: {
      flex: 2,
    },
    timeInput: {
      flex: 1,
    },
    sectionContainer: {
      marginTop: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      color: theme.colors.onSurface,
    },
    submitButton: {
      marginTop: 16,
    },
    submitButtonContent: {
      paddingVertical: 8,
    },
  });

export default TransactionAddScreen;
