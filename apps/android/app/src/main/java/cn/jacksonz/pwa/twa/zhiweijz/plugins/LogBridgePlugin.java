package cn.jacksonz.pwa.twa.zhiweijz.plugins;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 日志桥接插件
 * 将Web层的关键日志桥接到Android logcat
 */
@CapacitorPlugin(name = "LogBridge")
public class LogBridgePlugin extends Plugin {

    private static final String TAG = "LogBridge";

    /**
     * 输出调试日志到logcat
     */
    @PluginMethod
    public void logDebug(PluginCall call) {
        String message = call.getString("message", "");
        String tag = call.getString("tag", "WebView");
        
        Log.d(tag, "🌐 [Web] " + message);
        call.resolve();
    }

    /**
     * 输出信息日志到logcat
     */
    @PluginMethod
    public void logInfo(PluginCall call) {
        String message = call.getString("message", "");
        String tag = call.getString("tag", "WebView");
        
        Log.i(tag, "🌐 [Web] " + message);
        call.resolve();
    }

    /**
     * 输出警告日志到logcat
     */
    @PluginMethod
    public void logWarn(PluginCall call) {
        String message = call.getString("message", "");
        String tag = call.getString("tag", "WebView");
        
        Log.w(tag, "🌐 [Web] " + message);
        call.resolve();
    }

    /**
     * 输出错误日志到logcat
     */
    @PluginMethod
    public void logError(PluginCall call) {
        String message = call.getString("message", "");
        String tag = call.getString("tag", "WebView");
        
        Log.e(tag, "🌐 [Web] " + message);
        call.resolve();
    }
}
