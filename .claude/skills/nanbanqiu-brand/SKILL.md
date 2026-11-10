---
name: nanbanqiu-brand
description: 用到南伴球 logo / 标志 / 字标时使用：海报落款、封面、周边（T 恤 帽子 贴纸 球罐 毛巾）、名片、头像、App 顶栏、发给厂家的文件。一句话决定用主标志还是衍生标志，一行代码出图，不用重读规范。
---

# 南伴球标志（v1.0，11-10 定稿）

**先别读 logo.py / variants.py / 规范页 HTML。** 下面够用；拿不准再读 `marketing/brand/README.md`（§3 选用表、§2 决策理由）。

## 一句话选型
- **日常海报落款 → `sig-dots`**（点式签名：宽字距「南伴球」+ 两颗分开的纯色球在「伴」「球」上方）。
- **居中构图 / 对称版式 → `sig-dots-c`**（两点在字标正中、「伴」上方）。
- **正式 / 合作 / 公告落款 → `main-sig`**；**封面、启动页 → `main-v`**；**App 顶栏、导航 → `main-h`**；**图标、头像 → `mark`**。
- **周边 → 衍生**：胸口 / 帽子 / 别针 `dots`；吊牌 `h-dots`；长条 `rally`；毛巾 `vertical`；贴纸 `seal` / `badge`；布袋 / 包装纸 `variants.pattern`；压纹刺绣 `outline`；加载 `bounce`。
- 一个画面只放一次标志、只用一种变体。App 图标、商店页、合作文件只用主标志。

## 一行出图（海报脚本里已 `from lib import *`）
```python
{logo()}                                        # 深底日常落款：底部居中，宽 240，字底 y=1290
{logo(on='light')}                              # 浅底（自动变深绿单色）
{logo('main-v', 'dark', 540, 600, 380, 'center')}  # 封面竖式
{logo('dots', 'dark', 860, 200, 90, 'center')}  # 角落小点式
```
签名 `logo(kind, on, x, y, w, anchor)`；on = dark / light / lime / black / white；anchor = bottom（默认）/ center / top / topleft。
**新海报不再用 `wordmark()`**（未转曲、整体左偏约 7 px）。

## 配色铁律
黄绿球只上深底；浅底、黄绿底整个标志深绿单色（`on` 会自动处理）。不拉伸、不旋转、不加描边投影渐变、不换字体、不调换大小球。安全区 = 1 个小球直径。

## 给厂家 / 设计软件
`marketing/brand/svg/nanbanqiu-<组合>-<配色>.svg`（主标志）、`nanbanqiu-variant-<名>-<配色>.svg`（衍生），53 个，全部转曲、透明底。

## 改版
只改 `logo.py` / `variants.py` → `python3 marketing/brand/logo.py`（一条命令重出 SVG + 两个规范页）→ 截图看 → 先把「改了哪个决定、为什么」写进 README §2、用户原话写 §7 → 提交 `marketing/brand/` → 重新发布 Artifact（主标志 HsgcFhsvmiunzDJ6CM9LMH、周边 LDEvpsYawiUcBhFe7KwGrG，同一链接）。新变体登记三处：`variants.py` 函数、`api.KINDS`、README §3。
