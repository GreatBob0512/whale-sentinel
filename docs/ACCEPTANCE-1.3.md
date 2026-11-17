# 1.3.0 验收记录

## 自动化
运行 `node whale-sentinel/check.mjs`：69 tests / 69 pass / 0 fail / 0 skipped。包含状态投影、并行工具、真实todo比例、最终文本摘要、非法模型参数、通知认领/回执/兜底、准确结束原因、离线最后状态、音效独立开关、低音量/节流/销毁、Windows脚本安全与恢复逻辑。另通过全部运行时JS语法、PNG/图标大小、分发文件检查。

## 现场证据（现有DSH桌面页面）
- 当前安装版本1.3.0，application applied，无警告，shell.overlay whale-sentinel active。
- 实际宿主快照：会话步骤70、131次已完成工具调用、todo 3/5、真实比例0.6。另一个会话todo0/4、比例0，未制造预计完成时间。
- 页面主通道测试：通知status shown、delivery stage client-shown，即收到原系统 Notification.onshow；不等于用户已经阅读。
- 原生wake路由：HTTP200，ok true，reason foreground。1.2同一Windows脚本隐藏→还原实测exit0；本轮主链仍使用相同归属校验。
- 实际插件面板DOM：viewport1280×822，面板约348.52×549.66，top57.73/bottom607.40，未越界；2条活跃、1条结果、进度60和0、options存在、无slot错误；打开后focus确实进入面板。探针恢复了原面板打开状态，未改长期偏好。
- 插件管理器readBundleDetail(zh/en)：found，README.md，两种语言均识别状态图和流程图。
- 正确说明图片路由 `/api/plugin-manager/detail-file`：三图均200 image/png，分别341351/222302/202941字节。
- 曾试错 `/plugins/.../docs` 得404，该路径不是文档图片契约；已改用管理器正式detail-file路径验证，不把404掩饰为通过。

## 明确未做与限制
- 没有浏览器截图控制，未伪造截图；没有人耳听感确认。音效通过行为/资源与频率/节流自动测试，默认关闭。
- 未模拟点击操作系统原生通知本体，精确会话点击链由客户端测试验证，现场独立验证通知show与native wake。
- WinRT备用通知只提交到Windows，显示受系统勿扰/权限控制，fallback激活dsh://open不保证精确会话；正常页面主通道带确切sessionId。
- Windows备用声音使用系统音量，本地滑块只控制WebAudio。主通道默认静音，音效独立opt-in。
- 无P0/P1审查阻断；无重型新增依赖，角色素材未改变，说明三图约749KiB。

## 休眠门禁
`powercfg /a` 已确认电脑支持休眠。验收收尾后执行 `shutdown /h`，不强制结束任务/关闭程序；实际进入休眠后连接会中断，不能在休眠后继续确认界面。
