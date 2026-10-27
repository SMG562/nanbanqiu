// 网页端分享球员卡：和分享球局一样，扫码到手机上再发
function saveCard(uid){const u=U(uid),url=profileUrl(u,'webqr');
  openModal(`<div class="m-b"><div class="m-t">分享球员卡</div><p class="m-s">发朋友圈或小红书，让更多球友认识你</p>
  <div class="scw"><div class="scw-pv">${scMini(uid,300)}</div><div class="scw-q"><div class="qr" id="scq"></div><b>手机扫一扫</b><p>打开后保存球员卡<br>发朋友圈或小红书</p></div></div></div>`,'lg');qr($('#scq'),url)}

