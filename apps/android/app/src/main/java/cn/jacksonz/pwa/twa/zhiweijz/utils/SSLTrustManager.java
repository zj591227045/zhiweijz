package cn.jacksonz.pwa.twa.zhiweijz.utils;

import android.app.AlertDialog;
import android.content.Context;
import android.util.Log;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import javax.net.ssl.X509TrustManager;

/**
 * 自定义SSL信任管理器
 * 在证书验证失败时提供用户选择
 */
public class SSLTrustManager implements X509TrustManager {
    private static final String TAG = "SSLTrustManager";
    private final X509TrustManager defaultTrustManager;
    private final Context context;
    private boolean userAllowedUntrusted = false;

    public SSLTrustManager(X509TrustManager defaultTrustManager, Context context) {
        this.defaultTrustManager = defaultTrustManager;
        this.context = context;
    }

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
        try {
            defaultTrustManager.checkClientTrusted(chain, authType);
        } catch (CertificateException e) {
            if (!userAllowedUntrusted) {
                handleUntrustedCertificate(e, "客户端证书");
            }
        }
    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
        try {
            defaultTrustManager.checkServerTrusted(chain, authType);
        } catch (CertificateException e) {
            if (!userAllowedUntrusted) {
                handleUntrustedCertificate(e, "服务器证书");
            }
        }
    }

    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return defaultTrustManager.getAcceptedIssuers();
    }

    /**
     * 处理不受信任的证书
     */
    private void handleUntrustedCertificate(CertificateException originalException, String certificateType) throws CertificateException {
        Log.w(TAG, "检测到不受信任的" + certificateType + ": " + originalException.getMessage());
        
        // 在主线程中显示对话框
        if (context instanceof android.app.Activity) {
            android.app.Activity activity = (android.app.Activity) context;
            activity.runOnUiThread(() -> {
                showSecurityWarningDialog(originalException, certificateType);
            });
        }
        
        // 如果用户没有允许，抛出原始异常
        if (!userAllowedUntrusted) {
            throw originalException;
        }
    }

    /**
     * 显示安全警告对话框
     */
    private void showSecurityWarningDialog(CertificateException exception, String certificateType) {
        new AlertDialog.Builder(context)
            .setTitle("⚠️ 安全警告")
            .setMessage("检测到不受信任的" + certificateType + "。\n\n" +
                       "这可能是因为：\n" +
                       "• 服务器使用自签名证书\n" +
                       "• 证书已过期或无效\n" +
                       "• 连接可能不安全\n\n" +
                       "是否仍要继续连接？")
            .setPositiveButton("继续连接", (dialog, which) -> {
                userAllowedUntrusted = true;
                Log.i(TAG, "用户选择信任不受信任的证书");
                dialog.dismiss();
            })
            .setNegativeButton("取消", (dialog, which) -> {
                userAllowedUntrusted = false;
                Log.i(TAG, "用户拒绝信任不受信任的证书");
                dialog.dismiss();
            })
            .setCancelable(false)
            .show();
    }

    /**
     * 重置用户选择状态
     */
    public void resetUserChoice() {
        userAllowedUntrusted = false;
    }

    /**
     * 检查用户是否已允许不受信任的证书
     */
    public boolean isUserAllowedUntrusted() {
        return userAllowedUntrusted;
    }
}