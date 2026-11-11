from lib import *

META = dict(
    id=22, slug='no-ghost', title='不鸽', lines=['说好的球，', '不鸽。'],
    style=['插画', '双关', '手作'], tone='亮色', demo=False,
    concept='鸽子被画上禁止标志：放鸽子 = 爽约；荧光黄绿底配红圈，一眼看懂',
    use='赴约率 / 靠谱搭子（业务规则 §3.2）：来不了提前说',
)


def svg():
    random.seed(22)
    ink, red = '#0B3B2A', '#E5322D'
    cx, cy = 540, 880
    pigeon = f'''
<g filter="url(#rough2)" stroke="{ink}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
  <path d="M{cx+120} {cy+30} L{cx+250} {cy+110} L{cx+200} {cy+10} Z" fill="#6F7F8D"/>
  <path d="M{cx-40} {cy+130} L{cx-50} {cy+185} M{cx+20} {cy+135} L{cx+25} {cy+190}" fill="none" stroke="#E8643C" stroke-width="9"/>
  <ellipse cx="{cx}" cy="{cy}" rx="190" ry="125" transform="rotate(-8 {cx} {cy})" fill="#9AA8B4"/>
  <path d="M{cx-60} {cy-20} C{cx+20} {cy-60} {cx+150} {cy-10} {cx+170} {cy+60} C{cx+80} {cy+90} {cx-20} {cy+60} {cx-60} {cy-20} Z" fill="#7B8C9A"/>
  <circle cx="{cx-150}" cy="{cy-125}" r="78" fill="#9AA8B4"/>
  <ellipse cx="{cx-105}" cy="{cy-60}" rx="52" ry="34" transform="rotate(30 {cx-105} {cy-60})" fill="#5FB58A" stroke="none"/>
  <path d="M{cx-222} {cy-135} L{cx-285} {cy-118} L{cx-224} {cy-100} Z" fill="#F2B134"/>
  <circle cx="{cx-165}" cy="{cy-140}" r="14" fill="#fff" stroke-width="5"/><circle cx="{cx-169}" cy="{cy-140}" r="5" fill="{ink}" stroke="none"/>
</g>'''
    body = f'''
<rect width="{W}" height="{H}" fill="#C6EA3D"/>
<circle cx="150" cy="1180" r="260" fill="#B3D82B"/>
{tag('NO GHOSTING', color=ink, rule=red, op=.8, weight=700)}
{headline(META['lines'], y=330, size=112, colors=(ink, red))}
{sub('来不了，提前说一声。', y=520, size=28, color=ink, op=.8)}
{pigeon}
<g filter="url(#rough)" fill="none" stroke="{red}" stroke-width="44" stroke-linecap="round">
  <circle cx="{cx}" cy="{cy}" r="305"/>
  <path d="M{cx-215} {cy-215} L{cx+215} {cy+215}"/>
</g>
<g transform="translate(930 1090) rotate(14)" filter="url(#rough2)">{seamdisc(0, 0, 78, -22, ink, '#C6EA3D', 'bl')}</g>
{wordmark(1268, ink, sub=False)}
{grain(.2, True)}'''
    return page(body)
