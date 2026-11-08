from lib import *
from xia import DEFS, hero, brush_v
from poet import vtext, seal, footer

META = dict(
    id=220, slug='xia-promise', title='一诺千金', lines=['一诺千金'],
    style=['侠气', '夜雨', '守约', '现代版式'], tone='亮色', demo=False,
    concept='夜里下着雨，一盏球场灯把一小块南伴绿球场照亮，雨丝在光里发亮；场边门口站着一个戴斗笠、披红披风的人，背着拍，铁丝网上挂的小牌子写着 20:00。侠气就是守约：说好八点，风雨无阻。',
    use='侠气系列 · 叁；守约 / 不爽约 / 雨天照来',
)


def svg():
    r = random.Random(220)
    p = [f'<defs>{DEFS}<linearGradient id="n220" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F2E33"/><stop offset="1" stop-color="#174A45"/></linearGradient>'
         '<radialGradient id="pool220" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF1C8" stop-opacity=".55"/><stop offset="1" stop-color="#FFF1C8" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="cone220" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1C8" stop-opacity=".55"/><stop offset="1" stop-color="#FFF1C8" stop-opacity=".05"/></linearGradient>'
         '<clipPath id="cc220"><path d="M880 200 L940 200 L1160 1100 L420 1100Z"/></clipPath></defs>',
         '<rect width="1080" height="1350" fill="url(#n220)"/>']
    p.append('<path d="M0 780 H1080 V1350 H0Z" fill="#14403C"/>')
    # 灯杆 + 光锥 + 光池
    p.append('<path d="M910 200 V1000" stroke="#4A5A5E" stroke-width="10"/><rect x="866" y="182" width="88" height="26" rx="5" fill="#E8EEF0"/>')
    p.append('<path d="M880 208 L940 208 L1160 1100 L420 1100Z" fill="url(#cone220)"/>')
    p.append('<ellipse cx="760" cy="1000" rx="420" ry="120" fill="url(#pool220)"/>')
    # 被照亮的球场
    p.append('<path d="M470 900 L1080 900 L1080 1110 L380 1110Z" fill="#2F9A6A"/><path d="M490 912 L1080 912 M420 1096 L1080 1096 M470 912 L400 1096 M820 912 L840 1096 M440 1000 H1080" stroke="#F4EED8" stroke-width="3.4" fill="none" opacity=".9"/>')
    for _ in range(18):
        x, y = r.uniform(420, 1060), r.uniform(920, 1100)
        p.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r.uniform(8, 18):.0f}" ry="3" fill="none" stroke="#FFFFFF" stroke-width="1.4" opacity=".5"/>')
    # 铁丝网 + 门 + 牌子
    p.append('<g stroke="#9FB3AE" stroke-width="1.4" opacity=".55">' + ''.join(f'<path d="M{x} 760 V900"/>' for x in range(380, 1080, 18)) + ''.join(f'<path d="M380 {y} H1080"/>' for y in range(760, 900, 18)) + '</g>')
    p.append('<path d="M380 750 H1080 M380 900 H1080" stroke="#7A8E8A" stroke-width="5"/><path d="M560 750 V900 M660 750 V900" stroke="#7A8E8A" stroke-width="6"/>')
    p.append('<rect x="574" y="770" width="72" height="40" rx="4" fill="#F4EDCF"/>'
             f'<text x="610" y="799" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="22" fill="#C23A2B" style="font-variant-numeric:tabular-nums">20:00</text>')
    # 人 + 倒影
    fig = hero(610, 1020, 1.5, robe='#2B3A3A', cape='#C23A2B', flip=-1, wind=.5, hat='douli')
    p.append(f'<g transform="translate(0 2040) scale(1 -1)" opacity=".25">{fig}</g>')
    p.append(fig)
    # 雨：光里亮，光外暗
    rain = ''.join(f'<path d="M{x:.0f} {y:.0f} l-10 40"/>' for x, y in [(r.uniform(0, 1120), r.uniform(-20, 1200)) for _ in range(200)])
    p.append(f'<g stroke="#9FB3AE" stroke-width="1.4" opacity=".35">{rain}</g>')
    p.append(f'<g clip-path="url(#cc220)" stroke="#FFF6DA" stroke-width="2" opacity=".85">{rain}</g>')
    p.append('<path d="M0 1196 Q300 1176 620 1194 T1080 1188 V1350 H0Z" fill="#0B2A28"/>')
    p.append(brush_v('一诺千金', 150, 210, 118, '#F4EDCF', 1.06, 2))
    p.append(vtext('说好八点风雨无阻', 256, 224, 30, '#9FC9BA', 1.42, 500))
    p.append(seal(127, 740, 46, '南伴'))
    footer(p, '说好八点，我已经在了。', '侠气 · 叁 / 守约', 'A PROMISE IS A PROMISE, RAIN OR NOT', c2='#9FC9BA', c3='#7FA89C')
    return page(''.join(p))
