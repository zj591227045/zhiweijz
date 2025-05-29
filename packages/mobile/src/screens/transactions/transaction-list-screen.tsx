import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Appbar,
  ActivityIndicator,
  Chip,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTransactionStore } from '../../store/transaction-store';
import { useCategoryStore } from '../../store/category-store';
import { useAuthStore } from '../../store/auth-store';
import { NavigationProps, TransactionsStackParamList } from '../../navigation/types';
import dayjs from 'dayjs';

// 交易类型枚举
export enum TransactionType {
  EXPENSE = "EXPENSE",
  INCOME = "INCOME",
}

interface TransactionListScreenProps extends NavigationProps<'TransactionList'> {}

/**
 * 交易列表屏幕
 * 复用web端的交易列表逻辑，适配移动端UI
 */
const TransactionListScreen: React.FC<TransactionListScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { isAuthenticated } = useAuthStore();
  const { 
    transactions, 
    isLoading, 
    error, 
    fetchTransactions, 
    clearError 
  } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [refreshing, setRefreshing] = useState(false);
  const [groupedTransactions, setGroupedTransactions] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    income: 0,
    expense: 0,
    balance: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    transactionType: 'ALL',
    categoryIds: [] as string[],
  });

  // 检查认证状态
  useEffect(() => {
    if (!isAuthenticated) {
      // 在移动端，我们通过导航状态来处理认证
      console.log('用户未认证，需要登录');
    }
  }, [isAuthenticated]);

  // 获取数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      loadTransactions();
    }
  }, [isAuthenticated, filters]);

  // 加载交易数据
  const loadTransactions = useCallback(async () => {
    try {
      const queryParams = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 50,
        sort: 'date:desc',
        ...(filters.transactionType !== 'ALL' && { type: filters.transactionType }),
        ...(filters.categoryIds.length > 0 && { categoryIds: filters.categoryIds.join(',') }),
      };

      await fetchTransactions(queryParams);
    } catch (error) {
      console.error('加载交易数据失败:', error);
    }
  }, [filters, fetchTransactions]);

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTransactions();
    } finally {
      setRefreshing(false);
    }
  }, [loadTransactions]);

  // 按日期分组交易
  useEffect(() => {
    if (transactions && Array.isArray(transactions)) {
      const groups: Record<string, any[]> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach(transaction => {
        const date = dayjs(transaction.date).format('YYYY-MM-DD');
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(transaction);

        // 计算统计数据
        if (transaction.type === TransactionType.INCOME) {
          totalIncome += transaction.amount;
        } else {
          totalExpense += transaction.amount;
        }
      });

      const grouped = Object.entries(groups)
        .map(([date, transactions]) => ({
          date: dayjs(date).format('MM月DD日'),
          fullDate: date,
          transactions
        }))
        .sort((a, b) => new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime());

      setGroupedTransactions(grouped);
      setStatistics({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense
      });
    }
  }, [transactions]);

  // 处理交易项点击 - 直接进入编辑页面
  const handleTransactionClick = (transactionId: string) => {
    navigation.navigate('TransactionEdit', { transactionId });
  };

  // 处理添加交易
  const handleAddTransaction = () => {
    navigation.navigate('TransactionAdd');
  };

  // 格式化货币
  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 获取分类图标
  const getCategoryIcon = (iconName?: string) => {
    if (!iconName) return 'help-circle';
    // 简化图标映射
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
        <Appbar.Content 
          title="交易记录" 
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action 
          icon="filter-variant" 
          onPress={() => setShowFilters(!showFilters)}
        />
        <Appbar.Action 
          icon="plus" 
          onPress={handleAddTransaction}
        />
      </Appbar.Header>

      {/* 筛选器 */}
      {showFilters && (
        <Surface style={styles.filterContainer} elevation={1}>
          <Text style={[styles.filterTitle, { color: theme.colors.onSurface }]}>
            筛选条件
          </Text>
          <View style={styles.filterChips}>
            <Chip 
              selected={filters.transactionType === 'ALL'}
              onPress={() => setFilters(prev => ({ ...prev, transactionType: 'ALL' }))}
              style={styles.filterChip}
            >
              全部
            </Chip>
            <Chip 
              selected={filters.transactionType === 'INCOME'}
              onPress={() => setFilters(prev => ({ ...prev, transactionType: 'INCOME' }))}
              style={styles.filterChip}
            >
              收入
            </Chip>
            <Chip 
              selected={filters.transactionType === 'EXPENSE'}
              onPress={() => setFilters(prev => ({ ...prev, transactionType: 'EXPENSE' }))}
              style={styles.filterChip}
            >
              支出
            </Chip>
          </View>
        </Surface>
      )}

      {/* 统计摘要 */}
      <Surface style={styles.summaryContainer} elevation={2}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            收入
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.colors.primary }]}>
            {formatCurrency(statistics.income)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            支出
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.colors.error }]}>
            {formatCurrency(statistics.expense)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            结余
          </Text>
          <Text style={[
            styles.summaryAmount, 
            { color: statistics.balance >= 0 ? theme.colors.primary : theme.colors.error }
          ]}>
            {formatCurrency(statistics.balance)}
          </Text>
        </View>
      </Surface>

      {/* 交易列表 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !refreshing ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              加载中...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Icon name="alert-circle" size={48} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                clearError();
                loadTransactions();
              }}
            >
              <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
                重试
              </Text>
            </TouchableOpacity>
          </View>
        ) : groupedTransactions.length > 0 ? (
          <View style={styles.transactionGroups}>
            {groupedTransactions.map((group) => (
              <View key={group.fullDate} style={styles.transactionGroup}>
                <Text style={[styles.dateHeader, { color: theme.colors.onSurfaceVariant }]}>
                  {group.date}
                </Text>
                {group.transactions.map((transaction: any) => (
                  <TouchableOpacity
                    key={transaction.id}
                    style={[styles.transactionItem, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleTransactionClick(transaction.id)}
                  >
                    <View style={styles.transactionIcon}>
                      <Icon 
                        name={getCategoryIcon(transaction.category?.icon)} 
                        size={24} 
                        color={theme.colors.primary} 
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={[styles.transactionTitle, { color: theme.colors.onSurface }]}>
                        {transaction.description || transaction.category?.name || '未分类'}
                      </Text>
                      <Text style={[styles.transactionCategory, { color: theme.colors.onSurfaceVariant }]}>
                        {transaction.category?.name || '未分类'}
                      </Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { 
                        color: transaction.type === TransactionType.EXPENSE 
                          ? theme.colors.error 
                          : theme.colors.primary 
                      }
                    ]}>
                      {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Icon name="receipt" size={64} color={theme.colors.outline} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              暂无交易记录
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddTransaction}
            >
              <Text style={[styles.addButtonText, { color: theme.colors.onPrimary }]}>
                添加第一笔交易
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 浮动添加按钮 */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleAddTransaction}
      />
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
    filterContainer: {
      padding: 16,
      backgroundColor: theme.colors.surface,
    },
    filterTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    filterChips: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      marginRight: 8,
    },
    summaryContainer: {
      flexDirection: 'row',
      padding: 16,
      margin: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 14,
      marginBottom: 4,
    },
    summaryAmount: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    summaryDivider: {
      width: 1,
      backgroundColor: theme.colors.outline,
      marginHorizontal: 16,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 80, // 为FAB留出空间
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
      marginTop: 16,
      fontSize: 16,
      textAlign: 'center',
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
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      textAlign: 'center',
    },
    addButton: {
      marginTop: 24,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    transactionGroups: {
      padding: 16,
    },
    transactionGroup: {
      marginBottom: 24,
    },
    dateHeader: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      paddingLeft: 4,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 8,
      borderRadius: 12,
      elevation: 1,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    transactionCategory: {
      fontSize: 14,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
    },
  });

export default TransactionListScreen;
