from lib import *
from xia import DEFS, hero, brush_v, dots
from poet import vtext, seal, footer

META = dict(
    id=218, slug='xia-fuyi', title='事了拂衣去', lines=['事了拂衣去'],
    style=['侠气', '远景', '落日', '现代版式'], tone='亮色', demo=False,
    concept='李白《侠客行》：事了拂衣去，深藏身与名。落日压在天边，一大片被风吹伏的南伴绿草原；身后一块小球场，球已经捡回筐里；斗笠、红披风、背着球拍的人往落日里走，不回头。侠气在于：打完就走，场子收拾干净。',
    use='侠气系列 · 壹；球品 / 守规矩 / 打完收拾场地',
)


def svg():
    r = random.Random(218)
    p = [f'<defs>{DEFS}<linearGradient id="sky218" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2B25A"/><stop offset=".6" stop-color="#F8D48E"/><stop offset="1" stop-color="#FBE6B4"/></linearGradient>'
         '<linearGradient id="gr218" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FA474"/><stop offset="1" stop-color="#176B4D"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sky218)"/>',
         '<circle cx="800" cy="640" r="190" fill="#F07A2E" opacity=".95"/><circle cx="800" cy="640" r="250" fill="#F59A4A" opacity=".25"/>',
         '<path d="M0 760 L240 730 L480 752 L760 722 L1080 748 V800 H0Z" fill="#6CB890" opacity=".85"/>',
         '<path d="M0 780 Q400 750 1080 776 V1350 H0Z" fill="url(#gr218)"/>']
    # 风吹草：斜向细笔
    for _ in range(260):
        x, y = r.uniform(-20, 1100), r.uniform(800, 1200)
        k = (y - 780) / 420
        p.append(f'<path d="M{x:.0f} {y:.0f} q{18 + 30 * k:.0f} {-10 - 26 * k:.0f} {40 + 50 * k:.0f} {-14 - 30 * k:.0f}" stroke="{r.choice(["#8ED9B0", "#2A8A5E", "#4DB27F", "#0E5139"])}" stroke-width="{1 + 2 * k:.1f}" fill="none" opacity=".7"/>')
    # 身后的小球场 + 球筐
    p.append('<path d="M120 860 L420 860 L470 920 L80 920Z" fill="#2F9A6A"/><path d="M128 864 L412 864 L460 916 L90 916Z M270 864 V916 M104 890 H446" stroke="#F4EED8" stroke-width="2.4" fill="none"/>')
    p.append('<path d="M100 890 V872 H450 V890" stroke="#F4EED8" stroke-width="2" fill="#FFFFFF" fill-opacity=".25"/>')
    p.append('<path d="M470 900 h26 l-4 22 h-18z" fill="#C9A46A"/>' + ''.join(f'<circle cx="{474 + i * 6}" cy="{898 - (i % 2) * 4}" r="4" fill="#DDF35A"/>' for i in range(4)))
    # 侠客：往落日走
    p.append('<path d="M660 1012 Q520 1060 360 1120" stroke="#0E5139" stroke-width="3" stroke-dasharray="4 12" fill="none" opacity=".6"/>')
    p.append(hero(700, 1010, 1.55, robe='#2B3A3A', cape='#C23A2B', flip=1, wind=1.4))
    p.append('<path d="M640 1012 h120" stroke="#0B3B2A" stroke-width="6" opacity=".35" stroke-linecap="round"/>')
    p.append('<path d="M0 1196 Q300 1176 620 1194 T1080 1188 V1350 H0Z" fill="#0E5139"/>')
    # 字
    p.append(brush_v('事了拂衣去', 150, 200, 112, '#2B1E14', 1.06, 3))
    p.append(vtext('深藏身与名', 256, 214, 30, '#6A4A2E', 1.5, 500))
    p.append(seal(236, 470, 40, '南伴'))
    footer(p, '打完就走，球都捡干净了。', '侠气 · 壹 / 李白《侠客行》', 'GAME OVER. BALLS PICKED UP. GONE.', c2='#BFE6CF')
    return page(''.join(p))
