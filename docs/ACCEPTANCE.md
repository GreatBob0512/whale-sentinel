# 小鲸哨 2.1.0 · 验收记录

## 本轮范围

2.1.0 在 2.0.0 可靠性基础上补齐雷达信息、多窗口行为，并完成客户端的结构化与体积优化，不改角色形象：

1. 每个任务显示**工作区名**，并把运行中的**子代理个数**聚合到主任务行；子代理不单独成行、不发提醒；
2. **presence 按窗口记录**：任一窗口可见且聚焦即视为前台，隐藏窗口不能覆盖聚焦窗口；
3. **长任务提醒**可选开启，同一轮超过 15 分钟只提醒一次，子代理不触发；
4. 导航成功/失败回传 `diagnostic` 轨迹；
5. 客户端源码拆为 `src/client-core.js`、`src/client-text.js`、`src/client-panel.js`，`client.js` 由构建脚本生成，内联立绘由 `assets/` 生成；页面立绘从 384×576 缩到 **288×432 / 160 色**，`client.js` 从 **698,747 字节降到 556,403 字节（−20%）**；
6. 面板底色、文字、边框、状态点改用 **DSH 主题 token**（`--dsw-alias-*`），不再依赖系统 `prefers-color-scheme`；
7. 新增 `scripts/verify-release.mjs` 与 `scripts/build-client.mjs --check` 两道门禁，版本、入口、导出、文档、素材清单与构建产物必须一致。

未修改 DSH 核心或安装包。

## 自动化

`node check.mjs` → **158 tests / 158 pass / 0 fail**，随后两道门禁通过：

```
PASS release 2.1.0: entry, exports, files, index, host, docs and artwork agree
PASS client build: parts and generated artwork agree
PASS syntax, manifest distribution, icon size, five whole-body PNG states and notification assets
```

本轮新增/更新的门禁：

- 子会话只聚合到父行；子会话不产生通知；
- 任一聚焦窗口压制原生通知，隐藏窗口不能清除该状态；
- 长任务默认关闭、每轮一次、子代理不触发；
- `diagnostic` 只接受两个导航阶段并写入轨迹；
- 终态回执一小时后清理，pending 不误删；
- 客户端与宿主纯文本规则逐字符对账；
- 页面立绘 288×432、透明边界安全、内联与磁盘逐字节一致、内联预算 600KB；
- `client.js` 必须由 `src/` 与素材重建得到，过期即失败；
- 版本一致性：唯一 `release-2.1.0.js`，导出、`index.js`、host 版本、文档、WebP 清单一致。

## 真实页面读数

通过临时探针插件在已连接的 DSH 页面执行（探针已卸载）：

| 检查 | 实际结果 |
| --- | --- |
| 运行版本 | `2.1.0` |
| 立绘尺寸 | 浏览器解码 `288×432` |
| 面板 | 打开后 330px，关闭后消失 |
| 任务行 | 含 `workspace`、`children`；实测 `workspace: "default-workspace"` |
| 统计 | `{active:3, running:3, children:0…}` 口径分离；子会话计入 children |
| 长任务开关 | 写入后回读 `true`，随后恢复关闭 |
| 导航诊断 | `navigation-success` 出现在 delivery[0] |
| 主题（当前为深色） | 宿主 token 在 `body` 上：`bg-layer-1 #232324`、`label-primary #f9fafb`；面板底色计算为 `srgb(0.224,0.211,0.202) ≈ #393633`，文字 `rgb(249,250,251)`，对比约 12:1 |
| 旧 OS 深色规则 | 已不存在（`osDarkRule: false`） |
| 窄屏规则 | 存在（`max-width:520px`） |

## 边界

- **未在浅色主题下实测**：当前宿主是深色主题，深色面板已按 token 计算值验证；浅色分支只做了规则与回退值检查。
- **未做真实横幅点击**：只验证了协议入口能写出可消费的点击文件，页面侧认领/导航由自动化覆盖。
- **未启动第二个 DSH 实例**：共享协议与心跳仍是单元级验证。
- **520px 以下视口未实测**：探针运行在 1707px 宽视口。
- 以上未做项不得表述为“已验收通过”。

## 结论

2.1.0 完成了雷达信息、多窗口判定、长任务提醒与导航诊断，并把客户端拆成可维护源部件、体积降低 20%、主题改由 DSH token 驱动；版本、文档、素材与构建产物由门禁绑定。剩余真机项（浅色主题、520px、双实例、系统横幅点击）保持未验证。素材来源与权利见[素材说明](<ARTWORK.md>)与[署名](<../ATTRIBUTION.md>)。
