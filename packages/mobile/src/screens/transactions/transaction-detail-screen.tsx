import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Appbar,
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTransactionStore } from '../../store/transaction-store';
import { useAuthStore } from '../../store/auth-store';
import { NavigationProps, TransactionsStackParamList } from '../../navigation/types';
import { MobileAttachmentPreview, MobileAttachmentFile } from '../../components/transactions/mobile-attachment-preview';
import dayjs from 'dayjs';

// 记账类型枚举
export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

interface TransactionDetailScreenProps extends NavigationProps<'TransactionDetail'> {
  route: {
    params: {
      transactionId: string;
    };
  };
}

/**
 * 记账详情屏幕
 * 复用web端的记账详情逻辑，适配移动端UI
 */
const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = ({ navigation, route }) => {
  const theme = useTheme();
  const { transactionId } = route.params;
  const { isAuthenticated } = useAuthStore();
  const { 
    transaction, 
    isLoading, 
    error, 
    fetchTransaction, 
    deleteTransaction,
    clearError 
  } = useTransactionStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // 检查认证状态
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('用户未认证，需要登录');
      return;
    }
  }, [isAuthenticated]);

  // 获取记账详情
  useEffect(() => {
    if (isAuthenticated && transactionId) {
      fetchTransaction(transactionId);
      fetchAttachments(transactionId);
    }
  }, [isAuthenticated, transactionId]);

  // 获取附件列表
  const fetchAttachments = async (transactionId: string) => {
    try {
      // 这里需要调用API获取附件列表
      // const response = await apiClient.get(`/transactions/${transactionId}/attachments`);
      // setAttachments(response.data || []);

      // 临时使用空数组，实际应该从API获取
      setAttachments([]);
    } catch (error) {
      console.error('获取附件失败:', error);
      setAttachments([]);
    }
  };

  // 处理编辑记账
  const handleEdit = () => {
    navigation.navigate('TransactionEdit', { transactionId });
  };

  // 处理删除记账
  const handleDelete = async () => {
    if (!transaction) return;

    setIsDeleting(true);
    try {
      const success = await deleteTransaction(transaction.id);
      if (success) {
        Alert.alert(
          '删除成功',
          '记账记录已删除',
          [
            {
              text: '确定',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('删除记账失败:', error);
      Alert.alert('错误', '删除记账失败，请重试');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // 格式化货币
  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 格式化日期
  const formatDate = (date: string, format: string) => {
    return dayjs(date).format(format);
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="记账详情" titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            加载中...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="记账详情" titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              clearError();
              fetchTransaction(transactionId);
            }}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
              重试
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="记账详情" titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            未找到记账记录
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
              返回
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 自定义头部 */}
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title="记账详情" 
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action icon="pencil" onPress={handleEdit} />
        <Appbar.Action icon="delete" onPress={() => setShowDeleteDialog(true)} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 金额显示 */}
        <Surface style={styles.amountContainer} elevation={2}>
          <Text style={[
            styles.amountText,
            { 
              color: transaction.type === TransactionType.INCOME 
                ? theme.colors.primary 
                : theme.colors.error 
            }
          ]}>
            {transaction.type === TransactionType.INCOME ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>
        </Surface>

        {/* 记账信息 */}
        <Surface style={styles.infoContainer} elevation={1}>
          {/* 类型 */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
              类型
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {transaction.type === TransactionType.INCOME ? '收入' : '支出'}
            </Text>
          </View>

          {/* 分类 */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
              分类
            </Text>
            <View style={styles.categoryInfo}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Icon 
                  name={getCategoryIcon(transaction.category?.icon)} 
                  size={20} 
                  color={theme.colors.primary} 
                />
              </View>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {transaction.category?.name || '未分类'}
              </Text>
            </View>
          </View>

          {/* 日期 */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
              日期
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {formatDate(transaction.date, 'YYYY年MM月DD日')}
            </Text>
          </View>

          {/* 账本 */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
              账本
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {transaction.accountBook?.name || '默认账本'}
            </Text>
          </View>

          {/* 预算 */}
          {transaction.budget && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                预算
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {transaction.budget.name}
              </Text>
            </View>
          )}

          {/* 备注 */}
          {transaction.description && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                备注
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {transaction.description}
              </Text>
            </View>
          )}

          {/* 创建时间 */}
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
              创建时间
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {formatDate(transaction.createdAt, 'YYYY-MM-DD HH:mm')}
            </Text>
          </View>

          {/* 更新时间 */}
          {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                更新时间
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {formatDate(transaction.updatedAt, 'YYYY-MM-DD HH:mm')}
              </Text>
            </View>
          )}
        </Surface>

        {/* 附件区域 */}
        {attachments.length > 0 && (
          <Surface style={styles.attachmentContainer} elevation={1}>
            <View style={styles.attachmentHeader}>
              <Icon name="paperclip" size={20} color={theme.colors.primary} />
              <Text style={[styles.attachmentTitle, { color: theme.colors.onSurface }]}>
                附件 ({attachments.length})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentList}
            >
              {attachments.map((attachment, index) => (
                <TouchableOpacity
                  key={attachment.id}
                  style={styles.attachmentItem}
                  onPress={() => {
                    setPreviewIndex(index);
                    setPreviewVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  {attachment.file?.mimeType?.startsWith('image/') ? (
                    <Image
                      source={{ uri: attachment.file.url }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.attachmentFileIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                      <Icon
                        name={attachment.file?.mimeType?.includes('pdf') ? 'file-pdf-box' : 'file-document'}
                        size={32}
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                  <Text style={[styles.attachmentName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {attachment.file?.originalName || '未知文件'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Surface>
        )}

        {/* 操作按钮 */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={[styles.actionButton, styles.editButton]}
            contentStyle={styles.actionButtonContent}
            icon="pencil"
          >
            编辑
          </Button>
          <Button
            mode="contained"
            onPress={() => setShowDeleteDialog(true)}
            style={[styles.actionButton, styles.deleteButton]}
            contentStyle={styles.actionButtonContent}
            buttonColor={theme.colors.error}
            icon="delete"
          >
            删除
          </Button>
        </View>
      </ScrollView>

      {/* 删除确认对话框 */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>删除记账</Dialog.Title>
          <Dialog.Content>
            <Text>确定要删除这笔记账吗？此操作无法撤销。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>取消</Button>
            <Button 
              onPress={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
              textColor={theme.colors.error}
            >
              {isDeleting ? '删除中...' : '删除'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 附件预览模态框 */}
      {attachments.length > 0 && (
        <MobileAttachmentPreview
          files={attachments.map(attachment => ({
            id: attachment.file?.id || attachment.id,
            filename: attachment.file?.filename || '',
            originalName: attachment.file?.originalName || '未知文件',
            mimeType: attachment.file?.mimeType || 'application/octet-stream',
            size: attachment.file?.size || 0,
            url: attachment.file?.url,
          }))}
          currentIndex={previewIndex}
          isVisible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          onNavigate={setPreviewIndex}
        />
      )}
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
    loadingText: {
      marginTop: 16,
      fontSize: 16,
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 16,
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    amountContainer: {
      margin: 16,
      padding: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    amountText: {
      fontSize: 36,
      fontWeight: 'bold',
    },
    infoContainer: {
      margin: 16,
      marginTop: 0,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '20',
    },
    infoLabel: {
      fontSize: 16,
      fontWeight: '500',
      flex: 1,
    },
    infoValue: {
      fontSize: 16,
      flex: 2,
      textAlign: 'right',
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 2,
      justifyContent: 'flex-end',
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    attachmentContainer: {
      margin: 16,
      marginTop: 0,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    attachmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    attachmentTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    attachmentList: {
      paddingHorizontal: 4,
    },
    attachmentItem: {
      width: 80,
      marginRight: 12,
      alignItems: 'center',
    },
    attachmentImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginBottom: 4,
    },
    attachmentFileIcon: {
      width: 80,
      height: 80,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    attachmentName: {
      fontSize: 12,
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      margin: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    actionButtonContent: {
      paddingVertical: 8,
    },
    editButton: {
      borderColor: theme.colors.primary,
    },
    deleteButton: {
      // 样式由buttonColor属性控制
    },
  });

export default TransactionDetailScreen;
