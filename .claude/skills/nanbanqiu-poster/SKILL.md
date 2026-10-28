---
name: nanbanqiu-poster
description: 做南伴球的宣传海报、朋友圈 / 小红书配图、品牌视觉、宣传物料时使用。已有 28 张海报和一套出图流程（marketing/），新设计不用重新摸索品牌、不用通读旧代码。
---

# 南伴球宣传物料（海报）

**先别读旧海报和 lib.py，按下面流程走，一张新海报约 60 行代码、几轮就能定稿。**
成品都在预览站「宣传物料」页（/materials.html，手机能看、能存大图），推送到 main 自动更新。

## 流程
1. `python3 marketing/build.py --list`：看已有海报的编号 · 标题 · 风格 · 创意，**不重复**；想不到方向就看文末「还没做的方向」。
2. 新建 `marketing/posters/pNN_slug.py`（NN 接着最大编号，slug 用连字符，文件名里换成下划线），照下面的模板写 `META` 和 `svg()`。
3. `python3 marketing/build.py --only NN`：出 `img/NN-slug.webp`（1080×1350）、`thumb/`（360×450），登记 `posters.json`，并**自动检查文字**（出画布 / 离边太近 / 互相压住；旋转组里的文字可能误报）。
4. 看图：Read `marketing/img/NN-slug.webp`（一张约 2k token）。多张对比用 `--sheet /tmp/s.jpg`（缩略总览，一次读完）。改数字或文案后重跑 `--only NN`，不要整文件重写。
5. 收尾：`node tests/frontend/site.js`（站点测试，约 15 秒，会核对 posters.json、源文件、图片是否对得上）→ 提交（`marketing/` 整个目录：源文件、posters.json、img、thumb）→ 推送。
6. 给用户高清大图：`python3 marketing/build.py --only NN --hires <用户电脑文件夹>/宣传物料`（PNG 1620×2025，不进仓库，.gitignore 已忽略 png）。电脑文件夹要先用 device_request_folder_access 接上。
7. 进度记录不用为每张海报单独写；posters.json 就是清单。只有品牌规则或流程变了才改本文件。

## 品牌规则
- **颜色**（lib.C）：深绿 deep `#0B3B2A`、green `#176B4D`、mid `#0E5139`；荧光黄绿 lime `#C6EA3D`（球和强调色）；奶油 cream `#F7EBD6`、paper `#F3E6CC`；复古系列才用 orange `#E8643C` / amber `#F2B134`；咖啡色 `#B0582F`。**主调永远是深绿 + 荧光黄绿，球是主角。**
- **字体**：标题衬线 `SERIF`（Noto Serif CJK，粗体 700/900），其余无衬线 `SANS`；英文小标签字距 9、全大写。
- **版式**（1080×1350）：左右边距 80 / 84；左上小标签 `tag()` 在 y=150；标题第一行基线 y≈330（112 号字，行距 ≈1.11 倍）；底部品牌标 `wordmark()` 在 y≈1268（深色底用 `#fff`，浅色底用 `#0B3B2A`）；最后加 `grain()`（浅色底 `light=True`）。留白要足，一张只讲一件事。
- **文案**：短句，口语，温暖，句号收尾，全角标点；标题两行，第二行用强调色；112 号字一行最多 7 字（96 号 8 字）。常见结构：「前半句，后半句。」不夸张，不写没确认的数字、功能承诺、真实球场名。
- **示意内容**：图里出现虚构的时间、人数、距离、热力数据 → `META.demo=True`（页面会打「示意」角标）。产品事实以 `业务规则.md` 为准（7 天窗口、按水平匹配、距离筛选、申请 / 邀约流程等），不要编造功能。
- **不要**：真实照片、真人、别人的商标 / 吉祥物 / 球星 / 赛事标识、有版权的素材。球一律用 lib 画的。

