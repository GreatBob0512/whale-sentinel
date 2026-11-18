# 小鲸哨 2.1.0 · 验收记录

## 本轮范围

2.1.0 在 2.0.0 可靠性基础上补齐雷达信息、多窗口行为，并完成客户端结构化与体积优化，不改角色形象：

1. 每个任务显示**工作区名**，并把运行中的**子代理个数**聚合到主任务行；子代理不单独成行、不发提醒；
2. **presence 按窗口记录**：任一窗口可见且聚焦即视为前台，隐藏窗口不能覆盖聚焦窗口；
3. **长任务提醒**可选开启，同一轮超过 15 分钟只提醒一次，子代理不触发；
4. 导航成功/失败回传 `diagnostic` 轨迹；
5. 客户端源码拆为 `src/client-core.js`、`src/client-text.js`、`src/client-panel.js`，`client.js` 由构建脚本生成，内联立绘由 `assets/` 生成；页面立绘从 384×576 缩到 **288×432 / 160 色**，`client.js` 从 **698,747 字节降到 556,403 字节（−20%）**；
6. 面板底色、文字、边框、状态点改用 **DSH 主题 token**（`--dsw-alias-*`），不再依赖系统 `prefers-color-scheme`；
7. 新增 `scripts/verify-release.mjs`、`scripts/build-client.mjs --check` 两道门禁，版本、入口、导出、文档、素材与构建产物必须一致。

未修改 DSH 核心或安装包。

## 自动化

`node check.mjs` → **161 tests / 161 pass / 0 fail**，随后门禁通过：

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
- 页面立绘 288×432、透明边界安全、内联逐字节一致、内联预算 600KB；
- 浅色与深色主题的混合比例固定，并按宿主 token 值校验正文对比度 ≥ 7:1、次要文字 ≥ 4.5:1；
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
| 主题（当前为深色） | 宿主 token 在 `body` 上：`bg-layer-1 #232324`、`label-primary #f9fafb`；面板底色 `≈#393633`、文字 `#f9fafb`，对比约 **11.5:1** |
| 旧 OS 深色规则 | 已不存在（`osDarkRule: false`） |
| 窄屏规则 | 存在（`max-width:520px`） |

## 发布包解包自检

`npm pack` 后解压到临时目录，在解包目录内直接运行 `node check.mjs`：

```
extracted=77 files
# pass 161 / # fail 0
PASS release 2.1.0 ...
PASS client build ...
PASS syntax, manifest ...
exit=0
```

说明发布包不依赖工作区的其他文件即可通过全部自检。

## 双实例与中文路径（注册表级实测）

用两个临时协议、两个含中文的临时 spool 目录执行 `win-activation.ps1`，结束后注销并删除测试目录：

| 检查 | 结果 |
| --- | --- |
| 两个协议分别注册 | 均 `exit 0` |
| 后注册不删除先注册 | 两个键同时存在，`oneProtocolEach: true` |
| 真实插件协议未受影响 | `realKept: true` / `realStillThere: true` |
| 重复注册 | `exit 0`（幂等） |
| 中文路径启动器 | UTF-16 BOM，脚本内路径与目录完全一致 |
| 中文路径点击 | 写出 `<token>.click`，内容与 token 一致 |
| 清理 | 两个测试键均已删除 |

脚本保留为 `scripts/verify-activation.ps1`（开发验证用，不随插件分发）。

## 主题对比度（按宿主官方色值计算）

从安装包内的主题定义读取 alias 与静态色值（light: `#fff` / `#0f1115` / `#61666b`；dark: `#232324` / `#f9fafb` / `#cfd3d6`），按插件实际混合比例计算：

| 主题 | 面板底色 | 主文字对比 | 次要文字对比 | 卡片主文字 |
| --- | --- | --- | --- | --- |
| 浅色 | `#fffcf9` | **18.49:1** | **5.67:1** | 17.30:1 |
| 深色 | `#393634` | **11.47:1** | **7.96:1** | 8.81:1 |

## 边界

- **浅色未切换实测**：浅色分支用宿主官方 token 值与插件混合公式计算，未在浅色主题下看实际观感。
- **未在真实运行的两个 DSH 实例间点通知**：双实例只做到注册表与启动器级实测；共享协议与心跳另有单元测试。
- **未做真实横幅点击**：只验证了启动器写出可消费的点击文件，页面侧认领/导航由自动化覆盖。
- **520px 以下视口未实测**：探针运行在 1707px 宽视口。
- 以上未做项不得表述为“已验收通过”。

## 结论

2.1.0 完成雷达信息、多窗口判定、长任务提醒、导航诊断，客户端体积降低 20%，主题改由 DSH token 驱动，发布包、双实例注册与中文路径均有实测或计算证据。剩余真机项（浅色观感、520px、真实双实例点击、系统横幅点击）保持未验证。素材来源与权利见[素材说明](<ARTWORK.md>)与[署名](<../ATTRIBUTION.md>)。
