"""怎么加入（固定页，每期放最后一张）：三步 + 水平怎么看 + 微信转发用的二维码。"""
from common import *
EXPECT = lambda: ['球局码', 'nanbanqiu.app/g/7Kq2']

def html():
    ink, clay, mute, line = '#0B3B2A', '#C2410C', 'rgba(11,59,42,.6)', 'rgba(11,59,42,.14)'
    steps = [
        ('找到想打的那一局', f'时刻表每行右边有 <b>球局码</b>，比如 <code>7Kq2</code>。'),
        (f'浏览器打开 <code>{SITE}/g/7Kq2</code>', '直接是这一局：时间、球场、水平、还缺几位。不登录也能先看。'),
        ('点「申请加入」', '手机号登录，选好自己的水平。发起人确认后就约上了，有的局可以直接加入。'),
    ]
    st = ''.join(f'<li><i>{i+1}</i><div><b>{a}</b><s>{b}</s></div></li>' for i, (a, b) in enumerate(steps))
    bands = ''.join(f'<div><b>{w}</b><s>UTR {a:.1f}{"–" + format(b, ".1f") if b < 99 else " 以上"}</s></div>' for a, b, w in BANDS)
    return f'''<!doctype html><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}} s{{text-decoration:none}}
body{{width:1080px;height:1440px;overflow:hidden;background:linear-gradient(180deg,#F8EEDA,#F1E2C3);color:{ink};font-family:{SANS};position:relative}}
.grain{{position:absolute;inset:0;opacity:.2;mix-blend-mode:multiply}}
.wrap{{position:absolute;inset:0;padding:88px 84px}}
.tag{{font-size:17px;letter-spacing:9px;opacity:.7;font-weight:500}} .tag+i{{display:block;width:66px;height:3px;background:{clay};margin-top:16px}}
h1{{font-family:{SERIF};font-weight:700;font-size:72px;line-height:88px;letter-spacing:3px;margin-top:30px}} h1 em{{font-style:normal;color:{clay}}}
ol{{list-style:none;margin-top:64px}} li{{display:flex;gap:30px;padding:30px 0;border-top:1px solid {line}}} li:last-child{{border-bottom:1px solid {line}}}
li i{{font-style:normal;font-family:{NUM};font-weight:600;font-size:56px;line-height:1;color:{clay};width:48px}}
li b{{display:block;font-size:31px;font-weight:700}} li s{{display:block;font-size:21px;line-height:1.6;color:{mute};margin-top:10px}}
code{{font-family:{NUM};font-weight:600;color:{clay};letter-spacing:.5px}} li s b{{display:inline;font-size:inherit;color:{ink}}}
h2{{font-family:{SERIF};font-size:27px;margin-top:56px}} h2 s{{font-family:{SANS};font-size:17px;font-weight:400;color:{mute};margin-left:14px}}
.bands{{display:grid;grid-template-columns:repeat(5,1fr);margin-top:20px;border-radius:14px;overflow:hidden}}
.bands div{{padding:18px 0;text-align:center;background:rgba(11,59,42,.06)}} .bands div:nth-child(2n){{background:rgba(11,59,42,.11)}}
.bands b{{display:block;font-size:24px}} .bands s{{display:block;font-family:{NUM};font-size:15px;color:{mute};margin-top:6px}}
h2+.tips{{margin-top:18px}} .tips p{{font-size:20px;color:{mute};margin-top:12px;display:flex;align-items:center;gap:14px}} .tips u{{text-decoration:none;font-size:15px;font-weight:700;background:{ink};color:#C6EA3D;border-radius:6px;padding:4px 10px;letter-spacing:1px}}
.foot{{position:absolute;left:0;right:0;bottom:0;height:190px;background:{ink};color:#F7EBD6;display:flex;align-items:center;gap:26px;padding:0 84px}}
.foot .t{{flex:1}} .foot b{{font-size:24px;display:block}} .foot s{{font-size:17px;opacity:.65;display:block;margin-top:8px}}
.foot .qr{{font-size:12px;text-align:center;opacity:.8}} .foot svg{{display:block;margin-bottom:4px}}
.wm{{font-weight:700;font-size:30px;letter-spacing:9px;text-align:right}} .wm i{{display:block;font-style:normal;font-weight:400;font-size:11px;letter-spacing:5px;opacity:.6;margin-top:4px}}
</style><body>{GRAIN_SVG}<div class="wrap">
<div class="tag">HOW TO JOIN · 南伴球</div><i></i>
<h1>想打哪一局，<br><em>三步就能约上。</em></h1>
<ol>{st}</ol>
<h2>水平怎么看<s>同水平更好打；不确定就选低一档</s></h2>
<div class="bands">{bands}</div>
<h2>小提示</h2><div class="tips"><p><u>新手友好</u>标了这个的局，第一次来也放心。</p><p><u>女生局</u>只有女生能看到和申请，在 App 里找。</p></div></div>
<div class="foot"><div class="t"><b>墨尔本华人网球约局</b><s>{SITE} · 小红书搜「南伴球」</s></div>
<div class="qr">{qr_svg(100, url='https://nanbanqiu.app/melbourne/?source=xhs_join')}微信长按识别</div><div class="wm">南伴球<i>NANBANQIU</i></div></div></body>'''
