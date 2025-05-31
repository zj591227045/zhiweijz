import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useAuthStore } from '../store';
import StorageTestScreen from './StorageTestScreen';

const DashboardScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [showStorageTest, setShowStorageTest] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleShowStorageTest = () => {
    setShowStorageTest(true);
  };

  const handleCloseStorageTest = () => {
    setShowStorageTest(false);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 头部区域 */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>欢迎回来</Text>
          <Text style={styles.userName}>{user?.name || '用户'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>退出</Text>
        </TouchableOpacity>
      </View>

      {/* 主要内容区域 */}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>账户概览</Text>
          <Text style={styles.cardSubtitle}>这里将显示您的财务概览</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>快速记账</Text>
          <Text style={styles.cardSubtitle}>点击开始记录您的收支</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>统计分析</Text>
          <Text style={styles.cardSubtitle}>查看您的消费趋势和分析</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>预算管理</Text>
          <Text style={styles.cardSubtitle}>设置和管理您的预算计划</Text>
        </View>

        {/* 开发者工具 */}
        <TouchableOpacity style={[styles.card, styles.debugCard]} onPress={handleShowStorageTest}>
          <Text style={styles.cardTitle}>🔧 存储测试工具</Text>
          <Text style={styles.cardSubtitle}>测试和调试AsyncStorage功能</Text>
        </TouchableOpacity>
      </View>

      {/* 存储测试模态框 */}
      <Modal
        visible={showStorageTest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseStorageTest}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>存储测试工具</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseStorageTest}>
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
          <StorageTestScreen />
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  debugCard: {
    borderColor: '#ff9800',
    borderWidth: 2,
    backgroundColor: '#fff3e0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
