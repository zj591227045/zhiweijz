package com.zhiweijizhangandroid.models

/**
 * 仪表盘数据模型
 * 包含所有仪表盘需要的数据
 */
data class DashboardData(
    val monthlyStats: MonthlyStats = MonthlyStats.empty(),
    val budgetCategories: List<BudgetCategory> = emptyList(),
    val totalBudget: TotalBudget? = null,
    val groupedTransactions: List<GroupedTransactions> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
) {
    companion object {
        /**
         * 创建空的仪表盘数据
         */
        fun empty(): DashboardData {
            return DashboardData()
        }
        
        /**
         * 创建加载中状态的仪表盘数据
         */
        fun loading(): DashboardData {
            return DashboardData(isLoading = true)
        }
        
        /**
         * 创建错误状态的仪表盘数据
         */
        fun error(message: String): DashboardData {
            return DashboardData(error = message)
        }
    }
    
    /**
     * 是否有数据
     */
    fun hasData(): Boolean {
        return !isLoading && error == null && 
               (budgetCategories.isNotEmpty() || groupedTransactions.isNotEmpty())
    }
    
    /**
     * 是否显示预算部分
     */
    fun shouldShowBudget(): Boolean {
        return budgetCategories.isNotEmpty() || totalBudget != null
    }
    
    /**
     * 是否显示交易部分
     */
    fun shouldShowTransactions(): Boolean {
        return groupedTransactions.isNotEmpty()
    }
}
