package com.carbonhelper.tankan

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Window
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.view.WindowCompat
import com.carbonhelper.tankan.glass.components.LiquidBottomTab
import com.carbonhelper.tankan.glass.components.LiquidBottomTabs
import com.carbonhelper.tankan.glass.components.LiquidButton
import com.kyant.backdrop.drawBackdrop
import com.kyant.backdrop.effects.blur
import com.kyant.backdrop.effects.lens
import com.kyant.backdrop.effects.vibrancy
import com.kyant.backdrop.backdrops.rememberCanvasBackdrop
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    private var webView: WebView? = null

    /** 安全区（CSS px）：--sat 顶部挖孔 / --sab 底部手势条 / --kb 键盘高度 */
    private var satPx = 0
    private var sabPx = 0
    private var kbPx = 0

    /**
     * 状态栏隐藏后，顶部仍需避让挖孔/刘海。该值同时用于 CSS 的 --sat 与
     * Compose 顶部按钮的 padding，保证原生控件与页面标题对齐。
     */
    private val topInsetDp = mutableIntStateOf(0)

    /** 「电器详情」对话框读写的电器参数（仅电压 / 电流） */
    private data class ApplianceParam(
        val idx: Int,
        val name: String,
        val voltage: Int,
        val currentA: Int
    )

    /**
     * 锁定浅色模式（Android 12 / API 31）：
     * 在 attachBaseContext 阶段克隆 Configuration，强制 UI_MODE_NIGHT_NO，
     * 生成独立 Context。这样系统夜间模式（真机实测开启）既不会让 resources、
     * WebView、isSystemInDarkTheme() 变暗，也不会因为 uiMode 变化重建 Activity
     * （Manifest 的 configChanges 已包含 uiMode）。
     */
    override fun attachBaseContext(newBase: Context) {
        val cfg = Configuration(newBase.resources.configuration)
        cfg.uiMode = (cfg.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
                Configuration.UI_MODE_NIGHT_NO
        super.attachBaseContext(newBase.createConfigurationContext(cfg))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // AppCompat 全局夜间策略同样锁死为浅色（应用内所有 AppCompat 组件一致）
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
        super.onCreate(savedInstanceState)

        val window = window
        // Android 12 边到边：不再让系统给 DecorView 套系统栏 inset，全交给 Insets API
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.setStatusBarColor(Color.TRANSPARENT)
        window.setNavigationBarColor(Color.TRANSPARENT)

        setContent {
            // 显式锁定 Material 3 浅色配色，不读取 isSystemInDarkTheme()
            MaterialTheme(colorScheme = lightColorScheme()) {
                MainScreen(
                    onReleaseWebView = { webView = it },
                    closeDetail = { closeDetail() },
                    onJsCall = { js -> webView?.post { webView?.evaluateJavascript(js, null) } }
                )
            }
        }

        applySystemBarAppearance(window)
        // DecorView 尚未 attach 时 hide() 会被忽略，post 到下一帧补一次
        window.decorView.post { hideStatusBar() }
    }

    /**
     * 应用进入后自动隐藏状态栏 —— Android 12 官方做法：
     * WindowInsetsController.hide(statusBars)（替代已废弃的 FLAG_FULLSCREEN），
     * 配合 API 31 新增的 BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE：用户从顶部下滑
     * 只瞬时显示系统栏，松手后自动重新隐藏。
     */
    private fun hideStatusBar() {
        val controller = window.insetsController ?: return
        controller.systemBarsBehavior =
            WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsets.Type.statusBars())
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        hideStatusBar()
    }

    override fun onResume() {
        super.onResume()
        hideStatusBar()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideStatusBar()
    }

    /** Compose Dialog 拥有独立 Window，需在该 Window 上再次隐藏状态栏，避免弹出时闪回 */
    @Composable
    private fun HideDialogStatusBar() {
        val view = LocalView.current
        DisposableEffect(Unit) {
            view.windowInsetsController?.let { controller ->
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                controller.hide(WindowInsets.Type.statusBars())
            }
            onDispose { }
        }
    }

    /**
     * 窗口底色为纯黑，故系统栏图标必须保持浅色（windowLightStatusBar=false）。
     * 同时关闭 Android 10+ 的强制对比度遮罩，避免黑底上被系统压出一条灰带。
     */
    private fun applySystemBarAppearance(window: Window) {
        if (Build.VERSION.SDK_INT < 30) return
        try {
            window.setStatusBarContrastEnforced(false)
            window.setNavigationBarContrastEnforced(false)
            val controller = window.insetsController
            if (controller != null) {
                controller.setSystemBarsAppearance(
                    0,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                )
            }
        } catch (_: Exception) {
            // 个别 ROM 在此刻获取 InsetsController 会异常，忽略即可
        }
    }

    private fun closeDetail() {
        webView?.post {
            // 详情收缩动画 / 排行榜回看板，由 JS 按当前状态决定
            webView?.evaluateJavascript("window.handleSystemBack && window.handleSystemBack();", null)
        }
    }

    /* ---------- JS 桥：读取当前详情 idx / 电器参数，保存参数，删除设备 ---------- */

    private fun fetchDetailIdx(cb: (Int) -> Unit) {
        webView?.evaluateJavascript("window.getCurrentDetailIdx && window.getCurrentDetailIdx();") { raw ->
            val idx = raw?.trim()?.toIntOrNull()
            if (idx != null && idx >= 0) { cb(idx) }
        }
    }

    private fun fetchParams(idx: Int, cb: (ApplianceParam?) -> Unit) {
        val wv = webView ?: run { cb(null); return }
        wv.evaluateJavascript(
            "(function(){return JSON.stringify(window.getApplianceParams($idx));})();"
        ) { raw ->
            val p = try {
                if (raw == null || raw == "null") {
                    null
                } else {
                    // evaluateJavascript 回传的是 JSON 编码后的字符串字面量，包一层取出原文
                    val payload = JSONObject("{\"v\":$raw}").getString("v")
                    val o = JSONObject(payload)
                    ApplianceParam(
                        idx = o.getInt("idx"),
                        name = o.optString("name", ""),
                        voltage = o.optInt("voltage", 220),
                        currentA = o.optInt("currentA", 3)
                    )
                }
            } catch (_: Exception) {
                null
            }
            cb(p)
        }
    }

    private fun saveParams(idx: Int, voltage: Int, currentA: Int) {
        val o = JSONObject()
        o.put("voltage", voltage)
        o.put("currentA", currentA)
        // JSONObject.quote 保证中文与引号安全注入 JS
        val js = "window.saveApplianceParams($idx, ${JSONObject.quote(o.toString())});"
        webView?.post { webView?.evaluateJavascript(js, null) }
    }

    /** JS 桥：DeepSeek Chat Completions（子线程请求，结果回调 window.__aiResp） */
    private fun aiChat(reqId: String, apiKey: String, payloadJson: String) {
        Thread {
            var ok = false
            var reply: String
            try {
                val payload = JSONObject(payloadJson)
                val msgs = org.json.JSONArray()
                msgs.put(JSONObject().apply {
                    put("role", "system")
                    put("content", payload.optString("system", "你是低碳助手。"))
                })
                val userMsgs = payload.optJSONArray("messages")
                if (userMsgs != null) {
                    for (i in 0 until userMsgs.length()) { msgs.put(userMsgs.getJSONObject(i)) }
                }
                val body = JSONObject().apply {
                    put("model", "deepseek-chat")
                    put("messages", msgs)
                    put("temperature", 0.6)
                    put("max_tokens", 500)
                    put("stream", false)
                }
                val conn = (java.net.URL("https://api.deepseek.com/chat/completions").openConnection()
                    as java.net.HttpURLConnection)
                conn.requestMethod = "POST"
                conn.connectTimeout = 15000
                conn.readTimeout = 20000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.setRequestProperty("Authorization", "Bearer $apiKey")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val resp = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                if (code in 200..299) {
                    reply = JSONObject(resp)
                        .getJSONArray("choices").getJSONObject(0)
                        .getJSONObject("message").getString("content").trim()
                    ok = true
                } else {
                    reply = "AI 服务暂时不可用（HTTP $code），已切换为本地建议。"
                }
            } catch (e: Exception) {
                reply = "网络异常，无法连接 DeepSeek（${e.message ?: "未知错误"}），已切换为本地建议。"
            }
            val r = reply
            webView?.post {
                webView?.evaluateJavascript(
                    "window.__aiResp && window.__aiResp(${JSONObject.quote(reqId)}, $ok, ${JSONObject.quote(r)});",
                    null
                )
            }
        }.start()
    }

    private fun deleteAppliance(idx: Int) {
        android.util.Log.i("TankanJS", "NATIVE deleteAppliance idx=$idx")
        webView?.post { webView?.evaluateJavascript("window.deleteAppliance($idx);", null) }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Composable
    private fun MainScreen(
        onReleaseWebView: (WebView) -> Unit,
        closeDetail: () -> Unit,
        onJsCall: (String) -> Unit
    ) {
        // 详情页 / 排行榜 / 二级页是否打开：由 JS 桥同步
        val detailOpen = remember { mutableStateOf(false) }
        val rankOpen = remember { mutableStateOf(false) }
        val subOpen = remember { mutableStateOf(false) }
        val navIndex = remember { mutableIntStateOf(0) }

        // 「更多」菜单 / 电器详情编辑 / 删除确认
        val moreMenuOpen = remember { mutableStateOf(false) }
        val editOpen = remember { mutableStateOf(false) }
        val confirmDeleteOpen = remember { mutableStateOf(false) }
        val detailIdx = remember { mutableIntStateOf(-1) }
        val detailName = remember { mutableStateOf("") }
        val efVoltage = remember { mutableIntStateOf(220) }
        val efCurrent = remember { mutableIntStateOf(3) }

        // 液态玻璃内容：CanvasBackdrop 直接绘制半透明底色，避免 LayerBackdrop 未录制导致
        // 底部导航/按钮整体不渲染（真机 WebView 无法作为 backdrop 层源，见 0.0.4 修复记录）
        val backdrop = rememberCanvasBackdrop {
            drawRect(ComposeColor.White.copy(alpha = 0.42f))
        }
        // 悬浮在彩色背景上的小按钮用更淡的底，透出背景呈现通透玻璃感
        val glassBackdrop = rememberCanvasBackdrop {
            drawRect(ComposeColor.White.copy(alpha = 0.22f))
        }
        // 二级页返回键：AI 对话页是深色底，胶囊需更实，深色图标才看得清
        val subBackdrop = rememberCanvasBackdrop {
            drawRect(ComposeColor.White.copy(alpha = 0.6f))
        }

        BackHandler(enabled = detailOpen.value || rankOpen.value || subOpen.value) { closeDetail() }

        // 纯黑底：WebView 为透明背景，黑色由此层与 windowBackground 双重保证
        Box(Modifier.fillMaxSize().background(ComposeColor.Black)) {
            AndroidView(
                factory = { ctx ->
                    WebView(ctx).apply {
                        onReleaseWebView(this)
                        configureWebView()
                        setupInsets()
                        addJavascriptInterface(object {
                            @JavascriptInterface
                            fun setDetailOpen(open: Boolean) {
                                webView?.post { detailOpen.value = open }
                            }
                            @JavascriptInterface
                            fun setRankOpen(open: Boolean) {
                                webView?.post { rankOpen.value = open }
                            }
                            @JavascriptInterface
                            fun setSubOpen(open: Boolean) {
                                webView?.post { subOpen.value = open }
                            }
                            @JavascriptInterface
                            fun setNavIndex(index: Int) {
                                webView?.post { navIndex.intValue = index }
                            }
                            @JavascriptInterface
                            fun aiChat(reqId: String, apiKey: String, payload: String) {
                                this@MainActivity.aiChat(reqId, apiKey, payload)
                            }
                        }, "TankanBridge")
                        loadUrl("file:///android_asset/index.html")
                    }
                },
                update = {},
                modifier = Modifier.fillMaxSize()
            )

            if (subOpen.value) {
                // 宿舍 / 答题 / AI 二级页：只保留左上玻璃返回（侧滑跟手在 JS 内）。
                // 注意该分支优先于详情：AI 对话叠在详情上时，隐藏详情的更多按钮。
                LiquidButton(
                    onClick = { closeDetail() },
                    backdrop = subBackdrop,
                    modifier = Modifier
                        .padding(top = topInsetDp.intValue.dp)
                        .padding(start = 14.dp, top = 14.dp)
                        .align(Alignment.TopStart)
                ) {
                    LiquidIcon(AppIcons.Back, ComposeColor(0xFF3D3D3D), 30.dp, stroke = false)
                }
            } else if (detailOpen.value) {
                // 详情页：左上返回、右上更多（通透液态玻璃，无白 tint，透出背景）
                LiquidButton(
                    onClick = { closeDetail() },
                    backdrop = glassBackdrop,
                    modifier = Modifier
                        .padding(top = topInsetDp.intValue.dp)
                        .padding(start = 14.dp, top = 14.dp)
                        .align(Alignment.TopStart)
                ) {
                    LiquidIcon(AppIcons.Back, ComposeColor(0xFF3D3D3D), 30.dp, stroke = false)
                }
                LiquidButton(
                    onClick = {
                        // 先向 JS 确认当前电器 idx，再弹出菜单
                        fetchDetailIdx { i ->
                            detailIdx.intValue = i
                            moreMenuOpen.value = true
                        }
                    },
                    backdrop = glassBackdrop,
                    modifier = Modifier
                        .padding(top = topInsetDp.intValue.dp)
                        .padding(end = 14.dp, top = 14.dp)
                        .align(Alignment.TopEnd)
                ) {
                    LiquidIcon(AppIcons.More, ComposeColor(0xFF3D3D3D), 31.dp, stroke = true)
                }
            } else {
                // 底部液态导航：三个 tab 均为「图标在上、文字在下」
                val onTab = { i: Int ->
                    navIndex.intValue = i
                    onJsCall("window.switchNav && window.switchNav($i);")
                }
                LiquidBottomTabs(
                    selectedTabIndex = { navIndex.intValue },
                    onTabSelected = { i -> onTab(i) },
                    backdrop = backdrop,
                    tabsCount = 3,
                    modifier = Modifier
                        .fillMaxWidth(0.82f)
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(bottom = 22.dp)
                ) {
                    LiquidBottomTab(onClick = { onTab(0) }) {
                        LiquidIcon(AppIcons.Board, ComposeColor(0xFF3D3D3D), 25.dp, stroke = true)
                        Text("看板", color = ComposeColor(0xFF3D3D3D), fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold)
                    }
                    LiquidBottomTab(onClick = { onTab(1) }) {
                        LiquidIcon(AppIcons.Rank, ComposeColor(0xFF3D3D3D), 26.dp, stroke = true)
                        Text("排行榜", color = ComposeColor(0xFF3D3D3D), fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold)
                    }
                    LiquidBottomTab(onClick = { onTab(2) }) {
                        LiquidIcon(AppIcons.User, ComposeColor(0xFF3D3D3D), 26.dp, stroke = false, evenOdd = true)
                        Text("我的", color = ComposeColor(0xFF3D3D3D), fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                // 蓝色「添加设备」胶囊（仅看板页显示）
                if (navIndex.intValue == 0 && !rankOpen.value) {
                    LiquidButton(
                        onClick = { onJsCall("window.onAddClick && window.onAddClick();") },
                        backdrop = backdrop,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .navigationBarsPadding()
                            .padding(bottom = 106.dp),
                        tint = ComposeColor(0xFF0088FF)
                    ) {
                        LiquidIcon(AppIcons.Add, ComposeColor.White, 20.dp, stroke = false)
                        Text("添加设备", color = ComposeColor.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                // 排行榜正下方中央「参与答题」液态玻璃胶囊
                if (navIndex.intValue == 1 && rankOpen.value) {
                    LiquidButton(
                        onClick = { onJsCall("window.openQuiz && window.openQuiz();") },
                        backdrop = backdrop,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .navigationBarsPadding()
                            .padding(bottom = 106.dp),
                        tint = ComposeColor(0xFF0088FF)
                    ) {
                        LiquidIcon(AppIcons.Quiz, ComposeColor.White, 19.dp, stroke = false)
                        Text("参与答题", color = ComposeColor.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            /* ---------- 「更多」菜单：电器详情 / 删除此设备（均为液态玻璃胶囊） ---------- */
            if (moreMenuOpen.value) {
                MoreMenu(
                    glassBackdrop = glassBackdrop,
                    onDismiss = { moreMenuOpen.value = false },
                    onEdit = {
                        moreMenuOpen.value = false
                        fetchParams(detailIdx.intValue) { p ->
                            if (p != null) {
                                detailName.value = p.name
                                efVoltage.intValue = p.voltage
                                efCurrent.intValue = p.currentA
                                editOpen.value = true
                            }
                        }
                    },
                    onDelete = {
                        moreMenuOpen.value = false
                        fetchParams(detailIdx.intValue) { p ->
                            detailName.value = p?.name ?: "该设备"
                            confirmDeleteOpen.value = true
                        }
                    }
                )
            }

            /* ---------- 电器详情编辑对话框（液态玻璃：电压/电流） ---------- */
            if (editOpen.value) {
                EditParamDialog(
                    name = detailName.value,
                    voltage = efVoltage.intValue, onVoltage = { efVoltage.intValue = it },
                    current = efCurrent.intValue, onCurrent = { efCurrent.intValue = it },
                    onDismiss = { editOpen.value = false },
                    onSave = {
                        saveParams(detailIdx.intValue, efVoltage.intValue, efCurrent.intValue)
                        editOpen.value = false
                    }
                )
            }

            /* ---------- 删除确认 ---------- */
            if (confirmDeleteOpen.value) {
                AlertDialog(
                    onDismissRequest = { confirmDeleteOpen.value = false },
                    title = {
                        HideDialogStatusBar()
                        Text("删除设备", fontWeight = FontWeight.SemiBold)
                    },
                    text = {
                        Text(
                            "确定删除「${detailName.value}」吗？该设备的用电数据将一并移除。",
                            fontSize = 14.sp,
                            color = ComposeColor(0xFF44535C)
                        )
                    },
                    confirmButton = {
                        TextButton(onClick = {
                            confirmDeleteOpen.value = false
                            deleteAppliance(detailIdx.intValue)
                        }) {
                            Text("删除", color = ComposeColor(0xFFC43E1C), fontWeight = FontWeight.SemiBold)
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { confirmDeleteOpen.value = false }) {
                            Text("取消", color = ComposeColor(0xFF7A8790))
                        }
                    },
                    containerColor = ComposeColor(0xFFFFFFFF),
                    shape = RoundedCornerShape(5.dp)
                )
            }
        }
    }

    /** 右上角「更多」弹出的液态玻璃菜单 */
    @Composable
    private fun MoreMenu(
        glassBackdrop: com.kyant.backdrop.Backdrop,
        onDismiss: () -> Unit,
        onEdit: () -> Unit,
        onDelete: () -> Unit
    ) {
        Dialog(
            onDismissRequest = onDismiss,
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                decorFitsSystemWindows = false
            )
        ) {
            HideDialogStatusBar()
            // 空白区域点击关闭菜单（不显示涟漪）
            val interaction = remember { MutableInteractionSource() }
            Box(
                Modifier
                    .fillMaxSize()
                    .clickable(
                        interactionSource = interaction,
                        indication = null,
                        onClick = onDismiss
                    )
            ) {
                Column(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = topInsetDp.intValue.dp)
                        .padding(top = 68.dp, end = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalAlignment = Alignment.End
                ) {
                    LiquidButton(
                        onClick = onEdit,
                        backdrop = glassBackdrop
                    ) {
                        LiquidIcon(AppIcons.Info, ComposeColor(0xFF3D3D3D), 18.dp, stroke = false, evenOdd = true)
                        Text("电器详情", color = ComposeColor(0xFF3D3D3D), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }
                    LiquidButton(
                        onClick = onDelete,
                        backdrop = glassBackdrop
                    ) {
                        LiquidIcon(AppIcons.Trash, ComposeColor(0xFFC43E1C), 18.dp, stroke = false)
                        Text("删除此设备", color = ComposeColor(0xFFC43E1C), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    /** 「电器详情」参数编辑对话框 */
    /**
     * 「电器详情」液态玻璃对话框：仅电压（5/220/380V）与电流（1/3/10/16A）选择。
     * 容器使用与资源库一致的 drawBackdrop 玻璃材质（CanvasBackdrop 半透白 + 模糊/镜片）。
     */
    @Composable
    private fun EditParamDialog(
        name: String,
        voltage: Int, onVoltage: (Int) -> Unit,
        current: Int, onCurrent: (Int) -> Unit,
        onDismiss: () -> Unit,
        onSave: () -> Unit
    ) {
        Dialog(
            onDismissRequest = onDismiss,
            properties = DialogProperties(decorFitsSystemWindows = false)
        ) {
            HideDialogStatusBar()
            val btnBackdrop = rememberCanvasBackdrop {
                drawRect(ComposeColor.White.copy(alpha = 0.42f))
            }
            val dialogBackdrop = rememberCanvasBackdrop {
                drawRect(ComposeColor.White.copy(alpha = 0.55f))
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .drawBackdrop(
                        backdrop = dialogBackdrop,
                        shape = { RoundedCornerShape(16.dp) },
                        effects = {
                            vibrancy()
                            blur(2f.dp.toPx())
                            lens(12f.dp.toPx(), 24f.dp.toPx())
                        }
                    )
                    .border(1.dp, ComposeColor.White.copy(alpha = 0.65f), RoundedCornerShape(16.dp))
            ) {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "电器详情",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = ComposeColor(0xFF17242B),
                            modifier = Modifier.weight(1f)
                        )
                        Text(name, fontSize = 13.sp, color = ComposeColor(0xFF7A8790))
                    }
                    Spacer(Modifier.height(16.dp))

                    Text("额定电压", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = ComposeColor(0xFF44535C))
                    Spacer(Modifier.height(8.dp))
                    GlassOptionRow(
                        options = listOf(5, 220, 380),
                        unit = "V",
                        selected = voltage,
                        onSelect = onVoltage,
                        backdrop = btnBackdrop
                    )

                    Spacer(Modifier.height(16.dp))
                    Text("额定电流", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = ComposeColor(0xFF44535C))
                    Spacer(Modifier.height(8.dp))
                    GlassOptionRow(
                        options = listOf(1, 3, 10, 16),
                        unit = "A",
                        selected = current,
                        onSelect = onCurrent,
                        backdrop = btnBackdrop
                    )

                    Spacer(Modifier.height(20.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = onDismiss) {
                            Text("取消", color = ComposeColor(0xFF7A8790))
                        }
                        Spacer(Modifier.width(8.dp))
                        LiquidButton(
                            onClick = onSave,
                            backdrop = btnBackdrop,
                            tint = ComposeColor(0xFF0088FF)
                        ) {
                            Text("保存", color = ComposeColor.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }

    /** 玻璃选项芯片组：选中为蓝色液态玻璃，未选为白色半透玻璃 */
    @Composable
    private fun GlassOptionRow(
        options: List<Int>,
        unit: String,
        selected: Int,
        onSelect: (Int) -> Unit,
        backdrop: com.kyant.backdrop.Backdrop
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { v ->
                LiquidButton(
                    onClick = { onSelect(v) },
                    backdrop = backdrop,
                    modifier = Modifier.weight(1f),
                    tint = if (v == selected) ComposeColor(0xFF0088FF) else ComposeColor.Unspecified
                ) {
                    Text(
                        "$v$unit",
                        color = if (v == selected) ComposeColor.White else ComposeColor(0xFF3D3D3D),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Suppress("DEPRECATION")
    private fun configureWebView() {
        val wv = webView ?: return
        val s = wv.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.allowFileAccess = true
        s.allowFileAccessFromFileURLs = true
        s.allowUniversalAccessFromFileURLs = true
        s.loadWithOverviewMode = true
        s.useWideViewPort = true
        s.cacheMode = WebSettings.LOAD_NO_CACHE
        s.mediaPlaybackRequiresUserGesture = false
        // 锁定浅色：关闭 Android 10+ WebView 强制深色与 Android 13+ 算法深色，
        // 否则系统夜间模式会把浅色卡片整体反色（与 Activity / Compose 的浅色锁定保持一致）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            s.setForceDark(WebSettings.FORCE_DARK_OFF)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            s.setAlgorithmicDarkeningAllowed(false)
        }
        wv.setWebViewClient(object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                // 文档就绪后再注入一次安全区（首次注入可能早于文档创建而失效）
                pushInsetVars()
            }
        })
        wv.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(msg: android.webkit.ConsoleMessage): Boolean {
                android.util.Log.i("TankanJS", "[${msg.messageLevel()}] ${msg.message()}")
                return true
            }
        }
        wv.setBackgroundColor(Color.TRANSPARENT)
        wv.overScrollMode = WebView.OVER_SCROLL_NEVER
    }

    /**
     * 状态栏隐藏后，不能再把「状态栏高度」当作 --sat，否则页面顶部会留出一条
     * 多余的空白。Android 12 规范里沉浸式内容仍需避让挖孔/刘海，因此取
     * statusBars 与 displayCutout 顶部 inset 的较大值；隐藏状态下前者为 0。
     * 该值同步给 Compose 的顶部返回/更多按钮，保证原生与 Web 控件对齐。
     */
    private fun setupInsets() {
        val wv = webView ?: return
        val density = resources.displayMetrics.density
        satPx = 0
        topInsetDp.intValue = 0
        wv.setOnApplyWindowInsetsListener { _, insets ->
            val statusTop = insets.getInsets(WindowInsets.Type.statusBars()).top
            val cutoutTop = insets.getInsets(WindowInsets.Type.displayCutout()).top
            val top = Math.round(maxOf(statusTop, cutoutTop) / density)
            val bottom = Math.round(insets.getInsets(WindowInsets.Type.navigationBars()).bottom / density)
            val caption = Math.round(insets.getInsets(WindowInsets.Type.captionBar()).top / density)
            val ime = Math.round(insets.getInsets(WindowInsets.Type.ime()).bottom / density)
            satPx = top
            topInsetDp.intValue = top
            sabPx = maxOf(bottom, caption)
            kbPx = ime
            pushInsetVars()
            insets
        }
        pushInsetVars()
    }

    /**
     * 把安全区写入 CSS 变量。必须在文档就绪后调用：
     * 页面加载前 document.documentElement 为 null，直接写 style 会抛
     * TypeError（表现为 --sat 始终为 0，标题贴到状态栏上），故此处加存在性判断，
     * 并在 onPageFinished 再补一次。
     */
    private fun pushInsetVars() {
        // --fs：跟随系统「字体大小」，页面整体等比缩放；--kb：键盘高度（JS 侧与
        // visualViewport 取最大值后写入，键盘弹出时 AI 输入栏不会被挡住）
        val fs = resources.configuration.fontScale.coerceIn(1f, 1.5f)
        val js = "if(document.documentElement){" +
                "document.documentElement.style.setProperty('--sat','${satPx}px');" +
                "document.documentElement.style.setProperty('--sab','${sabPx}px');" +
                "document.documentElement.style.setProperty('--fs','$fs');}" +
                "window.__setKb && window.__setKb($kbPx);"
        webView?.post { webView?.evaluateJavascript(js, null) }
    }

    /* 系统字体大小改变时（configChanges 已含 fontScale）重新注入 --fs */
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // 切换深色模式 / 旋转 / 折叠屏等配置变化后，系统栏可能重新出现
        hideStatusBar()
        pushInsetVars()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}
