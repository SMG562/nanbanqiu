from lib import *

META = dict(
    id=217, slug='daily-games', title='今天的球局（日更模板）', lines=['今天的球局'],
    style=['球局推广', '信息图', '模板'], tone='浅色', demo=True,
    concept='每日球局推广图的标准版式：顶部南伴绿抬头写日期和城市，一句当天的小话；中间一排「球票」，时间最大、球场次之、类型和水平做小胶囊，右边副券只写缺几位；底部是还有几局和扫码入口。数据、球场名都是示意。',
    use='运营每天发小红书 / 朋友圈：让人一眼看到「今天有球、还缺人」；规范见 球局推广图.md',
)

GAMES = [('07:00', '城东公园球场', '单打', '3–4', 1), ('09:30', '河边社区球场', '双打', '4–5', 2), ('14:00', '大学北区球场', '双打', '2.5–3.5', 1),
         ('17:30', '海湾公园球场', '单打', '4.5–5.5', 1), ('19:30', '城北灯光球场', '双打', '3–4', 3)]


def ticket(y, t, place, typ, lv, need):
    x, w, h, sx = 72, 936, 156, 72 + 936 * .74
    return (f'<g filter="url(#tk)"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="#FFFFFF"/></g>'
            f'<clipPath id="tc{y}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22"/></clipPath>'
            f'<rect x="{sx:.0f}" y="{y}" width="{x + w - sx:.0f}" height="{h}" fill="#F4F7EC" clip-path="url(#tc{y})"/>'
            f'<circle cx="{sx:.0f}" cy="{y}" r="13" fill="#F3EFE4"/><circle cx="{sx:.0f}" cy="{y + h}" r="13" fill="#F3EFE4"/>'
            f'<path d="M{sx:.0f} {y + 18} V{y + h - 18}" stroke="#CDD6CC" stroke-width="2.4" stroke-dasharray="8 8"/>'
            f'<text x="{x + 40}" y="{y + 72}" font-family="{SANS}" font-weight="900" font-size="56" fill="#14231B" style="font-variant-numeric:tabular-nums">{t}</text>'
            f'<text x="{x + 250}" y="{y + 66}" font-family="{SANS}" font-weight="700" font-size="34" fill="#14231B">{place}</text>'
            f'<rect x="{x + 250}" y="{y + 88}" width="{58 + len(lv) * 17 + 120}" height="40" rx="20" fill="#EAF4EE"/>'
            f'<text x="{x + 270}" y="{y + 116}" font-family="{SANS}" font-weight="700" font-size="22" fill="#176B4D">{typ}  ·  UTR {lv}</text>'
            f'<circle cx="{sx + 50:.0f}" cy="{y + h / 2:.0f}" r="10" fill="#C6EA3D"/><circle cx="{sx + 50:.0f}" cy="{y + h / 2:.0f}" r="17" fill="none" stroke="#C6EA3D" stroke-width="4" opacity=".4"/>'
            f'<text x="{sx + 80:.0f}" y="{y + h / 2 - 4:.0f}" font-family="{SANS}" font-weight="900" font-size="38" fill="#176B4D">缺 {need}</text>'
            f'<text x="{sx + 82:.0f}" y="{y + h / 2 + 30:.0f}" font-family="{SANS}" font-weight="500" font-size="20" fill="#5B6B60">位球友</text>')


def svg():
    p = ['<defs><filter id="tk" x="-5%" y="-10%" width="110%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0B3B2A" flood-opacity=".10"/></filter></defs>',
         '<rect width="1080" height="1350" fill="#F3EFE4"/>',
         '<path d="M0 0 H1080 V300 Q540 340 0 300Z" fill="#176B4D"/>',
         '<circle cx="960" cy="90" r="150" fill="#1F7A58"/><circle cx="1010" cy="260" r="60" fill="#C6EA3D" opacity=".9"/>'
         '<path d="M962 228 q30 30 10 70 M1058 222 q-26 34 -6 72" stroke="#FFFFFF" stroke-width="5" fill="none" opacity=".85"/>',
         f'<text x="72" y="96" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="4" fill="#C6EA3D">11月9日 周日 · 墨尔本</text>',
         f'<text x="72" y="186" font-family="{SERIF}" font-weight="900" font-size="78" fill="#FFFFFF">今天的球局</text>',
         f'<text x="74" y="248" font-family="{SANS}" font-weight="500" font-size="28" fill="#CFE8DA">春眠不觉晓？早场七点见。</text>']
    for i, g in enumerate(GAMES):
        p.append(ticket(350 + i * 176, *g))
    p.append(f'<text x="72" y="1272" font-family="{SANS}" font-weight="700" font-size="30" fill="#14231B">还有 7 局，按水平和距离筛</text>'
             f'<text x="72" y="1314" font-family="{SANS}" font-weight="500" font-size="22" fill="#5B6B60">扫码打开南伴球 · 申请就能加入</text>')
    p.append('<rect x="880" y="1218" width="112" height="112" rx="14" fill="#FFFFFF" stroke="#CDD6CC" stroke-width="2"/>'
             '<rect x="900" y="1238" width="72" height="72" rx="6" fill="none" stroke="#176B4D" stroke-width="3" stroke-dasharray="6 6"/>'
             f'<text x="936" y="1280" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="16" fill="#176B4D">二维码</text>')
    p.append(f'<g transform="translate(850 1300)"><circle cx="-124" cy="-8" r="9" fill="#C6EA3D"/><circle cx="-108" cy="2" r="6" fill="#C6EA3D" stroke="#176B4D" stroke-width="2"/>'
             f'<text x="0" y="6" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="6" fill="#176B4D">南伴球</text></g>')
    return page(''.join(p))
