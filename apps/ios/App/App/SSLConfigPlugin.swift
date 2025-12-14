import Foundation
import Capacitor
import UIKit

/**
 * SSL配置插件 - iOS版本
 * 处理SSL证书验证和用户确认
 */
@objc(SSLConfigPlugin)
public class SSLConfigPlugin: CAPPlugin {
    private var isPermissiveMode = false
    
    /**
     * 显示SSL安全警告对话框
     */
    @objc func showSSLWarning(_ call: CAPPluginCall) {
        let url = call.getString("url") ?? "未知服务器"
        let message = call.getString("message") ?? "SSL证书验证失败"
        
        DispatchQueue.main.async {
            let alert = UIAlertController(
                title: "⚠️ SSL安全警告",
                message: """
                无法验证服务器证书的安全性。
                
                服务器: \(url)
                错误: \(message)
                
                这可能是因为：
                • 服务器使用自签名证书
                • 证书已过期或无效
                • 连接可能不安全
                
                是否仍要继续连接？
                """,
                preferredStyle: .alert
            )
            
            alert.addAction(UIAlertAction(title: "继续连接", style: .destructive) { _ in
                self.isPermissiveMode = true
                call.resolve([
                    "allowed": true,
                    "message": "用户选择继续连接"
                ])
                print("🔓 [SSLConfig] 用户选择信任不安全的SSL连接: \(url)")
            })
            
            alert.addAction(UIAlertAction(title: "取消连接", style: .cancel) { _ in
                call.resolve([
                    "allowed": false,
                    "message": "用户取消连接"
                ])
                print("🔒 [SSLConfig] 用户拒绝不安全的SSL连接: \(url)")
            })
            
            self.bridge?.viewController?.present(alert, animated: true)
        }
    }
    
    /**
     * 配置宽松的SSL设置
     */
    @objc func configurePermissiveSSL(_ call: CAPPluginCall) {
        isPermissiveMode = true
        call.resolve([
            "success": true,
            "message": "SSL配置已更新为宽松模式"
        ])
        print("✅ [SSLConfig] SSL配置已更新为宽松模式")
    }
    
    /**
     * 恢复默认SSL设置
     */
    @objc func restoreDefaultSSL(_ call: CAPPluginCall) {
        isPermissiveMode = false
        call.resolve([
            "success": true,
            "message": "SSL配置已恢复为默认模式"
        ])
        print("✅ [SSLConfig] SSL配置已恢复为默认模式")
    }
    
    /**
     * 获取当前SSL配置状态
     */
    @objc func getSSLStatus(_ call: CAPPluginCall) {
        call.resolve([
            "isPermissive": isPermissiveMode,
            "message": isPermissiveMode ? "当前使用宽松SSL配置" : "当前使用默认SSL配置"
        ])
    }
    
    /**
     * 检查是否允许不受信任的证书
     */
    public func shouldAllowUntrustedCertificate() -> Bool {
        return isPermissiveMode
    }
}