import * as THREE from 'three';
import {WORLD_CONFIG,baseWorld,finishWorld,box,cylinder,sphere,sign,randomSeed} from './shared.js';
export function createMemes() {
  const w=baseWorld(WORLD_CONFIG[1],0x286b70,0x4ac3b8);
  const ocean=new THREE.Mesh(new THREE.CylinderGeometry(100,100,.35,96),new THREE.MeshStandardMaterial({color:0x0d536b,metalness:.2,roughness:.35}));ocean.position.y=-2;w.group.add(ocean);
  for(let i=0;i<21;i++) {const a=i*2.399,r=13+randomSeed(i)*28,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x,z+34)<6||Math.hypot(x,z)<8)continue;
    const trunk=cylinder(.3,.42,3.8,0x92684c,x,1.9,z,8);trunk.rotation.z=(randomSeed(i+3)-.5)*.22;w.group.add(trunk);w.obstacles.push({x,z,r:.55});
    for(let j=0;j<5;j++){const frond=box(.65,.16,3.9,0x51d0a0,x+Math.cos(j*1.256)*1.4,4.2,z+Math.sin(j*1.256)*1.4);frond.rotation.y=j*1.256;frond.rotation.x=.28;w.group.add(frond);}
  }
  for(let i=0;i<7;i++){const a=i*6.28/7,x=Math.cos(a)*32,z=Math.sin(a)*32;
    const head=sphere(1.55,i%2?0xffd46e:0xff8ba5,x,3,z,24);w.group.add(head);
    const eye1=sphere(.16,0x1c2940,x-.5,3.3,z+1.4),eye2=sphere(.16,0x1c2940,x+.5,3.3,z+1.4);w.group.add(eye1,eye2);
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.52,.11,6,24,Math.PI),new THREE.MeshBasicMaterial({color:0x2a344d}));smile.position.set(x,2.65,z+1.42);smile.rotation.z=Math.PI;w.group.add(smile);
  }
  w.group.add(sign('ОСТРОВ МЕМОВ',0,10,-6,'#ffe0a2',5));
  return finishWorld(w,5);
}
