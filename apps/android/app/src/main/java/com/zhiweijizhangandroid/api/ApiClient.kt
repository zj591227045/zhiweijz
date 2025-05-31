package com.zhiweijizhangandroid.api

import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * API客户端
 * 处理与服务器的HTTP通信
 */
class ApiClient {

    private val baseUrl = "http://10.255.0.97/api"
    private val gson = Gson()
    private var authToken: String? = null

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    /**
     * 登录请求数据类
     */
    data class LoginRequest(
        val email: String,
        val password: String
    )

    /**
     * 注册请求数据类
     */
    data class RegisterRequest(
        val name: String,
        val email: String,
        val password: String
    )

    /**
     * 用户数据类
     */
    data class User(
        val id: String,
        val name: String,
        val email: String,
        val createdAt: String? = null  // 使字段可选，提供默认值
    )

    /**
     * API响应数据类
     */
    data class AuthResponse(
        val token: String,
        val user: User
    )

    /**
     * API错误响应数据类
     */
    data class ErrorResponse(
        val message: String,
        val code: String? = null
    )

    /**
     * 设置认证令牌
     */
    fun setAuthToken(token: String) {
        this.authToken = token
        println("[ApiClient] 认证令牌已设置")
    }

    /**
     * 清除认证令牌
     */
    fun clearAuthToken() {
        this.authToken = null
        println("[ApiClient] 认证令牌已清除")
    }

    /**
     * 执行HTTP请求
     */
    private suspend fun <T> executeRequest(
        method: String,
        endpoint: String,
        requestBody: Any? = null,
        responseClass: Class<T>
    ): T = withContext(Dispatchers.IO) {
        val url = "$baseUrl$endpoint"

        val requestBuilder = Request.Builder().url(url)

        // 添加认证头
        authToken?.let { token ->
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }

        // 添加请求体
        if (requestBody != null && method in listOf("POST", "PUT", "PATCH")) {
            val json = gson.toJson(requestBody)
            val body = json.toRequestBody("application/json".toMediaType())
            requestBuilder.method(method, body)
            requestBuilder.addHeader("Content-Type", "application/json")
        } else {
            requestBuilder.method(method, null)
        }

        println("[ApiClient] 请求: $method $url")
        println("[ApiClient] Headers: ${requestBuilder.build().headers}")

        val response = httpClient.newCall(requestBuilder.build()).execute()

        val responseBody = response.body?.string() ?: ""
        println("[ApiClient] 响应状态: ${response.code}")
        println("[ApiClient] 响应体长度: ${responseBody.length}")
        println("[ApiClient] 响应体内容: $responseBody")

        if (!response.isSuccessful) {
            println("[ApiClient] 请求失败: ${response.code} ${response.message}")
            println("[ApiClient] 错误响应体: $responseBody")
            val errorMessage = try {
                val errorResponse = gson.fromJson(responseBody, ErrorResponse::class.java)
                errorResponse.message
            } catch (e: Exception) {
                "HTTP ${response.code}: ${response.message}"
            }
            throw Exception(errorMessage)
        }

        println("[ApiClient] 请求成功: $method $url")

        try {
            val result = gson.fromJson(responseBody, responseClass)
            println("[ApiClient] JSON解析成功")
            result
        } catch (e: Exception) {
            println("[ApiClient] JSON解析失败: ${e.message}")
            println("[ApiClient] 期望类型: ${responseClass.simpleName}")
            println("[ApiClient] 响应内容: $responseBody")
            throw Exception("JSON解析失败: ${e.message}")
        }
    }

    /**
     * 登录
     */
    suspend fun login(email: String, password: String): AuthResponse {
        return executeRequest(
            "POST",
            "/auth/login",
            LoginRequest(email, password),
            AuthResponse::class.java
        )
    }

    /**
     * 注册
     */
    suspend fun register(name: String, email: String, password: String): AuthResponse {
        return executeRequest(
            "POST",
            "/auth/register",
            RegisterRequest(name, email, password),
            AuthResponse::class.java
        )
    }

