from helpers import *
import pathlib
rd = lambda p: pathlib.Path(p).read_text()
lens = rd('out3/mao-no-results.svg'); serve = rd('out3/mao-no-games.svg')
shrug = wrap(fig('z', dict(L=((-1.55, .78), (-1.82, .26)), R=((1.55, .78), (1.82, .26)), legs='stand'), 'sweat'))
fl = lambda *xs: '<div class="fl">' + ''.join(f'<span>{x}<i>×</i></span>' for x in xs) + '</div>'
sg = lambda ic, t, n, hot=False: f'<div class="sg{" hot" if hot else ""}"><em>{ic}</em><b>{t}</b><small>{n} 局</small><u>›</u></div>'
cards = [
 ('1 距离是瓶颈', fl('5 km', '双打', '周三'), lens, '5 公里内，周三没有双打局。', '放宽一点试试：',
  sg('📍', '放宽到 10 公里', 4, True) + sg('📅', '周四，5 公里内', 2), '<span class="b s">发一局</span>', '只有「距离」放宽就有球局 → 距离排第一。'),
 ('2 水平是瓶颈', fl('10 km', 'NTRP 4.5+', '周三'), lens, '10 公里内，周三没有 4.5 以上的局。', '水平放宽半档，球局就有了：',
  sg('🎚', '放宽到 4.0+', 3, True) + sg('📍', '放宽到 20 公里', 1), '<span class="b s">发一局</span>', '水平只放宽一档，不建议直接「不限」，免得约到差太多的局。'),
 ('3 要放宽两项', fl('5 km', '女生局', 'NTRP 3.5–4.0', '周三'), shrug, '这几个条件凑在一起有点难。', '放宽两项，有 2 局：',
  sg('📍🎾', '距离 10 公里 + 不限类型', 2, True), '<span class="b s">发一局</span>', '单项放宽都是 0 时，才试两项组合；还是 0 就转入下一种。'),
 ('4 附近真的没有', fl('20 km', '周三'), serve, '附近这天还没有球局。', '该你发球了。',
  '', '<span class="b p">发一局</span><span class="b s">有球局就通知我</span>', '放宽到极限仍是 0：不再硬推建议，换成会心一笑 + 发局 + 订阅。'),
]
css = '''<style>body{margin:0;background:#F2EEE3;font-family:'Noto Sans CJK SC',sans-serif;padding:22px;display:grid;grid-template-columns:repeat(4,262px);gap:14px}
.c{background:#fff;border-radius:22px;padding:14px 12px 14px;text-align:center;position:relative}
.tag{display:block;text-align:left;font-size:12px;color:#fff;background:#176B4D;border-radius:999px;padding:2px 10px;width:max-content}
.fl{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin:10px 0 0}.fl span{font-size:11.5px;background:#EEF4E6;color:#2B5A3A;border-radius:999px;padding:3px 8px}.fl i{font-style:normal;opacity:.5;margin-left:4px}
.c svg{width:150px;height:150px}h3{margin:0;font-size:16.5px;color:#0B3B2A;line-height:1.35}p{margin:4px 0 10px;font-size:12.5px;color:#6b7280}
.sg{display:flex;align-items:center;gap:8px;border:1.5px solid #E5E7EB;border-radius:14px;padding:9px 11px;margin:0 0 7px;text-align:left}.sg.hot{border-color:#176B4D;background:#F4FAF0}
.sg em{font-style:normal;font-size:14px}.sg b{flex:1;font-size:13.5px;color:#0B3B2A;font-weight:600}.sg small{font-size:12px;color:#176B4D;background:#fff;border-radius:999px;padding:1px 8px}.sg u{text-decoration:none;color:#9ca3af}
.b{display:inline-block;border-radius:999px;padding:8px 16px;font-size:13.5px;margin:4px 3px 0}.p{background:#176B4D;color:#fff}.s{background:#fff;color:#176B4D;border:1.5px solid #176B4D;padding:6.5px 14px}
.why{margin-top:10px;font-size:11.5px;color:#4b5563;background:#FAF7EE;border-radius:10px;padding:7px 9px;text-align:left;line-height:1.5}
.flow{grid-column:1/-1;background:#fff;border-radius:22px;padding:16px 20px;font-size:13.5px;color:#374151;line-height:1.75}.flow b{color:#0B3B2A}</style>'''
body = ''.join(f'<div class="c"><span class="tag">{t}</span>{fl_}{ic}<h3>{h}</h3><p>{s}</p>{sg_}<div>{b}</div><div class="why">{w}</div></div>' for t, fl_, ic, h, s, sg_, b, w in cards)
flow = '''<div class="flow"><b>怎么判断出现哪一种（一套规则，所有筛选通用）</b><br>
① 回显用户自己的条件（上面那排小标签），告诉他「为什么没有」，不让他怪 App。<br>
② 对每个条件<b>单独放宽一档</b>（距离 5→10→20 km；水平 ±0.5；类型 / 标签→不限；日期→最近有球的日子），数一数各有几局。<br>
③ 只展示<b>真的有球局</b>的前两个，按「球局数多、改动小」排序；同分时顺序：距离 → 日期 → 类型 → 水平（水平最后，体验差的局不推荐）。<br>
④ 单项都是 0，才试<b>放宽两项</b>；两项还是 0，才走「附近真的没有」：发球 + 发一局 + 通知我。<br>
⑤ 有建议时「发一局」是次按钮，没建议时是主按钮；图标跟着状态变（放大镜 / 一摊手 / 发球），不是每次都换。<br>
⑥ 不造假：「想打」人数、「附近有人」这类数字没有真实数据就不显示。</div>'''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width':1160,'height':800}); pg.set_content(css + body + flow); pg.screenshot(path='adaptive.png', full_page=True); br.close()
