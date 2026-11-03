// ===== 头像：字母或动物，均以“印”的形式呈现（卡片上可换印型） =====
const onLight=c=>c==='#F4EFE3'?'#3A4252':c;
const ZCOL=ZAVC.map(c=>c[1]);
const sealOf=u=>STYLES[(u.seal_roll||0)%STYLES.length];
const avContent=(u,s)=>u.avatar_kind==='animal'&&LA[u.animal]?animalContent(u.animal,s):letterContent(esc((u.name||'?')[0].toUpperCase()));
// 小头像：和球员卡上的头像用同一套「颜色 + 字母 / 动物」，同一种基础印（白文圆印）；米白色就是米白底、墨色字，不再反转成深色。
// 球员卡上「换一枚印」的纹理（布纹、毛玻璃、飞白……）只在大卡片上出现，小尺寸看不清，也太耗性能。
// 按「人 + 头像设置 + 尺寸」缓存生成好的 SVG：设置一改，键就变，所有地方下次渲染自动是新的。
const AV_CACHE=new Map();
const avStamp=(u,sz)=>{const k=[u.id,u.avatar_kind,u.animal,u.color,(u.name||'?')[0],sz].join('|');let h=AV_CACHE.get(k);
  if(!h){if(AV_CACHE.size>800)AV_CACHE.clear();h=stampSVG(s=>avContent(u,s),u.color,sz,String(u.id)+(u.animal||'')+u.color,'bw-rd');AV_CACHE.set(k,h)}return h};
const avcOf=id=>ZCOL[1+[...String(id)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7)%(ZCOL.length-1)];
const aniOf=id=>{const h=[...String(id)].reduce((h,c)=>(h*37+c.charCodeAt(0))>>>0,11);return h%3?LK[h%LK.length]:null};
// 白文印的字是「镂空」的：在球员卡上透出卡面的颜色。小头像在圆印下垫一层同样的卡面色，看起来和卡片上一模一样
const AV_INK={court:'#0B5844',hard:'#155EB0',clay:'#B33A18',grass:'#47782D',night:'#141B30'};
const av=(u,cls='')=>`<span class="av st${u.color==='#F4EFE3'?' paper':''} ${cls}" style="--avk:${AV_INK[u.card_theme||'court']||AV_INK.court}">${avStamp(u,40)}</span>`;
