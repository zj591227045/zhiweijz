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

  // 更新附件列表
  const updateAttachments = useCallback((newAttachments: MobileAttachment[]) => {
    setAttachments(newAttachments);
    onChange?.(newAttachments);
  }, [onChange]);

  // 上传文件到服务器
  const uploadFile = useCallback(async (fileUri: string, fileName: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('attachment', {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    } as any);

    try {
      let response;
      if (transactionId) {
        // 编辑模式：直接上传到指定交易
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
      borderWidth: 2,
      borderColor: theme.colors.outline,
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginBottom: 16,
    },
    uploadText: {
      marginTop: 8,
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    attachmentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    attachmentItem: {
      width: (screenWidth - 64) / 3, // 3列布局，考虑padding和gap
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      elevation: 2,
    },
    attachmentImage: {
      width: '100%',
      height: '70%',
    },
    attachmentInfo: {
      padding: 8,
      height: '30%',
      justifyContent: 'center',
    },
    attachmentName: {
      fontSize: 10,
      textAlign: 'center',
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: theme.colors.error,
      borderRadius: 12,
      width: 24,
      height: 24,
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
      {/* 上传区域 */}
      <TouchableOpacity
        style={styles.uploadArea}
        onPress={handleImagePicker}
        disabled={disabled || attachments.length >= maxFiles}
      >
        <Icon name="cloud-upload" size={32} color={theme.colors.primary} />
        <Text style={styles.uploadText}>
          点击上传收据、发票或其他相关文件
        </Text>
        <Text style={[styles.uploadText, { fontSize: 12 }]}>
          支持图片和PDF格式，最多{maxFiles}个文件
        </Text>
        
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleImagePicker}
            disabled={disabled || attachments.length >= maxFiles}
            icon="camera"
            compact
          >
            拍照/相册
          </Button>
          <Button
            mode="outlined"
            onPress={handleDocumentPicker}
            disabled={disabled || attachments.length >= maxFiles}
            icon="file-document"
            compact
          >
            选择文件
          </Button>
        </View>
      </TouchableOpacity>

      {/* 附件列表 */}
      {attachments.length > 0 && (
        <View>
          <Text style={{ marginBottom: 12, fontWeight: '500' }}>
            已选择的文件 ({attachments.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.attachmentGrid}>
              {attachments.map((attachment) => (
                <Surface key={attachment.id} style={styles.attachmentItem}>
                  {attachment.localUri && attachment.file?.mimeType?.startsWith('image/') ? (
                    <Image
                      source={{ uri: attachment.localUri }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.attachmentImage, { justifyContent: 'center', alignItems: 'center' }]}>
                      <Icon
                        name={attachment.file?.mimeType?.includes('pdf') ? 'file-pdf-box' : 'file-document'}
                        size={32}
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                  
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.description || attachment.file?.originalName}
                    </Text>
                    {attachment.file?.size && (
                      <Text style={[styles.attachmentName, { color: theme.colors.onSurfaceVariant }]}>
                        {formatFileSize(attachment.file.size)}
                      </Text>
                    )}
                  </View>

                  {/* 删除按钮 */}
                  <IconButton
                    icon="close"
                    size={12}
                    iconColor="white"
                    style={styles.removeButton}
                    onPress={() => handleRemoveAttachment(attachment.id)}
                    disabled={attachment.uploading}
                  />

                  {/* 上传中遮罩 */}
                  {attachment.uploading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator color="white" />
                    </View>
                  )}
                </Surface>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