## 模板
```python
from lib import *  # 品牌常量和绘图工具

META = dict(
    id=21, slug='my-idea', title='标题', lines=['前半句，', '后半句。'],
    style=['插画'], tone='深色',           # tone: 深色 / 浅色 / 亮色；style 可多个，例：写实光影 插画 信息图 排版 极简 双关 复古 地域梗 图标构图
    demo=False, concept='一句话说清画面和寓意', use='用在哪、讲哪个功能',
)

def svg():
    random.seed(21)                        # 有随机就必须定种子，重画结果才一致
    body = f'''
<defs><radialGradient id="bg21" cx="50%" cy="40%" r="85%"><stop offset="0" stop-color="#0F4A36"/><stop offset="1" stop-color="#04120C"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg21)"/>
{tag('ENGLISH TAG')}
{headline(META['lines'], y=330, size=112, colors=(C['cream'], C['lime']))}
{ball('a', 540, 800, 200)}
{wordmark(1268, '#fff', sub=False)}
{grain(.18)}'''
    return page(body)
```

## lib 速查（marketing/lib.py）
- `ball(id,cx,cy,r,rot=-22,blur=0)` 写实网球；`seamdisc(cx,cy,r,rot,fill,seam,id)` 扁平球。**id 在同一张里不能重复。**
- `headline(lines,x=80,y=330,size=112,colors=(奶油,黄绿),ls=4,lh=None,anchor='start')` 多行标题；`sub(text,x,y,size,color,op,ls,anchor)` 副标题；`tag(text,x,y,color,rule)` 小标签。
- `wordmark(cy,color,sub=True)` 品牌标；`grain(op,light)` 颗粒；`persp(t,…)` 球场透视；`page(body)` 包成网页。
- **手作质感**：滤镜 `url(#rough)`（大块形状的手绘抖动）、`url(#rough2)`（细线条 / 文字的轻微抖动），套在 `<g>` 上即可；配 `grain(light=True)` 做纸感。21–24 号是例子。
- **月亮和深空**：`moon(id,cx,cy,r,seed,glow)` 写实满月（暗海、环形坑、亮纹、光晕，26–28 号用）；`space(seed,avoid=[(cx,cy,r)],ymax)` 深空渐变 + 银河 + 星点，放最底层。月亮别画成脏灰：月面要亮，光晕要冷白，天空保持深色。
- 滤镜 id 直接用：`url(#bl6)` `#bl14` `#bl28` `#bl60`（高斯模糊，区域已放大，**别自己写滤镜**，否则会出方块边）、`#fuzz`、`#grain`。
- 常量 `W H SERIF SANS C`，以及 `math` `random` 已导入。

## 经验和坑
- 球落在地面要加阴影椭圆（`bl14`），光线方向统一（左上亮、右下暗）。
- 全角逗号后面有一段空白：标题折行用 `lines` 分两行，不要在一行里放逗号再接内容。
- 浅色底 wordmark 颜色 `#0B3B2A`；深绿地面上不要用深色字（6 号清晨球场就踩过）。
- 球和文字别叠在一起：先算好球的上沿 / 下沿再定标题和品牌标位置（1 号、3 号都返工过）。
- 圆环、拱形等几何图形先算坐标再写，别靠试；画完用 `--only` 看图，不要靠想象。
- webp 大图只有 30–80KB，别担心体积；颗粒效果在缩略图里基本看不出，不用调。

## 还没做的方向（想不到做什么时从这里挑）
- ~~赴约率 / 靠谱~~ 已做（22 不鸽）；可再做别的角度，规则见 `业务规则.md` §3.2。
- **万物皆球 / 麻将 / 便利贴** 已做（21 / 23 / 24）；同路子还能做：公交站牌、菜市场、方言梗、套印错位（水平匹配的隐喻）。
- **新手友好**：「新手也能约。」水平分档、同水平匹配，降低门槛。
- **女生 / 安全感**：屏蔽、隐私、群内可见范围（`隐私清单.md`）；文案要克制，不渲染焦虑。
- **墨尔本日常**：电车站、周末市集、海边球场、雨天改期；做成插画系列。
- **邀约**：「约 TA 打球」一天最多 3 个——「认真约一个人。」
- **悉尼扩展**：`地区扩展设计.md`；双城海报（墨尔本 + 悉尼），等上线再做。
- **澳网季**（每年 1 月）：只用通用元素，**不用赛事标识**。
- **其他尺寸**：小红书 3:4（1080×1440）、竖屏故事 9:16、公众号头图 2.35:1 **还没支持**——需要时：`lib.set_size()` + build.py 按 `META.size` 渲染 + site.mjs 物料页的缩略图比例，三处各改一点；别用裁剪 4:5 凑数（标题和品牌标会被切）。
