from lib import *
from lin import blob
from cine import DEFS, frame, boards, TOP, BOT

META = dict(
    id=188, slug='cine-after-rain', title='雨停了', lines=['雨停了'],
    style=['电影镜头', '低机位', '倒影', '年代感'], tone='深色', demo=False,
    concept='电影的贴地低机位镜头：雨刚停，镜头贴着湿漉漉的南伴绿场地，远处围网上的八块红牌子很小；近处一大摊积水把它们倒映出来，倒影被一圈涟漪轻轻搅动；前景一颗沾着水珠的球、一支躺在地上的拍，天边云缝里漏下一道光',
    use='雨后 / 等雨停；品牌电影感主视觉',
)


def svg():
    r = random.Random(188)
    HY = 420
    p = [f'<defs>{DEFS}<linearGradient id="sk188" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A6670"/><stop offset=".7" stop-color="#A8B4B4"/><stop offset="1" stop-color="#E8E4D0"/></linearGradient>'
         '<linearGradient id="wet188" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E6E5A"/><stop offset="1" stop-color="#0E2A20"/></linearGradient>'
         '<linearGradient id="pd188" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C8D0CC"/><stop offset="1" stop-color="#6A7A78"/></linearGradient>'
         '<clipPath id="pc188"><ellipse cx="560" cy="820" rx="460" ry="120"/></clipPath></defs>',
         f'<rect y="{TOP}" width="1080" height="{HY - TOP}" fill="url(#sk188)"/>']
    p.append('<path d="M620 120 L760 120 L560 420 L380 420Z" fill="#FFF6D8" opacity=".18"/>')                    # 云缝里漏下的光
    p.append(''.join(blob(r, r.uniform(0, 1080), r.uniform(140, 300), r.uniform(80, 160), r.uniform(26, 50), r.choice(['#4A5660', '#6A7680']), .8) for _ in range(14)))
    p.append('<rect x="200" y="330" width="680" height="80" fill="#C8BFA6"/>' + ''.join(f'<rect x="{216 + c * 48}" y="346" width="24" height="20" fill="#7A9098"/>' for c in range(14)))
    p.append(f'<rect y="{HY - 60}" width="1080" height="60" fill="#3A5040" opacity=".6"/>')
    p.append(f'<rect x="150" y="{HY - 56}" width="780" height="56" fill="#1E2A24" opacity=".35"/>' + ''.join(f'<line x1="{x}" y1="{HY - 60}" x2="{x}" y2="{HY}" stroke="#1E2A24" stroke-width="2"/>' for x in range(150, 931, 48)))
    boards(p, 540, HY - 46, 26)
    p.append(f'<rect y="{HY}" width="1080" height="{BOT - HY}" fill="url(#wet188)"/>')                       # 湿场地，贴地看
    p.append(f'<line x1="0" y1="{HY + 30}" x2="1080" y2="{HY + 30}" stroke="#F4EED8" stroke-width="3" opacity=".6"/>')
    p.append(f'<path d="M540 {HY} L-400 {BOT}" stroke="#F4EED8" stroke-width="10" opacity=".55"/>')
    p.append('<g opacity=".25">' + ''.join(f'<rect x="{r.uniform(0, 1060):.0f}" y="{r.uniform(HY + 40, BOT):.0f}" width="{r.uniform(60, 200):.0f}" height="3" fill="#E8F0EC"/>' for _ in range(30)) + '</g>')
    # 积水：倒映天空和八块红牌子
    pd = ['<rect x="80" y="690" width="960" height="260" fill="url(#pd188)"/>']
    pd.append('<g opacity=".9">')
    pd.append('<rect x="300" y="704" width="560" height="40" fill="#B8B0A0" opacity=".7"/>')                  # 倒影里的教学楼
    bb = []
    boards(bb, 560, 668, 32, mirror=True)
    pd.append(''.join(bb))
    pd.append('</g>')
    for k in range(4):
        pd.append(f'<ellipse cx="640" cy="830" rx="{40 + k * 50}" ry="{8 + k * 10}" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="{.5 - k * .1:.2f}"/>')
    p.append(f'<g clip-path="url(#pc188)">{"".join(pd)}</g>')
    p.append('<ellipse cx="560" cy="820" rx="460" ry="120" fill="none" stroke="#0E2A20" stroke-width="3" opacity=".5"/>')
    # 前景：一支躺着的拍（失焦）、一颗沾着水珠的球（对焦）
    p.append(f'<g filter="url(#dof2_c)"><line x1="40" y1="1110" x2="300" y2="1000" stroke="#2E3438" stroke-width="16" stroke-linecap="round"/><ellipse cx="380" cy="968" rx="110" ry="60" transform="rotate(-22 380 968)" fill="none" stroke="#2E3438" stroke-width="14"/></g>')
    p.append('<ellipse cx="840" cy="1062" rx="70" ry="12" fill="#06140E" opacity=".6"/>')
    p.append('<circle cx="840" cy="1010" r="56" fill="#C6EA3D"/><path d="M800 974 C824 996 824 1024 800 1046" stroke="#F6F8E0" stroke-width="7" fill="none"/><circle cx="858" cy="1028" r="54" fill="#5A7A10" opacity=".25"/>')
    for x, y, rr in [(826, 984, 5), (856, 1000, 4), (842, 1030, 3), (870, 980, 3)]:
        p.append(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="#FFFFFF" opacity=".85"/>')
    frame(p, '第 20 场　·　雨停了', '雨 停 了', '16 : 05', '地还湿着，有人已经把网挂好了。')
    return page(''.join(p))
