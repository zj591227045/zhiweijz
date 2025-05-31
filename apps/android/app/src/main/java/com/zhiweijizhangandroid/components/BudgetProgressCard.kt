package com.zhiweijizhangandroid.components

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.AttributeSet
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.core.content.ContextCompat
import com.zhiweijizhangandroid.models.BudgetCategory
import com.zhiweijizhangandroid.models.BudgetStatus
import com.zhiweijizhangandroid.models.TotalBudget

/**
 * 预算进度卡片组件
 * 对应Web版本的BudgetProgress组件
 */
class BudgetProgressCard @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    private lateinit var headerLayout: LinearLayout
    private lateinit var titleTextView: TextView
    private lateinit var collapseButton: Button
    private lateinit var viewAllButton: Button
    private lateinit var contentLayout: LinearLayout
    private lateinit var emptyView: TextView

    private var isCollapsed = false
    private var budgetCategories: List<BudgetCategory> = emptyList()
    private var totalBudget: TotalBudget? = null

    init {
        setupView()
    }

    private fun setupView() {
        orientation = VERTICAL
        setPadding(48, 48, 48, 48)

        // 设置Web端风格卡片样式
        background = createWebStyleCardBackground()
        elevation = 8f

        // 创建头部布局
        headerLayout = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 0, 0, 32)
            }
        }

        // 左侧标题区域
        val leftLayout = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
        }

        titleTextView = TextView(context).apply {
            text = "预算执行情况"
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#1f2937"))
        }
        leftLayout.addView(titleTextView)

        // 折叠按钮
        collapseButton = Button(context).apply {
            text = "▲"
            textSize = 12f
            setTextColor(Color.parseColor("#3b82f6"))
            background = createRoundedBackground("#f3f4f6", "#d1d5db")
            layoutParams = LayoutParams(72, 72).apply {
                setMargins(16, 0, 0, 0)
            }
            setOnClickListener { toggleCollapse() }
        }
        leftLayout.addView(collapseButton)

        headerLayout.addView(leftLayout)

        // 查看全部按钮
        viewAllButton = Button(context).apply {
            text = "查看全部"
            textSize = 14f
            setTextColor(Color.parseColor("#3b82f6"))
            background = null
            setOnClickListener {
                // TODO: 导航到预算列表页面
                Toast.makeText(context, "预算列表功能即将推出", Toast.LENGTH_SHORT).show()
            }
        }
        headerLayout.addView(viewAllButton)

        addView(headerLayout)

        // 内容布局
        contentLayout = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        }
        addView(contentLayout)

        // 空状态视图
        emptyView = TextView(context).apply {
            text = "暂无预算数据"
            textSize = 16f
            setTextColor(Color.parseColor("#6b7280"))
            gravity = Gravity.CENTER
            setPadding(0, 64, 0, 64)
            visibility = View.GONE
        }
        contentLayout.addView(emptyView)
    }

    /**
     * 切换折叠状态
     */
    private fun toggleCollapse() {
        isCollapsed = !isCollapsed
        collapseButton.text = if (isCollapsed) "▼" else "▲"
        contentLayout.visibility = if (isCollapsed) View.GONE else View.VISIBLE
    }

    /**
     * 更新预算数据
     */
    fun updateData(categories: List<BudgetCategory>, totalBudget: TotalBudget?) {
        this.budgetCategories = categories
        this.totalBudget = totalBudget

        // 清除现有内容
        contentLayout.removeAllViews()

        val displayCategories = prioritizeCategories(categories, totalBudget)

        if (displayCategories.isEmpty()) {
            // 显示空状态
            emptyView.visibility = View.VISIBLE
            contentLayout.addView(emptyView)
        } else {
            // 显示预算项目
            emptyView.visibility = View.GONE
            displayCategories.forEach { category ->
                val budgetItemView = createBudgetItem(category)
                contentLayout.addView(budgetItemView)
            }
        }
    }

    /**
     * 优先级排序并限制显示数量
     */
    private fun prioritizeCategories(categories: List<BudgetCategory>, totalBudget: TotalBudget?): List<BudgetCategory> {
        val processedCategories = categories.toMutableList()

        // 如果有总预算信息但分类列表中没有总预算，添加一个总预算项
        if (totalBudget != null && !processedCategories.any { it.isTotalBudget() }) {
            processedCategories.add(0, BudgetCategory(
                id = "total",
                name = "个人预算",
                icon = "money-bill",
                budget = totalBudget.amount,
                spent = totalBudget.spent,
                percentage = totalBudget.percentage,
                period = "MONTHLY"
            ))
        }

        // 过滤和排序
        val filteredCategories = processedCategories.filter { category ->
            !category.name.contains("未知") &&
            !category.name.contains("other") &&
            category.name != "未知分类"
        }.ifEmpty { processedCategories }

        // 按优先级排序
        val sortedCategories = filteredCategories.sortedBy { category ->
            when {
                category.isTotalBudget() -> 0
                category.period == "MONTHLY" && !category.name.contains("家庭") -> 1
                category.name.contains("家庭") -> 2
                category.period == "YEARLY" -> 3
                else -> 4
            }
        }

        // 最多显示3个
        return sortedCategories.take(3)
    }

    /**
     * 创建预算项目视图
     */
    private fun createBudgetItem(category: BudgetCategory): LinearLayout {
        return LinearLayout(context).apply {
            orientation = VERTICAL
            setPadding(32, 32, 32, 32)
            background = createRoundedBackground("#ffffff", "#e5e7eb")
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 0, 0, 16)
            }

            // 预算信息行
            val infoLayout = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                    setMargins(0, 0, 0, 16)
                }
            }

            // 左侧：图标和名称
            val leftInfo = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
            }

            // 分类图标
            val iconView = TextView(context).apply {
                text = getCategoryIcon(category.icon)
                textSize = 20f
                setTextColor(Color.parseColor("#3b82f6"))
                gravity = Gravity.CENTER
                layoutParams = LayoutParams(64, 64).apply {
                    setMargins(0, 0, 16, 0)
                }
                background = createRoundedBackground("#f3f4f6", "#d1d5db")
            }
            leftInfo.addView(iconView)

            // 分类名称
            val nameView = TextView(context).apply {
                text = category.name
                textSize = 16f
                setTextColor(Color.parseColor("#1f2937"))
                setTypeface(null, Typeface.BOLD)
            }
            leftInfo.addView(nameView)

            infoLayout.addView(leftInfo)

            // 右侧：百分比和金额
            val rightInfo = LinearLayout(context).apply {
                orientation = VERTICAL
                gravity = Gravity.END
            }

            // 百分比
            val percentageView = TextView(context).apply {
                text = "${String.format("%.1f", category.percentage)}%"
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                setTextColor(getPercentageColor(category.getBudgetStatus()))
                gravity = Gravity.END
                setPadding(0, 0, 0, 4)
            }
            rightInfo.addView(percentageView)

            // 金额
            val amountView = TextView(context).apply {
                text = "${formatCurrency(category.spent)} / ${formatCurrency(category.budget)}"
                textSize = 12f
                setTextColor(Color.parseColor("#6b7280"))
                gravity = Gravity.END
            }
            rightInfo.addView(amountView)

            infoLayout.addView(rightInfo)
            addView(infoLayout)

            // 进度条
            val progressBar = createProgressBar(category)
            addView(progressBar)
        }
    }

    /**
     * 创建进度条
     */
    private fun createProgressBar(category: BudgetCategory): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 24)

            // 创建进度条容器
            val progressContainer = FrameLayout(context).apply {
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            }

            // 背景条
            val progressBackground = View(context).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                background = createRoundedBackground("#e5e7eb", "#d1d5db")
            }
            progressContainer.addView(progressBackground)

            // 前景条（进度）
            val progressPercentage = category.percentage.coerceAtMost(100.0)
            if (progressPercentage > 0) {
                val progressForeground = View(context).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    ).apply {
                        // 使用权重来控制宽度
                        width = (300 * (progressPercentage / 100.0)).toInt()
                    }
                    background = createRoundedBackground(getProgressColor(category.getBudgetStatus()), "")
                }
                progressContainer.addView(progressForeground)
            }

            addView(progressContainer)
        }
    }

    /**
     * 获取分类图标
     */
    private fun getCategoryIcon(iconName: String?): String {
        return when (iconName?.lowercase()) {
            "food", "restaurant" -> "🍽️"
            "transport", "car" -> "🚗"
            "shopping", "shop" -> "🛒"
            "entertainment" -> "🎮"
            "health", "medical" -> "💊"
            "education" -> "🎓"
            "home", "house" -> "🏠"
            "money-bill" -> "💰"
            else -> "📊"
        }
    }

    /**
     * 获取百分比颜色
     */
    private fun getPercentageColor(status: BudgetStatus): Int {
        return Color.parseColor(when (status) {
            BudgetStatus.OVER_BUDGET -> "#ef4444"
            BudgetStatus.WARNING -> "#f59e0b"
            BudgetStatus.NORMAL -> "#3b82f6"
        })
    }

    /**
     * 获取进度条颜色
     */
    private fun getProgressColor(status: BudgetStatus): String {
        return when (status) {
            BudgetStatus.OVER_BUDGET -> "#ef4444"
            BudgetStatus.WARNING -> "#f59e0b"
            BudgetStatus.NORMAL -> "#3b82f6"
        }
    }

    /**
     * 创建Web端风格卡片背景
     */
    private fun createWebStyleCardBackground(): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.WHITE)
            cornerRadius = 16f
        }
    }

    /**
     * 创建圆角背景
     */
    private fun createRoundedBackground(fillColor: String, strokeColor: String): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 12f
            setColor(Color.parseColor(fillColor))
            if (strokeColor.isNotEmpty()) {
                setStroke(2, Color.parseColor(strokeColor))
            }
        }
    }

    /**
     * 格式化货币
     */
    private fun formatCurrency(amount: Double): String {
        return "¥${String.format("%.0f", amount)}"
    }
}
