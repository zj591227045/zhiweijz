package com.zhiweijizhangandroid.components

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.AttributeSet
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.zhiweijizhangandroid.models.BudgetExecution

/**
 * 预算执行情况卡片组件
 * 对应Web版本的BudgetExecution组件
 */
class BudgetExecutionCard @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    private lateinit var titleTextView: TextView
    private lateinit var viewAllTextView: TextView
    private lateinit var budgetContainer: LinearLayout

    init {
        setupView()
    }

    private fun setupView() {
        orientation = VERTICAL
        setPadding(48, 48, 48, 48)

        // 设置Web端风格的卡片样式
        background = createWebStyleCardBackground()
        elevation = 8f

        // 创建头部布局
        val headerLayout = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 0, 0, 32)
            }
        }

        // 标题
        titleTextView = TextView(context).apply {
            text = "预算执行情况"
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#1f2937"))
            layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
        }
        headerLayout.addView(titleTextView)

        // 查看全部按钮
        viewAllTextView = TextView(context).apply {
            text = "查看全部"
            textSize = 14f
            setTextColor(Color.parseColor("#3b82f6"))
            gravity = Gravity.END
        }
        headerLayout.addView(viewAllTextView)

        addView(headerLayout)

        // 预算项目容器
        budgetContainer = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        }
        addView(budgetContainer)
    }

    /**
     * 创建预算项目
     */
    private fun createBudgetItem(budgetExecution: BudgetExecution): LinearLayout {
        return LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 0, 0, 24)
            }

            // 预算信息行
            val infoLayout = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                    setMargins(0, 0, 0, 12)
                }
            }

            // 预算图标和名称
            val nameLayout = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
            }

            // 预算图标
            val iconView = TextView(context).apply {
                text = budgetExecution.icon
                textSize = 16f
                setPadding(0, 0, 16, 0)
            }
            nameLayout.addView(iconView)

            // 预算名称
            val nameTextView = TextView(context).apply {
                text = budgetExecution.name
                textSize = 16f
                setTextColor(Color.parseColor("#1f2937"))
            }
            nameLayout.addView(nameTextView)

            infoLayout.addView(nameLayout)

            // 百分比
            val percentageTextView = TextView(context).apply {
                text = "${budgetExecution.percentage}%"
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#1f2937"))
            }
            infoLayout.addView(percentageTextView)

            addView(infoLayout)

            // 进度条
            val progressBar = createWebStyleProgressBar(budgetExecution.percentage)
            addView(progressBar)

            // 金额信息
            val amountLayout = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                    setMargins(0, 8, 0, 0)
                }
            }

            val amountTextView = TextView(context).apply {
                text = "¥${budgetExecution.used}/¥${budgetExecution.total}"
                textSize = 14f
                setTextColor(Color.parseColor("#6b7280"))
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
            }
            amountLayout.addView(amountTextView)

            addView(amountLayout)
        }
    }

    /**
     * 创建Web端风格进度条
     */
    private fun createWebStyleProgressBar(percentage: Float): View {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 16)
            background = createProgressBackground()

            // 进度条填充
            val progressFill = View(context).apply {
                layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, percentage / 100f)
                background = createProgressFill()
            }
            addView(progressFill)

            // 剩余空间
            if (percentage < 100f) {
                val remainingSpace = View(context).apply {
                    layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, (100f - percentage) / 100f)
                }
                addView(remainingSpace)
            }
        }
    }

    /**
     * 创建进度条背景
     */
    private fun createProgressBackground(): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.parseColor("#e5e7eb"))
            cornerRadius = 8f
        }
    }

    /**
     * 创建进度条填充
     */
    private fun createProgressFill(): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.parseColor("#3b82f6"))
            cornerRadius = 8f
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
     * 更新预算执行数据
     */
    fun updateData(budgetExecutions: List<BudgetExecution>) {
        budgetContainer.removeAllViews()
        
        if (budgetExecutions.isEmpty()) {
            // 显示暂无数据
            val emptyView = TextView(context).apply {
                text = "暂无预算数据"
                textSize = 16f
                setTextColor(Color.parseColor("#6b7280"))
                gravity = Gravity.CENTER
                setPadding(0, 32, 0, 32)
            }
            budgetContainer.addView(emptyView)
        } else {
            budgetExecutions.forEach { budgetExecution ->
                budgetContainer.addView(createBudgetItem(budgetExecution))
            }
        }
    }
}
