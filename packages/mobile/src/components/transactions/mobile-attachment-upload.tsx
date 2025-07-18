import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Button,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { apiClient } from '../../lib/api-client';
import { MobileAttachmentPreview, MobileAttachmentFile } from './mobile-attachment-preview';

const { width: screenWidth } = Dimensions.get('window');

export interface MobileAttachment {
  id: string;
  fileId: string;
  attachmentType: 'RECEIPT' | 'INVOICE' | 'CONTRACT' | 'PHOTO' | 'DOCUMENT' | 'OTHER';
  description?: string;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string;
  };
  localUri?: string; // 本地文件URI
  uploading?: boolean;
}

interface MobileAttachmentUploadProps {
  transactionId?: string;
  initialAttachments?: MobileAttachment[];
  onChange?: (attachments: MobileAttachment[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function MobileAttachmentUpload({
  transactionId,
  initialAttachments = [],
  onChange,
  disabled = false,
  maxFiles = 10,
}: MobileAttachmentUploadProps) {
  const theme = useTheme();
  const [attachments, setAttachments] = useState<MobileAttachment[]>(initialAttachments);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // 更新附件列表
  const updateAttachments = useCallback((newAttachments: MobileAttachment[]) => {
    setAttachments(newAttachments);
    onChange?.(newAttachments);
  }, [onChange]);

  // 处理附件预览
  const handlePreviewAttachment = useCallback((index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  // 转换附件为预览格式
  const previewFiles: MobileAttachmentFile[] = attachments
    .filter(attachment => attachment.file)
    .map(attachment => ({
      id: attachment.file!.id,
      filename: attachment.file!.filename,
      originalName: attachment.file!.originalName,
      mimeType: attachment.file!.mimeType,
      size: attachment.file!.size,
      url: attachment.file!.url,
    }));

  // 上传文件到服务器
  const uploadFile = useCallback(async (fileUri: string, fileName: string, mimeType: string) => {
    const formData = new FormData();

    try {
      let response;
      if (transactionId) {
        // 编辑模式：直接上传到指定记账
        formData.append('attachment', {
          uri: fileUri,
          type: mimeType,
          name: fileName,
        } as any);

        response = await apiClient.post(
          `/transactions/${transactionId}/attachments`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        // 新建模式：先上传到临时存储
        formData.append('file', {
          uri: fileUri,
          type: mimeType,
          name: fileName,
        } as any);
        formData.append('bucket', 'temp-files');
        formData.append('category', 'attachments');
        formData.append('description', fileName);

        response = await apiClient.post('/file-storage/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      return response.data;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }, [transactionId]);

  // 处理图片选择
  const handleImagePicker = useCallback(() => {
    if (disabled || attachments.length >= maxFiles) return;

    Alert.alert(
      '选择图片',
      '请选择图片来源',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '相机拍照',
          onPress: () => {
            launchCamera(
              {
                mediaType: 'photo' as MediaType,
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1920,
              },
              handleImageResponse
            );
          },
        },
        {
          text: '从相册选择',
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo' as MediaType,
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1920,
                selectionLimit: maxFiles - attachments.length,
              },
              handleImageResponse
            );
          },
        },
      ]
    );
  }, [disabled, attachments.length, maxFiles]);

  // 处理图片选择响应
  const handleImageResponse = useCallback(async (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets) {
      for (const asset of response.assets) {
        if (asset.uri && asset.fileName && asset.type) {
          const tempAttachment: MobileAttachment = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fileId: '',
            attachmentType: 'PHOTO',
            description: asset.fileName,
            localUri: asset.uri,
            uploading: true,
          };

          // 添加到列表中显示上传状态
          const newAttachments = [...attachments, tempAttachment];
          updateAttachments(newAttachments);

          try {
            const uploadResult = await uploadFile(asset.uri, asset.fileName, asset.type);
            
            // 更新附件信息
            const updatedAttachment: MobileAttachment = {
              ...tempAttachment,
              fileId: uploadResult.fileId || uploadResult.data?.fileId,
              file: uploadResult.data || uploadResult,
              uploading: false,
            };

            const updatedAttachments = newAttachments.map(att => 
              att.id === tempAttachment.id ? updatedAttachment : att
            );
            updateAttachments(updatedAttachments);
          } catch (error) {
            // 上传失败，移除该附件
            const filteredAttachments = newAttachments.filter(att => att.id !== tempAttachment.id);
            updateAttachments(filteredAttachments);
            Alert.alert('上传失败', '图片上传失败，请重试');
          }
        }
      }
    }
  }, [attachments, uploadFile, updateAttachments]);

  // 处理文档选择
  const handleDocumentPicker = useCallback(async () => {
    if (disabled || attachments.length >= maxFiles) return;

    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
        allowMultiSelection: true,
      });

      for (const result of results) {
        if (attachments.length >= maxFiles) break;

        const tempAttachment: MobileAttachment = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileId: '',
          attachmentType: result.type?.includes('pdf') ? 'RECEIPT' : 'DOCUMENT',
          description: result.name,
          localUri: result.uri,
          uploading: true,
        };

        // 添加到列表中显示上传状态
        const newAttachments = [...attachments, tempAttachment];
        updateAttachments(newAttachments);

        try {
          const uploadResult = await uploadFile(result.uri, result.name, result.type || 'application/octet-stream');
          
          // 更新附件信息
          const updatedAttachment: MobileAttachment = {
            ...tempAttachment,
            fileId: uploadResult.fileId || uploadResult.data?.fileId,
            file: uploadResult.data || uploadResult,
            uploading: false,
          };

          const updatedAttachments = newAttachments.map(att => 
            att.id === tempAttachment.id ? updatedAttachment : att
          );
          updateAttachments(updatedAttachments);
        } catch (error) {
          // 上传失败，移除该附件
          const filteredAttachments = newAttachments.filter(att => att.id !== tempAttachment.id);
          updateAttachments(filteredAttachments);
          Alert.alert('上传失败', '文件上传失败，请重试');
        }
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('选择失败', '文件选择失败，请重试');
      }
    }
  }, [disabled, attachments, maxFiles, uploadFile, updateAttachments]);

