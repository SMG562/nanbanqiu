from lib import *
from lin import blob
from people import person
from cine import DEFS, frame, boards, TOP, BOT

META = dict(
    id=187, slug='cine-through-fence', title='隔着铁丝网', lines=['隔着铁丝网'],
    style=['电影镜头', '浅景深', '前景', '年代感'], tone='浅色', demo=False,
    concept='电影的浅景深镜头：镜头贴着球场外的铁丝网，前景的网格巨大、失焦、发暗；焦点越过铁丝网落在夏天午后的南伴绿球场上，两个孩子正在对打，球停在半空；画面左上角一块失焦的红牌子只露出半个「上」字——不用把八个字写全，看的人自己会补上',
    use='品牌电影感主视觉 / 回忆、偷看的视角',
)


def svg():
    r = random.Random(187)
    HY, VX = 560, 540
    p = [f'<defs>{DEFS}<linearGradient id="sk187" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC8E4"/><stop offset="1" stop-color="#E8EEE0"/></linearGradient></defs>',
         f'<rect y="{TOP}" width="1080" height="{HY - TOP}" fill="url(#sk187)"/>']
    p.append('<rect x="160" y="400" width="760" height="140" fill="#EDE4CC"/>' + ''.join(f'<rect x="{180 + c * 52}" y="{418 + rr * 44}" width="28" height="26" fill="#8EB0C0"/>' for c in range(14) for rr in range(2)))
    for x in range(0, 1080, 56):
        p.append(f'<rect x="{x - 2}" y="470" width="4" height="90" fill="#6A4A30"/>' + ''.join(blob(r, x + r.uniform(-6, 6), 440 + r.uniform(-40, 30), 12, 30, r.choice(['#3E7A44', '#2E6A3A', '#4E8A4E']), 1) for _ in range(3)))
    p.append(f'<rect y="{HY}" width="1080" height="{BOT - HY}" fill="#2F6E4E"/>')                              # 场地
    p.append(f'<rect y="{HY}" width="1080" height="{BOT - HY}" fill="#FFFFFF" opacity=".05"/>')
    for u in (-.42, -.34, .34, .42):
        p.append(f'<line x1="{VX + u * 600:.0f}" y1="{HY + 10}" x2="{VX + u * 3600:.0f}" y2="{BOT + 400}" stroke="#F4EED8" stroke-width="4"/>')
    p.append(f'<line x1="{VX - 260}" y1="{HY + 10}" x2="{VX + 260}" y2="{HY + 10}" stroke="#F4EED8" stroke-width="3"/>')
    p.append(f'<line x1="0" y1="760" x2="1080" y2="760" stroke="#F4EED8" stroke-width="4"/><line x1="40" y1="700" x2="1040" y2="700" stroke="#F4EED8" stroke-width="6"/>')
    p.append('<g opacity=".5">' + ''.join(f'<line x1="{x}" y1="700" x2="{x}" y2="728" stroke="#1E2A24" stroke-width="1.4"/>' for x in range(40, 1041, 12)) + '</g>')
    p.append('<rect x="36" y="660" width="8" height="70" fill="#4A4A4A"/><rect x="1036" y="660" width="8" height="70" fill="#4A4A4A"/>')
    p.append('<ellipse cx="380" cy="640" rx="40" ry="6" fill="#0E2A20" opacity=".4"/><ellipse cx="720" cy="900" rx="60" ry="9" fill="#0E2A20" opacity=".4"/>')
    p.append(person(380, 640, .4, 'hold', 1, 1, 0, '#FFFFFF', '#3E5E9A', shoe='#FFFFFF', sleeve='short', hairstyle='pony', racket_hand='fh'))
    p.append(person(720, 900, .7, 'five', -1, 0, 1, '#FFFFFF', '#3E5E9A', shoe='#FFFFFF', sleeve='short', hairstyle='short', racket_hand='fh'))
    p.append('<circle cx="560" cy="560" r="11" fill="#C6EA3D"/>')
    # 前景：失焦的铁丝网（巨大、发暗）
    mesh = ''.join(f'<line x1="{x}" y1="{TOP - 200}" x2="{x + 1200}" y2="{TOP + 1000}" stroke="#1E2A24" stroke-width="9"/><line x1="{x}" y1="{TOP - 200}" x2="{x - 1200}" y2="{TOP + 1000}" stroke="#1E2A24" stroke-width="9"/>' for x in range(-1200, 2400, 150))
    p.append(f'<g filter="url(#dof_c)" opacity=".8">{mesh}</g>')
    p.append(f'<g filter="url(#dof_c)"><rect x="-60" y="{TOP - 40}" width="260" height="290" fill="#C8402E"/><text x="70" y="{TOP + 200}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="230" fill="#F7E9C8">上</text></g>')
    p.append(f'<rect x="1000" y="{TOP}" width="40" height="{BOT - TOP}" fill="#1E2A24" filter="url(#dof_c)" opacity=".9"/>')
    frame(p, '第 12 场　·　隔着铁丝网', '隔 着 铁 丝 网', '15 : 10', '那年夏天，站在网外看了一下午，才敢问能不能一起打。')
    return page(''.join(p))
