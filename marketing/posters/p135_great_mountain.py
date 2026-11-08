from lib import *
from lin import DEFS, blob, ink, glow, poem, seal

META = dict(
    id=135, slug='great-mountain', title='导航都找不到', lines=['这块场，', '导航都找不到。'],
    style=['宋画', '巨嶂山水', '天地', '光亮'], tone='亮色', demo=False,
    concept='借范宽《溪山行旅图》的巨嶂格局：一座大山顶天立地占满画面上半，满身雨点皴，山顶一排小树，一线瀑布挂下来；山脚云气浮动，谷里一块小球场，两个人背着球包走在山路上，前景巨石和松树托住全幅',
    use='远一点、好一点的球场；天地很大，人很小，走着去也开心',
)


def svg():
    r = random.Random(135)
    p = [f'<defs>{DEFS}<linearGradient id="sk135" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFE3C4"/><stop offset="1" stop-color="#F8F1DE"/></linearGradient>'
         '<linearGradient id="mt135" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E7A5C"/><stop offset=".5" stop-color="#8E8E68"/><stop offset="1" stop-color="#C8BC8A"/></linearGradient>'
         '<linearGradient id="sd135" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3E4A3A" stop-opacity=".45"/><stop offset=".5" stop-color="#3E4A3A" stop-opacity="0"/><stop offset="1" stop-color="#3E4A3A" stop-opacity=".35"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk135)"/>', glow(540, 160, 500, 160, '#FFFBEE', .9)]
    m = 'M150 920 C170 760 200 600 250 480 C280 400 320 330 380 280 C420 250 450 236 480 226 C520 214 560 222 600 214 C650 206 700 230 740 280 C790 340 830 440 870 560 C900 660 930 800 940 920Z'
    g = [f'<path d="M-40 920 C20 760 80 640 160 560 C210 520 250 540 290 600 L330 920Z" fill="#A8A88A"/>',
         f'<path d="M1120 920 C1060 740 1000 640 920 580 C880 556 840 580 810 640 L760 920Z" fill="#A4A486"/>',
         f'<clipPath id="mc135"><path d="{m}"/></clipPath>', f'<path d="{m}" fill="url(#mt135)"/>', f'<path d="{m}" fill="url(#sd135)"/>', '<g clip-path="url(#mc135)">']
    for _ in range(1400):                                                                                    # 雨点皴
        x, y = r.uniform(150, 940), r.uniform(230, 880)
        g.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x + r.uniform(-1, 1):.0f}" y2="{y + r.uniform(5, 12):.0f}" stroke="#3A4030" stroke-width="{r.uniform(1.4, 2.6):.1f}" opacity="{r.uniform(.25, .6):.2f}"/>')
    for k in range(9):                                                                                       # 几道主脉
        x = 260 + k * 70 + r.uniform(-20, 20)
        g.append(ink([(x + 40, 300 + abs(k - 4) * 30), (x + r.uniform(-30, 30), 560), (x + r.uniform(-50, 50), 880)], r.uniform(5, 9), '#33392A', .5, (.2, .6)))
    g.append('</g>')
    for i in range(60):                                                                                      # 山顶一排小树
        t = i / 59
        x = 380 + t * 370
        y = 222 + 70 * (2 * t - 1) ** 2 - 4
        g.append(blob(r, x, y - r.uniform(0, 14), r.uniform(6, 10), r.uniform(9, 16), r.choice(['#2A3A2A', '#3A4E36']), .95))
    g.append(ink([(800, 380), (806, 520), (802, 680), (808, 800)], 5, '#FFFFFF', .9, (.05, .1)))           # 瀑布
    p.append('<g filter="url(#paint2)">' + ''.join(g) + '</g>')
    p.append(glow(540, 890, 620, 70, '#FFFFFF', .97, 28))                                                    # 山脚云气
    p.append(glow(300, 940, 300, 40, '#FFFFFF', .9, 14))
    # 谷地、小球场、山路、两个行人
    v = ['<path d="M0 980 C260 940 820 950 1080 970 L1080 1200 L0 1200Z" fill="#B9C48E"/>',
         '<path d="M440 1010 L660 1004 L684 1036 L420 1042Z" fill="#5EA584"/>',
         '<path d="M440 1010 L660 1004 L684 1036 L420 1042Z M430 1026 L672 1020 M551 1007 L552 1039" stroke="#FBF5E6" stroke-width="2.2" fill="none"/>',
         ink([(1080, 1120), (860, 1090), (760, 1060), (690, 1040)], 6, '#EADDB8', .95, (0, .2))]
    for x, y in [(812, 1078), (842, 1086)]:
        v.append(f'<rect x="{x-3}" y="{y-20}" width="7" height="20" rx="3" fill="#FFFFFF"/><circle cx="{x}" cy="{y-24}" r="4.5" fill="#2A2620"/>'
                 f'<rect x="{x+3}" y="{y-22}" width="5" height="14" rx="2" fill="#2E6A4E"/>')
    v.append('<circle cx="560" cy="1024" r="3.2" fill="#C6EA3D"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(v) + '</g>')
    fg = ['<path d="M-20 1200 L-20 980 C40 960 120 990 170 1040 C210 1080 240 1140 250 1200Z" fill="#8A7A52"/>',
          '<path d="M1100 1200 L1100 1000 C1040 990 960 1030 920 1080 C890 1120 880 1160 880 1200Z" fill="#7E7050"/>',
          ink([(-10, 990), (100, 1000), (180, 1060), (240, 1190)], 8, '#2A2A22', .8, (.05, .05)),
          ink([(1090, 1004), (980, 1030), (910, 1100), (884, 1190)], 8, '#2A2A22', .8, (.05, .05))]
    for bx, by, h in [(90, 1000, 300), (150, 1030, 240), (990, 1020, 280)]:                                  # 前景松
        fg.append(ink([(bx, by), (bx + 10, by - h * .5), (bx - 6, by - h)], 12, '#2E2A22', 1, (.05, .4)))
        for k in range(6):
            yy = by - h * (.35 + k * .12)
            for _ in range(5):
                fg.append(blob(r, bx + r.uniform(-50, 50), yy + r.uniform(-12, 12), r.uniform(14, 24), r.uniform(5, 8), r.choice(['#24402E', '#2E5038']), .95, r.uniform(-12, 12)))
    p.append('<g filter="url(#paint2)">' + ''.join(fg) + '</g>')
    txt, xl, yb = poem(META['lines'], 1000, 120, 38, '#3A3428')
    p.append(txt)
    p.append(seal(xl - 38, yb + 32, 28))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
