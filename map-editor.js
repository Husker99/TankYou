(() => {
  'use strict';
  const $=id=>document.getElementById(id), Maps=window.TankMaps, Campaign=window.TankCampaign;
  const draftKey='tank-you-map-draft-v1',libraryKey='tank-you-maps-v1';
  let draft=Maps.template(),tool='place',source=null,undo=[],redo=[],hooks={},savedId='';
  try{const raw=localStorage.getItem(draftKey);if(raw)draft=Maps.validate(JSON.parse(raw),false);}catch{}
  function message(text,error=false){$('map-editor-message').textContent=text;$('map-editor-message').classList.toggle('error',error);}
  function persist(){try{localStorage.setItem(draftKey,JSON.stringify(draft));}catch{message('Browser storage is unavailable. Export your map to keep a copy.',true);}}
  function library(){try{const value=JSON.parse(localStorage.getItem(libraryKey)||'[]');return Array.isArray(value)?value.filter(v=>typeof v.id==='string'&&v.map).slice(0,100):[];}catch{return [];}}
  function refreshLibrary(){const select=$('map-saved');select.replaceChildren(new Option('Choose a map',''));for(const v of library())select.add(new Option(v.map.name,v.id));select.value=savedId;}
  function remember(before){if(JSON.stringify(before)===JSON.stringify(draft))return;undo.push(before);if(undo.length>60)undo.shift();redo=[];persist();render();}
  function replace(next){const before=structuredClone(draft);draft=Maps.validate(next,false);source=null;savedId='';remember(before);render();}
  function setTool(next){tool=next;source=null;for(const b of document.querySelectorAll('[data-map-tool]'))b.setAttribute('aria-pressed',String(b.dataset.mapTool===tool));$('map-place-options').hidden=tool!=='place';$('map-tool-help').textContent=tool==='connect'?'Choose a starting node, then a node in the next row. Repeat to add paths; click the same pair to remove a path.':tool==='erase'?'Click an encounter to remove it and its connections.':'Place encounters in empty positions. Click an encounter to replace its type.';render();}
  function cell(row,column){
    const id=`${row}-${column}`,existing=draft.nodes.find(n=>n.id===id),before=structuredClone(draft);
    if(tool==='erase'){
      draft.nodes=draft.nodes.filter(n=>n.id!==id);for(const n of draft.nodes)n.next=n.next.filter(next=>next!==id);source=null;
    }else if(tool==='connect'){
      if(!existing){message('Place an encounter here before connecting it.',true);return;}
      if(!source){if(row===draft.rows-1){message('The final row leads to the map exit. Choose an earlier row.',true);return;}source=id;message('Now choose a destination in the next row.');render();return;}
      if(source===id){source=null;render();return;}
      const from=draft.nodes.find(n=>n.id===source);
      if(row!==from.row+1){message('Connections must advance exactly one row.',true);return;}
      if(from.next.includes(id))from.next=from.next.filter(next=>next!==id);
      else if(from.next.length===3){message('A node can have at most three outgoing paths.',true);return;}
      else from.next.push(id);
      message('Connection updated. Choose another destination or click the source to finish.');
    }else{
      const type=$('map-event').value,levelId=type==='combat'?$('map-combat-level').value:'random';
      if(existing)Object.assign(existing,{type,levelId});else draft.nodes.push({id,row,column,type,levelId,next:[]});
      message('Encounter placed. Use Connect to build its route.');
    }
    remember(before);render();
  }
  function render(){
    $('map-name').value=draft.name;$('map-rows').value=draft.rows;
    $('map-undo').disabled=!undo.length;$('map-redo').disabled=!redo.length;
    $('map-combat-options').hidden=$('map-event').value!=='combat';
    const board=$('map-editor-board'),x=c=>135+c*210,y=r=>780-r*644/(draft.rows-1);let edges='';
    board.style.height=`${Math.max(540,draft.rows*66)}px`;
    for(const n of draft.nodes)for(const id of n.next){const to=draft.nodes.find(v=>v.id===id);if(to)edges+=`<path d="M${x(n.column)} ${y(n.row)}L${x(to.column)} ${y(to.row)}" stroke="${source===n.id?'#287bc0':'#68704b'}" stroke-width="3" stroke-dasharray="9 7"/>`;}
    for(const n of draft.nodes)if(n.row===0)edges+=`<path d="M450 864L${x(n.column)} ${y(n.row)}" stroke="#287bc0" stroke-width="3" stroke-dasharray="9 7"/>`;
    for(const n of draft.nodes)if(n.row===draft.rows-1)edges+=`<path d="M${x(n.column)} ${y(n.row)}L450 45" stroke="#68704b" stroke-width="3" stroke-dasharray="9 7"/>`;
    board.innerHTML=`<svg class="campaign-routes" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true">${edges}</svg><span class="campaign-start" style="left:50%;top:96%">START</span><span class="campaign-goal" style="left:50%;top:5%">EXIT</span>`;
    for(let row=0;row<draft.rows;row++){
      const label=document.createElement('span');label.className='map-row-label';label.style.top=`${y(row)/9}%`;label.textContent=`${row+1}`;board.appendChild(label);
      for(let column=0;column<4;column++){
        const n=draft.nodes.find(n=>n.row===row&&n.column===column),button=document.createElement('button');
        button.type='button';button.className='campaign-node map-slot'+(!n?' empty':'')+(source===n?.id?' selected':'');button.style.left=`${x(column)/9}%`;button.style.top=`${y(row)/9}%`;
        if(n){button.innerHTML=Campaign.icon(n.type);button.style.color=['heart','refill'].includes(n.type)?'#be3f2c':n.type==='combat'?'#303a2d':'#237bb5';}else button.textContent='+';
        const name=`Row ${row+1}, position ${column+1}: ${n?Maps.types[n.type]:'Empty'}`;button.setAttribute('aria-label',name);button.title=name+(n?.type==='combat'?` · ${n.levelId==='random'?'Random level':window.TankLevels.builtInLevels[n.levelId].name}`:'');button.onclick=()=>cell(row,column);board.appendChild(button);
      }
    }
  }
  for(const b of document.querySelectorAll('[data-map-tool]'))b.onclick=()=>setTool(b.dataset.mapTool);
  $('map-event').onchange=()=>render();$('map-combat-level').replaceChildren(new Option('Random for this row','random'));
  for(const [id,level]of Object.entries(window.TankLevels.builtInLevels))$('map-combat-level').add(new Option(level.name,id));
  let nameBefore=null;$('map-name').onfocus=()=>{nameBefore=structuredClone(draft);};
  $('map-name').oninput=()=>{draft.name=$('map-name').value;persist();};
  $('map-name').onchange=()=>{draft.name=$('map-name').value;if(nameBefore)remember(nameBefore);nameBefore=null;};
  $('map-resize').onclick=()=>{const rows=Number($('map-rows').value);if(!Number.isInteger(rows)||rows<2||rows>12){message('Choose 2–12 rows.',true);return;}const before=structuredClone(draft);draft.rows=rows;draft.nodes=draft.nodes.filter(n=>n.row<rows);for(const n of draft.nodes)n.next=n.next.filter(id=>draft.nodes.some(v=>v.id===id));source=null;remember(before);render();message('Rows updated. Undo restores any cropped encounters.');};
  $('map-undo').onclick=()=>{if(!undo.length)return;redo.push(structuredClone(draft));draft=undo.pop();source=null;persist();render();};
  $('map-redo').onclick=()=>{if(!redo.length)return;undo.push(structuredClone(draft));draft=redo.pop();source=null;persist();render();};
  $('map-new').onclick=()=>{replace({version:1,kind:'tank-you-map',name:'Untitled Map',rows:8,nodes:[]});message('Place encounters, then connect them from the bottom row to the top.');};
  $('map-template').onclick=()=>{replace(Maps.template());message('Template loaded. Change encounters and paths to make it yours.');};
  $('map-save').onclick=()=>{try{draft.name=$('map-name').value;const map=Maps.validate(draft,false),items=library();if(!savedId)savedId=`map-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;const i=items.findIndex(v=>v.id===savedId),record={id:savedId,map};if(i>=0)items[i]=record;else items.push(record);if(items.length>100)throw Error('Map library is full. Export a copy.');localStorage.setItem(libraryKey,JSON.stringify(items));persist();refreshLibrary();message('Map saved in this browser.');}catch(e){message(e.message,true);}};
  $('map-load').onclick=()=>{const item=library().find(v=>v.id===$('map-saved').value);if(!item){message('Choose a saved map.',true);return;}try{replace(item.map);savedId=item.id;message('Map loaded.');}catch(e){message(e.message,true);}};
  $('map-export').onclick=()=>{try{draft.name=$('map-name').value;const map=Maps.validate(draft);const url=URL.createObjectURL(new Blob([JSON.stringify(map,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=(map.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'campaign-map')+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Map exported.');}catch(e){message(e.message,true);}};
  $('map-import').onclick=()=>$('map-file').click();
  $('map-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('Map files must be smaller than 100 KB.');replace(Maps.validate(JSON.parse(await file.text()),false));message('Map imported.');}catch(error){message(error instanceof SyntaxError?'Invalid JSON. Your draft is unchanged.':error.message,true);}e.target.value='';};
  $('map-play').onclick=()=>{try{draft.name=$('map-name').value;const map=Maps.validate(draft);persist();hooks.onPlay?.(map);}catch(e){message(e.message,true);}};
  $('map-editor-back').onclick=()=>{persist();hooks.onBack?.();};
  window.TankMapEditor={configure(value){hooks=value;},open(){hooks.onOpen?.();refreshLibrary();render();message('Edit the template or start blank. Connect routes from bottom to top.');}};
})();
