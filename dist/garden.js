/* A tiny planting playground. No libraries, persistence, or external requests. */
'use strict';
const svgNS='http://www.w3.org/2000/svg';
const garden=document.querySelector('#garden-canvas');
const existingPlants=document.querySelector('#existing-plants');
const yourPlants=document.querySelector('#your-plants');
const gardenStatus=document.querySelector('#garden-status');
const cursor=document.querySelector('#plant-cursor');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let seedType='hydrangea';
let sequence=0;
let plantSize='medium';
let plants=[];
const history=[];
const maximumPlants=48;
const sizeFactors={small:.68,medium:1,large:1.4};
const baseSizes={hydrangea:1,bloom:.9,canopy:1,grass:.95};
const seedNames={hydrangea:'Hydrangea',bloom:'Bloom',canopy:'Canopy',grass:'Grass'};
let pointerStroke=null;
let touchStart=null;
let keyboardPoint={x:450,y:350};

function shape(tag,attributes,parent) {
  const element=document.createElementNS(svgNS,tag);
  Object.entries(attributes).forEach(([key,value])=>element.setAttribute(key,value));
  parent.append(element);
  return element;
}

// Plants are original vector drawings: leaves, petals and a few simple shapes.
function makePlant(type,x,y,size,variation,isNew=false) {
  const position=document.createElementNS(svgNS,'g');
  position.setAttribute('transform',`translate(${x} ${y}) scale(${size})`);
  const plant=shape('g',{class:isNew?'plant plant-new':'plant',filter:'url(#plant-shadow)'},position);
  if(type==='hydrangea') {
    // Broad leaves and three rounded heads of tiny four-petal florets.
    // Each floret is one path, keeping a garden full of flowers lightweight.
    for(let i=0;i<5;i++) {
      const leaf=shape('g',{transform:`rotate(${i*72+variation*9})`},plant);
      shape('path',{d:'M0 5C-25 -4 -27 -30 0 -43C26 -30 24 -4 0 5Z',class:'hydrangea-leaf'},leaf);
      shape('path',{d:'M0 3V-34M0 -10 -12 -19M0 -18 12 -28',class:'leaf-vein',fill:'none'},leaf);
    }
    [[-16,-14,.83],[16,-10,.78],[0,14,1]].forEach(([hx,hy,size],j)=>{
      const head=shape('g',{class:'hydrangea-head',transform:`translate(${hx} ${hy}) scale(${size}) rotate(${variation*19+j*23})`},plant);
      shape('circle',{r:21,class:'hydrangea-base'},head);
      for(let i=0;i<13;i++) {
        const ring=i===0?0:i<7?9:17;
        const angle=i*Math.PI/3+(i<7?0:Math.PI/6);
        const floret=shape('g',{transform:`translate(${Math.cos(angle)*ring} ${Math.sin(angle)*ring}) rotate(${i*47}) scale(.54)`},head);
        shape('path',{d:'M0 0C-10 -2 -11 -10 -5 -11C0 -12 3 -6 0 0C2 -10 10 -11 11 -5C12 0 6 3 0 0C10 2 11 10 5 11C0 12 -3 6 0 0C-2 10 -10 11 -11 5C-12 0 -6 -3 0 0Z',class:(i+j+variation)%3===0?'hydrangea-floret hydrangea-lilac':'hydrangea-floret'},floret);
        shape('circle',{r:1.7,class:'hydrangea-heart'},floret);
      }
    });
  } else if(type==='canopy') {
    shape('ellipse',{cx:7,cy:12,rx:45,ry:40,class:'plant-shadow'},plant);
    shape('circle',{cx:0,cy:0,r:43,class:'tree-dark'},plant);
    for(let i=0;i<9;i++) {
      const angle=i*Math.PI*2/9+variation*.3;
      const cx=Math.cos(angle)*24,cy=Math.sin(angle)*24;
      shape('ellipse',{cx,cy,rx:25,ry:21,transform:`rotate(${i*40} ${cx} ${cy})`,class:i%3===0?'tree-light':'tree-medium'},plant);
      shape('path',{d:`M0 0L${cx*1.6} ${cy*1.6}`,class:'leaf-vein',fill:'none'},plant);
    }
    shape('circle',{cx:-7,cy:-6,r:20,class:'tree-light'},plant);
  } else if(type==='grass') {
    for(let i=0;i<11;i++) {
      const angle=i*360/11+variation*17,length=30+(i%3)*9;
      shape('path',{d:`M0 0Q-15 -${length*.5} 0 -${length}Q10 -${length*.5} 0 0Z`,transform:`rotate(${angle})`,class:'grass-blade'},plant);
    }
    shape('circle',{cx:0,cy:0,r:5,class:'tree-dark'},plant);
  } else {
    for(let i=0;i<6;i++) shape('ellipse',{cx:0,cy:-17,rx:10,ry:24,transform:`rotate(${i*60+variation*15})`,class:i%2?'tree-medium':'tree-dark'},plant);
    [[-15,-10,.66],[16,-5,.85],[0,18,.7]].forEach(([bx,by,scale],j)=>{
      const flower=shape('g',{transform:`translate(${bx} ${by}) scale(${scale}) rotate(${variation*30+j*20})`},plant);
      for(let i=0;i<7;i++) shape('ellipse',{cx:0,cy:-12,rx:6.5,ry:12,transform:`rotate(${i*360/7})`,class:(variation+j)%3===0?'petal-pink':'petal'},flower);
      shape('circle',{cx:0,cy:0,r:5.5,class:'flower-heart'},flower);
      shape('circle',{cx:-1,cy:-1,r:2,fill:'#f4efc5'},flower);
    });
  }
  return position;
}

