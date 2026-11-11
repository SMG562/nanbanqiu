"""把空状态图标放进真实页面的示意：8 个场景。"""
import pathlib
H = pathlib.Path(__file__).parent
def svg(p, w): return pathlib.Path(H / p).read_text().replace('width="220" height="220"', f'width="{w}" height="{w}"').replace('width="240" height="240"', f'width="{w}" height="{w}"')
G, DG, L = '#176B4D', '#0B3B2A', '#C6EA3D'
def phone(title, body, tab=0, head=None):
    tabs = ''.join(f'<div class="t{" on" if i==tab else ""}"><i></i>{n}</div>' for i, n in enumerate(('球局', '地图', '消息', '我的')))
    return f'<div class="ph"><div class="sb"><b>9:41</b><span>●●● ▮</span></div><div class="hd">{head or title}</div><div class="bd">{body}</div><div class="tb">{tabs}</div><p class="cap">{title}</p></div>'
def empty(icon, h, sub, btn=None, ghost=None, extra=''):
    return (f'<div class="em">{icon}<h3>{h}</h3><p>{sub}</p>{extra}' + (f'<a class="b">{btn}</a>' if btn else '') + (f'<a class="g">{ghost}</a>' if ghost else '') + '</div>')
week = '<div class="wk">' + ''.join(f'<div class="{"d on" if i==2 else "d"}"><small>{w}</small>{n}</div>' for i, (w, n) in enumerate(zip('一二三四五六日', range(2, 9)))) + '</div>'
chips = '<div class="ch"><span>5 km ✕</span><span>3.0–3.5 ✕</span><span>双打 ✕</span></div>'
sug = ('<div class="sg"><div><b>放宽到 10 公里</b><small>多 3 局</small></div><div><b>水平不限</b><small>多 5 局</small></div></div>')
pages = [
 phone('今天没有球局', week + empty(svg('舞台风/stage-no-games.svg', 168), '该你发球了。', '今天还没人发球，你来开个头？', '发一局', '有球局时通知我'), 0),
 phone('筛选后附近没有', chips + empty(svg('舞台风/stage-no-results.svg', 140), '条件有点挑。', '换个说法，或者放宽一点：', None, '发一局', sug), 0),
 phone('我的球局·空', empty(svg('mao-my-empty.svg', 168), '球拍在包里睡着了。', '报名一局，它就醒了。', '去看看球局'), 3, '我的球局'),
 phone('通知·空', empty(svg('舞台风/stage-no-notice.svg', 168), '听着呢。', '有球友报名、球局变动，会第一时间告诉你。'), 2, '通知'),
 phone('加载中', empty(svg('舞台风/stage-loading.svg', 168), '热身中。', '马上就好'), 0),
 phone('报名成功', '<div class="dim"></div><div class="sheet">' + svg('舞台风/stage-joined.svg', 150) + '<h3>位置给你留好了。</h3><p>周六 08:00 · Albert Park 3 号场</p><a class="b">加入球局群</a><a class="g">加到日历</a></div>', 0),
 phone('球局被取消', '<div class="sticker">' + svg('表情包风/meme-rain-cancel.svg', 200) + '</div><div class="info"><b>周六 08:00 · 双打 3.0</b><small>发起人已取消 · 原因：下雨</small></div><a class="b" style="margin:14px 16px">看看别的球局</a>', 0, '球局详情'),
 phone('断网', empty(svg('舞台风/stage-offline.svg', 168), '断线了。', '检查一下网络，再试一次。', '重试'), 0),
]
css = '''body{margin:0;padding:30px;background:#EDEFEA;font-family:"Noto Sans CJK SC",sans-serif;display:grid;grid-template-columns:repeat(4,290px);gap:34px 26px}
.ph{width:290px;height:580px;background:#fff;border-radius:34px;position:relative;overflow:hidden;box-shadow:0 8px 28px #0002;border:6px solid #1c1f1d;box-sizing:content-box;width:278px;height:568px}
.sb{display:flex;justify-content:space-between;padding:12px 20px 4px;font-size:12px;color:#222}.hd{padding:6px 18px 8px;font-size:20px;font-weight:900;color:#0B3B2A}
.bd{height:410px;overflow:hidden;position:relative}.tb{position:absolute;bottom:0;left:0;right:0;height:58px;border-top:1px solid #eee;display:flex;background:#fff}
.t{flex:1;text-align:center;font-size:10px;color:#9aa1a9;padding-top:9px}.t i{display:block;width:20px;height:20px;border-radius:7px;background:#e3e6e3;margin:0 auto 3px}.t.on{color:#0B3B2A;font-weight:700}.t.on i{background:#C6EA3D}
.cap{position:absolute;bottom:-34px;left:0;right:0;text-align:center;font-size:14px;color:#556}
.wk{display:flex;gap:4px;padding:0 12px 6px}.d{flex:1;text-align:center;font-size:15px;font-weight:700;padding:6px 0;border-radius:12px;color:#333}.d small{display:block;font-size:10px;color:#9aa1a9;font-weight:400}.d.on{background:#0B3B2A;color:#fff}.d.on small{color:#C6EA3D}
.em{text-align:center;padding:8px 22px}.em svg{display:block;margin:0 auto}.em h3{margin:2px 0 4px;font-size:19px;color:#0B3B2A}.em p{margin:0 0 14px;font-size:13px;color:#8a919c;line-height:1.5}
.b{display:inline-block;background:#0B3B2A;color:#C6EA3D;font-weight:800;font-size:14px;padding:11px 34px;border-radius:24px}.g{display:block;margin-top:10px;color:#176B4D;font-size:13px;font-weight:600}
.ch{display:flex;gap:6px;padding:2px 14px 0}.ch span{font-size:11px;background:#EEF4E6;color:#176B4D;border-radius:12px;padding:4px 9px}
.sg{display:grid;gap:8px;margin:0 6px 12px}.sg div{display:flex;justify-content:space-between;align-items:center;background:#F5F8F2;border-radius:14px;padding:11px 14px;font-size:13px;color:#0B3B2A}.sg small{color:#fff;background:#176B4D;border-radius:10px;padding:2px 8px;font-size:11px}
.dim{position:absolute;inset:0;background:#0006}.sheet{position:absolute;bottom:0;left:0;right:0;background:#fff;border-radius:24px 24px 0 0;text-align:center;padding:14px 18px 20px}.sheet svg{display:block;margin:0 auto}.sheet h3{margin:0 0 4px;font-size:19px;color:#0B3B2A}.sheet p{margin:0 0 12px;font-size:12px;color:#8a919c}
.sticker{margin:6px auto 0;width:200px}.info{margin:0 16px;padding:12px 14px;background:#F5F8F2;border-radius:14px;font-size:14px;color:#0B3B2A}.info small{display:block;margin-top:3px;color:#8a919c;font-size:12px}'''
html = f'<style>{css}</style>' + ''.join(pages)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1400}, device_scale_factor=1.5); pg.set_content(html); pg.screenshot(path=str(H / '场景页面示意.png'), full_page=True); b.close()
