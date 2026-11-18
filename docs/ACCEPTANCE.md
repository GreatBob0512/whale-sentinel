# 小鲸哨 2.3.1 · 验收记录

## 本轮范围

2.3.1 修掉 7 个闭环缺陷，并顺手修掉清空引发的长任务补发：

1. **清空是全清**：history、results、完成计数、待发通知一起清；页面关闭已显示的浏览器通知；宿主调用 `Remove` 撤回整组 Windows Toast。
2. **今日完成独立计数**：不再从最多 50 条结果里推导；一天超过 50 个结束也照实计数。
3. **Windows Toast 可撤回**：`native-wake.ps1` 新增 `Remove` 模式，可按会话 Tag 或整组移除；任务被处理、清空或关闭通知时调用。
4. **多待办可见**：同一会话有多个待处理时，行内显示“另有 N 个待处理”；最新一条仍是主提示。
5. **状态回收**：代理释放时删除 facts/seen/nudges/stalledStates/waitingEvents，只保留 `detached` 墓碑供重新创建时清除；`stats.sessions` 可观测。
6. **焦点陷阱**：面板内 Tab/Shift+Tab 在首尾控件间循环，不跑出面板。
7. **尺寸控件唯一**：移除旧的“标准/大”按钮与 `toggleSize`，只保留收起/展开两个滑块。
8. **清空不再补发长任务**：保留 `nudges` 去重表，避免清空后 4 个超时任务立刻各补一条通知；长任务与完成一样批量合并（“另有 N 个任务运行较久”）。

未修改 DSH 核心或安装包。

## 自动化

`node check.mjs` → **188 tests / 188 pass / 0 fail**，门禁通过：

```
PASS release 2.3.1: entry, exports, files, index, host, docs and artwork agree
PASS client build: parts and generated artwork agree
PASS syntax, manifest distribution, icon size, five whole-body PNG states and notification assets
```

本轮新增门禁：

- clear 后 results、doneToday、pending 通知都为 0，且调用 native.remove；
- 60 次完成事件后 `results` 仍为 50、`doneToday` 为 60；
- 多 pending 行暴露 `pendingCount`；
- agent/disposed 后 `stats.sessions` 归零，重新创建后恢复；
- `remove` 会话与会话 Tag 一致，空目标移除整组；
- Tab 焦点首尾循环，`props.toggleSize` 与 setter 不存在；
- 清空后不重新产生 longRun；两条 longRun 合并为一条并带“另有 1 个任务运行较久”。

## 真实页面读数（2.3.1）

| 检查 | 实际结果 |
| --- | --- |
| 运行版本 | `2.3.1` |
| 焦点陷阱 | 打开面板有 11 个可聚焦控件；聚焦最后一个后按 Tab，焦点回到第一个（`focusWrapped: true`） |
| 旧尺寸按钮 | 不存在（`sizeToggle: false`） |
| 清空 | 清空前 3 条通知；`clear` 后 pending **0**、withdrawn **3**、results **0**、doneToday **0** |
| 长任务补发 | 清空后等待 2.5 秒，未产生新的 longRun 通知 |
| 版本与结果 | `results: 0`、`waiting: 0` |

## 历史证据（2.1.x–2.3.0 保留）

- 发布包解包自检：77 个文件，解包目录内 `check.mjs` 全过。
- 双实例与中文路径：两个临时协议并存、后注册不删除先注册、真实协议未受影响；中文目录启动器 UTF-16 且能写点击文件；测试键已清理。
- 主题对比度（宿主官方色值）：浅色正文 18.49:1、次要 5.67:1；深色正文 11.47:1、次要 7.96:1。
- 页面立绘 288×432；`client.js` 约 563 KB；源码拆为 `src/` 三件并由构建脚本生成。

## 补充真机环境验证（2.3.1，本轮补做）

之前列为“需要环境配合”的项目里，有几项其实可以自己做；本轮已补做：

| 项目 | 做法 | 实际结果 |
| --- | --- | --- |
| **520px 窄屏** | 用 Win32 把 DSH 窗口临时缩到 520×900，再恢复最大化 | 视口 `520×894`，`matchMedia('(max-width:520px)')` 为真；面板宽 **500px**，展开态角色 `display:none` |
| **浅色主题** | 通过 Client `theme` 服务 `setTheme('light')`，测量后切回深色 | 面板底色 `srgb(1,0.987,0.975) ≈ #FFFCF9`、文字 `#0F1115`（对比约 18.5:1）；随后 `body` 回到 `rgb(21,21,23)`、`colorScheme: dark` |
| **前台不弹** | 窗口置前 + 临时关闭“前台也通知”，走真实 host 通道发测试通知 | `hasFocus: true`；测试通知状态 **withdrawn**，delivery 出现 **page-foreground-suppressed**；随后“前台也通知”恢复为原值 `true` |
| **Toast 撤回（系统级）** | 用 `native-wake.ps1 -Mode Notify` 真发一条，再用 `History.GetHistory` 查数量，随后 `-Mode Remove` | 历史数 **0 → 1 → 0**；整组移除也验证为 **2 → 0**；最终 0，无残留测试通知 |
| **状态还原** | 逐项确认 | 窗口已恢复最大化；`notifyWhenFocused: true`；角色可见（`hidden:false`）；主题深色 |

保留 `scripts/verify-toast.ps1` 作为可复跑的系统级验证脚本（开发用，不随插件分发）。

## 边界（更新后）

- **真实人工点击横幅**仍未做：本轮验证的是“系统显示 → 程序调用 Remove 撤回”和“启动器写出点击文件”，没有人工点横幅。
- **两个真实 DSH 实例同时运行并点通知**仍未做；双实例只做到注册表/启动器级实测。
- **多待办提示、长任务批量合并、代理释放后的状态回收**仍只有单元级验证；真机抓取时没有可稳定制造的对应并发场景。
- 浅色只验证了面板实际计算色与对比度，没有做长时间人工观感评审。
- 以上未做项不得表述为“已验收通过”。

## 结论

2.3.1 把“清空、统计、通知撤回、多待办、内存回收、焦点、尺寸入口”七个闭环缺口补上，并修复了清空触发长任务补发这一新发现的问题。剩余项集中在真机环境与视觉验收。素材来源与权利见[素材说明](<ARTWORK.md>)与[署名](<../ATTRIBUTION.md>)。
