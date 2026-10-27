const custHTML=()=>`<div id="cust"><div class="sh-t" style="text-align:center;font-size:17px;font-weight:800;margin:2px 0 12px">个性化球员卡</div>
  <div style="height:${Math.round(430*.8)}px;display:flex;justify-content:center"><div style="transform:scale(.8);transform-origin:top center">${playerCard(ME.id)}</div></div>${cthHTML()}${persHTML()}
  <p class="pm" style="text-align:center;font-size:12px;margin:14px 0 6px">头像可选字母或动物，选动物后可以「换一枚印」</p></div>`;
function openCustom(){openSheet(custHTML(),true)}
function refreshCard(){render();renderMe();const sh=$('#sheet');if(sh.classList.contains('show')&&$('#cust')){const st=sh.scrollTop;sh.innerHTML='<div class="grab"></div>'+custHTML();sh.scrollTop=st}}
