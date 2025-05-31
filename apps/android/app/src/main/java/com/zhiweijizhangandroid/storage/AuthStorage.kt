package com.zhiweijizhangandroid.storage

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException

/**
 * 认证状态存储管理
 * 基于SharedPreferences实现的状态持久化
 */
class AuthStorage private constructor(context: Context) {
    
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("AsyncStorage", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    companion object {
        @Volatile
        private var INSTANCE: AuthStorage? = null
        
        fun getInstance(context: Context): AuthStorage {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AuthStorage(context.applicationContext).also { INSTANCE = it }
            }
        }
        
        // 存储键名常量
        const val KEY_AUTH_TOKEN = "auth-token"
        const val KEY_USER_INFO = "user-info"
        const val KEY_IS_AUTHENTICATED = "is-authenticated"
        const val KEY_REMEMBER_ME = "remember-me"
    }
    
    /**
     * 用户信息数据类
     */
    data class UserInfo(
        val id: String,
        val name: String,
        val email: String,
        val createdAt: String
    )
    
    /**
     * 保存认证令牌
     */
    fun saveAuthToken(token: String) {
        sharedPreferences.edit()
            .putString(KEY_AUTH_TOKEN, token)
            .apply()
        println("[AuthStorage] 认证令牌已保存")
    }
    
    /**
     * 获取认证令牌
     */
    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }
    
    /**
     * 保存用户信息
     */
    fun saveUserInfo(userInfo: UserInfo) {
        try {
            val json = gson.toJson(userInfo)
            sharedPreferences.edit()
                .putString(KEY_USER_INFO, json)
                .apply()
            println("[AuthStorage] 用户信息已保存: ${userInfo.name}")
        } catch (e: Exception) {
            println("[AuthStorage] 保存用户信息失败: ${e.message}")
        }
    }
    
    /**
     * 获取用户信息
     */
    fun getUserInfo(): UserInfo? {
        return try {
            val json = sharedPreferences.getString(KEY_USER_INFO, null)
            if (json != null) {
                gson.fromJson(json, UserInfo::class.java)
            } else {
                null
            }
        } catch (e: JsonSyntaxException) {
            println("[AuthStorage] 解析用户信息失败: ${e.message}")
            null
        }
    }
    
    /**
     * 设置认证状态
     */
    fun setAuthenticated(isAuthenticated: Boolean) {
        sharedPreferences.edit()
            .putBoolean(KEY_IS_AUTHENTICATED, isAuthenticated)
            .apply()
        println("[AuthStorage] 认证状态已更新: $isAuthenticated")
    }
    
    /**
     * 检查是否已认证
     */
    fun isAuthenticated(): Boolean {
        return sharedPreferences.getBoolean(KEY_IS_AUTHENTICATED, false)
    }
    
    /**
     * 设置记住我选项
     */
    fun setRememberMe(remember: Boolean) {
        sharedPreferences.edit()
            .putBoolean(KEY_REMEMBER_ME, remember)
            .apply()
    }
    
    /**
     * 获取记住我选项
     */
    fun getRememberMe(): Boolean {
        return sharedPreferences.getBoolean(KEY_REMEMBER_ME, false)
    }
    
    /**
     * 保存完整的登录状态
     */
    fun saveLoginState(token: String, userInfo: UserInfo, rememberMe: Boolean = false) {
        val editor = sharedPreferences.edit()
        editor.putString(KEY_AUTH_TOKEN, token)
        editor.putString(KEY_USER_INFO, gson.toJson(userInfo))
        editor.putBoolean(KEY_IS_AUTHENTICATED, true)
        editor.putBoolean(KEY_REMEMBER_ME, rememberMe)
        editor.apply()
        
        println("[AuthStorage] 登录状态已保存: ${userInfo.name}")
    }
    
    /**
     * 清除所有认证信息
     */
    fun clearAuthData() {
        val editor = sharedPreferences.edit()
        editor.remove(KEY_AUTH_TOKEN)
        editor.remove(KEY_USER_INFO)
        editor.putBoolean(KEY_IS_AUTHENTICATED, false)
        
        // 如果没有选择记住我，也清除该选项
        if (!getRememberMe()) {
            editor.remove(KEY_REMEMBER_ME)
        }
        
        editor.apply()
        println("[AuthStorage] 认证信息已清除")
    }
    
    /**
     * 获取所有存储的键
     */
    fun getAllKeys(): List<String> {
        return sharedPreferences.all.keys.toList()
    }
    
    /**
     * 获取存储统计信息
     */
    fun getStorageStats(): String {
        val allEntries = sharedPreferences.all
        val authKeys = allEntries.keys.filter { key ->
            key.startsWith("auth-") || key.startsWith("user-") || key == KEY_IS_AUTHENTICATED || key == KEY_REMEMBER_ME
        }
        
        return "认证相关存储:\n" +
                "总键数: ${authKeys.size}\n" +
                "键列表: ${authKeys.joinToString(", ")}\n" +
                "认证状态: ${if (isAuthenticated()) "已登录" else "未登录"}\n" +
                "记住我: ${if (getRememberMe()) "是" else "否"}"
    }
    
    /**
     * 验证存储数据完整性
     */
    fun validateAuthData(): Boolean {
        val token = getAuthToken()
        val userInfo = getUserInfo()
        val isAuth = isAuthenticated()
        
        // 如果标记为已认证，但缺少必要数据，则认为数据不完整
        if (isAuth && (token.isNullOrEmpty() || userInfo == null)) {
            println("[AuthStorage] 认证数据不完整，清除状态")
            clearAuthData()
            return false
        }
        
        return true
    }
    
    /**
     * 检查是否有有效的登录会话
     */
    fun hasValidSession(): Boolean {
        return validateAuthData() && isAuthenticated() && !getAuthToken().isNullOrEmpty()
    }
}
