package com.zhiweijizhangandroid.models

/**
 * 交易数据模型
 * 对应Web版本的Transaction
 */
data class Transaction(
    val id: String,
    val amount: Double,
    val type: TransactionType,
    val categoryName: String,
    val categoryIcon: String? = null,
    val description: String? = null,
    val date: String
) {
    /**
     * 获取显示标题
     */
    fun getDisplayTitle(): String {
        return description?.takeIf { it.isNotBlank() } ?: categoryName
    }
    
    /**
     * 获取格式化金额（带符号）
     */
    fun getFormattedAmount(): String {
        val prefix = if (type == TransactionType.EXPENSE) "-" else "+"
        return "$prefix${formatCurrency(amount)}"
    }
    
    /**
     * 获取图标类名
     */
    fun getIconClass(): String {
        // 如果是收入类型且没有图标名称，使用默认收入图标
        if (type == TransactionType.INCOME && categoryIcon.isNullOrBlank()) {
            return "money-bill-wave"
        }
        return getCategoryIconClass(categoryIcon ?: "")
    }
    
    private fun formatCurrency(amount: Double): String {
        return "¥${String.format("%.2f", amount)}"
    }
    
    private fun getCategoryIconClass(iconName: String): String {
        // 简化的图标映射，实际应该从工具类获取
        return when (iconName.lowercase()) {
            "food", "restaurant" -> "utensils"
            "transport", "car" -> "car"
            "shopping", "shop" -> "shopping-cart"
            "entertainment" -> "gamepad"
            "health", "medical" -> "heartbeat"
            "education" -> "graduation-cap"
            "home", "house" -> "home"
            "salary", "income" -> "money-bill-wave"
            else -> "circle"
        }
    }
}

/**
 * 交易类型枚举
 */
enum class TransactionType {
    EXPENSE,  // 支出
    INCOME    // 收入
}

/**
 * 分组交易数据模型
 */
data class GroupedTransactions(
    val date: String,
    val transactions: List<Transaction>
) {
    /**
     * 获取当日总收入
     */
    fun getDayIncome(): Double {
        return transactions.filter { it.type == TransactionType.INCOME }
            .sumOf { it.amount }
    }
    
    /**
     * 获取当日总支出
     */
    fun getDayExpense(): Double {
        return transactions.filter { it.type == TransactionType.EXPENSE }
            .sumOf { it.amount }
    }
    
    /**
     * 获取当日净收入
     */
    fun getDayBalance(): Double {
        return getDayIncome() - getDayExpense()
    }
}
