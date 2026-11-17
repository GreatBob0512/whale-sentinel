# 鲸哨通知可靠性升级实现计划

> **给执行代理：** 使用「子代理驱动开发」逐任务推进，先红后绿，需求审查后代码审查。

**目标：** 卸载第三方，保留整身形象/隐藏恢复/任务面板，按真实结束原因通知，点击无需宿主补丁。

**架构：** 宿主注册纯 session projection，从任务日志派生权威状态；POST claim/ack 与 GET snapshot/delta 提供每条通知唯一送达认领。Client 使用快照而非运行→停止猜结果；浏览器通知 onshow 才确认系统接收，未确认时 Windows 原生发送兜底。点击固定本机会话动作，Windows 原生窗口模块只恢复 DSH 窗口。

**技术栈：** JavaScript ESM、React现有页面、Cordis投影与认证路由、Node内置测试、WinRT/User32。

## 文件结构
- `task-state.js` / `task-state.test.mjs`：纯事件折叠、结果与批准/选择/输入分类、同会话撤回去重。
- `index.js` / `host.test.mjs`：宿主投影、认证快照/动作路由、发送确认与诊断、兜底。
- `native.js` / `native.test.mjs` / `native-wake.ps1`：Windows原生唤起/WinRT系统通知，不改安装包。
- `client.js` / `check.mjs`：保留素材/外观，改读宿主快照；按唯一通知id认领、onshow确认、点击恢复窗口跳会话。
- `package.json`、`README.md`：分发新增文件、迁移说明、版本1.2.0。

## 任务
- [x] 1. 原生模块委派独立实现，先运行失败测试，再实现有限时进程/安全参数/窗口归属。
- [x] 2. 状态投影先写失败测试：
```js
const state=fold(init({id:'s'}),{type:'turn/end',seq:3,time:100,data:{turn:1,reason:{kind:'aborted',reason:{kind:'user'}}}});
assert.equal(state.outcome.kind,'stopped');
assert.notEqual(state.outcome.kind,'done');
```
真实completed=>done、error/max-tokens/blocked=>error；pending type=approval/choice/input，tool result清除；无关事件同引用，checkpoint纯JSON。
- [x] 3. 宿主 route guard、claim/ack和原生兜底测试：一个notice只能claim一次，onshow ack后不可fallback，fallback不能重复，restart不回放旧完成，通知开关真的阻止发送。
- [x] 4. Client测试先红：宿主active列表/事件快照能更新形象，run→idle本身不发done；pending完成撤回；后台click调用wake route后开正确session；onerror不能计已显示。
- [x] 5. 全量测试、静态检查、安装升级启用、检查live slot、真实系统show回调证据；不把构造成功或注册成功当成用户实际看到。
- [x] 6. 独立需求审查，再独立质量审查；问题修复后重测，卸载临时诊断。

不修改app.asar，不复用旧宿主补丁；不添加余额/套餐等超出本次目标的功能。第三方已卸载，设置残留由管理器维护，不手改profile。
