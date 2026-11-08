from lib import *
from people import person
from series import T, frame, court_bg, foot_shadow
from scene_common import bench

META = dict(
    id=168, slug='series-meet', title='系列 02 · 有人等你', lines=['周六上午，有人等你。'],
    style=['场景', '设计系统', '品牌色', '插画'], tone='深色', demo=False,
    concept='164 的优化版：场地换成品牌绿、围网换成深绿虚化；两人击掌，一人手里攥着球（全画面唯一的荧光点）；长凳、球包、水壶退到右边；统一的文字区和落款',
    use='用户旅程：约上；按水平匹配、附近 10 公里（业务规则默认距离）',
)


def svg():
    p = []
    court_bg(p, fence_y=740)
    p.append(bench(840, 800, 300))
    p.append(f'<path d="M880 800 C880 754 916 736 952 742 C988 748 1006 774 1002 800Z" fill="{T["g900"]}"/><rect x="1014" y="742" width="26" height="58" rx="9" fill="#9CC8D0"/>')
    p.append(foot_shadow(720, 1004, 230))
    p.append(person(620, 1000, 1.8, 'five', 1, 1, 0, T['white'], T['g900'], skirt=True, sleeve='short', hairstyle='pony'))
    p.append(person(840, 1004, 1.82, 'five', -1, 3, 3, '#B9CDB8', T['cream'], sleeve='short', hairstyle='cap'))
    hx, hy = 620 - 20 * 1.8 + 4, 1000 - 176 * 1.8
    p.append(f'<circle cx="{hx + 10:.0f}" cy="{hy + 4:.0f}" r="13" fill="{T["lime"]}"/>')
    frame(p, 'SATURDAY · 9:00 AM · ALBERT PARK', '周六上午，有人等你。', '按水平找球友，附近 10 公里的球局。', '找一个水平相近的', '02', dark=True)
    return page(''.join(p))
