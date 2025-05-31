package com.zhiweijizhangandroid

import android.app.Application
import com.zhiweijizhangandroid.utils.FontAwesomeHelper

/**
 * 应用类
 * 只为记账Android应用
 */
class MainApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        println("[MainApplication] 应用启动")

        // 初始化Font Awesome图标
        FontAwesomeHelper.initialize(this)
    }
}
