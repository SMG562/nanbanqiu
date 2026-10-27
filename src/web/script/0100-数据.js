  s.badges=BADGES.map(b=>({code:b[0],name:b[1],desc:b[2],glyph:bdgHex(b[3],b[5](s)>=b[4]),mini:bdgMini(b[3]),target:b[4],val:Math.min(b[4],b[5](s)),got:b[5](s)>=b[4]}));
  return s}

// 一人一局只有一行（和 game_participants 的唯一约束一致）：撤回 / 退出只改状态，再次申请 / 加入时复用这一行
function partUpsert(r){const o=PARTS.find(p=>p.game_id===r.game_id&&p.user_id===r.user_id);if(!o){PARTS.push(r);return r}Object.keys(o).forEach(k=>delete o[k]);return Object.assign(o,r)}

