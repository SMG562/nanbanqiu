// ===== 球员身份：昵称 + 姓氏首字母（选填）+ 终身编号 =====
const fmtNo=n=>{n=n||0;return n<10000?String(n).padStart(4,'0'):String(n)};   // 后台 9 位；展示至少 4 位，不补多余的 0
const cardName=u=>{const [f,...r]=String(u.name||'').split(' ');const li=(u.last||(r[0]||'')[0]||'').toUpperCase();return f+(li?' '+li+'.':'')};
const profileUrl=(u,ch)=>shareURL(`https://nanbanqiu.app/p/${fmtNo(u.no)}`,ch);
function qrMatrix(text){try{if(window.QRCode){const d=document.createElement('div');const q=new QRCode(d,{text,width:64,height:64,correctLevel:QRCode.CorrectLevel.M});const m=q._oQRCode;if(m){const n=m.getModuleCount(),a=[];for(let y=0;y<n;y++){a.push([]);for(let x=0;x<n;x++)a[y].push(m.isDark(y,x))}return a}}}catch(e){}
  // 离线兜底：装饰性图案（带三个定位角）
  let h=7;for(const c of String(text))h=(h*31+c.charCodeAt(0))>>>0;const n=25,r=()=>(h=(h*1103515245+12345)>>>0)/4294967296,a=[];
  for(let y=0;y<n;y++){a.push([]);for(let x=0;x<n;x++)a[y].push(r()>.52)}return a}
// 二维码融入卡片：无白底，定位角为圆角方框，数据点为圆点，颜色取卡片亮色
function qrSVG(text){const a=qrMatrix(text),n=a.length;const inF=(x,y)=>(x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7);let dots='';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(a[y][x]&&!inF(x,y))dots+=`<circle cx="${x+.5}" cy="${y+.5}" r=".42"/>`;
  const fin=(x,y)=>`<rect x="${x+.5}" y="${y+.5}" width="6" height="6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1"/><rect x="${x+2}" y="${y+2}" width="3" height="3" rx=".9"/>`;
  return `<svg viewBox="-.5 -.5 ${n+1} ${n+1}" fill="currentColor">${fin(0,0)}${fin(n-7,0)}${fin(0,n-7)}${dots}</svg>`}
function drawCardQR(root,u){const el=root&&root.querySelector('.pc-qr');if(!el)return;el.innerHTML=qrSVG(profileUrl(u))}
