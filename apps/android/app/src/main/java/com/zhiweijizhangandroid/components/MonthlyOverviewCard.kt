package com.zhiweijizhangandroid.components

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.AttributeSet
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.zhiweijizhangandroid.models.MonthlyStats

/**
 * 月度概览卡片组件
 * 对应Web版本的MonthlyOverview组件
 */
class MonthlyOverviewCard @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    private lateinit var titleTextView: TextView
    private lateinit var monthTextView: TextView
    private lateinit var incomeAmountTextView: TextView
    private lateinit var expenseAmountTextView: TextView
    private lateinit var balanceAmountTextView: TextView

    init {
        setupView()
    }

    private fun setupView() {
        orientation = VERTICAL
        setPadding(48, 48, 48, 48) // 适中的内边距

        // 设置Web端风格的卡片样式
        background = createWebStyleCardBackground()
        elevation = 8f // 适度阴影

        // 创建头部布局
        val headerLayout = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 0, 0, 48)
            }
        }

        // 标题 - Web端风格
        titleTextView = TextView(context).apply {
            text = "本月概览"
            textSize = 18f // Web端标准大小
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#1f2937")) // Web端标准颜色
            layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
        }
        headerLayout.addView(titleTextView)

        // 月份 - Web端风格
        monthTextView = TextView(context).apply {
            text = ""
            textSize = 14f
            setTextColor(Color.parseColor("#6b7280")) // Web端标准灰色
            gravity = Gravity.END
        }
        headerLayout.addView(monthTextView)

        addView(headerLayout)

        // 创建余额详情布局
        val detailsLayout = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        }

        // 收入项 - Web端绿色
        val incomeLayout = createBalanceItem("收入", "#10b981")
        incomeAmountTextView = incomeLayout.getChildAt(1) as TextView
        detailsLayout.addView(incomeLayout)

        // Web端分隔线
        detailsLayout.addView(createModernDivider())

        // 支出项 - Web端红色
        val expenseLayout = createBalanceItem("支出", "#ef4444")
        expenseAmountTextView = expenseLayout.getChildAt(1) as TextView
        detailsLayout.addView(expenseLayout)

        // Web端分隔线
        detailsLayout.addView(createModernDivider())

        // 结余项 - Web端蓝色
        val balanceLayout = createBalanceItem("结余", "#3b82f6")
        balanceAmountTextView = balanceLayout.getChildAt(1) as TextView
        detailsLayout.addView(balanceLayout)

        addView(detailsLayout)
    }

    /**
     * 创建Web端风格余额项目
     */
    private fun createBalanceItem(label: String, color: String): LinearLayout {
        return LinearLayout(context).apply {
            orientation = VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)

            // 标签 - Web端风格
            val labelTextView = TextView(context).apply {
                text = label
                textSize = 14f // Web端标准大小
                setTextColor(Color.parseColor("#6b7280")) // Web端标准灰色
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 8) // Web端标准间距
            }
            addView(labelTextView)

            // 金额 - Web端风格
            val amountTextView = TextView(context).apply {
                text = "¥0.00"
                textSize = 18f // Web端标准大小
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor(color))
                gravity = Gravity.CENTER
            }
            addView(amountTextView)
        }
    }

    /**
     * 创建Web端风格分隔线
     */
    private fun createModernDivider(): View {
        return View(context).apply {
            layoutParams = LayoutParams(1, 48).apply { // Web端标准线条
                setMargins(16, 0, 16, 0) // Web端标准边距
            }
            setBackgroundColor(Color.parseColor("#e5e7eb")) // Web端标准颜色
        }
    }

    /**
     * 创建Web端风格卡片背景
     */
    private fun createWebStyleCardBackground(): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.WHITE)
            cornerRadius = 16f // Web端标准圆角
        }
    }

    /**
     * 更新月度统计数据
     */
    fun updateData(monthlyStats: MonthlyStats) {
        println("[MonthlyOverviewCard] 开始更新数据")
        println("[MonthlyOverviewCard] 收到数据: 月份=${monthlyStats.month}, 收入=${monthlyStats.income}, 支出=${monthlyStats.expense}, 结余=${monthlyStats.balance}")

        monthTextView.text = monthlyStats.month
        incomeAmountTextView.text = formatCurrency(monthlyStats.income)
        expenseAmountTextView.text = formatCurrency(monthlyStats.expense)
        balanceAmountTextView.text = formatCurrency(monthlyStats.balance)

        println("[MonthlyOverviewCard] UI更新完成: 月份=${monthTextView.text}, 收入=${incomeAmountTextView.text}, 支出=${expenseAmountTextView.text}, 结余=${balanceAmountTextView.text}")

        // 根据结余正负设置颜色 - Web端颜色
        val balanceColor = if (monthlyStats.balance >= 0) "#10b981" else "#ef4444"
        balanceAmountTextView.setTextColor(Color.parseColor(balanceColor))

        println("[MonthlyOverviewCard] 数据更新完成")
    }

    /**
     * 格式化货币
     */
    private fun formatCurrency(amount: Double): String {
        return "¥${String.format("%.2f", amount)}"
    }
}
