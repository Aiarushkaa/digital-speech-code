import * as THREE from 'three';

export const WORLD_CONFIG = [
  { id:'city', name:'Город цифрового общения', short:'Цифровой город', icon:'▥', color:'#6e8dff', sky:0x090e2c, accent:0x738bff, description:'Общайся уважительно. Распознавай сленг и исправляй сообщения.', award:'Значок «Городской дипломат»' },
  { id:'memes', name:'Остров мемов', short:'Остров мемов', icon:'☀', color:'#ffb36b', sky:0x122f45, accent:0xffa85d, description:'Пойми язык мемов и научись выбирать уместный стиль.', award:'Значок «Мемолог»' },
  { id:'campus', name:'Академический кампус', short:'Академический кампус', icon:'▤', color:'#80dec6', sky:0x0d2532, accent:0x80dec6, description:'Проверь орфографию, пунктуацию и официальную речь.', award:'Значок «Академик»' },
  { id:'laboratory', name:'Лаборатория слов', short:'Лаборатория слов', icon:'⬡', color:'#ce91ff', sky:0x1b1034, accent:0xb58cff, description:'Исследуй слова, смыслы, синонимы и точность речи.', award:'Значок «Алхимик слова»' },
  { id:'arena', name:'Арена речевой культуры', short:'Финальная арена', icon:'♛', color:'#ffd779', sky:0x241629, accent:0xffd46f, description:'Прими итоговый вызов цифровой ответственности.', award:'Кубок «Мастер цифровой грамотности»' },
];