    /**
     * 检查网络连接
     */
    suspend fun checkConnection(): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            val request = Request.Builder()
                .url("$baseUrl/health")
                .build()

            val response = httpClient.newCall(request).execute()
            val isConnected = response.isSuccessful

            println("[ApiClient] 网络连接检查: ${if (isConnected) "正常" else "异常"}")
            isConnected
        } catch (e: Exception) {
            println("[ApiClient] 网络连接检查失败: ${e.message}")
            false
        }
    }

    /**
     * 获取用户信息
     */
    suspend fun getUserInfo(): User {
        return executeRequest("GET", "/auth/me", null, User::class.java)
    }

    /**
     * 登出
     */
    suspend fun logout(): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            executeRequest("POST", "/auth/logout", null, Map::class.java)
            true
        } catch (e: Exception) {
            println("[ApiClient] 登出请求失败: ${e.message}")
            false
        }
    }

    /**
     * 获取API基础URL
     */
    fun getBaseUrl(): String = baseUrl

    /**
     * 清除缓存（简化实现）
     */
    fun clearCache() {
        println("[ApiClient] 缓存已清除")
    }

    /**
     * 获取统计数据
     */
    suspend fun getStatistics(accountBookId: String, startDate: String, endDate: String): Map<String, Any>? {
        return try {
            val endpoint = "/statistics/overview?accountBookId=$accountBookId&startDate=$startDate&endDate=$endDate"
            executeRequest("GET", endpoint, null, Map::class.java) as? Map<String, Any>
        } catch (e: Exception) {
            println("[ApiClient] 获取统计数据失败: ${e.message}")
            null
        }
    }

    /**
     * 获取预算统计数据
     */
    suspend fun getBudgetStatistics(accountBookId: String): Map<String, Any>? {
        return try {
            val endpoint = "/budgets/statistics?accountBookId=$accountBookId"
            executeRequest("GET", endpoint, null, Map::class.java) as? Map<String, Any>
        } catch (e: Exception) {
            println("[ApiClient] 获取预算统计失败: ${e.message}")
            null
        }
    }

    /**
     * 获取最近交易数据
     */
    suspend fun getRecentTransactions(accountBookId: String, limit: Int = 20): Map<String, Any>? {
        return try {
            val endpoint = "/transactions?accountBookId=$accountBookId&limit=$limit&sort=date&order=desc"
            executeRequest("GET", endpoint, null, Map::class.java) as? Map<String, Any>
        } catch (e: Exception) {
            println("[ApiClient] 获取最近交易失败: ${e.message}")
            null
        }
    }

    /**
     * 获取用户账本列表
     */
    suspend fun getAccountBooks(): Map<String, Any>? {
        return try {
            executeRequest("GET", "/account-books", null, Map::class.java) as? Map<String, Any>
        } catch (e: Exception) {
            println("[ApiClient] 获取账本列表失败: ${e.message}")
            null
        }
    }

    /**
     * 模拟登录（用于测试）
     */
    suspend fun mockLogin(email: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        // 模拟网络延迟
        kotlinx.coroutines.delay(1000)

        // 简单的模拟验证
        if (email.isNotEmpty() && password.length >= 6) {
            AuthResponse(
                token = "mock-token-${System.currentTimeMillis()}",
                user = User(
                    id = "mock-user-id",
                    name = email.substringBefore("@"),
                    email = email,
                    createdAt = java.util.Date().toString()
                )
            )
        } else {
            throw Exception("邮箱或密码格式不正确")
        }
    }

    /**
     * 模拟注册（用于测试）
     */
    suspend fun mockRegister(name: String, email: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        // 模拟网络延迟
        kotlinx.coroutines.delay(1500)

        // 简单的模拟验证
        if (name.isNotEmpty() && email.contains("@") && password.length >= 6) {
            AuthResponse(
                token = "mock-token-${System.currentTimeMillis()}",
                user = User(
                    id = "mock-user-${System.currentTimeMillis()}",
                    name = name,
                    email = email,
                    createdAt = java.util.Date().toString()
                )
            )
        } else {
            throw Exception("注册信息格式不正确")
        }
    }
}
