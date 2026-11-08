"""品牌场景系列（167 起）的设计系统：配色 token、网格、字级、落款、行动提示。
60% 暖白/沙色 · 30% 品牌绿系 · 10% 荧光黄绿（只给球和一处行动提示）。光一律从左上来。"""
from lib import SANS

T = dict(
    ink='#1E2A24',        # 正文墨色（带绿，不用纯黑）
    ink2='#5A6A62',
    paper='#F6F2EA', sand='#E6DDCF', sage='#DCE6DD', mist='#EEF2EC',
    g900='#0B3B2A', g700='#176B4D', g600='#2F7A5E', g500='#3E8E6E', g300='#9CC4AE', g100='#D6E8DC',
    lime='#C6EA3D', cream='#F2EADA', blush='#EBC9C1', white='#FAFAF6', wood='#B8865A',
)
M = 84                     # 左右边距
BASE = 8                   # 基线


def frame(p, eyebrow, title, body, cta, idx, dark=False):
    """统一的文字区：左上眉标、左下标题 + 正文 + 行动提示、右下落款 + 系列编号。"""
    fg = T['white'] if dark else T['ink']
    fg2 = '#E4EEE8' if dark else T['ink2']
    p.append(f'<text x="{M}" y="136" font-family="{SANS}" font-weight="500" font-size="15" letter-spacing="5" fill="{T["ink2"]}">{eyebrow}</text>')   # 眉标在浅色天上，一律用墨色
    p.append(f'<text x="{M}" y="1056" font-family="{SANS}" font-weight="300" font-size="60" letter-spacing="1" fill="{fg}">{title}</text>')
    p.append(f'<text x="{M + 2}" y="1108" font-family="{SANS}" font-weight="400" font-size="23" letter-spacing="1" fill="{fg2}">{body}</text>')
    p.append(f'<text x="{M + 2}" y="1178" font-family="{SANS}" font-weight="500" font-size="20" letter-spacing="2" fill="{fg}">{cta}  →</text>')
    p.append(f'<rect x="{M + 2}" y="1190" width="{len(cta) * 22 + 20}" height="4" rx="2" fill="{T["lime"]}"/>')
    p.append(f'<line x1="{M}" y1="1250" x2="{1080 - M}" y2="1250" stroke="{fg2}" stroke-width="1" opacity=".35"/>')
    p.append(f'<text x="{M}" y="1294" font-family="{SANS}" font-weight="500" font-size="15" letter-spacing="4" fill="{fg2}">{idx} / 04</text>')
    p.append(f'<circle cx="{1080 - M - 146}" cy="1284" r="9" fill="{T["lime"]}"/><circle cx="{1080 - M - 130}" cy="1294" r="6" fill="{T["lime"]}" stroke="{T["paper"] if not dark else T["g700"]}" stroke-width="2"/>'
             f'<text x="{1080 - M}" y="1300" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="28" letter-spacing="8" fill="{fg}">南伴球</text>')


def court_bg(p, fence_y=760, court=None):
    """品牌绿系球场：远处浅鼠尾草色天、虚化的深绿围网、品牌绿场地 + 白线。"""
    court = court or T['g600']
    p.append('<defs><linearGradient id="sk_s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3F5EF"/><stop offset="1" stop-color="#E3EBE3"/></linearGradient>'
             '<pattern id="mesh_s2" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="24" fill="none" stroke="#2E4A3E" stroke-width="2"/></pattern>'
             '<filter id="dof_s2" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.6"/></filter>'
             f'<linearGradient id="ct_s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{T["g500"]}"/><stop offset="1" stop-color="{court}"/></linearGradient></defs>')
    p.append('<rect width="1080" height="1350" fill="url(#sk_s2)"/>')
    p.append(f'<g filter="url(#dof_s2)" opacity=".8"><rect width="1080" height="{fence_y}" fill="url(#mesh_s2)" opacity=".45"/>'
             + ''.join(f'<rect x="{x}" y="0" width="14" height="{fence_y}" fill="#1E3A2E"/>' for x in (150, 560, 970))
             + f'<rect y="56" width="1080" height="10" fill="#1E3A2E"/></g>')
    p.append('<path d="M0 0 L560 0 L0 760Z" fill="#FFFDF4" opacity=".4"/>')                                             # 左上来的光
    p.append(f'<rect y="{fence_y}" width="1080" height="{1350 - fence_y}" fill="url(#ct_s2)"/>')
    p.append(f'<path d="M-40 {fence_y + 110} L1120 {fence_y + 84}" stroke="#F4F7F2" stroke-width="7" opacity=".9"/>')


def foot_shadow(cx, y, rx=110):
    return f'<ellipse cx="{cx}" cy="{y}" rx="{rx}" ry="10" fill="#0B2A1E" opacity=".28" filter="url(#bl6)"/>'
