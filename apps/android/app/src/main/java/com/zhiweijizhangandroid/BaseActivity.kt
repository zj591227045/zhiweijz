package com.zhiweijizhangandroid

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.zhiweijizhangandroid.storage.AuthStorage
import com.zhiweijizhangandroid.utils.FontAwesomeHelper
import kotlinx.coroutines.launch

/**
 * 基础Activity - 包含全局顶部工具栏和底部导航栏
 */
abstract class BaseActivity : AppCompatActivity() {

    protected lateinit var authStorage: AuthStorage

    // UI组件
    private lateinit var rootLayout: LinearLayout
    private lateinit var topToolbar: LinearLayout
    private lateinit var contentContainer: FrameLayout
    private lateinit var bottomNavigation: LinearLayout

    // 工具栏组件
    private lateinit var titleTextView: TextView
    private lateinit var userButton: Button
    private lateinit var settingsButton: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        authStorage = AuthStorage.getInstance(this)

        // 创建全局布局
        createGlobalLayout()

        // 设置内容视图
        setContentView(rootLayout)

        // 子类实现具体内容
        createContent(contentContainer)

        // 设置当前页面状态
        updateNavigationState()
    }

    /**
     * 创建全局布局结构
     */
    private fun createGlobalLayout() {
        // 根布局
        rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
        }

        // 创建顶部工具栏
        createTopToolbar()

        // 创建内容容器
        contentContainer = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f // 占据剩余空间
            )
            setBackgroundColor(Color.parseColor("#f8f9fa"))
        }
        rootLayout.addView(contentContainer)

        // 创建底部导航栏
        createBottomNavigation()
    }

    /**
     * 创建顶部工具栏
     */
    private fun createTopToolbar() {
        topToolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(32, 32, 32, 32) // 增加内边距
            setBackgroundColor(Color.parseColor("#ffffff")) // 白色背景
            elevation = 6f // 减少阴影
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 应用标题 - 现代化样式
        titleTextView = TextView(this).apply {
            text = getPageTitle()
            textSize = 22f // 稍微增大
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111827")) // 深色文字
            layoutParams = LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )
        }
        topToolbar.addView(titleTextView)

        // 用户按钮 - 现代化圆形头像
        userButton = Button(this).apply {
            val userInfo = authStorage.getUserInfo()
            text = userInfo?.name?.take(2) ?: "用户"
            textSize = 16f
            setTextColor(Color.WHITE)
            background = createCircularButton("#3b82f6") // 圆形按钮
            layoutParams = LinearLayout.LayoutParams(
                112, 112 // 稍微增大
            ).apply {
                setMargins(20, 0, 20, 0)
            }
            setOnClickListener { showUserMenu() }
        }
        topToolbar.addView(userButton)

        // 夜间模式按钮
        val nightModeButton = TextView(this).apply {
            FontAwesomeHelper.setIcon(this, "moon", 18f)
            setTextColor(Color.parseColor("#64748b"))
            background = createCircularButton("#f1f5f9")
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(112, 112).apply {
                setMargins(10, 0, 10, 0)
            }
            setOnClickListener { toggleNightMode() }
        }
        topToolbar.addView(nightModeButton)

        // 设置按钮 - 现代化圆形按钮
        settingsButton = TextView(this).apply {
            FontAwesomeHelper.setIcon(this, "cog", 18f)
            setTextColor(Color.parseColor("#64748b")) // 灰色图标
            background = createCircularButton("#f1f5f9") // 浅灰色背景
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                112, 112 // 与用户按钮保持一致
            )
            setOnClickListener { openSettings() }
        }
        topToolbar.addView(settingsButton)

        // 通知按钮
        val notificationButton = TextView(this).apply {
            FontAwesomeHelper.setIcon(this, "bell", 18f)
            setTextColor(Color.parseColor("#64748b"))
            background = createCircularButton("#f1f5f9")
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(112, 112).apply {
                setMargins(10, 0, 0, 0)
            }
            setOnClickListener { showNotifications() }
        }
        topToolbar.addView(notificationButton)

        rootLayout.addView(topToolbar)
    }

    /**
     * 创建底部导航栏
     */
    private fun createBottomNavigation() {
        bottomNavigation = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 16, 0, 16)
            setBackgroundColor(Color.WHITE)
            elevation = 8f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 导航项目
        val navItems = listOf(
            NavItem("首页", "home", DashboardActivity::class.java),
            NavItem("统计", "chart-bar", null), // TODO: 添加统计Activity
            NavItem("记账", "plus", null), // TODO: 添加记账Activity - 中间的加号按钮
            NavItem("预算", "briefcase", null), // TODO: 添加预算Activity
            NavItem("我的", "user-circle", null)  // TODO: 添加个人中心Activity
        )

        navItems.forEach { item ->
            val navButton = createNavigationButton(item)
            bottomNavigation.addView(navButton)
        }

        rootLayout.addView(bottomNavigation)
    }

    /**
     * 创建导航按钮
     */
    private fun createNavigationButton(item: NavItem): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(16, 16, 16, 16)
            layoutParams = LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )

            // 特殊处理中间的加号按钮
            if (item.icon == "plus") {
                // 创建圆形加号按钮
                val iconView = TextView(this@BaseActivity).apply {
                    FontAwesomeHelper.setIcon(this, "plus", 24f)
                    setTextColor(Color.WHITE)
                    background = createCircularButton("#3b82f6")
                    gravity = Gravity.CENTER
                    layoutParams = LinearLayout.LayoutParams(80, 80).apply {
                        setMargins(0, 0, 0, 8)
                    }
                }
                addView(iconView)

                // 标签
                val labelView = TextView(this@BaseActivity).apply {
                    text = item.label
                    textSize = 12f
                    gravity = Gravity.CENTER
                    setTextColor(Color.parseColor("#3b82f6"))
                    setTypeface(null, Typeface.BOLD)
                }
                addView(labelView)
            } else {
                // 普通图标
                val iconView = TextView(this@BaseActivity).apply {
                    FontAwesomeHelper.setIcon(this, item.icon, 20f)
                    gravity = Gravity.CENTER
                    setPadding(0, 0, 0, 8)
                    setTextColor(Color.parseColor("#6b7280"))
                }
                addView(iconView)

                // 标签
                val labelView = TextView(this@BaseActivity).apply {
                    text = item.label
                    textSize = 12f
                    gravity = Gravity.CENTER
                    setTextColor(Color.parseColor("#6b7280"))
                }
                addView(labelView)

                // 设置当前页面状态
                if (item.activityClass == this@BaseActivity::class.java) {
                    setBackgroundColor(Color.parseColor("#e0f2fe"))
                    iconView.setTextColor(Color.parseColor("#3b82f6"))
                    labelView.setTextColor(Color.parseColor("#3b82f6"))
                    labelView.setTypeface(null, Typeface.BOLD)
                }
            }

            // 点击事件
            setOnClickListener {
                if (item.activityClass != null && item.activityClass != this@BaseActivity::class.java) {
                    navigateToActivity(item.activityClass)
                } else {
                    Toast.makeText(this@BaseActivity, "${item.label}功能即将推出", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    /**
     * 显示用户菜单
     */
    private fun showUserMenu() {
        val userInfo = authStorage.getUserInfo()
        val message = if (userInfo != null) {
            "用户：${userInfo.name}\n邮箱：${userInfo.email}"
        } else {
            "用户信息加载失败"
        }

        val builder = android.app.AlertDialog.Builder(this)
        builder.setTitle("用户信息")
        builder.setMessage(message)
        builder.setPositiveButton("确定") { dialog, _ -> dialog.dismiss() }
        builder.setNegativeButton("登出") { _, _ -> handleLogout() }
        builder.show()
    }

    /**
     * 切换夜间模式
     */
    private fun toggleNightMode() {
        Toast.makeText(this, "夜间模式功能即将推出", Toast.LENGTH_SHORT).show()
    }

    /**
     * 显示通知
     */
    private fun showNotifications() {
        Toast.makeText(this, "通知功能即将推出", Toast.LENGTH_SHORT).show()
    }

    /**
     * 打开设置
     */
    private fun openSettings() {
        Toast.makeText(this, "设置功能即将推出", Toast.LENGTH_SHORT).show()
    }

    /**
     * 处理登出
     */
    private fun handleLogout() {
        lifecycleScope.launch {
            try {
                // 清除认证数据
                authStorage.clearAuthData()

                Toast.makeText(this@BaseActivity, "已安全登出", Toast.LENGTH_SHORT).show()

                // 跳转到登录页面
                val intent = Intent(this@BaseActivity, LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()

            } catch (e: Exception) {
                Toast.makeText(this@BaseActivity, "登出失败：${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * 导航到指定Activity
     */
    private fun navigateToActivity(activityClass: Class<*>) {
        val intent = Intent(this, activityClass)
        startActivity(intent)
    }

    /**
     * 更新导航状态
     */
    private fun updateNavigationState() {
        titleTextView.text = getPageTitle()
    }

    /**
     * 创建圆形按钮背景
     */
    private fun createCircularButton(color: String): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor(color))
        }
    }

    /**
     * 子类需要实现的方法
     */
    abstract fun createContent(container: FrameLayout)
    abstract fun getPageTitle(): String

    /**
     * 导航项目数据类
     */
    private data class NavItem(
        val label: String,
        val icon: String,
        val activityClass: Class<*>?
    )
}
