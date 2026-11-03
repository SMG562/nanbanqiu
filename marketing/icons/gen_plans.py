from helpers import *
import pathlib
SV = lambda body: wrap(body)
def svg_file(p): return pathlib.Path(p).read_text()
# 图标
raise_hand = svg_file('out2/empty_A.svg')
serve = svg_file('out3/mao-no-games.svg')
bell = svg_file('out4/mao-push.svg')
point = SV(fig('p', dict(L=DOWN_L, R=((1.5, .0), (2.05, .02)), legs='stand'), 'smile', look=1, cx=92) + ln('M178 96 l14 6 l-14 6', 2.8))
tx, ty = P(1.5, -.3)
ticket = SV(fig('t', dict(L=DOWN_L, R=((1.5, .3), (1.42, -.05)), legs='stand', tilt=-3), 'happy', cx=96)
            + f'<g transform="translate({tx-4:.1f} {ty-34:.1f}) rotate(10)"><rect x="-22" y="-16" width="52" height="32" rx="6" fill="#fff" stroke="{PEN}" stroke-width="2.4"/>'
            + ln('M-6 -16 v32', 1.6, extra='stroke-dasharray="2 3"') + f'<circle cx="-14" cy="0" r="5" fill="#C6EA3D" stroke="{PEN}" stroke-width="1.6"/>' + ln('M3 -5 h18 M3 5 h12', 2.2, extra='opacity=".6"') + '</g>')
slot = SV(
    f'<rect x="26" y="40" width="168" height="124" rx="16" fill="#fff" stroke="{PEN}" stroke-width="2.6" stroke-dasharray="3 7" stroke-linecap="round"/>'
    + figure3('s', 70, 0, 26, dict(L=DOWN_L, R=((1.55, -.1), (1.34, -1.0)), legs='stand'), 'happy', gy=146).replace('filter="url(#rough2)"', '')
    + ''.join(f'<circle cx="{118+i*26}" cy="116" r="11" fill="none" stroke="{PEN}" stroke-width="2.2" stroke-dasharray="2 5" stroke-linecap="round"/>' for i in range(3))
    + ln('M140 78 h40', 2.6, extra='opacity=".5"') + ln('M140 92 h26', 2.6, extra='opacity=".35"'))

btn = lambda t, k='p': f'<span class="b {k}">{t}</span>'
plans = [
 ('A', '虚线球局卡', '填空心理', slot, '这局空着，小毛先占一个位。', '你发，我第一个报名。', btn('我来发这一局') ,
  '', '空位本身就是邀请：用户看到的不是「没有」，而是一张等他补完的卡。<br>解决：怕没人来。'),
 ('B', '我也想打', '低成本表态', raise_hand, '已经有 3 个人想打这天。', '你也想打？举个手，有人发了马上叫你。', btn('我也想打') + btn('我来发', 's'),
  '<div class="chips"><i>🎾</i><i>🎾</i><i>🎾</i></div>', '把「想打但不想发」的人变成需求信号，别人看到「3 人想打」更敢发。<br>解决：鸡生蛋蛋生鸡。'),
 ('C', '邻近日子', '不留死胡同', point, '这天没有，周六有 5 局。', '看看别的日子？', btn('看周六') + btn('我来发', 's'),
  '<div class="days"><b>周四<br>0</b><b class="on">今天<br>·</b><b>周六<br>5</b><b>周日<br>3</b></div>', '空状态最大的风险是让人觉得「这个 App 没人」。马上展示别的日子有球，社区依然是活的。<br>解决：流失。'),
 ('D', '照老样子', '默认值', ticket, '照上次的来一局？', '周六 8:00 · 常去球场 · 缺 2 人', btn('一键发出') + btn('改一改', 's'),
  '<div class="chips"><u>周六 8:00</u><u>Albert Park</u><u>缺 2</u></div>', '预填上次的时间、球场和人数，发布从「填表」变成「点一下」。<br>解决：发局太麻烦。'),
 ('E', '会心一笑', '情绪降温', serve, '该你发球了。', '今天还没有球局，发一局吧。', btn('发一局'),
  '', '纯情绪：把失落换成一个笑，再轻推一把。最适合当底层默认，也最不依赖数据。<br>解决：失落。'),
 ('F', '替你守着', '留住人', bell, '有人发了，我叫你。', '这天一有球局，第一时间提醒你。', btn('有球局就通知我') + btn('我来发', 's'),
  '', '用户今天没打成，但留下了一个回来的理由。<br>解决：走了就不回来。'),
]
css = '''<style>body{margin:0;background:#F2EEE3;font-family:'Noto Sans CJK SC',sans-serif;padding:22px;display:grid;grid-template-columns:repeat(3,330px);gap:18px}
.c{background:#fff;border-radius:22px;padding:14px 14px 16px;text-align:center;position:relative}
.tag{position:absolute;left:14px;top:12px;font-size:12px;color:#fff;background:#176B4D;border-radius:999px;padding:2px 10px;text-align:left}
.sub0{font-size:11.5px;color:#9ca3af;margin:0}
.c svg{width:170px;height:170px;margin-top:10px}
h3{margin:0;font-size:19px;color:#0B3B2A}p{margin:4px 0 10px;font-size:13px;color:#6b7280}
.b{display:inline-block;border-radius:999px;padding:9px 18px;font-size:14px;margin:0 3px}.p{background:#176B4D;color:#fff}.s{background:#fff;color:#176B4D;border:1.5px solid #176B4D;padding:7.5px 16px}
.chips{margin-bottom:10px}.chips i{font-style:normal;margin:0 3px;font-size:18px}.chips u{text-decoration:none;font-size:12.5px;background:#F1F7E6;color:#2B5A3A;border-radius:8px;padding:4px 9px;margin:0 3px}
.days{display:flex;gap:6px;justify-content:center;margin-bottom:10px}.days b{font-weight:500;font-size:12px;color:#6b7280;background:#F5F5F0;border-radius:10px;padding:6px 10px;line-height:1.4}.days .on{background:#fff;border:1.5px dashed #176B4D;color:#176B4D}
.why{margin-top:12px;font-size:12px;color:#4b5563;background:#FAF7EE;border-radius:10px;padding:8px 10px;text-align:left;line-height:1.5}</style>'''
cards = ''.join(f'<div class="c"><span class="tag">{k} · {n}</span><div style="height:6px"></div>{icon}<h3>{h}</h3><p>{s}</p>{extra}<div>{b}</div><div class="why"><b>{ps}：</b>{why}</div></div>'
                for k, n, ps, icon, h, s, b, extra, why in plans)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width':1080,'height':1000}); pg.set_content(css + cards); pg.screenshot(path='plans.png', full_page=True); br.close()
