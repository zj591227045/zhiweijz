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
}

/**
 * 移动端附件预览组件
 * 支持图片预览、文件下载、保存到相册等功能
 */
export function MobileAttachmentPreview({
  files,
  currentIndex,
  isVisible,
  onClose,
  onNavigate,
}: MobileAttachmentPreviewProps) {
  const theme = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const currentFile = files[currentIndex];
  const isImage = currentFile?.mimeType.startsWith('image/');

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
  const handleDownload = () => {
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
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
      >
        {/* 头部工具栏 */}
        <View style={[styles.header, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.fileName, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {currentFile.originalName}
            </Text>
            <Text style={[styles.fileInfo, { color: theme.colors.onSurfaceVariant }]}>
              {formatFileSize(currentFile.size)} • {currentFile.mimeType}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <IconButton
              icon="download"
              size={24}
              iconColor={theme.colors.primary}
              onPress={handleDownload}
              disabled={isDownloading}
            />
            <IconButton
              icon="close"
              size={24}
              iconColor={theme.colors.onSurface}
              onPress={onClose}
            />
          </View>
        </View>

        {/* 内容区域 */}
        <View style={styles.content}>
          {isImage ? (
            <TouchableOpacity style={styles.imageContainer} activeOpacity={1}>
              <Image
                source={{ uri: currentFile.url }}
                style={styles.image}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.fileContainer}>
              <View style={[styles.fileIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon
                  name={currentFile.mimeType.includes('pdf') ? 'file-pdf-box' : 'file-document'}
                  size={64}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.fileTitle, { color: theme.colors.onSurface }]}>
                {currentFile.originalName}
              </Text>
              <Text style={[styles.fileSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {formatFileSize(currentFile.size)}
              </Text>
            </View>
          )}
        </View>

        {/* 下载进度 */}
        {isDownloading && (
          <View style={[styles.progressContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
              下载中... {Math.round(downloadProgress)}%
            </Text>
          </View>
        )}

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
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    margin: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerRight: {
    flexDirection: 'row',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
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
  image: {
    width: screenWidth,
    height: screenHeight * 0.7,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  progressText: {
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
});