export function material(color, metalness=.12, roughness=.65) { return new THREE.MeshStandardMaterial({ color, metalness, roughness }); }
export function mesh(geometry, mat, x=0,y=0,z=0, cast=true) {
  const m = new THREE.Mesh(geometry, mat); m.position.set(x,y,z); m.castShadow=cast; m.receiveShadow=true; return m;
}
export function box(w,h,d,color,x,y,z) { return mesh(new THREE.BoxGeometry(w,h,d),material(color),x,y,z); }
export function cylinder(rt,rb,h,color,x,y,z,segments=12) { return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material(color),x,y,z); }
export function sphere(r,color,x,y,z,segments=16) { return mesh(new THREE.SphereGeometry(r,segments,12),material(color),x,y,z); }
export function glow(color, intensity=1.2, distance=11) { return new THREE.PointLight(color,intensity,distance,2); }
export function sign(text, x,y,z, color='#ffffff', size=3.4) {
  const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=160;
  const c=canvas.getContext('2d'); c.clearRect(0,0,768,160);
  c.font='bold 55px system-ui, Arial'; c.textAlign='center'; c.textBaseline='middle';
  c.shadowColor=color; c.shadowBlur=18; c.fillStyle=color; c.fillText(text,384,82,720);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.position.set(x,y,z); sprite.scale.set(size*3.6,size*.75,1); return sprite;
}
export function baseWorld(config, groundColor, edgeColor) {
  const group=new THREE.Group();
  const ground=cylinder(44,44,1.3,groundColor,0,-.73,0,96); ground.castShadow=false; group.add(ground);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(43.8,.35,8,96),new THREE.MeshStandardMaterial({color:edgeColor,emissive:edgeColor,emissiveIntensity:.55,metalness:.55})); rim.rotation.x=Math.PI/2; rim.position.y=-.02; group.add(rim);
  const disc=cylinder(8,8,.12,edgeColor,0,.02,0,48); disc.material.emissive=new THREE.Color(edgeColor); disc.material.emissiveIntensity=.12; group.add(disc);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(6.6,.09,6,64),new THREE.MeshBasicMaterial({color:config.accent})); ring.rotation.x=Math.PI/2;ring.position.y=.12;group.add(ring);
  const paths=[];
  for(let i=0;i<8;i++) {const a=i*Math.PI/4; const p=box(2.7,.04,32,edgeColor,Math.sin(a)*15,.025,Math.cos(a)*15); p.rotation.y=a; p.material.transparent=true;p.material.opacity=.13;group.add(p);paths.push(p);}
  const obstacles=[];
  const tasks=[]; const coins=[];
  const positions=[[-22,-9],[-15,19],[1,26],[22,13],[24,-13],[-2,-24]];
  return {group, obstacles, tasks, coins, positions, spawn:new THREE.Vector3(0,0,8), radius:42, config};
}
export function addTaskNodes(world, count) {
  for(let i=0;i<count;i++) {
    const [x,z]=world.positions[i]; const g=new THREE.Group(); g.position.set(x,0,z);
    const pedestal=cylinder(1.5,1.9,.65,0x16243a,0,.34,0,12);g.add(pedestal);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(1.45,.12,6,24),new THREE.MeshBasicMaterial({color:world.config.accent}));rim.rotation.x=Math.PI/2;rim.position.y=.74;g.add(rim);
    const crystal=mesh(new THREE.OctahedronGeometry(.86,0),new THREE.MeshStandardMaterial({color:world.config.accent,emissive:world.config.accent,emissiveIntensity:.52,metalness:.3,roughness:.18}),0,2.05,0);g.add(crystal);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.16,.8,2.4,16,1,true),new THREE.MeshBasicMaterial({color:world.config.accent,transparent:true,opacity:.11,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=1.65;g.add(beam);
    g.add(sign(`ЗАДАНИЕ ${String(i+1).padStart(2,'0')}`,0,3.65,0,'#ffffff',2.15));
    const light=glow(world.config.accent,.8,8);light.position.y=2.4;g.add(light);
    world.group.add(g);world.tasks.push({group:g,crystal,beam,position:new THREE.Vector3(x,0,z),index:i});
  }
}
export function addPortal(world) {
  const g=new THREE.Group();g.position.set(0,0,-34);
  const frame=new THREE.Mesh(new THREE.TorusGeometry(3.25,.43,14,48),new THREE.MeshStandardMaterial({color:0xdbe5ff,emissive:world.config.accent,emissiveIntensity:.7,metalness:.8,roughness:.18}));frame.position.y=3.6;g.add(frame);
  const inner=new THREE.Mesh(new THREE.CircleGeometry(2.85,48),new THREE.MeshBasicMaterial({color:world.config.accent,transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false}));inner.position.y=3.6;g.add(inner);
  const base=cylinder(4.3,4.6,.5,0x1b2c48,0,.25,0,48);g.add(base);
  g.add(sign('ПОРТАЛ',0,8,0,'#ffffff',2.5));
  const light=glow(world.config.accent,2.2,18);light.position.y=4;g.add(light);
  world.group.add(g);world.portal={group:g,frame,inner,position:new THREE.Vector3(0,0,-34)};
}
export function addCoins(world, count=12) {
  for(let i=0;i<count;i++) {
    const angle=(i*2.39996)+.4;const r=11+(i%4)*6.2;const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    if(Math.hypot(x,z+34)<6) continue;
    const g=new THREE.Group();g.position.set(x,1.35,z);
    const coin=new THREE.Mesh(new THREE.TorusGeometry(.49,.16,8,16),new THREE.MeshStandardMaterial({color:0xffd16c,emissive:0xf9a727,emissiveIntensity:.35,metalness:.7,roughness:.2}));g.add(coin);
    const core=sphere(.28,0xffe2a4,0,0,0);core.material.emissive=new THREE.Color(0xffc85c);core.material.emissiveIntensity=.55;g.add(core);
    world.group.add(g);world.coins.push({group:g,position:new THREE.Vector3(x,0,z),id:`${world.config.id}-${i}`,phase:i*.9});
  }
}
export function addCheckpoint(world) {
  const g=new THREE.Group();g.position.set(0,0,0);
  const c=cylinder(1.5,1.8,.28,0x1d3651,0,.16,0,16);g.add(c);
  const gem=mesh(new THREE.OctahedronGeometry(.62),new THREE.MeshStandardMaterial({color:0x9af4e8,emissive:0x4ef6cf,emissiveIntensity:.75}),0,1.65,0);g.add(gem);
  g.add(sign('КОНТРОЛЬНАЯ ТОЧКА',0,3.15,0,'#a9fff1',2));
  world.group.add(g);world.checkpoint={group:g,gem,position:new THREE.Vector3(0,0,0)};
}
export function finishWorld(world,count) { addTaskNodes(world,count);addPortal(world);addCoins(world);addCheckpoint(world);return world; }
export function randomSeed(i) {const n=Math.sin(i*127.1+78.233)*43758.5453;return n-Math.floor(n);}