const startingPlants=[
 ['canopy',230,210,1.38],['canopy',355,183,1.05],['canopy',670,216,1.35],
 ['canopy',738,437,1.02],['canopy',299,505,.95],['hydrangea',185,357,.83],
 ['bloom',222,294,.72],['bloom',354,253,.7],['hydrangea',572,479,1],
 ['bloom',632,461,.82],['grass',432,206,.74],['grass',403,519,.85],
 ['grass',211,433,.8],['grass',709,277,.7],['bloom',476,506,.74]
];
startingPlants.forEach(([type,x,y,size],index)=>existingPlants.append(makePlant(type,x,y,size,index)));
document.querySelector('.play-controls').hidden=false;
document.body.classList.add('garden-ready');
garden.setAttribute('tabindex','0');
garden.setAttribute('role','button');
garden.removeAttribute('aria-labelledby');
garden.setAttribute('aria-describedby','keyboard-hint');
const undoButton=document.querySelector('#undo-garden');
const resetButton=document.querySelector('#reset-garden');

function keepInPlot(point) {
  // The oval sits inside the illustrated boundary; plants stay in the garden.
  let dx=(point.x-450)/264,dy=(point.y-348)/164;
  const radius=Math.hypot(dx,dy);
  if(radius>1) {dx/=radius;dy/=radius;}
  return {x:450+dx*264,y:348+dy*164};
}
function scenePoint(event) {
  const point=garden.createSVGPoint();
  point.x=event.clientX;point.y=event.clientY;
  const matrix=garden.getScreenCTM();
  return keepInPlot(matrix?point.matrixTransform(matrix.inverse()):{x:450,y:350});
}
function updateControls(message) {
  document.querySelector('#plant-count').textContent=`${plants.length} / ${maximumPlants}`;
  undoButton.disabled=history.length===0;
  resetButton.disabled=plants.length===0;
  if(message) gardenStatus.textContent=message;
}
function remember(before) {
  history.push(before);
  if(history.length>20) history.shift();
}
function renderPlants() {
  yourPlants.replaceChildren(...plants.map(p=>makePlant(p.type,p.x,p.y,p.size,p.variation)));
}
function addPlant(point,type=seedType,size=baseSizes[type]*sizeFactors[plantSize]) {
  const p={...keepInPlot(point),type,size,variation:sequence++};
  plants.push(p);
  yourPlants.append(makePlant(p.type,p.x,p.y,p.size,p.variation,true));
  if(plants.length>maximumPlants) {plants.shift();yourPlants.firstElementChild.remove();}
  updateControls();
}
function finishStroke() {
  if(!pointerStroke) return;
  remember(pointerStroke.before);
  pointerStroke=null;
  updateControls(`${plants.length} ${plants.length===1?'plant':'plants'}. Undo removes your last planting stroke.`);
}
function plantOnce(point) {
  finishStroke();
  remember(plants.slice());
  addPlant(point);
  updateControls(`${seedNames[seedType]} planted. ${plants.length} of ${maximumPlants} plants.`);
}
function refreshPreview() {
  const size=baseSizes[seedType]*sizeFactors[plantSize];
  const preview=makePlant(seedType,0,0,size,sequence);
  preview.querySelector('.plant').removeAttribute('filter');
  document.querySelector('#cursor-preview').replaceChildren(preview);
  document.querySelector('#cursor-ring').setAttribute('r',Math.max(52,size*55));
  garden.setAttribute('aria-label',`Plant ${plantSize} ${seedNames[seedType].toLowerCase()}. Use arrow keys to move and Enter or Space to plant.`);
}
function showCursor(point) {
  keyboardPoint=point;
  cursor.setAttribute('transform',`translate(${point.x} ${point.y})`);
  cursor.setAttribute('opacity','1');
}
refreshPreview();

