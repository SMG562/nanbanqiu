// PATCH /api/me { avatar_kind, animal, avatar_color, seal_roll, card_theme }
const cthHTML=()=>`<div class="cth">${CTH.map(t=>`<button data-cth="${t[0]}" class="${(ME.card_theme||'court')===t[0]?'on':''}" style="--x:${t[2]};--y:${t[3]};--z:${t[4]}"><i></i>${t[1]}</button>`).join('')}</div>
  <div class="akind"><button data-akind="letter" class="${ME.avatar_kind!=='animal'?'on':''}">字母</button><button data-akind="animal" class="${ME.avatar_kind==='animal'?'on':''}">动物</button></div>
  ${ME.avatar_kind==='animal'?`<div class="zg">${LK.map(k=>`<button data-an="${k}" title="${LA[k].n}" class="${ME.animal===k?'on':''}">${pickSVG(k,30)}</button>`).join('')}</div><button class="rollb" data-roll="1">换一枚印</button>`:''}
  <div class="avc2">${ZCOL.map(c=>`<button data-avc="${c}" class="${ME.color===c?'on':''}" style="background:${c}"></button>`).join('')}</div>`;
const persHTML=()=>'';

