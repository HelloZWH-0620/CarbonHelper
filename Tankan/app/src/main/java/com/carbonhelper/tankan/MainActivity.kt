package com.carbonhelper.tankan

import android.annotation.SuppressLint
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color as ComposeColor
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

    /** 安全区（CSS px）：--sat 顶部状态栏 / --sab 底部手势条 / --kb 键盘高度 */
    private var satPx = 0
    private var sabPx = 0
    private var kbPx = 0

    /** 「电器详情」对话框读写的电器参数（仅电压 / 电流） */
    private data class ApplianceParam(
        val idx: Int,
        val name: String,
        val voltage: Int,
        val currentA: Int
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val window = window
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
        }
        window.setStatusBarColor(Color.TRANSPARENT)
        window.setNavigationBarColor(Color.TRANSPARENT)

        setContent {
            MainScreen(
                onReleaseWebView = { webView = it },
                closeDetail = { closeDetail() },
                onJsCall = { js -> webView?.post { webView?.evaluateJavascript(js, null) } }
            )
        }

        applySystemBarAppearance(window)
    }

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

        Box(Modifier.fillMaxSize()) {
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
                        .statusBarsPadding()
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
                        .statusBarsPadding()
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
                        .statusBarsPadding()
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
                    title = { Text("删除设备", fontWeight = FontWeight.SemiBold) },
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
                        .statusBarsPadding()
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
        Dialog(onDismissRequest = onDismiss) {
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

    private fun setupInsets() {
        val wv = webView ?: return
        val density = resources.displayMetrics.density
        // 兜底：识别不到状态栏 inset 时用系统 status_bar_height 资源值
        val barId = resources.getIdentifier("status_bar_height", "dimen", "android")
        val fallbackTop = if (barId > 0) {
            Math.round(resources.getDimensionPixelSize(barId) / density)
        } else {
            Math.round(24f * density / density)
        }
        satPx = fallbackTop
        wv.setOnApplyWindowInsetsListener { _, insets ->
            val top = Math.round(insets.getInsets(WindowInsets.Type.statusBars()).top / density)
            val bottom = Math.round(insets.getInsets(WindowInsets.Type.navigationBars()).bottom / density)
            val caption = Math.round(insets.getInsets(WindowInsets.Type.captionBar()).top / density)
            val ime = Math.round(insets.getInsets(WindowInsets.Type.ime()).bottom / density)
            if (top > 0) { satPx = top }
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
        pushInsetVars()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}
