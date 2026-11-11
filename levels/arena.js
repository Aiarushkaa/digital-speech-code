import * as THREE from 'three';
import {WORLD_CONFIG,baseWorld,finishWorld,box,cylinder,sphere,sign} from './shared.js';
export function createArena() {
  const w=baseWorld(WORLD_CONFIG[4],0x30233b,0xa47d4e);
  for(let i=0;i<32;i++) {const a=i*Math.PI*2/32,x=Math.cos(a)*39,z=Math.sin(a)*39;
    const col=cylinder(.65,.85,6,0x755c6d,x,3,z,10);w.group.add(col);w.obstacles.push({x,z,r:.75});
    const top=sphere(.75,0xffd779,x,6.4,z,12);top.material.emissive=new THREE.Color(0xffb94d);top.material.emissiveIntensity=.9;w.group.add(top);
    if(i%2===0){const banner=box(1.6,4,.1,0x7558a1,x,8.7,z);banner.rotation.y=a;w.group.add(banner);}
  }
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(12+i*8,.15,8,96),new THREE.MeshBasicMaterial({color:i%2?0xd89b69:0xb895d9}));ring.rotation.x=Math.PI/2;ring.position.y=.07;w.group.add(ring);}
  const dais=cylinder(3,3.6,1.1,0x9d794d,0,.55,-11,32);w.group.add(dais);
  const stem=cylinder(.24,.4,1.1,0xffd779,0,2,-11,20);stem.material.metalness=.8;w.group.add(stem);
  const cup=cylinder(1.12,.62,1.18,0xffd779,0,3.03,-11,32);cup.material.metalness=.8;cup.material.roughness=.19;w.group.add(cup);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.12,.12,10,40),new THREE.MeshStandardMaterial({color:0xffe9a6,metalness:.85,roughness:.15}));rim.rotation.x=Math.PI/2;rim.position.set(0,3.64,-11);w.group.add(rim);
  for(const x of [-1.18,1.18]){const handle=new THREE.Mesh(new THREE.TorusGeometry(.58,.13,10,28),new THREE.MeshStandardMaterial({color:0xffd779,metalness:.85,roughness:.2}));handle.position.set(x,3.1,-11);w.group.add(handle);}
  const foot=cylinder(.85,.95,.24,0xffd779,0,1.46,-11,24);w.group.add(foot);
  w.group.add(sign('АРЕНА РЕЧЕВОЙ КУЛЬТУРЫ',0,11,0,'#ffe4a0',5));
  return finishWorld(w,6);
}
