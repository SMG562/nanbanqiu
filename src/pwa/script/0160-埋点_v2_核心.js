document.addEventListener('click',e=>{const b=e.target.closest('[data-fday]');if(!b)return;e.stopPropagation();UI.day=+b.dataset.fday;closeSheet();renderDisc()},true);
