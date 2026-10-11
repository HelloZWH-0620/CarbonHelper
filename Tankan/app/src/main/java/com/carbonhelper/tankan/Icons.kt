package com.carbonhelper.tankan

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.graphics.PathParser.createPathFromPathData

/** 用 Compose 绘制 SVG path（保持与原设计图标一致，来自对应的 .svg 文件） */
object AppIcons {
    val Board = "M16.1698 10.0603H7.82982C6.64982 10.0603 6.23983 9.27031 6.92983 8.31031L11.0998 2.47031C11.5898 1.77031 12.4099 1.77031 12.8899 2.47031L17.0598 8.31031C17.7598 9.27031 17.3498 10.0603 16.1698 10.0603Z" +
            "M18.7798 15.6705C19.7098 16.9505 19.1698 18.0005 17.5898 18.0005H6.41986C4.83986 18.0005 4.29985 16.9505 5.22985 15.6705L9.21984 10.0605H14.7899L16.1699 12.0005" +
            "M12 22V18"
    val Rank = "M8.67 14H4C2.9 14 2 14.9 2 16V22H8.67V14ZM13.33 10H10.66C9.56003 10 8.66003 10.9 8.66003 12V22H15.33V12C15.33 10.9 14.44 10 13.33 10ZM20 17H15.33V22H22V19C22 17.9 21.1 17 20 17ZM12.52 2.0708L13.05 3.1308C13.12 3.2808 13.31 3.42079 13.47 3.44079L14.43 3.6008C15.04 3.7008 15.19 4.15078 14.75 4.58078L14 5.33078C13.87 5.46078 13.8 5.70079 13.84 5.87079L14.05 6.7908C14.22 7.5208 13.83 7.80081 13.19 7.42081L12.29 6.89081C12.13 6.79081 11.86 6.79081 11.7 6.89081L10.8 7.42081C10.16 7.80081 9.76998 7.5208 9.93998 6.7908L10.15 5.87079C10.19 5.70079 10.12 5.45078 9.98999 5.33078L9.24999 4.59079C8.80999 4.15079 8.94999 3.71078 9.56999 3.61078L10.53 3.4508C10.69 3.4208 10.88 3.28081 10.95 3.14081L11.48 2.08078C11.77 1.50078 12.23 1.5008 12.52 2.0708Z"
    val User = "M22 7.81V16.19C22 19 20.71 20.93 18.44 21.66C17.78 21.89 17.02 22 16.19 22H7.81C6.98 22 6.22 21.89 5.56 21.66C3.29 20.93 2 19 2 16.19V7.81C2 4.17 4.17 2 7.81 2H16.19C19.83 2 22 4.17 22 7.81Z" +
            "M18.4401 21.6597C17.7801 21.8897 17.0201 21.9998 16.1901 21.9998H7.81006C6.98006 21.9998 6.22006 21.8897 5.56006 21.6597C5.91006 19.0197 8.67006 16.9697 12.0001 16.9697C15.3301 16.9697 18.0901 19.0197 18.4401 21.6597Z" +
            "M15.58 11.58C15.58 13.56 13.98 15.17 12 15.17C10.02 15.17 8.42004 13.56 8.42004 11.58C8.42004 9.60002 10.02 8 12 8C13.98 8 15.58 9.60002 15.58 11.58Z"
    val Add = "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.75 11h-3.75v3.75a1 1 0 1 1-2 0V13H7.25a1 1 0 1 1 0-2H11V7.25a1 1 0 1 1 2 0V11h3.75a1 1 0 1 1 0 2Z"
    val Back = "M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75ZM15.5 12.75H9.5C9.09 12.75 8.75 12.41 8.75 12C8.75 11.59 9.09 11.25 9.5 11.25H15.5C15.91 11.25 16.25 11.59 16.25 12C16.25 12.41 15.91 12.75 15.5 12.75ZM11.4999 15.7504C11.3099 15.7504 11.1199 15.6804 10.9699 15.5304L7.96994 12.5304C7.67994 12.2404 7.67994 11.7604 7.96994 11.4704L10.9699 8.47043C11.2599 8.18043 11.7399 8.18043 12.0299 8.47043C12.3199 8.76043 12.3199 9.24043 12.0299 9.53043L9.55994 12.0004L12.0299 14.4704C12.3199 14.7604 12.3199 15.2404 12.0299 15.5304C11.8799 15.6804 11.6899 15.7504 11.4999 15.7504Z"
    val More = "M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" +
            "M15.9965 12H16.0054" +
            "M11.9955 12H12.0045" +
            "M7.99451 12H8.00349"
    val Info = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
    val Trash = "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
    val Quiz = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.24c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"
}

/**
 * 根据 SVG path 数据绘制图标。
 * @param stroke 该图标是否为描边风格（对应原 SVG 的 fill="none"）。
 * 所有图标统一使用 24×24 的 viewport，需缩放到 [size] 指定的画布尺寸，
 * 否则 path 会按 1 单位 = 1 物理像素绘制，在高 dpi 屏上又小又偏（仅占画布左上角）。
 */
@Composable
fun LiquidIcon(
    pathData: String,
    color: androidx.compose.ui.graphics.Color,
    size: Dp = 24.dp,
    stroke: Boolean = true,
    strokeWidthDp: Dp = 1.7.dp,
    evenOdd: Boolean = false
) {
    val density = LocalDensity.current
    /* 所有图标统一使用 24×24 的 viewport：在组合阶段直接把 path 预缩放到物理像素，
       绘制时不加 transform（该设备上 DrawScope.scale 会出现内容被裁切/不显示）。 */
    val path: Path = remember(pathData, size, evenOdd) {
        val p = createPathFromPathData(pathData).asComposePath()
        /* 「我的」等图标靠内部子路径镂空成形，path 数据同向缠绕，需改用奇偶规则 */
        if (evenOdd) p.fillType = PathFillType.EvenOdd
        val s = with(density) { size.toPx() } / 24f
        val m = Matrix()
        m[0, 0] = s
        m[1, 1] = s
        p.transform(m)
        p
    }
    Canvas(Modifier.size(size)) {
        drawPath(
            path = path,
            color = color,
            style = if (stroke) {
                Stroke(width = strokeWidthDp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            } else Fill
        )
    }
}