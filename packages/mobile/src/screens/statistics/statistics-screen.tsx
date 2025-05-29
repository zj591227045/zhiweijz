import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Appbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigationProps, MainTabParamList } from '../../navigation/types';

interface StatisticsScreenProps extends NavigationProps<'Statistics'> {}

/**
 * 统计屏幕
 * 显示收支统计、图表分析等信息
 */
const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ navigation }) => {
  const theme = useTheme();

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* 自定义头部 */}
      <Appbar.Header style={styles.header}>
        <Appbar.Content 
          title="统计分析" 
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action 
          icon="calendar-range" 
          onPress={() => {
            // TODO: 实现日期范围选择
          }}
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 占位内容 */}
        <Surface style={styles.placeholderCard} elevation={2}>
          <View style={styles.placeholderContent}>
            <Icon name="chart-line" size={64} color={theme.colors.outline} />
            <Text style={[styles.placeholderTitle, { color: theme.colors.onSurfaceVariant }]}>
              统计功能开发中
            </Text>
            <Text style={[styles.placeholderSubtitle, { color: theme.colors.outline }]}>
              即将为您提供详细的收支分析和图表统计
            </Text>
          </View>
        </Surface>
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
    placeholderCard: {
      padding: 48,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    placeholderContent: {
      alignItems: 'center',
    },
    placeholderTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    placeholderSubtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export default StatisticsScreen;
