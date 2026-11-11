import * as THREE from 'three';
import {WORLD_CONFIG,baseWorld,finishWorld,box,cylinder,sign,randomSeed} from './shared.js';
export function createCity() {
  const w=baseWorld(WORLD_CONFIG[0],0x111d35,0x5166b0);
  for(let i=0;i<26;i++) {
    const a=i*Math.PI*2/26,r=37+randomSeed(i)*3; const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)<7&&z<0) continue;
    const h=5+randomSeed(i+40)*13, bw=3+randomSeed(i+21)*3;
    const building=box(bw,h,bw,i%3===0?0x28385c:0x1d2a46,x,h/2,z);w.group.add(building);w.obstacles.push({x,z,r:bw*.62});
    const cap=box(bw+.25,.18,bw+.25,0x536fa6,x,h+.1,z);w.group.add(cap);
    for(let floor=1;floor<h/1.8;floor++)for(let col=-1;col<=1;col++){
      const window=box(.42,.65,.035,((floor+i)%3)?0x68baff:0xffa9d8,x+col*.85,floor*1.65,z+(bw/2)+.025);window.material.emissive=new THREE.Color(window.material.color);window.material.emissiveIntensity=.6;w.group.add(window);
    }
  }
  for(let i=0;i<9;i++) {const a=i*Math.PI*2/9,x=Math.cos(a)*30,z=Math.sin(a)*30;
    const post=cylinder(.12,.2,4.5,0x66799c,x,2.25,z);w.group.add(post);
    const lamp=cylinder(.52,.52,.22,0x9be8ff,x,4.6,z);lamp.material.emissive=new THREE.Color(0x69caff);lamp.material.emissiveIntensity=1.3;w.group.add(lamp);
  }
  w.group.add(sign('ЦИФРОВОЙ ГОРОД',0,10,-6,'#a2b6ff',5));
  return finishWorld(w,5);
}
