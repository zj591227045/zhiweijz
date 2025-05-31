package com.zhiweijizhangandroid.store

import android.content.Context
import com.zhiweijizhangandroid.api.ApiClient
import com.zhiweijizhangandroid.models.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*

/**
 * 仪表盘状态管理
 * 对应Web版本的useDashboardStore
 */
class DashboardStore(
    private val context: Context,
    private val apiClient: ApiClient
) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // 状态流
    private val _dashboardData = MutableStateFlow(DashboardData.empty())
    val dashboardData: StateFlow<DashboardData> = _dashboardData.asStateFlow()

    // 当前账本ID
    private var currentAccountBookId: String? = null

    /**
     * 获取仪表盘数据
     */
    fun fetchDashboardData(accountBookId: String) {
        currentAccountBookId = accountBookId
        println("[DashboardStore] 开始获取仪表盘数据，账本ID: $accountBookId")

        scope.launch {
            try {
                _dashboardData.value = _dashboardData.value.copy(isLoading = true, error = null)

                // 并行请求数据，每个请求独立处理错误
                println("[DashboardStore] 开始并行请求API数据...")

                // 月度统计（必需）
                val monthlyStats = try {
                    fetchMonthlyStatistics(accountBookId)
                } catch (e: Exception) {
                    println("[DashboardStore] 月度统计获取失败，使用默认值: ${e.message}")
                    MonthlyStats(
                        income = 0.0,
                        expense = 0.0,
                        balance = 0.0,
                        month = getCurrentMonth()
                    )
                }

                // 预算数据（可选）
                val budgetData = try {
                    fetchBudgetStatistics(accountBookId)
                } catch (e: Exception) {
                    println("[DashboardStore] 预算数据获取失败，使用空数据: ${e.message}")
                    Pair(emptyList<BudgetCategory>(), null)
                }

                // 交易数据（可选）
                val transactions = try {
                    fetchRecentTransactions(accountBookId)
                } catch (e: Exception) {
                    println("[DashboardStore] 交易数据获取失败，使用空数据: ${e.message}")
                    emptyList<GroupedTransactions>()
                }

                println("[DashboardStore] 所有API请求完成")
                println("[DashboardStore] 月度统计: 收入=${monthlyStats.income}, 支出=${monthlyStats.expense}")
                println("[DashboardStore] 预算分类数量: ${budgetData.first.size}")
                println("[DashboardStore] 交易分组数量: ${transactions.size}")

                _dashboardData.value = DashboardData(
                    monthlyStats = monthlyStats,
                    budgetCategories = budgetData.first,
                    totalBudget = budgetData.second,
                    groupedTransactions = transactions,
                    isLoading = false,
                    error = null
                )

            } catch (e: Exception) {
                println("[DashboardStore] 获取仪表盘数据失败: ${e.message}")
                e.printStackTrace()
                _dashboardData.value = DashboardData.error("获取仪表盘数据失败: ${e.message}")
            }
        }
    }

    /**
     * 刷新仪表盘数据（不显示加载状态）
     */
    fun refreshDashboardData(accountBookId: String) {
        currentAccountBookId = accountBookId

        scope.launch {
            try {
                _dashboardData.value = _dashboardData.value.copy(error = null)

                // 清除缓存
                apiClient.clearCache()

                // 并行请求数据
                val monthlyStatsDeferred = async { fetchMonthlyStatistics(accountBookId) }
                val budgetDataDeferred = async { fetchBudgetStatistics(accountBookId) }
                val transactionsDeferred = async { fetchRecentTransactions(accountBookId) }

                val monthlyStats = monthlyStatsDeferred.await()
                val budgetData = budgetDataDeferred.await()
                val transactions = transactionsDeferred.await()

                _dashboardData.value = _dashboardData.value.copy(
                    monthlyStats = monthlyStats,
                    budgetCategories = budgetData.first,
                    totalBudget = budgetData.second,
                    groupedTransactions = transactions
                )

            } catch (e: Exception) {
                println("刷新仪表盘数据失败: ${e.message}")
                _dashboardData.value = _dashboardData.value.copy(error = "刷新数据失败: ${e.message}")
            }
        }
    }

    /**
     * 清除仪表盘数据
     */
    fun clearDashboardData() {
        _dashboardData.value = DashboardData.empty()
        currentAccountBookId = null
    }

    /**
     * 获取月度统计数据
     */
    private suspend fun fetchMonthlyStatistics(accountBookId: String): MonthlyStats {
        return withContext(Dispatchers.IO) {
            try {
                val calendar = Calendar.getInstance()
                val startDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(
                    calendar.apply {
                        set(Calendar.DAY_OF_MONTH, 1)
                    }.time
                )

                calendar.set(Calendar.DAY_OF_MONTH, calendar.getActualMaximum(Calendar.DAY_OF_MONTH))
                val endDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(calendar.time)

                println("[DashboardStore] 请求月度统计: $startDate 到 $endDate")
                val response = apiClient.getStatistics(accountBookId, startDate, endDate)
                println("[DashboardStore] 月度统计响应: $response")

                MonthlyStats(
                    income = response?.get("income") as? Double ?: 0.0,
                    expense = response?.get("expense") as? Double ?: 0.0,
                    balance = response?.get("netIncome") as? Double ?: 0.0,
                    month = getCurrentMonth()
                )
            } catch (e: Exception) {
                println("[DashboardStore] 获取月度统计失败: ${e.message}")
                e.printStackTrace()
                throw e
            }
        }
    }

    /**
     * 获取预算统计数据
     */
    private suspend fun fetchBudgetStatistics(accountBookId: String): Pair<List<BudgetCategory>, TotalBudget?> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiClient.getBudgetStatistics(accountBookId)

                val categories = (response?.get("categories") as? List<Map<String, Any>>)?.map { categoryData ->
                    BudgetCategory(
                        id = categoryData["id"] as? String ?: "",
                        name = categoryData["name"] as? String ?: "",
                        icon = categoryData["icon"] as? String,
                        budget = (categoryData["budget"] as? Number)?.toDouble() ?: 0.0,
                        spent = (categoryData["spent"] as? Number)?.toDouble() ?: 0.0,
                        percentage = (categoryData["percentage"] as? Number)?.toDouble() ?: 0.0,
                        period = categoryData["period"] as? String,
                        categoryId = categoryData["categoryId"] as? String
                    )
                } ?: emptyList()

                val totalBudgetData = response?.get("totalBudget") as? Map<String, Any>
                val totalBudget = totalBudgetData?.let {
                    TotalBudget(
                        amount = (it["amount"] as? Number)?.toDouble() ?: 0.0,
                        spent = (it["spent"] as? Number)?.toDouble() ?: 0.0,
                        percentage = (it["percentage"] as? Number)?.toDouble() ?: 0.0
                    )
                }

                Pair(categories, totalBudget)
            } catch (e: Exception) {
                println("[DashboardStore] 获取预算统计失败: ${e.message}")
                // 预算不存在是正常情况，返回空数据而不是抛异常
                if (e.message?.contains("预算不存在") == true || e.message?.contains("404") == true) {
                    println("[DashboardStore] 预算不存在，返回空预算数据")
                    return@withContext Pair(emptyList(), null)
                }
                e.printStackTrace()
                throw e
            }
        }
    }

    /**
     * 获取最近交易数据
     */
    private suspend fun fetchRecentTransactions(accountBookId: String): List<GroupedTransactions> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiClient.getRecentTransactions(accountBookId, limit = 20)
                println("[DashboardStore] 交易API响应: $response")

                // 服务器返回格式: {"total":0,"page":1,"limit":20,"data":[]}
                // 需要从data字段获取交易数据
                val transactionList = response?.get("data") as? List<Map<String, Any>> ?: emptyList()
                println("[DashboardStore] 解析到 ${transactionList.size} 条交易记录")

                val transactions = transactionList.map { txData ->
                    Transaction(
                        id = txData["id"] as? String ?: "",
                        amount = (txData["amount"] as? Number)?.toDouble() ?: 0.0,
                        type = if ((txData["type"] as? String) == "EXPENSE") TransactionType.EXPENSE else TransactionType.INCOME,
                        categoryName = (txData["category"] as? Map<String, Any>)?.get("name") as? String ?: "未分类",
                        categoryIcon = (txData["category"] as? Map<String, Any>)?.get("icon") as? String,
                        description = txData["description"] as? String ?: "",
                        date = txData["date"] as? String ?: ""
                    )
                }

                // 按日期分组
                val grouped = groupTransactionsByDate(transactions)
                println("[DashboardStore] 分组后的交易数据: ${grouped.size} 组")
                grouped
            } catch (e: Exception) {
                println("[DashboardStore] 获取最近交易失败: ${e.message}")
                e.printStackTrace()
                // 交易数据获取失败时返回空列表，不影响其他数据显示
                emptyList()
            }
        }
    }

    /**
     * 按日期分组交易
     */
    private fun groupTransactionsByDate(transactions: List<Transaction>): List<GroupedTransactions> {
        return transactions.groupBy { transaction ->
            // 提取日期部分 (YYYY-MM-DD)，忽略时间部分
            try {
                // 处理ISO 8601格式: 2025-05-31T03:18:44.193Z
                val dateOnly = transaction.date.substringBefore("T")
                println("[DashboardStore] 交易日期: ${transaction.date} -> 分组日期: $dateOnly")
                dateOnly
            } catch (e: Exception) {
                println("[DashboardStore] 日期解析失败: ${transaction.date}, 使用原始值")
                transaction.date
            }
        }.map { (dateKey, txList) ->
            // 格式化显示日期
            val displayDate = try {
                // 将 2025-05-31 格式化为 05月31日
                val parts = dateKey.split("-")
                if (parts.size >= 3) {
                    "${parts[1]}月${parts[2]}日"
                } else {
                    dateKey
                }
            } catch (e: Exception) {
                dateKey
            }

            println("[DashboardStore] 日期分组: $dateKey -> $displayDate (${txList.size}条交易)")
            GroupedTransactions(date = displayDate, transactions = txList.sortedByDescending { it.date })
        }.sortedByDescending { group ->
            // 按原始日期排序
            try {
                group.transactions.firstOrNull()?.date ?: ""
            } catch (e: Exception) {
                group.date
            }
        }
    }

    /**
     * 获取当前月份字符串
     */
    private fun getCurrentMonth(): String {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH) + 1
        return "${year}年${String.format("%02d", month)}月"
    }

    /**
     * 清理资源
     */
    fun cleanup() {
        scope.cancel()
    }
}
