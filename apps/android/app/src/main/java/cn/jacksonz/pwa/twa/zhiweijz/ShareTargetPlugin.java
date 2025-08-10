package cn.jacksonz.pwa.twa.zhiweijz;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    private static final String TAG = "ShareTargetPlugin";

    @PluginMethod
    public void getSharedImage(PluginCall call) {
        Log.d(TAG, "📷 [ShareTargetPlugin] getSharedImage方法被调用");
        
        try {
            // 从MainActivity获取分享的图片URI
            MainActivity mainActivity = (MainActivity) getActivity();
            if (mainActivity != null && mainActivity.getSharedImageUri() != null) {
                Uri imageUri = mainActivity.getSharedImageUri();
                Log.d(TAG, "📷 [ShareTargetPlugin] 获取到分享图片URI: " + imageUri.toString());
                
                // 处理图片
                String processedImagePath = processSharedImage(imageUri);
                
                if (processedImagePath != null) {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("imagePath", processedImagePath);
                    result.put("originalUri", imageUri.toString());
                    
                    Log.d(TAG, "✅ [ShareTargetPlugin] 图片处理成功: " + processedImagePath);
                    call.resolve(result);
                } else {
                    Log.e(TAG, "❌ [ShareTargetPlugin] 图片处理失败");
                    call.reject("Failed to process shared image");
                }
            } else {
                Log.w(TAG, "⚠️ [ShareTargetPlugin] 没有找到分享的图片");
                call.reject("No shared image found");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ [ShareTargetPlugin] 处理分享图片时发生错误: " + e.getMessage(), e);
            call.reject("Error processing shared image: " + e.getMessage());
        }
    }

    private String processSharedImage(Uri imageUri) {
        try {
            Context context = getContext();
            ContentResolver contentResolver = context.getContentResolver();
            
            // 创建临时文件
            File tempDir = new File(context.getCacheDir(), "shared_images");
            if (!tempDir.exists()) {
                tempDir.mkdirs();
            }
            
            String fileName = "shared_image_" + System.currentTimeMillis() + ".jpg";
            File tempFile = new File(tempDir, fileName);
            
            // 复制图片到临时文件
            try (InputStream inputStream = contentResolver.openInputStream(imageUri);
                 FileOutputStream outputStream = new FileOutputStream(tempFile)) {
                
                if (inputStream != null) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                    
                    Log.d(TAG, "📷 [ShareTargetPlugin] 图片已复制到: " + tempFile.getAbsolutePath());
                    return tempFile.getAbsolutePath();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ [ShareTargetPlugin] 处理图片时发生错误: " + e.getMessage(), e);
        }
        
        return null;
    }

    @PluginMethod
    public void clearSharedImage(PluginCall call) {
        Log.d(TAG, "🧹 [ShareTargetPlugin] 清除分享图片");
        
        try {
            MainActivity mainActivity = (MainActivity) getActivity();
            if (mainActivity != null) {
                mainActivity.clearSharedImageUri();
                Log.d(TAG, "✅ [ShareTargetPlugin] 分享图片已清除");
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "❌ [ShareTargetPlugin] 清除分享图片时发生错误: " + e.getMessage(), e);
            call.reject("Error clearing shared image: " + e.getMessage());
        }
    }
}
