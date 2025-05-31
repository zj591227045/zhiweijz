package com.zhiweijizhangandroid

import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.zhiweijizhangandroid.api.ApiClient
import com.zhiweijizhangandroid.storage.AuthStorage
import kotlinx.coroutines.launch

/**
 * 登录Activity
 * 提供用户登录功能，集成状态管理
 */
class LoginActivity : AppCompatActivity() {

    private lateinit var authStorage: AuthStorage
    private lateinit var apiClient: ApiClient

    // UI组件
    private lateinit var emailEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var loginButton: Button
    private lateinit var registerButton: Button
    private lateinit var rememberMeCheckBox: CheckBox
    private lateinit var statusTextView: TextView
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化组件
        initializeComponents()

        // 检查是否已登录
        checkExistingAuth()

        // 创建UI
        createUI()

        // 设置事件监听器
        setupEventListeners()
    }

    private fun initializeComponents() {
        authStorage = AuthStorage.getInstance(this)
        apiClient = ApiClient()
    }

    private fun checkExistingAuth() {
        if (authStorage.hasValidSession()) {
            // 已有有效登录状态，直接跳转到仪表盘
            navigateToDashboard()
        }
    }

    private fun createUI() {
        val scrollView = ScrollView(this)
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }

        // Logo区域
        val logoLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 32, 0, 48)
        }

        val logoText = TextView(this).apply {
            text = "只为记账"
            textSize = 32f
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = android.view.Gravity.CENTER
            setTextColor(resources.getColor(android.R.color.holo_blue_dark, null))
        }
        logoLayout.addView(logoText)

        val sloganText = TextView(this).apply {
            text = "简单、高效，AI驱动的记账工具"
            textSize = 16f
            gravity = android.view.Gravity.CENTER
            setTextColor(resources.getColor(android.R.color.darker_gray, null))
            setPadding(0, 8, 0, 0)
        }
        logoLayout.addView(sloganText)

        mainLayout.addView(logoLayout)

        // 表单区域
        val formLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 32)
        }

        // 标题
        val titleText = TextView(this).apply {
            text = "登录您的账户"
            textSize = 24f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, 0, 0, 24)
        }
        formLayout.addView(titleText)

        // 邮箱输入
        val emailLabel = TextView(this).apply {
            text = "邮箱"
            textSize = 16f
            setPadding(0, 0, 0, 8)
        }
        formLayout.addView(emailLabel)

        emailEditText = EditText(this).apply {
            hint = "请输入邮箱地址"
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setPadding(16, 16, 16, 16)
            background = resources.getDrawable(android.R.drawable.edit_text, null)
        }
        formLayout.addView(emailEditText)

        // 密码输入
        val passwordLabel = TextView(this).apply {
            text = "密码"
            textSize = 16f
            setPadding(0, 16, 0, 8)
        }
        formLayout.addView(passwordLabel)

        passwordEditText = EditText(this).apply {
            hint = "请输入密码"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            setPadding(16, 16, 16, 16)
            background = resources.getDrawable(android.R.drawable.edit_text, null)
        }
        formLayout.addView(passwordEditText)

        // 记住我选项
        rememberMeCheckBox = CheckBox(this).apply {
            text = "记住我"
            setPadding(0, 16, 0, 16)
        }
        formLayout.addView(rememberMeCheckBox)

        mainLayout.addView(formLayout)

        // 按钮区域
        val buttonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 32)
        }

        // 登录按钮
        loginButton = Button(this).apply {
            text = "登录"
            textSize = 18f
            setPadding(0, 16, 0, 16)
            setBackgroundColor(resources.getColor(android.R.color.holo_blue_dark, null))
            setTextColor(resources.getColor(android.R.color.white, null))
        }
        buttonLayout.addView(loginButton)

        // 注册按钮
        registerButton = Button(this).apply {
            text = "注册新账户"
            textSize = 16f
            setPadding(0, 12, 0, 12)
            background = null
            setTextColor(resources.getColor(android.R.color.holo_blue_dark, null))
        }
        buttonLayout.addView(registerButton)

        mainLayout.addView(buttonLayout)

        // 状态显示区域
        statusTextView = TextView(this).apply {
            text = "准备就绪"
            textSize = 14f
            gravity = android.view.Gravity.CENTER
            setPadding(0, 16, 0, 16)
            setTextColor(resources.getColor(android.R.color.darker_gray, null))
        }
        mainLayout.addView(statusTextView)

        // 进度条
        progressBar = ProgressBar(this).apply {
            visibility = android.view.View.GONE
        }
        mainLayout.addView(progressBar)

        scrollView.addView(mainLayout)
        setContentView(scrollView)
    }

    private fun setupEventListeners() {
        loginButton.setOnClickListener {
            handleLogin()
        }

        registerButton.setOnClickListener {
            navigateToRegister()
        }

        // 恢复记住的邮箱
        if (authStorage.getRememberMe()) {
            authStorage.getUserInfo()?.let { userInfo ->
                emailEditText.setText(userInfo.email)
                rememberMeCheckBox.isChecked = true
            }
        }
    }

    private fun handleLogin() {
        val email = emailEditText.text.toString().trim()
        val password = passwordEditText.text.toString()
        val rememberMe = rememberMeCheckBox.isChecked

        // 输入验证
        if (email.isEmpty()) {
            showError("请输入邮箱地址")
            return
        }

        if (password.isEmpty()) {
            showError("请输入密码")
            return
        }

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            showError("请输入有效的邮箱地址")
            return
        }

        // 开始登录
        setLoading(true)
        updateStatus("正在登录...")

        lifecycleScope.launch {
            try {
                // 使用真实API登录
                println("[LoginActivity] 开始API登录请求: $email")
                val response = apiClient.login(email, password)
                println("[LoginActivity] API登录成功，token: ${response.token.take(20)}...")

                // 保存登录状态
                val userInfo = AuthStorage.UserInfo(
                    id = response.user.id,
                    name = response.user.name,
                    email = response.user.email,
                    createdAt = response.user.createdAt ?: java.util.Date().toString()  // 如果服务器没有返回，使用当前时间
                )

                authStorage.saveLoginState(response.token, userInfo, rememberMe)
                apiClient.setAuthToken(response.token)

                updateStatus("登录成功！")
                showSuccess("欢迎回来，${response.user.name}！")

                // 延迟一下再跳转，让用户看到成功消息
                kotlinx.coroutines.delay(1000)
                navigateToDashboard()

            } catch (e: Exception) {
                updateStatus("登录失败")
                showError("登录失败：${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun navigateToRegister() {
        val intent = Intent(this, RegisterActivity::class.java)
        startActivity(intent)
    }

    private fun navigateToDashboard() {
        val intent = Intent(this, DashboardActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun setLoading(loading: Boolean) {
        runOnUiThread {
            loginButton.isEnabled = !loading
            registerButton.isEnabled = !loading
            emailEditText.isEnabled = !loading
            passwordEditText.isEnabled = !loading
            rememberMeCheckBox.isEnabled = !loading

            progressBar.visibility = if (loading) android.view.View.VISIBLE else android.view.View.GONE
            loginButton.text = if (loading) "登录中..." else "登录"
        }
    }

    private fun updateStatus(message: String) {
        runOnUiThread {
            val currentTime = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
                .format(java.util.Date())
            statusTextView.text = "[$currentTime] $message"
            println("[LoginActivity] $message")
        }
    }

    private fun showError(message: String) {
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
            statusTextView.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
        }
    }

    private fun showSuccess(message: String) {
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
            statusTextView.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
        }
    }
}
