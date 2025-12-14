package cn.jacksonz.pwa.twa.zhiweijz.plugins;

import android.app.AlertDialog;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import cn.jacksonz.pwa.twa.zhiweijz.utils.NetworkConfigHelper;

/**
 * SSL配置插件
 * 允许Web层控制SSL证书验证行为
 */
@CapacitorPlugin(name = "SSLConfig")
public class SSLConfigPlugin extends Plugin {
    private static final String TAG = "SSLConfigPlugin";

    /**
     * 显示SSL安全警告对话框
     */
    @PluginMethod
    public void showSSLWarning(PluginCall call) {
        String url = call.getString("url", "未知服务器");
        String message = call.getString("message", "SSL证书验证失败");

        getActivity().runOnUiThread(() -> {
            new AlertDialog.Builder(getContext())
                .setTitle("⚠️ SSL安全警告")
                .setMessage("无法验证服务器证书的安全性。\n\n" +
                           "服务器: " + url + "\n" +
                           "错误: " + message + "\n\n" +
                           "这可能是因为：\n" +
                           "• 服务器使用自签名证书\n" +
                           "• 证书已过期或无效\n" +
                           "• 连接可能不安全\n\n" +
                           "是否仍要继续连接？")
                .setPositiveButton("继续连接", (dialog, which) -> {
                    // 配置宽松的SSL设置
                    NetworkConfigHelper.configurePermissiveSSL(getContext());
                    
                    JSObject result = new JSObject();
                    result.put("allowed", true);
                    result.put("message", "用户选择继续连接");
                    call.resolve(result);
                    
                    Log.i(TAG, "用户选择信任不安全的SSL连接: " + url);
                })
                .setNegativeButton("取消连接", (dialog, which) -> {
                    JSObject result = new JSObject();
                    result.put("allowed", false);
                    result.put("message", "用户取消连接");
                    call.resolve(result);
                    
                    Log.i(TAG, "用户拒绝不安全的SSL连接: " + url);
                })
                .setCancelable(false)
                .show();
        });
    }

    /**
     * 配置宽松的SSL设置
     */
    @PluginMethod
    public void configurePermissiveSSL(PluginCall call) {
        try {
            NetworkConfigHelper.configurePermissiveSSL(getContext());
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "SSL配置已更新为宽松模式");
            call.resolve(result);
            
            Log.i(TAG, "✅ SSL配置已更新为宽松模式");
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("message", "SSL配置失败: " + e.getMessage());
            call.reject("SSL配置失败", e);
            
            Log.e(TAG, "❌ SSL配置失败", e);
        }
    }

    /**
     * 恢复默认SSL设置
     */
    @PluginMethod
    public void restoreDefaultSSL(PluginCall call) {
        try {
            NetworkConfigHelper.restoreDefaultSSL();
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "SSL配置已恢复为默认模式");
            call.resolve(result);
            
            Log.i(TAG, "✅ SSL配置已恢复为默认模式");
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("message", "SSL配置恢复失败: " + e.getMessage());
            call.reject("SSL配置恢复失败", e);
            
            Log.e(TAG, "❌ SSL配置恢复失败", e);
        }
    }

    /**
     * 获取当前SSL配置状态
     */
    @PluginMethod
    public void getSSLStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("isPermissive", NetworkConfigHelper.isPermissiveSSLConfigured());
        result.put("message", NetworkConfigHelper.isPermissiveSSLConfigured() ? 
                   "当前使用宽松SSL配置" : "当前使用默认SSL配置");
        call.resolve(result);
    }
}