package com.zhiweijizhangandroid.utils

import android.content.Context
import android.graphics.Typeface
import android.widget.TextView

/**
 * Font Awesome图标工具类
 * 使用本地字体文件实现
 */
object FontAwesomeHelper {

    private var fontAwesome: Typeface? = null

    /**
     * 初始化Font Awesome
     */
    fun initialize(context: Context) {
        try {
            // 从assets加载Font Awesome字体
            fontAwesome = Typeface.createFromAsset(context.assets, "fonts/fontawesome-webfont.ttf")
        } catch (e: Exception) {
            // 如果字体文件不存在，使用默认字体
            fontAwesome = null
        }
    }

    /**
     * 设置Font Awesome图标到TextView
     */
    fun setIcon(textView: TextView, iconName: String, size: Float = 20f) {
        textView.apply {
            text = getIconCode(iconName)
            textSize = size

            // 如果Font Awesome字体可用，使用它
            fontAwesome?.let {
                typeface = it
            } ?: run {
                // 否则使用备用图标
                text = getFallbackIcon(iconName)
            }
        }
    }

    /**
     * 获取Font Awesome图标代码 (Font Awesome 6)
     */
    private fun getIconCode(iconName: String): String {
        return when (iconName) {
            // 顶部工具栏图标
            "moon" -> "\uf186"           // 夜间模式
            "cog" -> "\uf013"            // 设置
            "bell" -> "\uf0f3"           // 通知
            "user-circle" -> "\uf007"    // 用户头像

            // 底部导航栏图标
            "home" -> "\uf015"           // 首页/仪表盘
            "chart-bar" -> "\uf080"      // 统计
            "edit" -> "\uf044"           // 记账/编辑
            "list" -> "\uf03a"           // 交易列表
            "briefcase" -> "\uf0b1"      // 预算

            // 其他常用图标
            "plus" -> "\u002b"           // 添加 (Font Awesome 6使用+号)
            "minus" -> "\uf068"          // 减少
            "search" -> "\uf002"         // 搜索
            "filter" -> "\uf0b0"         // 筛选
            "calendar" -> "\uf073"       // 日历
            "money-bill" -> "\uf0d6"     // 金钱
            "credit-card" -> "\uf09d"    // 信用卡
            "wallet" -> "\uf555"         // 钱包

            else -> "\uf059"             // 默认问号图标
        }
    }

    /**
     * 获取备用图标（当Font Awesome加载失败时使用）
     */
    private fun getFallbackIcon(iconName: String): String {
        return when (iconName) {
            // 顶部工具栏图标
            "moon" -> "🌙"               // 夜间模式
            "cog" -> "⚙️"                // 设置
            "bell" -> "🔔"               // 通知
            "user-circle" -> "👤"        // 用户头像

            // 底部导航栏图标
            "home" -> "🏠"               // 首页/仪表盘
            "chart-bar" -> "📊"          // 统计
            "edit" -> "✏️"               // 记账/编辑
            "list" -> "📝"               // 交易列表
            "briefcase" -> "💼"          // 预算

            // 其他常用图标
            "plus" -> "+"                // 添加
            "minus" -> "-"               // 减少
            "search" -> "🔍"             // 搜索
            "filter" -> "🔽"             // 筛选
            "calendar" -> "📅"           // 日历
            "money-bill" -> "💰"         // 金钱
            "credit-card" -> "💳"        // 信用卡
            "wallet" -> "👛"             // 钱包

            else -> "❓"                 // 默认问号图标
        }
    }

    /**
     * 创建带图标的TextView
     */
    fun createIconTextView(context: Context, iconName: String, size: Float = 20f): TextView {
        return TextView(context).apply {
            setIcon(this, iconName, size)
        }
    }
}
