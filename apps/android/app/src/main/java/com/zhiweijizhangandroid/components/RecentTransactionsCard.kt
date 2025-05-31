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
import com.zhiweijizhangandroid.models.GroupedTransactions
import com.zhiweijizhangandroid.models.Transaction
import com.zhiweijizhangandroid.models.TransactionType

/**
 * 最近交易卡片组件
 * 对应Web版本的RecentTransactions组件
 */
class RecentTransactionsCard @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    private lateinit var headerLayout: LinearLayout
    private lateinit var titleTextView: TextView
    private lateinit var viewAllButton: Button
    private lateinit var contentLayout: LinearLayout
    private lateinit var emptyView: TextView

    private var groupedTransactions: List<GroupedTransactions> = emptyList()
    private var onTransactionClickListener: ((String) -> Unit)? = null

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

        titleTextView = TextView(context).apply {
            text = "最近交易"
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#1f2937"))
            layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
        }
        headerLayout.addView(titleTextView)

        // 查看全部按钮
        viewAllButton = Button(context).apply {
            text = "查看全部"
            textSize = 14f
            setTextColor(Color.parseColor("#3b82f6"))
            background = null
            setOnClickListener {
                // TODO: 导航到交易列表页面
                Toast.makeText(context, "交易列表功能即将推出", Toast.LENGTH_SHORT).show()
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
            text = "暂无交易记录"
            textSize = 16f
            setTextColor(Color.parseColor("#6b7280"))
            gravity = Gravity.CENTER
            setPadding(0, 64, 0, 64)
            visibility = View.GONE
        }
        contentLayout.addView(emptyView)
    }

    /**
     * 设置交易点击监听器
     */
    fun setOnTransactionClickListener(listener: (String) -> Unit) {
        this.onTransactionClickListener = listener
    }

    /**
     * 更新交易数据
     */
    fun updateData(groupedTransactions: List<GroupedTransactions>) {
        this.groupedTransactions = groupedTransactions

        // 清除现有内容
        contentLayout.removeAllViews()

        if (groupedTransactions.isEmpty()) {
            // 显示空状态
            emptyView.visibility = View.VISIBLE
            contentLayout.addView(emptyView)
        } else {
            // 显示交易组
            emptyView.visibility = View.GONE
            groupedTransactions.forEach { group ->
                val groupView = createTransactionGroup(group)
                contentLayout.addView(groupView)
            }
        }
    }

    /**
     * 创建交易组视图
     */
    private fun createTransactionGroup(group: GroupedTransactions): LinearLayout {
        return LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 0, 0, 24)
            }

            // 日期标题
            val dateView = TextView(context).apply {
                text = group.date
                textSize = 14f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#6b7280"))
                setPadding(0, 0, 0, 16)
            }
            addView(dateView)

            // 交易列表
            val transactionListLayout = LinearLayout(context).apply {
                orientation = VERTICAL
                background = createRoundedBackground("#ffffff", "#e5e7eb")
                setPadding(0, 16, 0, 16)
            }

            group.transactions.forEach { transaction ->
                val transactionView = createTransactionItem(transaction)
                transactionListLayout.addView(transactionView)

                // 添加分隔线（除了最后一个）
                if (transaction != group.transactions.last()) {
                    val divider = View(context).apply {
                        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 1).apply {
                            setMargins(64, 16, 0, 16)
                        }
                        setBackgroundColor(Color.parseColor("#e5e7eb"))
                    }
                    transactionListLayout.addView(divider)
                }
            }

            addView(transactionListLayout)
        }
    }

    /**
     * 创建交易项目视图
     */
    private fun createTransactionItem(transaction: Transaction): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(32, 24, 32, 24)
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)

            // 设置点击事件
            isClickable = true
            isFocusable = true
            background = createClickableBackground()
            setOnClickListener {
                onTransactionClickListener?.invoke(transaction.id)
            }

            // 交易图标
            val iconView = TextView(context).apply {
                text = getTransactionIcon(transaction)
                textSize = 20f
                setTextColor(Color.parseColor("#3b82f6"))
                gravity = Gravity.CENTER
                layoutParams = LayoutParams(64, 64).apply {
                    setMargins(0, 0, 16, 0)
                }
                background = createRoundedBackground("#f3f4f6", "#d1d5db")
            }
            addView(iconView)

            // 交易详情
            val detailsLayout = LinearLayout(context).apply {
                orientation = VERTICAL
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
            }

            // 交易标题
            val titleView = TextView(context).apply {
                text = transaction.getDisplayTitle()
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#1f2937"))
                setPadding(0, 0, 0, 4)
            }
            detailsLayout.addView(titleView)

            // 交易分类
            val categoryView = TextView(context).apply {
                text = transaction.categoryName
                textSize = 14f
                setTextColor(Color.parseColor("#6b7280"))
            }
            detailsLayout.addView(categoryView)

            addView(detailsLayout)

            // 交易金额
            val amountView = TextView(context).apply {
                text = transaction.getFormattedAmount()
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                setTextColor(getAmountColor(transaction.type))
                gravity = Gravity.END
            }
            addView(amountView)
        }
    }

    /**
     * 获取交易图标
     */
    private fun getTransactionIcon(transaction: Transaction): String {
        return when (transaction.categoryIcon?.lowercase()) {
            "food", "restaurant" -> "🍽️"
            "transport", "car" -> "🚗"
            "shopping", "shop" -> "🛒"
            "entertainment" -> "🎮"
            "health", "medical" -> "💊"
            "education" -> "🎓"
            "home", "house" -> "🏠"
            "salary", "income" -> "💰"
            else -> if (transaction.type == TransactionType.INCOME) "💰" else "💳"
        }
    }

    /**
     * 获取金额颜色
     */
    private fun getAmountColor(type: TransactionType): Int {
        return Color.parseColor(when (type) {
            TransactionType.INCOME -> "#10b981"
            TransactionType.EXPENSE -> "#ef4444"
        })
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
     * 创建可点击背景
     */
    private fun createClickableBackground(): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 8f
            setColor(Color.TRANSPARENT)
        }
    }
}
