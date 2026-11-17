# 1.3.1 系统通知排版修正

针对用户实机截图：长 Markdown 正文挤占通知、128px 方形图被系统放大、来源显示 PowerShell。

## 调整
- 原生通知标题一行，正文最多两行；任务名最多32字符，摘要58字符，总体保持紧凑，耗时单列。
- 清除 Markdown 强调/标题/列表/代码块、HTML、链接地址和图片语法，只留可阅读文字。面板完整结果不受系统通知短摘要截断影响。
- 整身角色使用728×240透明横幅，图源为原240px状态图缩小到适配高度，不从128px图标放大、不裁半身。Windows hero尺寸受系统版本/缩放影响，不承诺像素级布局。
- 仅读取现有Get-StartApps，唯一匹配DeepSeek Harness且AppID为electron.app.DeepSeek Harness或com.deepseek.dsh时优先使用其注册身份；其他安装仍使用原PowerShell备用身份。不写注册表、不改DSH安装包。

## 验证
- 74项回归测试全通过（含真实WinRT构造，Show边界在单测替换）。
- XML真实构造覆盖hero整身图片、行数、attribution耗时、XML转义和两种有效来源身份、失败查询回退。
- 实际本机Get-StartApps存在electron.app.DeepSeek Harness。单条真实测试发送返回ok=true，仅代表Windows接受提交，不保证用户看到了横幅。
- Windows通知历史查询未取得记录，不以其作为显示/归属成功证据；最终原生横幅视觉仍需实机截图核对。