  // 删除附件
  const handleRemoveAttachment = useCallback(async (attachmentId: string) => {
    try {
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) return;

      // 如果是已保存的附件，调用删除API
      if (transactionId && !attachment.id.startsWith('temp-')) {
        await apiClient.delete(`/transactions/attachments/${attachmentId}`);
      }

      const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
      updateAttachments(updatedAttachments);
    } catch (error) {
      console.error('删除附件失败:', error);
      Alert.alert('删除失败', '删除附件失败，请重试');
    }
  }, [attachments, transactionId, updateAttachments]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const styles = StyleSheet.create({
    container: {
      padding: 16,
    },
    uploadArea: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 16,
      backgroundColor: theme.colors.surfaceVariant,
      marginBottom: 20,
    },
    uploadHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    uploadText: {
      marginLeft: 8,
      flex: 1,
      color: theme.colors.onSurfaceVariant,
      fontSize: 14,
      fontWeight: '500',
    },
    infoButton: {
      padding: 4,
      borderRadius: 12,
      backgroundColor: 'transparent',
    },
    uploadDescription: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginBottom: 16,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
    },
    attachmentGrid: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 4,
    },
    attachmentItem: {
      width: 160, // 固定宽度，更大的预览
      height: 180,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    attachmentImage: {
      width: '100%',
      height: 120, // 固定高度，更大的图片预览
    },
    attachmentInfo: {
      padding: 12,
      height: 60,
      justifyContent: 'space-between',
    },
    attachmentName: {
      fontSize: 10,
      textAlign: 'center',
    },
    removeButton: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: theme.colors.error,
      borderRadius: 16,
      width: 32,
      height: 32,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={styles.container}>
      {/* 优化后的上传区域 */}
      <View style={styles.uploadArea}>
        <View style={styles.uploadHeader}>
          <Icon name="cloud-upload" size={24} color={theme.colors.primary} />
          <Text style={styles.uploadText}>添加附件</Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                '支持的文件格式',
                '• 图片格式：JPEG, PNG, GIF, WEBP\n• 文档格式：PDF\n• 最大文件大小：10MB',
                [{ text: '知道了', style: 'default' }]
              );
            }}
            style={styles.infoButton}
          >
            <Icon name="information-outline" size={16} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <Text style={styles.uploadDescription}>
          支持图片和PDF格式，最多上传{maxFiles}个文件
        </Text>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleImagePicker}
            disabled={disabled || attachments.length >= maxFiles}
            icon="camera"
            style={{ minWidth: 100 }}
          >
            拍照/相册
          </Button>
          <Button
            mode="outlined"
            onPress={handleDocumentPicker}
            disabled={disabled || attachments.length >= maxFiles}
            icon="file-document"
            style={{ minWidth: 100 }}
          >
            选择文件
          </Button>
        </View>
      </View>

      {/* 增强版附件列表 */}
      {attachments.length > 0 && (
        <View>
          <Text style={{ marginBottom: 16, fontWeight: '600', fontSize: 16 }}>
            已上传的附件 ({attachments.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            <View style={styles.attachmentGrid}>
              {attachments.map((attachment) => (
                <Surface key={attachment.id} style={styles.attachmentItem}>
                  {/* 可点击的预览区域 */}
                  <TouchableOpacity
                    style={styles.attachmentImage}
                    onPress={() => {
                      const attachmentIndex = attachments.findIndex(a => a.id === attachment.id);
                      if (attachmentIndex >= 0 && attachment.file) {
                        handlePreviewAttachment(attachmentIndex);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {attachment.localUri && attachment.file?.mimeType?.startsWith('image/') ? (
                      <Image
                        source={{ uri: attachment.localUri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceVariant }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          backgroundColor: theme.colors.errorContainer,
                          borderRadius: 8,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 8
                        }}>
                          <Icon
                            name={attachment.file?.mimeType?.includes('pdf') ? 'file-pdf-box' : 'file-document'}
                            size={24}
                            color={theme.colors.error}
                          />
                        </View>
                        <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>
                          点击预览
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.attachmentInfo}>
                    <Text style={[styles.attachmentName, { fontWeight: '500' }]} numberOfLines={1}>
                      {attachment.description || attachment.file?.originalName}
                    </Text>
                    {attachment.file?.size && (
                      <Text style={[styles.attachmentName, { color: theme.colors.onSurfaceVariant, fontSize: 11 }]}>
                        {formatFileSize(attachment.file.size)}
                      </Text>
                    )}
                  </View>

                  {/* 删除按钮 - 位于右下角内部 */}
                  <IconButton
                    icon="delete"
                    size={16}
                    iconColor="white"
                    style={styles.removeButton}
                    onPress={() => handleRemoveAttachment(attachment.id)}
                    disabled={attachment.uploading}
                  />

                  {/* 上传中遮罩 */}
                  {attachment.uploading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>
                        上传中...
                      </Text>
                    </View>
                  )}
                </Surface>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* 附件预览模态框 */}
      {previewFiles.length > 0 && (
        <MobileAttachmentPreview
          files={previewFiles}
          currentIndex={previewIndex}
          isVisible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          onNavigate={setPreviewIndex}
        />
      )}
    </View>
  );
}
