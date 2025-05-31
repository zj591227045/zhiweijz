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
 * 注册Activity
 * 提供用户注册功能，集成状态管理
 */
class RegisterActivity : AppCompatActivity() {

    private lateinit var authStorage: AuthStorage
    private lateinit var apiClient: ApiClient

    // UI组件
    private lateinit var nameEditText: EditText
    private lateinit var emailEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var confirmPasswordEditText: EditText
    private lateinit var registerButton: Button
    private lateinit var loginButton: Button
    private lateinit var agreeTermsCheckBox: CheckBox
    private lateinit var statusTextView: TextView
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 初始化组件
        initializeComponents()

        // 创建UI
        createUI()

        // 设置事件监听器
        setupEventListeners()
    }

    private fun initializeComponents() {
        authStorage = AuthStorage.getInstance(this)
        apiClient = ApiClient()
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
            text = "加入我们，开始智能记账之旅"
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
            text = "创建新账户"
            textSize = 24f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, 0, 0, 24)
        }
        formLayout.addView(titleText)

        // 姓名输入
        val nameLabel = TextView(this).apply {
            text = "姓名"
            textSize = 16f
            setPadding(0, 0, 0, 8)
        }
        formLayout.addView(nameLabel)

        nameEditText = EditText(this).apply {
            hint = "请输入您的姓名"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS
            setPadding(16, 16, 16, 16)
            background = resources.getDrawable(android.R.drawable.edit_text, null)
        }
        formLayout.addView(nameEditText)

        // 邮箱输入
        val emailLabel = TextView(this).apply {
            text = "邮箱"
            textSize = 16f
            setPadding(0, 16, 0, 8)
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
            hint = "请输入密码（至少6位）"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            setPadding(16, 16, 16, 16)
            background = resources.getDrawable(android.R.drawable.edit_text, null)
        }
        formLayout.addView(passwordEditText)

        // 确认密码输入
        val confirmPasswordLabel = TextView(this).apply {
            text = "确认密码"
            textSize = 16f
            setPadding(0, 16, 0, 8)
        }
        formLayout.addView(confirmPasswordLabel)

        confirmPasswordEditText = EditText(this).apply {
            hint = "请再次输入密码"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            setPadding(16, 16, 16, 16)
            background = resources.getDrawable(android.R.drawable.edit_text, null)
        }
        formLayout.addView(confirmPasswordEditText)

        // 同意条款选项
        agreeTermsCheckBox = CheckBox(this).apply {
            text = "我同意用户协议和隐私政策"
            setPadding(0, 16, 0, 16)
        }
        formLayout.addView(agreeTermsCheckBox)

        mainLayout.addView(formLayout)

        // 按钮区域
        val buttonLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 32)
        }

        // 注册按钮
        registerButton = Button(this).apply {
            text = "注册"
            textSize = 18f
            setPadding(0, 16, 0, 16)
            setBackgroundColor(resources.getColor(android.R.color.holo_green_dark, null))
            setTextColor(resources.getColor(android.R.color.white, null))
        }
        buttonLayout.addView(registerButton)

        // 登录按钮
        loginButton = Button(this).apply {
            text = "已有账户？立即登录"
            textSize = 16f
            setPadding(0, 12, 0, 12)
            background = null
            setTextColor(resources.getColor(android.R.color.holo_blue_dark, null))
        }
        buttonLayout.addView(loginButton)

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
        registerButton.setOnClickListener {
            handleRegister()
        }

        loginButton.setOnClickListener {
            navigateToLogin()
        }
    }

    private fun handleRegister() {
        val name = nameEditText.text.toString().trim()
        val email = emailEditText.text.toString().trim()
        val password = passwordEditText.text.toString()
        val confirmPassword = confirmPasswordEditText.text.toString()
        val agreeTerms = agreeTermsCheckBox.isChecked

        // 输入验证
        if (name.isEmpty()) {
            showError("请输入姓名")
            return
        }

        if (email.isEmpty()) {
            showError("请输入邮箱地址")
            return
        }

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            showError("请输入有效的邮箱地址")
            return
        }

        if (password.isEmpty()) {
            showError("请输入密码")
            return
        }

        if (password.length < 6) {
            showError("密码长度至少为6位")
            return
        }

        if (confirmPassword.isEmpty()) {
            showError("请确认密码")
            return
        }

        if (password != confirmPassword) {
            showError("两次输入的密码不一致")
            return
        }

        if (!agreeTerms) {
            showError("请先同意用户协议和隐私政策")
            return
        }

        // 开始注册
        setLoading(true)
        updateStatus("正在注册...")

        lifecycleScope.launch {
            try {
                // 使用真实API注册
                println("[RegisterActivity] 开始API注册请求: $email")
                val response = apiClient.register(name, email, password)
                println("[RegisterActivity] API注册成功，token: ${response.token.take(20)}...")

                // 保存登录状态
                val userInfo = AuthStorage.UserInfo(
                    id = response.user.id,
                    name = response.user.name,
                    email = response.user.email,
                    createdAt = response.user.createdAt ?: java.util.Date().toString()  // 如果服务器没有返回，使用当前时间
                )

                authStorage.saveLoginState(response.token, userInfo, false)
                apiClient.setAuthToken(response.token)

                updateStatus("注册成功！")
                showSuccess("欢迎加入，${response.user.name}！")

                // 延迟一下再跳转，让用户看到成功消息
                kotlinx.coroutines.delay(1500)
                navigateToDashboard()

            } catch (e: Exception) {
                updateStatus("注册失败")
                showError("注册失败：${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun navigateToLogin() {
        finish() // 返回登录页面
    }

    private fun navigateToDashboard() {
        val intent = Intent(this, DashboardActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun setLoading(loading: Boolean) {
        runOnUiThread {
            registerButton.isEnabled = !loading
            loginButton.isEnabled = !loading
            nameEditText.isEnabled = !loading
            emailEditText.isEnabled = !loading
            passwordEditText.isEnabled = !loading
            confirmPasswordEditText.isEnabled = !loading
            agreeTermsCheckBox.isEnabled = !loading

            progressBar.visibility = if (loading) android.view.View.VISIBLE else android.view.View.GONE
            registerButton.text = if (loading) "注册中..." else "注册"
        }
    }

    private fun updateStatus(message: String) {
        runOnUiThread {
            val currentTime = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
                .format(java.util.Date())
            statusTextView.text = "[$currentTime] $message"
            println("[RegisterActivity] $message")
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