garden.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0) return;
  if(event.pointerType==='touch') {
    // Never cancel touch scrolling. Only a stationary tap adds a plant.
    touchStart={id:event.pointerId,x:event.clientX,y:event.clientY};
    return;
  }
  event.preventDefault();
  garden.classList.add('pointer-focus');
  garden.focus({preventScroll:true});
  finishStroke();
  const point=scenePoint(event);
  pointerStroke={id:event.pointerId,before:plants.slice(),last:point};
  garden.setPointerCapture(event.pointerId);
  addPlant(point);
  showCursor(point);
});
garden.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch') {
    if(touchStart&&Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)>10) touchStart=null;
    return;
  }
  const point=scenePoint(event);
  showCursor(point);
  if(!pointerStroke||event.pointerId!==pointerStroke.id) return;
  // Space a stroke by plant size, so a fast gesture still leaves an even trail.
  const spacing=baseSizes[seedType]*sizeFactors[plantSize]*54;
  let distance=Math.hypot(point.x-pointerStroke.last.x,point.y-pointerStroke.last.y);
  while(distance>=spacing) {
    const last=pointerStroke.last;
    const next={x:last.x+(point.x-last.x)*spacing/distance,y:last.y+(point.y-last.y)*spacing/distance};
    addPlant(next);
    pointerStroke.last=next;
    distance=Math.hypot(point.x-next.x,point.y-next.y);
  }
});
garden.addEventListener('pointerup',event=>{
  if(event.pointerType==='touch') {
    if(touchStart&&touchStart.id===event.pointerId&&Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)<=10) plantOnce(scenePoint(event));
    touchStart=null;
    return;
  }
  finishStroke();
  if(garden.hasPointerCapture(event.pointerId)) garden.releasePointerCapture(event.pointerId);
});
garden.addEventListener('pointercancel',()=>{touchStart=null;finishStroke();cursor.setAttribute('opacity','0');});
garden.addEventListener('lostpointercapture',finishStroke);
garden.addEventListener('pointerleave',()=>{if(!pointerStroke) cursor.setAttribute('opacity','0');});
garden.addEventListener('focus',()=>{if(garden.matches(':focus-visible')) showCursor(keyboardPoint);});
garden.addEventListener('blur',()=>cursor.setAttribute('opacity','0'));
document.addEventListener('keydown',()=>garden.classList.remove('pointer-focus'));
garden.addEventListener('keydown',event=>{
  const directions={ArrowLeft:[-28,0],ArrowRight:[28,0],ArrowUp:[0,-28],ArrowDown:[0,28]};
  if(directions[event.key]) {
    event.preventDefault();
    const [x,y]=directions[event.key];
    showCursor(keepInPlot({x:keyboardPoint.x+x,y:keyboardPoint.y+y}));
  } else if(event.key==='Enter'||event.key===' ') {
    event.preventDefault();
    if(!event.repeat) {plantOnce(keyboardPoint);showCursor(keyboardPoint);}
  }
});

