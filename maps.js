(() => {
  'use strict';
  const Levels=window.TankLevels;
  const types={combat:'Combat',heart:'+1 Heart',refill:'Refill All Hearts',stygian:'Styx',lethe:'Lethe',phleg:'Phleg',ache:'Ache'};
  function validate(input,playable=true){
    if(!input||input.version!==1||input.kind!=='tank-you-map')throw Error('Choose a Tank You roguelike map file.');
    if(typeof input.name!=='string'||!input.name.trim()||input.name.length>60)throw Error('Give the map a name of 1–60 characters.');
    if(!Number.isInteger(input.rows)||input.rows<2||input.rows>12)throw Error('Use 2–12 rows. Maps have four available positions per row.');
    if(!Array.isArray(input.nodes)||input.nodes.length>input.rows*4)throw Error('A row can contain at most four encounters.');
    const ids=new Set();
    const nodes=input.nodes.map(n=>{
      if(!n||!Number.isInteger(n.row)||n.row<0||n.row>=input.rows||!Number.isInteger(n.column)||n.column<0||n.column>3||n.id!==`${n.row}-${n.column}`||ids.has(n.id))throw Error('Each encounter must have its own position inside the map.');
      ids.add(n.id);
      if(!Object.hasOwn(types,n.type))throw Error('Choose a supported encounter type.');
      if(!Array.isArray(n.next)||n.next.length>3||new Set(n.next).size!==n.next.length)throw Error('An encounter can branch to at most three different choices.');
      const levelId=n.type==='combat'?(n.levelId||'random'):'random';
      if(levelId!=='random'&&!Object.hasOwn(Levels.builtInLevels,levelId))throw Error('Choose an existing combat level.');
      return {id:n.id,row:n.row,column:n.column,type:n.type,levelId,next:[...n.next]};
    }).sort((a,b)=>a.row-b.row||a.column-b.column);
    const byId=new Map(nodes.map(n=>[n.id,n]));
    for(const n of nodes)for(const id of n.next)if(!byId.has(id)||byId.get(id).row!==n.row+1)throw Error('Connections must lead to an encounter in the next row.');
    if(playable){
      const starts=nodes.filter(n=>n.row===0),ends=nodes.filter(n=>n.row===input.rows-1);
      if(!starts.length||!ends.length)throw Error('Place an encounter in both the first and last rows.');
      const reached=new Set(starts.map(n=>n.id));
      for(const n of nodes){
        if(n.row<input.rows-1&&!n.next.length)throw Error(`Row ${n.row+1} has a dead end. Connect it to the next row.`);
        if(reached.has(n.id))for(const id of n.next)reached.add(id);
      }
      if(reached.size!==nodes.length)throw Error('Every encounter must be reachable from the first row.');
    }
    return {version:1,kind:'tank-you-map',name:input.name.trim(),rows:input.rows,nodes};
  }
  function compile(input,seed){
    const map=validate(input),levels=Object.keys(Levels.builtInLevels);let a=seed>>>0;
    return map.nodes.map(n=>{a=(Math.imul(a,1664525)+1013904223)>>>0;const low=Math.floor(n.row/map.rows*Math.max(0,levels.length-3));return {...n,next:[...n.next],levelId:n.levelId==='random'?levels[Math.min(levels.length-1,low+a%Math.min(3,levels.length))]:n.levelId,x:135+n.column*210,y:780-n.row*644/(map.rows-1)};});
  }
  function template(){
    const counts=[2,2,3,2,4,3,2,1],links=[[[0],[1]],[[0,1,2],[2]],[[0],[0],[1]],[[0,1,2],[3]],[[0],[1],[1],[2]],[[0],[0,1],[1]],[[0],[0]]];
    const cols=counts.map(count=>Array.from({length:count},(_,c)=>count===1?1:Math.round(c*3/(count-1))));
    return {version:1,kind:'tank-you-map',name:'Untitled Map',rows:8,nodes:counts.flatMap((count,row)=>Array.from({length:count},(_,c)=>({id:`${row}-${cols[row][c]}`,row,column:cols[row][c],type:row===3&&c===1?'refill':row%3===1&&c===0?'heart':row%3===2&&c===1?'stygian':'combat',levelId:'random',next:row===7?[]:links[row][c].map(i=>`${row+1}-${cols[row+1][i]}`)})))};
  }
  window.TankMaps={types,validate,compile,template};
})();
