# 鲸哨文档与素材维护

当前版本：1.8.8。两套运行素材：坐姿 `whale-it-seated-v1`（`assets/fish-*.png`）与展开态 `buddy-*.webp`（记录在 `assets/artwork.json` 的 `buddy` 字段）。

## 唯一事实来源

- [素材清单](<../assets/artwork.json>)：角色基准哈希、两套姿势图哈希、拆帧来源、实际尺寸、透明边界、文件哈希与字节。不要在文档复制一份易过期的旧尺寸表。
- [使用说明](<../README.md>)：中文详情页入口，两语言 `meta.detail` 均指向它。
- [英文简版](<../README.en.md>)：同步范围与通知边界，中文完整说明链接保留。
- [素材说明](<ARTWORK.md>)：两套素材的采用范围、来源、动画与整身规则。
- [验收记录](<ACCEPTANCE.md>)：当前页面证据与验证限制；旧 1.3 记录仅用于追溯。

## 构建

**1. 坐姿素材（收起态）**

生图阶段在工作区完成：以用户指定的角色基准为参考图，用 `gpt-image-2.6` 生成**纯白背景**的五态姿势图（透明背景会引入边缘噪点）。

拆帧脚本 `outputs/whale-it-states/split-seated.py`：白底 flood fill 抠除背景 → 按 alpha 连通域拆分（不按固定列宽，避免裁断头发或鲸尾）→ **按宽高取更小比例**统一缩放并留安全边距，输出 `frames-seated/{phase}-384.png`。

运行素材构建 `python whale-sentinel/scripts/build-it-artwork.py`：读取上述拆帧结果，输出页面 384×576／图标 128×128／侧图 160×192，并同步更新客户端的两套内联 PNG 与 `data-artwork` 标识，避免磁盘已换而页面仍显示旧图或旧标识。

**2. 展开态五表情**

姿势图：工作区 `outputs/whale-buddy/buddy-five-white.png`（白底五格）。

拆帧脚本 `outputs/whale-buddy/split-buddy2.py`：同样先抠白底、再按连通域拆帧，但输出**紧凑裁剪**结果 `frames/{phase}-tight.png`，不带任何透明留白。

打包脚本 `python whale-sentinel/scripts/build-buddy2.py`：把紧凑帧等比缩放到 224 × 462、转 WebP（quality 58），写入 `assets/buddy-{phase}.webp`，并更新 `artwork.json` 的 `buddy` 字段与客户端 `BUDDY` 内联（`data:image/webp;base64`）。

两处必须一起改：只换磁盘文件或只改内联，页面与清单就会不一致。

原始生成文件不属于发布包；素材重建是工作区开发步骤，不要求最终用户运行。运行端没有 Python、Pillow 或新增图形库依赖。

插件图标为 256×256 完整角色，直接从较高分辨率页面图缩小，不从 128 小图放大。SVG 仅包装同一 PNG。

执行 `python whale-sentinel/docs/build-diagrams.py` 重建三张说明图。脚本只排版当前素材与图解，不生成新角色；图中明确标注非运行截图。重建后逐张查看以确认无裁身和截字。

执行 `node whale-sentinel/check.mjs`：回归、语法、分发、图标与 PNG/WebP 检查；素材测试逐字节比较内联图与文件，并校验五态互不相同、页面素材标识等于清单 ID、展开态为 WebP 且为紧凑裁剪。不得通过修改预期哈希来掩盖误换角色。

## 尺寸变量（改之前先读）

展开态尺寸由两个 CSS 变量相乘得出：

```css
.dpg-root{--dpg-buddy-scale:1;--dpg-buddy-h:236px}
.dpg-sprite{height:calc(var(--dpg-buddy-h) * var(--dpg-buddy-scale,1))}
```

- `--dpg-buddy-h`：像素基准，对应「展开尺寸 100%」时的高度。
- `--dpg-buddy-scale`：由设置里的「展开尺寸」滑块写入，80%–160%。
- 收起态独立，用 `--dpg-scale` 乘 `--dpg-base-h/--dpg-base-w`，与展开尺寸互不影响。两个滑块分别持久化。

**必须用像素基准乘缩放，不要用父级百分比高度。** 父容器是自动高度（由内容决定），子元素写 `height: 46%` 会形成循环依赖，浏览器会忽略它并退回内容高度——表现是「改了 CSS 却完全没变化」，而且很难从视觉上判断原因。曾踩过这个坑，退回像素基准后立刻生效。

## 分发

[package.json](<../package.json>) 允许 `assets/*.png`、`assets/*.webp` 与 `assets/artwork.json`，不递归打包探索素材目录。文档 PNG 显式只包括 [状态手册](<state-handbook.png>)、[信息流程](<session-flow.png>)、[独立控制](<controls-guide.png>)。历史原图与非当前候选不列入运行／说明图分发清单。

插件管理器读取 locale `meta.detail`，相对图片由认证的 `/api/plugin-manager/detail-file` 路由提供；不会通过自创 `/plugins/.../docs` URL 加载。仅验证本地链接不等于真实页面视觉验收。

## 变更边界

插件改动只涉及素材资源与必要的版本入口，不修改 DSH 核心、安装包、用户偏好或通知／会话业务行为。保持完整整身、同一幼年形态；不悄悄引入年龄切换或换装。

动画只保留整身浮动与指尖脉冲。**不要重新引入「同一张图裁出头部再旋转」的做法**——裁剪边缘会在旋转时暴露成轮廓撕裂。

旧版曾提供的两个筛选开关（会话范围、动态条数）已移除，不应在文档或界面中重新出现；旧偏好中的 `scope` / `historyLimit` 会被忽略，不会隐藏运行中的任务。最近动态固定默认显示 3 条，其余通过「查看更多结果」展开。
