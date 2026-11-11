import * as THREE from 'three';
import {WORLD_CONFIG,baseWorld,finishWorld,box,cylinder,sign,sphere} from './shared.js';
export function createCampus() {
  const w=baseWorld(WORLD_CONFIG[2],0x2c5653,0x76c3b2);
w.positions[5] = [-5, 5];
    const building=box(18,9,10,0xd1c5a7,x,4.5,z);w.group.add(building);w.obstacles.push({x,z,r:6.8});
    const roof=box(20,.8,12,0x264d56,x,9.5,z);w.group.add(roof);
    for(let j=0;j<5;j++){const col=cylinder(.45,.5,6,0xf3e8d3,x-7+j*3.5,3.3,z+5.3);w.group.add(col);}
    const door=box(2.5,3.5,.15,0x314f5b,x,1.75,z+5.15);w.group.add(door);
  }
  for(let i=0;i<10;i++){const a=i*2*Math.PI/10,x=Math.cos(a)*35,z=Math.sin(a)*35;
    const trunk=cylinder(.35,.5,4,0x695e54,x,2,z);w.group.add(trunk);
    for(let j=0;j<3;j++){const canopy=sphere(2.4-j*.35,0x5b9f80,x,4.1+j*1.25,z,12);w.group.add(canopy);}
  }
  for(let i=0;i<6;i++){const x=-30+i*12;const bench=box(3,.25,1,0x8b745b,x,.8,30);w.group.add(bench);}
  w.group.add(sign('АКАДЕМИЧЕСКИЙ КАМПУС',0,10,1,'#c2fff1',4.4));
  return finishWorld(w,6);
}
