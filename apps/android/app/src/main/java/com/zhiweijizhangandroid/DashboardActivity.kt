package com.zhiweijizhangandroid

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.zhiweijizhangandroid.api.ApiClient
import com.zhiweijizhangandroid.storage.AuthStorage
import com.zhiweijizhangandroid.store.DashboardStore
import com.zhiweijizhangandroid.components.MonthlyOverviewCard
import com.zhiweijizhangandroid.components.BudgetProgressCard
import com.zhiweijizhangandroid.components.RecentTransactionsCard
import kotlinx.coroutines.launch

/**
 * 仪表盘Activity - 完全复刻Web版本
 * 显示月度概览、预算进度、最近交易
 */
class DashboardActivity : BaseActivity() {

    private lateinit var apiClient: ApiClient
    private lateinit var dashboardStore: DashboardStore

    // UI组件
    private lateinit var scrollView: ScrollView
    private lateinit var mainLayout: LinearLayout
    private lateinit var loadingView: ProgressBar
    private lateinit var errorView: TextView
    private lateinit var contentLayout: LinearLayout

    // 仪表盘组件
    private lateinit var monthlyOverviewCard: MonthlyOverviewCard
    private lateinit var budgetProgressCard: BudgetProgressCard
    private lateinit var recentTransactionsCard: RecentTransactionsCard

    override fun createContent(container: FrameLayout) {
        // 初始化组件
        initializeComponents()

        // 检查认证状态
        checkAuthStatus()

        // 创建UI
        createUI(container)

        // 设置事件监听器
        setupEventListeners()

        // 观察状态变化
        observeState()

        // 加载仪表盘数据
        loadDashboardData()
    }

    override fun getPageTitle(): String {
        return "只为记账"
    }

    private fun initializeComponents() {
        apiClient = ApiClient()
        dashboardStore = DashboardStore(this, apiClient)

        // 设置API客户端的认证令牌
        authStorage.getAuthToken()?.let { token ->
            apiClient.setAuthToken(token)
        }
    }

    private fun checkAuthStatus() {
        if (!authStorage.hasValidSession()) {
            // 没有有效登录状态，跳转到登录页面
            navigateToLogin()
        }
    }

