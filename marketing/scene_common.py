"""163–166 场景海报的共用背景：晒着太阳的球场围网（虚化）+ 蓝绿场地 + 长凳道具。"""


def fence_court(p, court='#7CC4C6', fence_y=760):
    p.append('<defs><linearGradient id="sky_s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEF0EC"/><stop offset="1" stop-color="#E2E4DE"/></linearGradient>'
             '<pattern id="mesh_s" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="26" height="26" fill="none" stroke="#6E6A66" stroke-width="2.2"/></pattern>'
             '<filter id="dof_s" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>')
    p.append(f'<rect width="1080" height="1350" fill="url(#sky_s)"/>')
    p.append(f'<g filter="url(#dof_s)"><rect width="1080" height="{fence_y}" fill="url(#mesh_s)" opacity=".55"/>'
             + ''.join(f'<rect x="{x}" y="0" width="16" height="{fence_y}" fill="#4A4642"/>' for x in (120, 520, 920))
             + f'<rect y="40" width="1080" height="12" fill="#4A4642"/></g>')
    p.append('<path d="M0 0 L520 0 L0 700Z" fill="#FFFFFF" opacity=".35"/>')
    p.append(f'<rect y="{fence_y}" width="1080" height="{1350 - fence_y}" fill="{court}"/>')
    p.append(f'<path d="M-40 {fence_y + 120} L1120 {fence_y + 90}" stroke="#FFFFFF" stroke-width="8" opacity=".85"/>')


def bench(x, y, w=380):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="26" rx="4" fill="#B8784A"/><rect x="{x}" y="{y + 26}" width="{w}" height="70" fill="#A0663E"/>'
            f'<rect x="{x}" y="{y + 26}" width="{w}" height="6" fill="#8A5634"/>')
