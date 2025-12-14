import Foundation
import Network

/**
 * 网络代理类
 * 处理SSL证书验证和用户交互
 */
class NetworkDelegate: NSObject, URLSessionDelegate {
    private weak var sslPlugin: SSLConfigPlugin?
    
    init(sslPlugin: SSLConfigPlugin?) {
        self.sslPlugin = sslPlugin
        super.init()
    }
    
    /**
     * 处理SSL证书验证挑战
     */
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        // 获取服务器信任对象
        guard let serverTrust = challenge.protectionSpace.serverTrust else {
            print("❌ [NetworkDelegate] 无法获取服务器信任对象")
            completionHandler(.performDefaultHandling, nil)
            return
        }
        
        // 首先尝试默认验证
        let policy = SecPolicyCreateSSL(true, challenge.protectionSpace.host as CFString)
        SecTrustSetPolicies(serverTrust, policy)
        
        var result: SecTrustResultType = .invalid
        let status = SecTrustEvaluate(serverTrust, &result)
        
        // 如果默认验证成功，直接通过
        if status == errSecSuccess && (result == .unspecified || result == .proceed) {
            print("✅ [NetworkDelegate] SSL证书验证成功")
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
            return
        }
        
        // 如果验证失败，检查是否允许不受信任的证书
        if let plugin = sslPlugin, plugin.shouldAllowUntrustedCertificate() {
            print("🔓 [NetworkDelegate] 使用宽松模式，允许不受信任的证书")
            let credential = URLCredential(trust: serverTrust)
            completionHandler(.useCredential, credential)
            return
        }
        
        // 如果不在宽松模式，显示警告对话框
        print("⚠️ [NetworkDelegate] SSL证书验证失败，主机: \(challenge.protectionSpace.host)")
        
        DispatchQueue.main.async {
            let alert = UIAlertController(
                title: "⚠️ SSL安全警告",
                message: """
                无法验证服务器证书的安全性。
                
                服务器: \(challenge.protectionSpace.host)
                
                这可能是因为：
                • 服务器使用自签名证书
                • 证书已过期或无效
                • 连接可能不安全
                
                是否仍要继续连接？
                """,
                preferredStyle: .alert
            )
            
            alert.addAction(UIAlertAction(title: "继续连接", style: .destructive) { _ in
                print("🔓 [NetworkDelegate] 用户选择信任不受信任的证书")
                self.sslPlugin?.configurePermissiveSSL(CAPPluginCall(callbackId: "", options: [:], success: { _ in }, error: { _ in }))
                let credential = URLCredential(trust: serverTrust)
                completionHandler(.useCredential, credential)
            })
            
            alert.addAction(UIAlertAction(title: "取消连接", style: .cancel) { _ in
                print("🔒 [NetworkDelegate] 用户拒绝不受信任的证书")
                completionHandler(.cancelAuthenticationChallenge, nil)
            })
            
            // 获取当前显示的视图控制器
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let window = windowScene.windows.first,
               let rootViewController = window.rootViewController {
                rootViewController.present(alert, animated: true)
            }
        }
    }
}