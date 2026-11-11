// Запуск: node tests/verify.mjs
// Автоматическая проверка целостности файлов и образовательных заданий.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTIONS, TOTAL_QUESTIONS } from '../data/questions.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=[];
const required=['index.html','style.css','game.js','README.md','.nojekyll','levels/shared.js','levels/city.js','levels/memes.js','levels/campus.js','levels/laboratory.js','levels/arena.js','data/questions.js','data/achievements.js'];
for(const file of required)if(!fs.existsSync(path.join(root,file)))fail.push(`Нет файла ${file}`);
const counts={city:5,memes:5,campus:6,laboratory:6,arena:6};
const ids=new Set();
for(const [world,count] of Object.entries(counts)){
  const questions=QUESTIONS[world];
  if(questions?.length!==count)fail.push(`${world}: ожидалось ${count} заданий`);
  for(const q of questions||[]){
    if(ids.has(q.id))fail.push(`Повтор ID ${q.id}`);ids.add(q.id);
    if(!q.id||!q.title||!q.skill||!q.prompt||!q.explanation)fail.push(`Пустое поле в ${q.id}`);
    if(q.options?.length!==4||!Number.isInteger(q.answer)||q.answer<0||q.answer>3)fail.push(`Неверные варианты в ${q.id}`);
    if(new Set(q.options).size!==4)fail.push(`Повтор вариантов в ${q.id}`);
  }
  const code=fs.readFileSync(path.join(root,`levels/${world}.js`),'utf8');
  if(!code.includes(`finishWorld(w,${count})`))fail.push(`${world}: число терминалов не совпадает с заданиями`);
}
if(TOTAL_QUESTIONS!==28)fail.push(`Всего заданий ${TOTAL_QUESTIONS}, ожидалось 28`);
if(ACHIEVEMENTS.length!==10)fail.push(`Достижений ${ACHIEVEMENTS.length}, ожидалось 10`);
for(const file of required.filter(f=>f.endsWith('.js'))){
  const code=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of code.matchAll(/from\s+['"](\.[^'"]+)['"]/g)){
    const target=path.resolve(path.dirname(path.join(root,file)),match[1]);
    if(!fs.existsSync(target))fail.push(`Неразрешённый импорт ${file}: ${match[1]}`);
  }
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const id of ['game-root','hud','ui','minimap','joystick','touch-interact','touch-jump','touch-run'])if(!html.includes(`id="${id}"`))fail.push(`Нет DOM-элемента ${id}`);
if(fail.length){console.error('ОШИБКИ:\n'+fail.join('\n'));process.exitCode=1;}
else console.log(`ПРОВЕРКА ПРОЙДЕНА: ${required.length} основных файлов, ${TOTAL_QUESTIONS} заданий, ${ACHIEVEMENTS.length} достижений, 5 миров, импорты и DOM.`);
