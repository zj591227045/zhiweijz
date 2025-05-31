package com.zhiweijizhangandroid.models

/**
 * 预算分类数据模型
 * 对应Web版本的BudgetCategory
 */
data class BudgetCategory(
    val id: String,
    val name: String,
    val icon: String? = null,
    val budget: Double,
    val spent: Double,
    val percentage: Double,
    val period: String? = null,
    val categoryId: String? = null
) {
    /**
     * 获取预算状态
     */
    fun getBudgetStatus(): BudgetStatus {
        return when {
            percentage > 100 -> BudgetStatus.OVER_BUDGET
            percentage > 80 -> BudgetStatus.WARNING
            else -> BudgetStatus.NORMAL
        }
    }
    
    /**
     * 获取剩余预算
     */
    fun getRemainingBudget(): Double {
        return budget - spent
    }
    
    /**
     * 是否为总预算
     */
    fun isTotalBudget(): Boolean {
        return name.contains("总预算") || 
               name.contains("月度预算") || 
               name == "预算" || 
               id == "total"
    }
}

/**
 * 预算状态枚举
 */
enum class BudgetStatus {
    NORMAL,     // 正常
    WARNING,    // 警告（超过80%）
    OVER_BUDGET // 超预算
}

/**
 * 总预算数据模型
 */
data class TotalBudget(
    val amount: Double,
    val spent: Double,
    val percentage: Double
)