document.querySelectorAll('[data-seed]').forEach(button=>button.addEventListener('click',()=>{
  seedType=button.dataset.seed;
  document.querySelectorAll('[data-seed]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
  refreshPreview();
  gardenStatus.textContent=`${seedNames[seedType]} selected. Tap a spot or drag to plant a trail.`;
}));
document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{
  plantSize=button.dataset.size;
  document.querySelectorAll('[data-size]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
  refreshPreview();
  gardenStatus.textContent=`${plantSize[0].toUpperCase()+plantSize.slice(1)} plants selected.`;
}));
undoButton.addEventListener('click',()=>{
  finishStroke();
  if(!history.length) return;
  plants=history.pop();
  renderPlants();
  updateControls(`Last planting undone. ${plants.length} plants remain.`);
});
resetButton.addEventListener('click',()=>{
  pointerStroke=null;touchStart=null;plants=[];history.length=0;sequence=0;
  yourPlants.replaceChildren();
  updateControls('A fresh patch. Choose a plant and start again.');
});
document.querySelector('#surprise-garden').addEventListener('click',()=>{
  finishStroke();
  remember(plants.slice());
  // A loose ring of mixed planting leaves the path and pond easy to read.
  const turn=Math.random()*Math.PI*2;
  for(let i=0;i<12;i++) {
    const angle=turn+i*Math.PI*2/12;
    const type=['hydrangea','bloom','grass','canopy','hydrangea','bloom'][i%6];
    const point={x:450+Math.cos(angle)*(190+Math.random()*28),y:348+Math.sin(angle)*(106+Math.random()*18)};
    addPlant(point,type,baseSizes[type]*(.72+Math.random()*.4));
  }
  updateControls('A mixed border, just for you. Try another, or Undo to go back.');
});
document.querySelector('#light-toggle').addEventListener('click',event=>{
  const dusk=document.body.dataset.light!=='dusk';
  document.body.dataset.light=dusk?'dusk':'day';
  event.currentTarget.setAttribute('aria-pressed',String(dusk));
  event.currentTarget.setAttribute('aria-label',dusk?'Return to daylight':'Turn on evening light');
  document.querySelector('#light-label').textContent=dusk?'Evening':'Daylight';
  gardenStatus.textContent=dusk?'Evening light. Same garden, a different mood.':'Back to daylight.';
});
document.querySelector('#season-toggle').addEventListener('click',event=>{
  const autumn=document.body.dataset.season!=='autumn';
  document.body.dataset.season=autumn?'autumn':'summer';
  event.currentTarget.setAttribute('aria-pressed',String(autumn));
  event.currentTarget.setAttribute('aria-label',autumn?'Switch to summer colours':'Switch to autumn colours');
  document.querySelector('#season-label').textContent=autumn?'Autumn':'Summer';
  gardenStatus.textContent=autumn?'Autumn colours: rust, amber and soft gold.':'Summer colours: leafy greens and soft flowers.';
});

// Real links still work without JavaScript and with modifier-clicks.
document.querySelector('.enter-garden').addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||reducedMotion.matches) return;
  event.preventDefault();
  const destination=event.currentTarget.href;
  document.body.classList.add('is-entering');
  setTimeout(()=>window.location.assign(destination),430);
});
window.addEventListener('pageshow',()=>document.body.classList.remove('is-entering'));
