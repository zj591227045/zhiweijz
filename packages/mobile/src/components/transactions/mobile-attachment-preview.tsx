import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Platform,
  PermissionsAndroid,
  StatusBar,
  PanResponder,
  Animated,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  IconButton,
  ActivityIndicator,
  Modal,
  Portal,
  Button,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import CameraRoll from '@react-native-camera-roll/camera-roll';
import { apiClient } from '../../lib/api-client';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface MobileAttachmentFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}

interface MobileAttachmentPreviewProps {
  files: MobileAttachmentFile[];
  currentIndex: number;
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete?: (index: number) => void; // 新增删除回调
}

/**
 * 移动端附件预览组件
 * 支持全屏图片预览、长按操作菜单、缩放、滑动切换等功能
 */
export function MobileAttachmentPreview({
  files,
  currentIndex,
  isVisible,
  onClose,
  onNavigate,
  onDelete,
}: MobileAttachmentPreviewProps) {
  const theme = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [scale, setScale] = useState(new Animated.Value(1));
  const [lastTap, setLastTap] = useState<number | null>(null);

  const currentFile = files[currentIndex];
  const isImage = currentFile?.mimeType.startsWith('image/');

  // 长按手势处理器
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // 检测滑动手势
      const { dx, dy } = gestureState;
      return Math.abs(dx) > 10 || Math.abs(dy) > 10;
    },
    
    onPanResponderGrant: (evt) => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      
      if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
        // 双击处理 - 可以添加缩放逻辑
        handleDoubleTap();
      } else {
        setLastTap(now);
        // 开始长按检测
        setTimeout(() => {
          if (lastTap === now) {
            // 长按触发
            handleLongPress();
          }
        }, 500);
      }
    },
    
    onPanResponderMove: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      
      // 如果移动距离超过阈值，取消长按
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        setLastTap(null);
      }
    },
    
    onPanResponderRelease: (evt, gestureState) => {
      const { dx } = gestureState;
      const swipeThreshold = 100;
      
      // 水平滑动切换图片
      if (Math.abs(dx) > swipeThreshold && files.length > 1) {
        if (dx > 0 && currentIndex > 0) {
          // 向右滑动，显示上一张
          onNavigate(currentIndex - 1);
        } else if (dx < 0 && currentIndex < files.length - 1) {
          // 向左滑动，显示下一张
          onNavigate(currentIndex + 1);
        }
      }
    },
  });

  // 处理双击缩放
  const handleDoubleTap = () => {
    const currentScale = scale._value;
    const newScale = currentScale === 1 ? 2 : 1;
    
    Animated.spring(scale, {
      toValue: newScale,
      useNativeDriver: false,
    }).start();
    
    setLastTap(null);
  };

  // 处理长按显示操作菜单
  const handleLongPress = () => {
    if (isImage) {
      setShowActionMenu(true);
    }
    setLastTap(null);
  };

  // 处理删除操作
  const handleDelete = () => {
    setShowActionMenu(false);
    if (onDelete) {
      Alert.alert(
        '删除图片',
        `确定要删除图片"${currentFile.originalName}"吗？此操作无法撤销。`,
        [
          { text: '取消', style: 'cancel' },
          { 
            text: '删除', 
            style: 'destructive',
            onPress: () => onDelete(currentIndex)
          }
        ]
      );
    }
  };

  // 请求存储权限
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return true; // iOS不需要额外权限
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: '存储权限',
          message: '需要存储权限来保存文件',
          buttonNeutral: '稍后询问',
          buttonNegative: '取消',
          buttonPositive: '确定',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('权限请求失败:', err);
      return false;
    }
  };

  // 下载文件
  const downloadFile = async (file: MobileAttachmentFile): Promise<string> => {
    const apiBaseUrl = '/api'; // 移动端使用相对路径
    const downloadUrl = `${apiBaseUrl}/file-storage/${file.id}/download`;
    
    // 确定保存路径
    const downloadDir = Platform.OS === 'ios' 
      ? RNFS.DocumentDirectoryPath 
      : RNFS.DownloadDirectoryPath;
    
    const filePath = `${downloadDir}/${file.originalName}`;

    // 下载文件
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: filePath,
      progress: (res) => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        setDownloadProgress(progress);
      },
    }).promise;

    if (downloadResult.statusCode === 200) {
      return filePath;
    } else {
      throw new Error(`下载失败，状态码: ${downloadResult.statusCode}`);
    }
  };

  // 保存图片到相册
  const saveImageToGallery = async (file: MobileAttachmentFile) => {
    if (!isImage) {
      Alert.alert('错误', '只能保存图片到相册');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // 请求权限
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('权限不足', '需要存储权限来保存图片');
        return;
      }

      // 下载文件
      const filePath = await downloadFile(file);

      // 保存到相册
      await CameraRoll.save(filePath, { type: 'photo' });

      Alert.alert('保存成功', '图片已保存到相册');
    } catch (error) {
      console.error('保存图片失败:', error);
      Alert.alert('保存失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // 下载文件到本地存储
  const downloadToLocal = async (file: MobileAttachmentFile) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // 请求权限
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('权限不足', '需要存储权限来下载文件');
        return;
      }

      // 下载文件
      const filePath = await downloadFile(file);

      Alert.alert(
        '下载成功',
        `文件已保存到: ${filePath}`,
        [
          { text: '确定', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('下载文件失败:', error);
      Alert.alert('下载失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // 处理下载按钮点击
  const handleDownloadAction = () => {
    if (!currentFile) return;

    if (isImage) {
      Alert.alert(
        '保存选项',
        '选择保存方式',
        [
          { text: '保存到相册', onPress: () => saveImageToGallery(currentFile) },
          { text: '下载到文件', onPress: () => downloadToLocal(currentFile) },
          { text: '取消', style: 'cancel' }
        ]
      );
    } else {
      downloadToLocal(currentFile);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!currentFile) return null;

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={onClose}
        contentContainerStyle={styles.fullScreenModal}
      >
        {/* 全屏状态栏 */}
        <StatusBar hidden={isVisible} />

        {/* 主要内容区域 */}
        <View style={styles.fullScreenContent}>
          {isImage ? (
            <Animated.View 
              style={[
                styles.imageContainer,
                {
                  transform: [{ scale: scale }]
                }
              ]}
              {...panResponder.panHandlers}
            >
              <Image
                source={{ uri: currentFile.url }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </Animated.View>
          ) : (
            <View style={styles.fileContainer}>
              <View style={[styles.fileIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon
                  name={currentFile.mimeType.includes('pdf') ? 'file-pdf-box' : 'file-document'}
                  size={64}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.fileTitle, { color: 'white' }]}>
                {currentFile.originalName}
              </Text>
              <Text style={[styles.fileSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                {formatFileSize(currentFile.size)}
              </Text>
            </View>
          )}
        </View>

        {/* 导航按钮 */}
        {files.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={() => onNavigate(currentIndex - 1)}
              >
                <Icon name="chevron-left" size={32} color="white" />
              </TouchableOpacity>
            )}
            {currentIndex < files.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={() => onNavigate(currentIndex + 1)}
              >
                <Icon name="chevron-right" size={32} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* 关闭按钮 */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Icon name="close" size={24} color="white" />
        </TouchableOpacity>

        {/* 下载进度 */}
        {isDownloading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.progressText}>
              下载中... {Math.round(downloadProgress)}%
            </Text>
          </View>
        )}

        {/* 长按操作菜单 */}
        <Modal
          visible={showActionMenu}
          onDismiss={() => setShowActionMenu(false)}
          contentContainerStyle={styles.actionMenuModal}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowActionMenu(false);
                handleDownloadAction();
              }}
            >
              <Icon name="download" size={24} color={theme.colors.primary} />
              <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>保存图片</Text>
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDelete}
              >
                <Icon name="delete" size={24} color={theme.colors.error} />
                <Text style={[styles.actionText, { color: theme.colors.error }]}>删除图片</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowActionMenu(false)}
            >
              <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.actionText, { color: theme.colors.onSurfaceVariant }]}>取消</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  fullScreenModal: {
    flex: 1,
    margin: 0,
    backgroundColor: 'black',
  },
  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight,
  },
  fileContainer: {
    alignItems: 'center',
    padding: 32,
  },
  fileIcon: {
    width: 120,
    height: 120,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  fileSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  progressText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  actionMenuModal: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionMenu: {
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  actionText: {
    fontSize: 18,
    marginLeft: 16,
    fontWeight: '500',
  },
});
