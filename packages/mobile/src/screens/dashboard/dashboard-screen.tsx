import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Button,
  ActivityIndicator,
  Appbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/auth-store';
import { useAccountBookStore } from '../../store/account-book-store';
import { NavigationProps, MainTabParamList } from '../../navigation/types';

interface DashboardScreenProps extends NavigationProps<'Dashboard'> {}

/**
 * 仪表盘屏幕
 * 复用web端的仪表盘逻辑，适配移动端UI
 */
const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, logout } = useAuthStore();
  const { currentAccountBook, accountBooks, fetchAccountBooks, isLoading } = useAccountBookStore();
  const [refreshing, setRefreshing] = useState(false);

  // 初始化数据
  useEffect(() => {
    fetchAccountBooks();
  }, [fetchAccountBooks]);

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAccountBooks();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 处理登出
  const handleLogout = () => {
    Alert.alert(
      '确认登出',
      '您确定要登出吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '登出', 
          style: 'destructive',
          onPress: () => logout()
        },
      ]
    );
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* 自定义头部 */}
      <Appbar.Header style={styles.header}>
        <Appbar.Content 
          title="仪表盘" 
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action 
          icon="bell-outline" 
          onPress={() => {
            // TODO: 实现通知功能
            Alert.alert('通知', '暂未实现');
          }}
        />
        <Appbar.Action 
          icon="logout" 
          onPress={handleLogout}
        />
      </Appbar.Header>

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
        {/* 用户欢迎信息 */}
        <Surface style={styles.welcomeCard} elevation={2}>
          <View style={styles.welcomeContent}>
            <View style={styles.avatarContainer}>
              <Icon name="account-circle" size={48} color={theme.colors.primary} />
            </View>
            <View style={styles.welcomeText}>
              <Text style={[styles.welcomeTitle, { color: theme.colors.onSurface }]}>
                欢迎回来
              </Text>
              <Text style={[styles.userName, { color: theme.colors.primary }]}>
                {user?.name || user?.email || '用户'}
              </Text>
            </View>
          </View>
        </Surface>

        {/* 当前账本信息 */}
        {currentAccountBook ? (
          <Surface style={styles.accountBookCard} elevation={2}>
            <View style={styles.cardHeader}>
              <Icon name="book-open-variant" size={24} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                当前账本
              </Text>
            </View>
            <Text style={[styles.accountBookName, { color: theme.colors.primary }]}>
              {currentAccountBook.name}
            </Text>
            <Text style={[styles.accountBookCurrency, { color: theme.colors.onSurfaceVariant }]}>
              货币: {currentAccountBook.currency}
            </Text>
          </Surface>
        ) : (
          <Surface style={styles.noAccountBookCard} elevation={2}>
            <Icon name="book-plus" size={48} color={theme.colors.outline} />
            <Text style={[styles.noAccountBookTitle, { color: theme.colors.onSurfaceVariant }]}>
              暂无账本
            </Text>
            <Text style={[styles.noAccountBookSubtitle, { color: theme.colors.outline }]}>
              创建您的第一个账本开始记账
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                // TODO: 导航到创建账本页面
                Alert.alert('提示', '创建账本功能即将推出');
              }}
              style={styles.createAccountBookButton}
            >
              创建账本
            </Button>
          </Surface>
        )}

        {/* 快速操作 */}
        <Surface style={styles.quickActionsCard} elevation={2}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            快速操作
          </Text>
          <View style={styles.quickActionsGrid}>
            <Button
              mode="outlined"
              onPress={() => {
                // TODO: 导航到添加记账页面
                Alert.alert('提示', '添加记账功能即将推出');
              }}
              style={styles.quickActionButton}
              contentStyle={styles.quickActionContent}
            >
              <Icon name="plus" size={20} />
              添加记账
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                // TODO: 导航到统计页面
                navigation.navigate('Statistics');
              }}
              style={styles.quickActionButton}
              contentStyle={styles.quickActionContent}
            >
              <Icon name="chart-line" size={20} />
              查看统计
            </Button>
          </View>
        </Surface>

        {/* 账本列表 */}
        {accountBooks.length > 0 && (
          <Surface style={styles.accountBooksCard} elevation={2}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              我的账本 ({accountBooks.length})
            </Text>
            {accountBooks.map((book) => (
              <View key={book.id} style={styles.accountBookItem}>
                <View style={styles.accountBookInfo}>
                  <Icon 
                    name="book" 
                    size={20} 
                    color={book.id === currentAccountBook?.id ? theme.colors.primary : theme.colors.outline} 
                  />
                  <Text 
                    style={[
                      styles.accountBookItemName, 
                      { 
                        color: book.id === currentAccountBook?.id 
                          ? theme.colors.primary 
                          : theme.colors.onSurface 
                      }
                    ]}
                  >
                    {book.name}
                  </Text>
                  {book.id === currentAccountBook?.id && (
                    <Text style={[styles.currentBadge, { color: theme.colors.primary }]}>
                      当前
                    </Text>
                  )}
                </View>
                <Text style={[styles.accountBookItemCurrency, { color: theme.colors.onSurfaceVariant }]}>
                  {book.currency}
                </Text>
              </View>
            ))}
          </Surface>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              加载中...
            </Text>
          </View>
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
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    welcomeCard: {
      padding: 20,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    welcomeContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      marginRight: 16,
    },
    welcomeText: {
      flex: 1,
    },
    welcomeTitle: {
      fontSize: 16,
      marginBottom: 4,
    },
    userName: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    accountBookCard: {
      padding: 20,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    noAccountBookCard: {
      padding: 32,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
    },
    accountBookName: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    accountBookCurrency: {
      fontSize: 14,
    },
    noAccountBookTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    noAccountBookSubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
    },
    createAccountBookButton: {
      marginTop: 8,
    },
    quickActionsCard: {
      padding: 20,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    quickActionButton: {
      flex: 1,
      marginHorizontal: 4,
    },
    quickActionContent: {
      paddingVertical: 8,
    },
    accountBooksCard: {
      padding: 20,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    accountBookItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '20',
    },
    accountBookInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    accountBookItemName: {
      fontSize: 16,
      marginLeft: 12,
      flex: 1,
    },
    currentBadge: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 8,
    },
    accountBookItemCurrency: {
      fontSize: 14,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
  });

export default DashboardScreen;
