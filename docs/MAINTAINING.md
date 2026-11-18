# 鲸哨文档与素材维护

当前版本：2.1.0。两套运行素材：坐姿 `whale-it-seated-v1`（`assets/fish-*.png`）与展开态 `buddy-*.webp`（记录在 `assets/artwork.json` 的 `buddy` 字段；WebP 必须同时出现在 `package.json` 的 `files` 中）。

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

运行素材构建 `python whale-sentinel/scripts/build-it-artwork.py`：读取上述拆帧结果，缩放到 288×432 并量化到 160 色，输出页面立绘、图标 128×128、侧图 160×192，同时更新素材清单与 `data-artwork` 标识。**它不再改 `client.js`**：内联立绘由 `node scripts/build-client.mjs` 从 `assets/` 生成。

客户端源码拆成 `src/client-core.js`、`src/client-text.js`、`src/client-panel.js`；`client.js` 是构建产物（包装 + 源部件 + 生成的 `BUDDY`/`SPRITES`/`NOTIFY_FACES`）。改界面必须改 `src/` 后执行 `node scripts/build-client.mjs`，`check.mjs` 会用 `--check` 拒绝过期产物。

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

## 2.0 可靠性不变量（改之前先读）

以下五条是 2.0 修掉的真实缺陷，改动时不要回退：

1. **不要把“开始尝试”当成“已发送”**：`DeliveryQueue.beginNative()` 只是进入发送中，必须由 `settleNative({ok,reason})` 落定；失败要回到 `pending` 并按 `nativeRetryMs` 重试，达到上限才允许 `native-failed`。
2. **点击桥不可用也要提醒**：`activation.ready` 为 false 时，用 `noNavigation: true` 发送仅提醒；`native.js` 与 `native-wake.ps1` 都会拒绝“既无 URI 又未声明 noNavigation”的载荷，避免弹出一个点了没反应的横幅。
3. **协议按 profile 共享**：`protocolFor(DSH_HOME)` 生成确定性协议；清理旧键必须证明其启动器目录已不存在，不能仅凭 marker 删除。卸载时用 `instances/` 心跳判断是否还有其他存活实例。
4. **启动器必须 UTF-16**：`activate.vbs` 要写成 UTF-16 LE + BOM，否则中文用户目录会在 ASCII 编码时变成 `?`，注册成功但点击打不开。
5. **导航不能污染轮询**：`handleFocus()` 独立于状态同步，导航失败只更新导航提示；连续失败 3 次释放该点击，不能让队首卡住 60 秒。

另外：设置写入必须经过 `saveSetting()` 的脏值保护，旧快照不得覆盖刚拖动的值；`test` 通知不得写入 history 或参与统计。

## 2.1 雷达与多窗口不变量

1. **子代理只聚合、不单独提醒**：`remember()` 会保存子会话事实，但 `s.child` 在通知、事件与 `restoreWait` 之前返回；子会话只汇总到根行的 `children`。
2. **presence 按窗口记录**：`presence` 是 `client → heartbeat` 映射，任一窗口 20 秒内可见且聚焦即视为前台；不要退回单个全局变量。
3. **长任务每轮一次**：`nudges` 以 `sessionId → since` 去重，`since` 变化（新一轮）才允许再次提醒；阈值固定 15 分钟，只有开关可配。
4. **导航结果要回传**：`diagnostic` 动作只接受 `navigation-success` / `navigation-failed`，写入 `delivery` 轨迹；失败不得改动连接状态。
5. **发布一致性由脚本把关**：`scripts/verify-release.mjs` 校验版本、入口、导出、`index.js`、host 版本、文档与素材清单；`check.mjs` 会先跑它。
6. **主题只依赖宿主 token**：面板底色/文字/边框/状态点使用 `--dsw-alias-*`，不要新增 `prefers-color-scheme` 分支。改混合比例后必须跑 `theme-contrast.test.mjs`（正文 ≥ 7:1、次要 ≥ 4.5:1），并按宿主新色值更新测试里的代表值。
7. **客户端只能通过构建改**：改 `src/` 后执行 `node scripts/build-client.mjs`；直接改 `client.js` 会被 `--check` 拒绝。

开发验证脚本 `scripts/verify-activation.ps1` 会临时注册两个测试协议、验证双实例并存与中文路径点击，并在结束时注销、删除临时目录；它不随插件分发，也不要把它改成常驻逻辑。

## 分发

[package.json](<../package.json>) 允许 `assets/*.png`、`assets/*.webp` 与 `assets/artwork.json`，不递归打包探索素材目录。文档 PNG 显式只包括 [状态手册](<state-handbook.png>)、[信息流程](<session-flow.png>)、[独立控制](<controls-guide.png>)。历史原图与非当前候选不列入运行／说明图分发清单。

插件管理器读取 locale `meta.detail`，相对图片由认证的 `/api/plugin-manager/detail-file` 路由提供；不会通过自创 `/plugins/.../docs` URL 加载。仅验证本地链接不等于真实页面视觉验收。

## 变更边界

插件改动只涉及素材资源与必要的版本入口，不修改 DSH 核心、安装包、用户偏好或通知／会话业务行为。保持完整整身、同一幼年形态；不悄悄引入年龄切换或换装。

动画只保留整身浮动与指尖脉冲。**不要重新引入「同一张图裁出头部再旋转」的做法**——裁剪边缘会在旋转时暴露成轮廓撕裂。

旧版曾提供的两个筛选开关（会话范围、动态条数）已移除，不应在文档或界面中重新出现；旧偏好中的 `scope` / `historyLimit` 会被忽略，不会隐藏运行中的任务。最近动态固定默认显示 3 条，其余通过「查看更多结果」展开。
