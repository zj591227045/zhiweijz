package cn.jacksonz.pwa.twa.zhiweijz;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.capacitorjs.plugins.camera.CameraPlugin;
import cn.jacksonz.pwa.twa.zhiweijz.plugins.ShareTargetPlugin;
import cn.jacksonz.pwa.twa.zhiweijz.plugins.LogBridgePlugin;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    private Uri sharedImageUri = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 注册Camera插件
        registerPlugin(CameraPlugin.class);

        // 注册分享目标插件
        registerPlugin(ShareTargetPlugin.class);

        // 注册日志桥接插件
        registerPlugin(LogBridgePlugin.class);

        super.onCreate(savedInstanceState);

        // 设置状态栏和导航栏透明
        setupSystemBars();

        // 添加启动日志
        Log.d(TAG, "🚀 [MainActivity] 应用启动完成，已注册插件");

        // 处理分享Intent
        handleSharedIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // 处理新的分享Intent
        handleSharedIntent(intent);
    }

    /**
     * 处理分享的Intent
     */
    private void handleSharedIntent(Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        String type = intent.getType();

        Log.d(TAG, "处理Intent - Action: " + action + ", Type: " + type);

        if (Intent.ACTION_SEND.equals(action) && type != null && type.startsWith("image/")) {
            Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (imageUri != null) {
                Log.d(TAG, "接收到分享的图片: " + imageUri.toString());

                // 存储分享的图片URI供插件使用
                sharedImageUri = imageUri;

                // 将图片URI传递给Web层
                String imageUriStr = imageUri.toString();
                Log.d(TAG, "准备发送JavaScript事件，图片URI: " + imageUriStr);

                // 延迟执行，确保Web层已经完全加载
                getBridge().getWebView().postDelayed(() -> {
                    String jsCode = "try { " +
                        "console.log('📷 [Android] 准备触发分享图片事件'); " +
                        "window.dispatchEvent(new CustomEvent('sharedImageReceived', { detail: { imageUri: '" +
                        imageUriStr.replace("'", "\\'") + "', source: 'share' } })); " +
                        "console.log('📷 [Android] 分享图片事件已触发'); " +
                        "'SUCCESS'; " +
                        "} catch(e) { " +
                        "console.error('📷 [Android] JavaScript执行失败:', e); " +
                        "'ERROR: ' + e.message; " +
                        "}";
                    Log.d(TAG, "📷 [MainActivity] 执行JavaScript代码触发分享事件");
                    getBridge().getWebView().evaluateJavascript(jsCode, result -> {
                        Log.d(TAG, "📷 [MainActivity] JavaScript执行完成，结果: " + result);
                    });
                }, 2000); // 延迟2秒执行
            }
        }
    }

    private void setupSystemBars() {
        // 启用边到边显示
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // 设置状态栏和导航栏透明
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);

        // 设置状态栏图标为深色（适合浅色背景）
        WindowInsetsControllerCompat windowInsetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (windowInsetsController != null) {
            windowInsetsController.setAppearanceLightStatusBars(true);
            windowInsetsController.setAppearanceLightNavigationBars(true);
        }

        // 设置系统UI可见性
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }

    // 分享图片URI的getter和setter方法
    public Uri getSharedImageUri() {
        return sharedImageUri;
    }

    public void clearSharedImageUri() {
        sharedImageUri = null;
    }
}
