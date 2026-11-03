/* ===================== 性别：只用于女生局 =====================
 * 第一次填写立即生效；女生改男生随时可以；男生改女生只能一次（注册时选了男生、之后再改也算这一次）。 */
setGender=function(to){const from=ME.gender;if(from===to)return;if(from==='m'&&to==='f')ME.g_m2f=Date.now();if(from)ME.g_changes=(ME.g_changes||0)+1;ME.gender=to};
const gLocked=()=>ME.gender==='m'&&!!ME.g_m2f;
function gPick(v){if(v==='f'&&gLocked()){toast('已经改过一次，不能再改为女生');return true}
  if(!ME.gender&&v==='m'){setGender('m');GSTEP=null;INV_CLOSE();INV_RENDER();toast('已保存');GNEXT=null;return true}return false}
openGender=function(next){if(next!==undefined)GNEXT=next;const g=ME.gender;
  if(GSTEP){const to=GSTEP,first=!g,L=[];
    if(to==='f'){if(!first)L.push('男生改为女生只能改一次');L.push('冒用女生身份，核实后永久封号')}
    else if(ME.g_m2f)L.push('改为男生后，不能再改回女生');
    INV_OPEN(`<div class="iv"><div class="iv-h" style="display:block"><b style="font-size:17px">${first?`确认你是${to==='f'?'女生':'男生'}？`:`改为${to==='f'?'女生':'男生'}？`}</b></div>
    ${L.length?`<ul class="wrules">${L.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}
    <button class="iv-go" data-sx="gConfirm" data-v="${to}" style="margin-top:14px">确认</button><button class="iv-3" data-sx="gBack" style="width:100%;margin-top:8px">返回</button></div>`);return}
  INV_OPEN(`<div class="iv"><div class="iv-h" style="display:block"><b style="font-size:17px">性别</b><small style="display:block;margin-top:6px">只用于女生局，不会显示在球员卡上${ME.g_flag?' · 账号审核中':''}</small></div>
    <div class="iv-seg" style="margin-top:14px">${[['f','女生'],['m','男生']].map(([k,l])=>`<button data-sx="pickG" data-v="${k}" class="${g===k?'on':''}${k==='f'&&gLocked()?' off':''}">${l}</button>`).join('')}</div>
    ${gLocked()?'<div class="iv-hint">已经改过一次，不能再改为女生</div>':''}
    <button class="iv-3" data-iv="close" style="width:100%;margin-top:12px">${g?'关闭':'暂不填写'}</button></div>`)};

