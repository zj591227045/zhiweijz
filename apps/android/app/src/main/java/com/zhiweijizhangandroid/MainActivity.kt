package com.zhiweijizhangandroid

import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * 主Activity - SharedPreferences状态管理测试
 * 只为记账Android应用
 */
class MainActivity : AppCompatActivity() {

    private lateinit var sharedPreferences: SharedPreferences
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化组件
        initializeComponents()

        // 创建UI
        createUI()
    }

    private fun initializeComponents() {
        sharedPreferences = getSharedPreferences("AsyncStorage", Context.MODE_PRIVATE)
    }

    private fun createUI() {
        val scrollView = ScrollView(this)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        // 标题
        val titleText = TextView(this).apply {
            text = "只为记账 Android 状态管理测试"
            textSize = 20f
            setPadding(0, 0, 0, 32)
        }
        layout.addView(titleText)

        // 状态显示
        statusText = TextView(this).apply {
            text = "准备就绪，点击按钮开始测试..."
            textSize = 14f
            setPadding(0, 0, 0, 16)
        }
        layout.addView(statusText)

        // SharedPreferences基础测试按钮
        val testStorageButton = Button(this).apply {
            text = "测试 SharedPreferences 基础功能"
            setOnClickListener { testSharedPreferences() }
        }
        layout.addView(testStorageButton)

        // 认证存储测试按钮
        val testAuthStorageButton = Button(this).apply {
            text = "测试认证状态存储"
            setOnClickListener { testAuthStorage() }
        }
        layout.addView(testAuthStorageButton)

        // 清除存储按钮
        val clearStorageButton = Button(this).apply {
            text = "清除所有存储"
            setOnClickListener { clearAllStorage() }
        }
        layout.addView(clearStorageButton)

        // 查看存储信息按钮
        val viewStorageButton = Button(this).apply {
            text = "查看存储信息"
            setOnClickListener { viewStorageInfo() }
        }
        layout.addView(viewStorageButton)

        scrollView.addView(layout)
        setContentView(scrollView)
    }

    private fun updateStatus(message: String) {
        val currentTime = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        statusText.text = "[$currentTime] $message"
        println("[MainActivity] $message")
    }

    private fun testSharedPreferences() {
        try {
            updateStatus("开始测试SharedPreferences...")

            val testKey = "test-key-${System.currentTimeMillis()}"
            val testValue = "test-value-${System.currentTimeMillis()}"

            // 测试写入
            val editor = sharedPreferences.edit()
            editor.putString(testKey, testValue)
            editor.apply()

            // 测试读取
            val retrievedValue = sharedPreferences.getString(testKey, null)

            // 测试删除
            editor.remove(testKey)
            editor.apply()

            // 验证删除
            val deletedValue = sharedPreferences.getString(testKey, null)

            if (retrievedValue == testValue && deletedValue == null) {
                val message = "SharedPreferences测试成功！\n" +
                        "写入: $testValue\n" +
                        "读取: $retrievedValue\n" +
                        "删除: 成功"
                updateStatus("✅ $message")
                Toast.makeText(this, "SharedPreferences测试成功", Toast.LENGTH_SHORT).show()
            } else {
                throw Exception("数据不匹配: 期望=$testValue, 实际=$retrievedValue, 删除后=$deletedValue")
            }
        } catch (e: Exception) {
            val message = "SharedPreferences测试失败: ${e.message}"
            updateStatus("❌ $message")
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }

    private fun testAuthStorage() {
        try {
            updateStatus("开始测试认证存储...")

            // 模拟保存认证信息
            val testToken = "test-token-${System.currentTimeMillis()}"
            val testUserJson = """
                {
                    "id": "test-id",
                    "name": "测试用户",
                    "email": "test@example.com",
                    "createdAt": "${java.util.Date()}"
                }
            """.trimIndent()

            val editor = sharedPreferences.edit()
            editor.putString("auth-token", testToken)
            editor.putString("user-info", testUserJson)
            editor.apply()

            // 验证保存的数据
            val savedToken = sharedPreferences.getString("auth-token", null)
            val savedUserJson = sharedPreferences.getString("user-info", null)

            if (savedToken == testToken && savedUserJson == testUserJson) {
                updateStatus("✅ 认证存储测试成功！")
                Toast.makeText(this, "认证存储测试成功", Toast.LENGTH_SHORT).show()
            } else {
                updateStatus("❌ 认证存储测试失败：数据不匹配")
            }
        } catch (e: Exception) {
            updateStatus("❌ 认证存储测试失败：${e.message}")
        }
    }

    private fun clearAllStorage() {
        try {
            val editor = sharedPreferences.edit()
            editor.clear()
            editor.apply()
            updateStatus("✅ 所有存储已清除")
            Toast.makeText(this, "存储已清除", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            updateStatus("❌ 清除存储失败：${e.message}")
        }
    }

    private fun viewStorageInfo() {
        try {
            val allEntries = sharedPreferences.all
            val keys = allEntries.keys.toList()
            val info = "存储信息:\n总键数: ${keys.size}\n键列表: ${keys.joinToString(", ")}"
            updateStatus(info)
            Toast.makeText(this, "共有 ${keys.size} 个存储项", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            updateStatus("❌ 获取存储信息失败：${e.message}")
        }
    }
}
