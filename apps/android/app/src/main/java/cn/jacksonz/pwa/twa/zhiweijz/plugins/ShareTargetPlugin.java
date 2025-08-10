package cn.jacksonz.pwa.twa.zhiweijz.plugins;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;

/**
 * 分享目标插件
 * 处理从其他应用分享到本应用的图片数据
 */
@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {

    private static final String TAG = "ShareTargetPlugin";

    /**
     * 获取分享的图片数据
     */
    @PluginMethod
    public void getSharedImage(PluginCall call) {
        Log.d(TAG, "📷 [ShareTargetPlugin] getSharedImage方法被调用");

        String imageUri = call.getString("imageUri");
        Log.d(TAG, "📷 [ShareTargetPlugin] 接收到图片URI: " + imageUri);

        if (imageUri == null || imageUri.isEmpty()) {
            Log.e(TAG, "❌ [ShareTargetPlugin] 图片URI为空");
            call.reject("图片URI不能为空");
            return;
        }

        try {
            Uri uri = Uri.parse(imageUri);
            Context context = getContext();
            ContentResolver contentResolver = context.getContentResolver();

            // 获取文件信息
            String fileName = getFileName(contentResolver, uri);
            String mimeType = contentResolver.getType(uri);
            long fileSize = getFileSize(contentResolver, uri);

            Log.d(TAG, "📷 [ShareTargetPlugin] 处理分享图片 - 文件名: " + fileName + ", 类型: " + mimeType + ", 大小: " + fileSize);

            // 读取图片数据并转换为Base64
            InputStream inputStream = contentResolver.openInputStream(uri);
            if (inputStream == null) {
                Log.e(TAG, "❌ [ShareTargetPlugin] 无法读取图片数据");
                call.reject("无法读取图片数据");
                return;
            }

            byte[] imageBytes = readInputStream(inputStream);
            String base64Data = Base64.encodeToString(imageBytes, Base64.DEFAULT);

            // 构建返回数据
            JSObject result = new JSObject();
            result.put("fileName", fileName != null ? fileName : "shared_image.jpg");
            result.put("mimeType", mimeType != null ? mimeType : "image/jpeg");
            result.put("fileSize", fileSize);
            result.put("base64Data", base64Data);
            result.put("source", "share");

            Log.d(TAG, "✅ [ShareTargetPlugin] 图片处理成功 - Base64长度: " + base64Data.length());
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "❌ [ShareTargetPlugin] 处理分享图片失败", e);
            call.reject("处理图片失败: " + e.getMessage());
        }
    }

    /**
     * 获取文件名
     */
    private String getFileName(ContentResolver contentResolver, Uri uri) {
        String fileName = null;
        
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = contentResolver.query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0) {
                        fileName = cursor.getString(nameIndex);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "获取文件名失败", e);
            }
        }
        
        if (fileName == null) {
            fileName = uri.getLastPathSegment();
        }
        
        return fileName;
    }

    /**
     * 获取文件大小
     */
    private long getFileSize(ContentResolver contentResolver, Uri uri) {
        long fileSize = 0;
        
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = contentResolver.query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                    if (sizeIndex >= 0) {
                        fileSize = cursor.getLong(sizeIndex);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "获取文件大小失败", e);
            }
        }
        
        return fileSize;
    }

    /**
     * 读取InputStream到字节数组
     */
    private byte[] readInputStream(InputStream inputStream) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[1024];
        int nRead;
        
        while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        
        inputStream.close();
        return buffer.toByteArray();
    }
}
