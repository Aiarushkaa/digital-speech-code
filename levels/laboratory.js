import * as THREE from 'three';
import {WORLD_CONFIG,baseWorld,finishWorld,box,cylinder,sphere,sign,randomSeed} from './shared.js';
export function createLaboratory() {
  const w=baseWorld(WORLD_CONFIG[3],0x292044,0x7b5ab3);
  for(let i=0;i<18;i++){
    const a=i*2.399,r=13+randomSeed(i+3)*27,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const h=2+randomSeed(i+6)*9;
    const pillar=cylinder(.65,1.05,h,i%3===0?0x6b4a9d:0x344a78,x,h/2,z,6);w.group.add(pillar);
    const orb=sphere(.85,i%2?0xbba0ff:0x65edff,x,h+.8,z,12);orb.material.emissive=orb.material.color.clone();orb.material.emissiveIntensity=.5;w.group.add(orb);
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,r=32,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const machine=box(3.2,4,2.8,0x30304f,x,2,z);w.group.add(machine);w.obstacles.push({x,z,r:1.8});
    const screen=box(2.2,1.7,.1,0x76d4ff,x,2.7,z+1.45);screen.material.emissive=new THREE.Color(0x5198ff);screen.material.emissiveIntensity=.7;w.group.add(screen);
  }
  const helix=new THREE.Group();
  for(let i=0;i<28;i++){const t=i*.48,r=2.1;helix.add(sphere(.22,i%2?0xe9aaff:0x7ae8ff,Math.cos(t)*r,1+i*.27,Math.sin(t)*r,8));}
  helix.position.set(0,0,-12);w.group.add(helix);
  w.group.add(sign('ЛАБОРАТОРИЯ СЛОВ',0,11,-5,'#dbb5ff',5));
  return finishWorld(w,6);
}
