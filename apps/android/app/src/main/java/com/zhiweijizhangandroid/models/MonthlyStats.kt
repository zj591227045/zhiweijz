package com.zhiweijizhangandroid.models

/**
 * 月度统计数据模型
 * 对应Web版本的monthlyStats
 */
data class MonthlyStats(
    val income: Double = 0.0,
    val expense: Double = 0.0,
    val balance: Double = 0.0,
    val month: String = ""
) {
    companion object {
        fun empty(): MonthlyStats {
            return MonthlyStats(
                income = 0.0,
                expense = 0.0,
                balance = 0.0,
                month = getCurrentMonth()
            )
        }
        
        private fun getCurrentMonth(): String {
            val calendar = java.util.Calendar.getInstance()
            val year = calendar.get(java.util.Calendar.YEAR)
            val month = calendar.get(java.util.Calendar.MONTH) + 1
            return "${year}年${String.format("%02d", month)}月"
        }
    }
}
