package cn.jacksonz.pwa.twa.zhiweijz.utils;

import android.content.Context;
import android.util.Log;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * 网络配置助手类
 * 提供SSL证书信任配置
 */
public class NetworkConfigHelper {
    private static final String TAG = "NetworkConfigHelper";
    private static boolean isConfigured = false;

    /**
     * 配置宽松的SSL设置（允许不受信任的证书）
     * 注意：这会降低安全性，仅在开发/测试环境使用
     */
    public static void configurePermissiveSSL(Context context) {
        if (isConfigured) {
            Log.d(TAG, "SSL配置已经设置，跳过重复配置");
            return;
        }

        try {
            // 创建信任所有证书的TrustManager
            TrustManager[] trustAllCerts = new TrustManager[]{
                new X509TrustManager() {
                    @Override
                    public X509Certificate[] getAcceptedIssuers() {
                        return new X509Certificate[0];
                    }

                    @Override
                    public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        // 信任所有客户端证书
                    }

                    @Override
                    public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        // 信任所有服务器证书
                    }
                }
            };

            // 创建SSLContext
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new SecureRandom());

            // 设置默认的SSLSocketFactory
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());

            // 设置默认的HostnameVerifier（信任所有主机名）
            HttpsURLConnection.setDefaultHostnameVerifier(new HostnameVerifier() {
                @Override
                public boolean verify(String hostname, SSLSession session) {
                    Log.d(TAG, "验证主机名: " + hostname);
                    return true; // 信任所有主机名
                }
            });

            isConfigured = true;
            Log.i(TAG, "✅ 已配置宽松的SSL设置");

        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            Log.e(TAG, "❌ 配置SSL设置失败", e);
        }
    }

    /**
     * 恢复默认的SSL设置
     */
    public static void restoreDefaultSSL() {
        try {
            // 恢复默认的SSL设置
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, null, null);
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier(HttpsURLConnection.getDefaultHostnameVerifier());
            
            isConfigured = false;
            Log.i(TAG, "✅ 已恢复默认SSL设置");
        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            Log.e(TAG, "❌ 恢复默认SSL设置失败", e);
        }
    }

    /**
     * 检查是否已配置宽松SSL
     */
    public static boolean isPermissiveSSLConfigured() {
        return isConfigured;
    }
}