    private fun createUI(container: FrameLayout) {
        // 创建主滚动视图 - Web端风格
        scrollView = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#f9fafb")) // Web端标准背景色
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        // 创建主布局 - Web端风格
        mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 120) // Web端标准间距
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 创建加载视图
        loadingView = ProgressBar(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER
                setMargins(0, 128, 0, 128)
            }
            visibility = View.VISIBLE
        }
        mainLayout.addView(loadingView)

        // 创建错误视图
        errorView = TextView(this).apply {
            textSize = 16f
            setTextColor(android.graphics.Color.parseColor("#ef4444"))
            gravity = android.view.Gravity.CENTER
            setPadding(32, 64, 32, 64)
            visibility = View.GONE
        }
        mainLayout.addView(errorView)

        // 创建内容布局
        contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            visibility = View.GONE
        }

        // 创建仪表盘组件
        createDashboardComponents()

        mainLayout.addView(contentLayout)
        scrollView.addView(mainLayout)
        container.addView(scrollView)
    }

    private fun createDashboardComponents() {
        try {
            // 月度概览卡片
            monthlyOverviewCard = MonthlyOverviewCard(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 24) // Web端标准卡片间距
                }
            }
            contentLayout.addView(monthlyOverviewCard)

            // 预算进度卡片
            budgetProgressCard = BudgetProgressCard(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 24) // Web端标准卡片间距
                }
            }
            contentLayout.addView(budgetProgressCard)

            // 最近交易卡片
            recentTransactionsCard = RecentTransactionsCard(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 24) // Web端标准卡片间距
                }
            }
            contentLayout.addView(recentTransactionsCard)
        } catch (e: Exception) {
            println("[DashboardActivity] 创建组件失败: ${e.message}")
            e.printStackTrace()

            // 创建简单的错误提示
            val errorText = TextView(this).apply {
                text = "仪表盘组件初始化失败: ${e.message}"
                textSize = 16f
                setTextColor(android.graphics.Color.RED)
                setPadding(32, 32, 32, 32)
            }
            contentLayout.addView(errorText)
        }
    }

    private fun setupEventListeners() {
        try {
            // 设置交易点击监听器
            if (::recentTransactionsCard.isInitialized) {
                recentTransactionsCard.setOnTransactionClickListener { transactionId ->
                    // TODO: 导航到交易详情页面
                    Toast.makeText(this, "交易详情功能即将推出", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            println("[DashboardActivity] 设置事件监听器失败: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun observeState() {
        println("[DashboardActivity] 开始监听数据变化...")
        lifecycleScope.launch {
            dashboardStore.dashboardData.collect { data ->
                println("[DashboardActivity] 收到数据更新: isLoading=${data.isLoading}, error=${data.error}")
                println("[DashboardActivity] 月度统计: 收入=${data.monthlyStats.income}, 支出=${data.monthlyStats.expense}")
                updateUI(data)
            }
        }
    }

    private fun updateUI(data: com.zhiweijizhangandroid.models.DashboardData) {
        println("[DashboardActivity] updateUI被调用")
        runOnUiThread {
            println("[DashboardActivity] 在UI线程中更新界面")
            when {
                data.isLoading -> {
                    println("[DashboardActivity] 显示加载状态")
                    loadingView.visibility = View.VISIBLE
                    errorView.visibility = View.GONE
                    contentLayout.visibility = View.GONE
                }
                data.error != null -> {
                    println("[DashboardActivity] 显示错误状态: ${data.error}")
                    loadingView.visibility = View.GONE
                    errorView.visibility = View.VISIBLE
                    errorView.text = data.error
                    contentLayout.visibility = View.GONE
                }
                else -> {
                    println("[DashboardActivity] 显示内容，开始更新组件数据")
                    loadingView.visibility = View.GONE
                    errorView.visibility = View.GONE
                    contentLayout.visibility = View.VISIBLE

                    // 更新各个组件的数据
                    try {
                        if (::monthlyOverviewCard.isInitialized) {
                            println("[DashboardActivity] 更新月度概览卡片")
                            monthlyOverviewCard.updateData(data.monthlyStats)
                        } else {
                            println("[DashboardActivity] 月度概览卡片未初始化")
                        }
                        if (::budgetProgressCard.isInitialized) {
                            println("[DashboardActivity] 更新预算进度卡片")
                            budgetProgressCard.updateData(data.budgetCategories, data.totalBudget)
                        } else {
                            println("[DashboardActivity] 预算进度卡片未初始化")
                        }
                        if (::recentTransactionsCard.isInitialized) {
                            println("[DashboardActivity] 更新最近交易卡片")
                            recentTransactionsCard.updateData(data.groupedTransactions)
                        } else {
                            println("[DashboardActivity] 最近交易卡片未初始化")
                        }
                        println("[DashboardActivity] 所有组件更新完成")
                    } catch (e: Exception) {
                        println("[DashboardActivity] 更新组件数据失败: ${e.message}")
                        e.printStackTrace()
                        errorView.text = "更新数据失败: ${e.message}"
                        errorView.visibility = View.VISIBLE
                        contentLayout.visibility = View.GONE
                    }
                }
            }
        }
    }

    private fun loadDashboardData() {
        // 获取用户的默认账本ID
        lifecycleScope.launch {
            try {
                println("[DashboardActivity] 开始获取用户账本列表...")
                val accountBooks = apiClient.getAccountBooks()

                // 查找默认账本或第一个账本
                val defaultAccountBook = accountBooks?.get("data") as? List<Map<String, Any>>
                val accountBookId = if (!defaultAccountBook.isNullOrEmpty()) {
                    // 优先使用isDefault=true的账本
                    val defaultBook = defaultAccountBook.find { (it["isDefault"] as? Boolean) == true }
                    val selectedBook = defaultBook ?: defaultAccountBook.first()
                    val bookId = selectedBook["id"] as? String
                    val bookName = selectedBook["name"] as? String
                    val transactionCount = selectedBook["transactionCount"] as? Number

                    println("[DashboardActivity] 找到账本: $bookName (ID: $bookId, 交易数: $transactionCount)")
                    bookId ?: "1"
                } else {
                    println("[DashboardActivity] 未找到账本，使用默认ID")
                    "1"
                }

                println("[DashboardActivity] 使用账本ID: $accountBookId")
                println("[DashboardActivity] 当前token: ${authStorage.getAuthToken()?.take(20)}...")
                dashboardStore.fetchDashboardData(accountBookId)
            } catch (e: Exception) {
                println("[DashboardActivity] 获取账本列表失败: ${e.message}")
                // 降级到使用用户ID
                val userInfo = authStorage.getUserInfo()
                val fallbackAccountBookId = userInfo?.id ?: "1"
                println("[DashboardActivity] 降级使用用户ID作为账本ID: $fallbackAccountBookId")
                dashboardStore.fetchDashboardData(fallbackAccountBookId)
            }
        }
    }

    private fun navigateToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        dashboardStore.cleanup()
    }
}
