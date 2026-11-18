"""Build the three bundled documentation diagrams from current full-body assets.

Native Pillow diagrams, not screenshots or new character generation.
Run only after the current release's assets are final: python docs/build-diagrams.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs'
FONT = 'C:/Windows/Fonts/msyh.ttc'
BOLD = 'C:/Windows/Fonts/msyhbd.ttc'
INK, MUTED, BG = '#26344B', '#58687B', '#F7F9F8'
BLUE, MINT, YELLOW, CORAL, LAV = '#506B8E', '#CBE7DE', '#F0E6C4', '#EED7DC', '#DFDDEA'
COLORS = ['#718094', '#58789E', '#9B7B43', '#45816F', '#A16878']


def font(n, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, n)


def text(d, xy, value, n=24, color=INK, bold=False):
    d.text(xy, value, font=font(n, bold), fill=color)


def wrap(d, value, width, n=24, bold=False):
    result, line = [], ''
    for ch in value:
        candidate = line + ch
        if d.textbbox((0, 0), candidate, font=font(n, bold))[2] > width and line:
            result.append(line)
            line = ch
        else:
            line = candidate
    if line:
        result.append(line)
    return result


def lines(d, xy, value, width, n=24, color=MUTED, bold=False, gap=9):
    x, y = xy
    for line in wrap(d, value, width, n, bold):
        text(d, (x, y), line, n, color, bold)
        y += n + gap
    return y


def base(title, subtitle, h):
    im = Image.new('RGB', (1600, h), BG)
    d = ImageDraw.Draw(im)
    text(d, (48, 24), '小鲸哨 / WHALE SENTINEL · 2.1.1', 19, BLUE, True)
    text(d, (48, 63), title, 41, INK, True)
    text(d, (48, 126), subtitle, 22, MUTED)
    return im, d


def card(d, box, fill='white', radius=20):
    x1, y1, x2, y2 = box
    d.rounded_rectangle((x1 + 4, y1 + 5, x2 + 4, y2 + 5), radius, fill='#D7D9E2')
    d.rounded_rectangle(box, radius, fill=fill, outline=INK, width=2)


def arrow(d, start, end, color=BLUE):
    d.line([start, end], fill=color, width=4)
    x, y = end
    pts = [(x, y), (x - 13, y - 8), (x - 13, y + 8)] if x > start[0] else [(x, y), (x - 8, y - 13), (x + 8, y - 13)]
    d.polygon(pts, fill=color)


def mark(d, xy, kind, color=INK):
    x, y = xy
    if kind == 'check':
        d.line([(x, y + 9), (x + 7, y + 16), (x + 22, y)], fill=color, width=4)
    elif kind == 'sound':
        d.polygon([(x, y + 8), (x + 7, y + 8), (x + 15, y + 1), (x + 15, y + 23), (x + 7, y + 16), (x, y + 16)], fill=color)
        d.arc((x + 8, y - 1, x + 31, y + 25), -65, 65, fill=color, width=3)
    elif kind == 'eye':
        d.ellipse((x - 3, y + 3, x + 25, y + 20), outline=color, width=3)
        d.ellipse((x + 7, y + 7, x + 15, y + 15), fill=color)
    elif kind == 'bubble':
        d.rounded_rectangle((x - 2, y, x + 25, y + 20), 6, outline=color, width=3)
        d.line([(x + 4, y + 20), (x + 1, y + 25), (x + 12, y + 20)], fill=color, width=3)
        d.line([(x, y + 24), (x + 24, y)], fill=color, width=3)
    elif kind == 'bell':
        d.arc((x + 2, y - 1, x + 22, y + 19), 180, 360, fill=color, width=3)
        d.line([(x + 2, y + 9), (x + 2, y + 18), (x - 1, y + 21), (x + 25, y + 21), (x + 22, y + 18), (x + 22, y + 9)], fill=color, width=3)
        d.arc((x + 7, y + 18, x + 17, y + 28), 0, 180, fill=color, width=3)
    elif kind == 'close':
        d.line([(x, y), (x + 19, y + 19)], fill=color, width=3)
        d.line([(x + 19, y), (x, y + 19)], fill=color, width=3)
    else:
        d.ellipse((x, y, x + 20, y + 20), outline=color, width=3)


def save(im, name):
    path = OUT / name
    im.save(path, optimize=True)
    print(name, im.size, path.stat().st_size)


# 1. Five-state handbook. Contain the entire approved source canvas, never crop bodies.
im, d = base('表情提醒你，结果由真实会话决定', '坐在工位前的五态整身手记 · 素材图解 / 非运行截图；第一版不含阶段切换。', 940)
phases = ['idle', 'running', 'waiting', 'done', 'error']
labels = ['待命', '进行中', '等你回应', '完成', '异常']
meaning = [
    ['无活跃任务', '不表示上一轮成功'],
    ['跟踪阶段与真实待办', '没有待办不编百分比'],
    ['批准 / 选择 / 输入', '点提醒回原会话处理'],
    ['真实结束原因完成', '完整交付在原会话'],
    ['真实异常结束', '手动停止另行标记'],
]
for i, (phase, label) in enumerate(zip(phases, labels)):
    x = 42 + i * 306
    card(d, (x, 196, x + 288, 844))
    d.rounded_rectangle((x + 16, 214, x + 272, 222), 4, fill=COLORS[i])
    sprite = Image.open(ROOT / 'assets' / f'fish-{phase}.png').convert('RGBA')
    sprite.thumbnail((250, 430), Image.Resampling.LANCZOS)
    im.paste(sprite, (x + (288 - sprite.width) // 2, 239 + (430 - sprite.height) // 2), sprite)
    icon = Image.open(ROOT / 'assets' / f'fish-{phase}-icon.png').convert('RGBA')
    icon.thumbnail((48, 48), Image.Resampling.LANCZOS)
    im.paste(icon, (x + 20, 688), icon)
    text(d, (x + 80, 692), label, 27, COLORS[i], True)
    for j, line in enumerate(meaning[i]):
        text(d, (x + 20, 758 + j * 32), line, 20, MUTED)
text(d, (48, 885), '坐在桌前敲键盘 / 举手等待 / 收工与排查 · 展开后站起指向任务 · 保留整身 · 第一版仅幼年，无阶段切换', 23)
save(im, 'state-handbook.png')

# 2. Real task facts, separate display/sound channels, exact short-lived click binding.
im, d = base('从会话事实，到提醒，再回到原会话', '流程示意 / 非运行截图 · 系统已提交、显示回调、导航请求和用户已读分别记录。', 1050)
boxes = [(48, 194, 438, 398), (603, 194, 997, 398), (1162, 194, 1552, 398)]
for box in boxes:
    card(d, box)
for box, title, body in [
    (boxes[0], '01 真实会话', '阶段 / 工具 / 待办 / 等待 / 结束原因；静默或空闲不等于成功。'),
    (boxes[1], '02 后台投影', '增量整理事实；待答优先。断线保留最后状态，不伪装实时。'),
    (boxes[2], '03 角色与面板', '五态整身 + 进度条 + 短摘要。结果默认 3 条，可展开。'),
]:
    x1, y1, x2, _ = box
    text(d, (x1 + 22, y1 + 18), title, 27, INK, True)
    lines(d, (x1 + 22, y1 + 69), body, x2 - x1 - 44, 22)
arrow(d, (443, 292), (598, 292))
arrow(d, (1002, 292), (1157, 292))
arrow(d, (800, 403), (800, 448))
card(d, (48, 454, 1015, 758), '#E9F5FD')
text(d, (72, 474), '系统通知：页面主通道 → Windows 原生备用', 28, INK, True)
text(d, (72, 527), '主通道：认领事件，onshow 才记录显示回调', 24)
text(d, (72, 571), '备用通道：页面报错 / 无回执时尝试原生提交', 24)
text(d, (72, 615), '原生前台去重：可见且聚焦的有效心跳 → 延后重复提醒', 23)
text(d, (72, 659), '失焦 / 最小化 / 心跳过期与真正退出应用分别处理', 23, MUTED)
text(d, (72, 703), '提交成功 ≠ 横幅已显示 ≠ 用户已读', 23, INK, True)
card(d, (1050, 454, 1552, 758), '#E5F7EE')
text(d, (1074, 474), '本地短音：独立开关', 28, INK, True)
for y, body in [(527, '默认关 · 低音量 · 1 秒节流'), (571, '试听 / 启用时交互解锁'), (615, '失败不影响任务或通知'), (659, '滑块仅调 WebAudio'), (703, 'Windows 声音由系统管理')]:
    text(d, (1074, y), body, 23, MUTED if y >= 659 else INK)
card(d, (48, 813, 1552, 993), '#F0ECFC')
text(d, (72, 832), '点任务 / 结果 / 气泡 / 新通知 → 绑定会话 → 请求导航', 29, INK, True)
text(d, (72, 884), '原生点击：插件自有短期协议 → 恢复、最大化、置前；不修改 DSH 核心或 app.asar。', 23)
text(d, (72, 930), '宿主 / 页面须运行；重启、退出、标识过期后旧通知可能失效；Windows 可限制聚焦。', 23, MUTED)
save(im, 'session-flow.png')

# 3. Independent controls and actions. Diagram cards are conceptual, never a mock screenshot.
im, d = base('只关你不需要的那一层', '操作图解 / 非运行截图 · 面板齿轮打开设置；图标按钮有名称提示与无障碍标签。', 1310)
control_rows = [
    ('隐藏角色', '收起立绘 → 右下角恢复钮', '不停止会话；不顺带关闭通知或音效。', '#E9F5FD', 'eye'),
    ('静音气泡', '关闭角色旁文字提醒', '气泡正文可返回对应会话；× 只负责关闭。', '#F0ECFC', 'bubble'),
    ('系统通知', '在应用外也收发系统提醒', '原生提交受权限、勿扰和横幅设置影响；提交不等于已显示。', '#FFF1CB', 'bell'),
    ('前台也通知', '默认关 → 开启后前台也弹', '关着时正看着 DSH 会延后原生提醒，避免重复打扰。', '#FDEAF7', 'bell'),
    ('柔和音效', '默认关闭 → 开启 / 试听', '本地短音，不读取麦克风；页面挂起可能阻止播放。', '#E5F7EE', 'sound'),
    ('提示音音量', '页面音量 5%–50%', '只调页面 WebAudio，系统通知声由 Windows 管理。', '#FFE8EC', 'sound'),
    ('收起 / 展开尺寸', '各 80%–160%，互不影响', '收起改坐姿角色，展开改指向看板的角色；缩小仍保留整身。', '#E8F1FF', 'expand'),
]
for i, (title, body, note, fill, icon) in enumerate(control_rows):
    y = 175 + i * 128
    card(d, (48, y, 1552, y + 112), fill)
    d.rounded_rectangle((70, y + 24, 120, y + 74), 13, fill='white', outline=INK, width=2)
    mark(d, (84, y + 37), icon)
    text(d, (144, y + 24), title, 29, INK, True)
    text(d, (457, y + 20), body, 27, INK, True)
    lines(d, (457, y + 67), note, 1065, 22, MUTED, gap=4)
card(d, (48, 1088, 1552, 1235), 'white')
text(d, (72, 1108), '返回原会话：点条目或气泡正文；最近动态默认 3 条，可展开查看更多', 27, INK, True)
text(d, (72, 1159), '托盘 ≠ 退出：DSH 完全退出后，后台无法继续跟踪。独立开关不是全局静音。', 23, MUTED)
text(d, (72, 1197), '图示只说明交互关系，不代表这张图已通过系统通知、视觉或人耳验收。', 21, MUTED)
save(im, 'controls-guide.png')
