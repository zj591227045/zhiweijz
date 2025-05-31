package com.zhiweijizhangandroid.models

/**
 * 预算执行情况数据模型
 */
data class BudgetExecution(
    val id: String,
    val name: String,
    val icon: String,
    val used: Double,
    val total: Double,
    val percentage: Float
)
