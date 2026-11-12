import * as THREE from 'three';
import { createCity } from './levels/city.js';
import { createMemes } from './levels/memes.js';
import { createCampus } from './levels/campus.js';
import { createLaboratory } from './levels/laboratory.js';
import { createArena } from './levels/arena.js';
import { WORLD_CONFIG, material, mesh, sphere } from './levels/shared.js';
import { QUESTIONS, TOTAL_QUESTIONS } from './data/questions.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { GameAudio } from './data/audio.js';

const STORAGE_KEY = 'zerde-digital-speech-code-v1';
const $ = id => document.getElementById(id);
const audio = new GameAudio();

let stepTimer = 0;

const factories = [createCity, createMemes, createCampus, createLaboratory, createArena];
const COLORS = ['#69d9d0', '#779dff', '#ffb779', '#e88dbd', '#c4a5ff', '#e9ebf5'];

const DEFAULT = () => ({
  name: '',
  avatar: {
    outfit: 'hoodie',
    hair: 'short',
    color: COLORS[0],
    skin: '#d8a57f'
  },
  score: 0,
  coins: 0,
  xp: 0,
  unlocked: 1,
  currentWorld: 0,
  position: { x: 0, z: 8 },
  completedTasks: {},
  collectedCoins: {},
  completedWorlds: [],
  achievements: [],
  attempts: {},
  stats: {
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0
  },
  checkpoint: { world: 0, x: 0, z: 8 }
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT();

    const obj = JSON.parse(raw);

    if (!obj || typeof obj !== 'object' || !obj.avatar || !obj.completedTasks) {
      return DEFAULT();
    }

    return {
      ...DEFAULT(),
      ...obj,
      stats: { ...DEFAULT().stats, ...obj.stats },
      avatar: { ...DEFAULT().avatar, ...obj.avatar }
    };
  } catch {
    return DEFAULT();
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    notify('Не удалось сохранить прогресс: проверьте настройки браузера.');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function taskKey(i) {
  return `${WORLD_CONFIG[state.currentWorld].id}-${i}`;
}

function doneCount(i) {
  return QUESTIONS[WORLD_CONFIG[i].id].filter(
    (_, j) => state.completedTasks[`${WORLD_CONFIG[i].id}-${j}`]
  ).length;
}

function totalDone() {
  return Object.values(state.completedTasks).filter(Boolean).length;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090e2c);
scene.fog = new THREE.FogExp2(0x090e2c, .009);

const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, .1, 240);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

$('game-root').appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xb9d8ff, 0x24364b, 2.2);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffe5c9, 3);
sun.position.set(-18, 32, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 110;
sun.shadow.bias = -.0002;
scene.add(sun);

let world, avatar, avatarParts = {};
let mode = 'menu';
let currentTask = null;
let lastAnswer = null;
let worldResultPending = false;

let yaw = 0;
let pitch = .34;
let zoom = 12;
let velocityY = 0;
let grounded = true;
let walkTime = 0;
let elapsed = 0;
let saveTick = 0;
let checkpointTriggered = false;

const keys = new Set();
const joystick = { x: 0, y: 0 };

let touchRun = false;
let jumpQueued = false;

const bursts = [];

let toastTimer = null;
let bannerTimer = null;

let previewRenderer = null;
let previewScene = null;
let previewCamera = null;
let previewAvatar = null;

function sound(type) {
  if (type === 'bad') {
    audio.wrong();
  } else if (type === 'coin') {
    audio.coin();
  } else {
    audio.correct();
  }
}

function notify(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.remove('hidden');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    t.classList.add('hidden');
  }, 2700);
}

function burst(position, color = 0x8af2df) {
  for (let i = 0; i < 17; i++) {
    const m = sphere(
      .1 + Math.random() * .09,
      color,
      position.x,
      position.y + 1.5,
      position.z,
      7
    );

    m.material.emissive = new THREE.Color(color);
    m.material.emissiveIntensity = .9;

    scene.add(m);

    bursts.push({
      mesh: m,
      v: new THREE.Vector3(
        (Math.random() - .5) * 7,
        Math.random() * 5 + 1,
        (Math.random() - .5) * 7
      ),
      life: 1
    });
  }
}

function checkAchievements() {
  const award = id => {
    if (!state.achievements.includes(id)) {
      state.achievements.push(id);

      const a = ACHIEVEMENTS.find(v => v.id === id);

      if (a) {
        notify(`Достижение: ${a.name}!`);
        audio.achievement();
        audio.speak(`Новое достижение! ${a.name}`);
      }
    }
  };

  if (totalDone() >= 1) award('first');
  if (totalDone() >= 5) award('five');
  if (totalDone() >= 10) award('ten');
  if (state.coins >= 10) award('coins');
  if (state.stats.bestStreak >= 5) award('perfect');

  for (const w of state.completedWorlds) {
    award(WORLD_CONFIG[w].id);
  }

  save();
}

function makeAvatar() {
  if (avatar) scene.remove(avatar);

  avatar = new THREE.Group();

  avatar.position.set(
    state.position.x || 0,
    0,
    state.position.z ?? 8
  );

  const skin = material(state.avatar.skin);
  const cloth = material(state.avatar.color, .2, .53);
  const dark = material(0x17243b);
  const white = material(0xf0f2ff);

  const torso = mesh(
    new THREE.BoxGeometry(1.18, 1.45, .64),
    cloth,
    0,
    2.05,
    0
  );

  torso.geometry.translate(0, 0, 0);
  avatar.add(torso);

  const neck = mesh(
    new THREE.CylinderGeometry(.17, .17, .24, 10),
    skin,
    0,
    2.9,
    0
  );

  avatar.add(neck);

  const head = mesh(
    new THREE.SphereGeometry(.43, 18, 14),
    skin,
    0,
    3.35,
    0
  );

  head.scale.set(1, .98, .88);
  avatar.add(head);

  for (const x of [-.17, .17]) {
    const eye = sphere(.044, 0x152235, x, 3.4, .37, 8);
    avatar.add(eye);
  }

  const smile = mesh(
    new THREE.BoxGeometry(.15, .026, .02),
    material(0x9b5e55),
    0,
    3.18,
    .38
  );

  avatar.add(smile);

  const hairMat = material(
    state.avatar.hair === 'cap' ? 0x192c47 : 0x20202d
  );

  if (state.avatar.hair === 'cap') {
    const cap = mesh(
      new THREE.SphereGeometry(
        .46,
        16,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      ),
      hairMat,
      0,
      3.54,
      0
    );

    avatar.add(cap);

    avatar.add(
      mesh(
        new THREE.BoxGeometry(.72, .08, .3),
        hairMat,
        0,
        3.57,
        .38
      )
    );
  } else if (state.avatar.hair === 'curly') {
    for (let i = 0; i < 11; i++) {
      const a = i * 2.399;

      avatar.add(
        sphere(
          .17,
          0x25232b,
          Math.cos(a) * .29,
          3.65 + Math.sin(a * .8) * .08,
          Math.sin(a) * .28,
          9
        )
      );
    }
  } else {
    const hair = mesh(
      new THREE.SphereGeometry(
        .445,
        18,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * .48
      ),
      hairMat,
      0,
      3.59,
      0
    );

    avatar.add(hair);
  }

  const arms = [];
  const legs = [];

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();

    arm.position.set(side * .76, 2.64, 0);
    avatar.add(arm);

    arm.add(
      mesh(
        new THREE.BoxGeometry(.35, .92, .39),
        state.avatar.outfit === 'tee' ? skin : cloth,
        0,
        -.45,
        0
      )
    );

    arm.add(
      mesh(
        new THREE.BoxGeometry(.27, .23, .31),
        skin,
        0,
        -1,
        0
      )
    );

    arms.push(arm);

    const leg = new THREE.Group();

    leg.position.set(side * .32, 1.37, 0);
    avatar.add(leg);

    leg.add(
      mesh(
        new THREE.BoxGeometry(.43, 1.08, .48),
        dark,
        0,
        -.53,
        0
      )
    );

    leg.add(
      mesh(
        new THREE.BoxGeometry(.47, .22, .72),
        white,
        0,
        -1.1,
        .1
      )
    );

    legs.push(leg);
  }

  if (state.avatar.outfit === 'jacket') {
    const stripe = mesh(
      new THREE.BoxGeometry(.065, 1.3, .06),
      white,
      0,
      2.08,
      .36
    );

    avatar.add(stripe);

    avatar.add(
      mesh(
        new THREE.BoxGeometry(.14, .16, .07),
        white,
        -.35,
        2.55,
        .36
      )
    );
  } else if (state.avatar.outfit === 'hoodie') {
    const hood = mesh(
      new THREE.TorusGeometry(.38, .14, 8, 20, Math.PI),
      cloth,
      0,
      2.75,
      -.15
    );

    hood.rotation.z = Math.PI;
    avatar.add(hood);

    avatar.add(
      mesh(
        new THREE.BoxGeometry(.45, .19, .09),
        material(0x263956),
        0,
        1.75,
        .36
      )
    );
  } else {
    avatar.add(
      mesh(
        new THREE.BoxGeometry(.34, .12, .06),
        white,
        0,
        2.65,
        .34
      )
    );
  }

  avatarParts = { arms, legs, torso, head };

  scene.add(avatar);
  refreshPreview();
}

function refreshPreview() {
  if (!previewScene || !avatar) return;

  if (previewAvatar) {
    previewScene.remove(previewAvatar);
  }

  previewAvatar = avatar.clone(true);
  previewAvatar.position.set(0, -1.5, 0);
  previewScene.add(previewAvatar);
}

function setupPreview() {
  const host = $('avatar-preview');
  if (!host) return;

  if (!previewRenderer) {
    previewRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;

    previewScene = new THREE.Scene();

    previewScene.add(
      new THREE.HemisphereLight(0xffffff, 0x536688, 3)
    );

    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-4, 8, 9);
    previewScene.add(light);

    previewCamera = new THREE.PerspectiveCamera(37, 1, .1, 50);
    previewCamera.position.set(0, 1, 10);
    previewCamera.lookAt(0, .35, 0);
  }

  const w = Math.max(180, host.clientWidth);
  const h = Math.max(210, host.clientHeight);

  previewRenderer.setSize(w, h);
  previewCamera.aspect = w / h;
  previewCamera.updateProjectionMatrix();

  host.appendChild(previewRenderer.domElement);
  refreshPreview();
}

function buildWorld(i, restore = true) {
  if (world) scene.remove(world.group);

  state.currentWorld = i;
  world = factories[i]();

  scene.add(world.group);

  scene.background.setHex(world.config.sky);
  scene.fog.color.setHex(world.config.sky);

  const p = restore && state.position && i === state.currentWorld
    ? state.position
    : { x: 0, z: 8 };

  avatar.position.set(
    Math.max(-39, Math.min(39, p.x || 0)),
    0,
    Math.max(-39, Math.min(39, p.z ?? 8))
  );

  velocityY = 0;
  grounded = true;
  checkpointTriggered = false;

  keys.clear();
  joystick.x = 0;
  joystick.y = 0;

  for (const c of world.coins) {
    c.group.visible = !state.collectedCoins[c.id];
  }

  updateNodes();
  updateHUD();
  save();
}

function updateNodes() {
  if (!world) return;

  for (const t of world.tasks) {
    const done = !!state.completedTasks[
      `${world.config.id}-${t.index}`
    ];

    t.crystal.material.color.setHex(
      done ? 0x75efbc : world.config.accent
    );

    t.crystal.material.emissive.setHex(
      done ? 0x42ce91 : world.config.accent
    );

    t.beam.visible = !done;
  }

  const complete =
    doneCount(state.currentWorld) === QUESTIONS[world.config.id].length;

  world.portal.inner.material.color.setHex(
    complete ? 0x76ffcd : world.config.accent
  );

  world.portal.inner.material.opacity = complete ? .58 : .15;
}

function updateHUD() {
  if (!world) return;

  const total = QUESTIONS[world.config.id].length;
  const n = doneCount(state.currentWorld);

  $('hud-world').textContent =
    `Мир ${state.currentWorld + 1} · Уровень ${Math.floor(state.xp / 250) + 1} · ${world.config.short}`;

  $('hud-score').textContent = state.score;
  $('hud-coins').textContent = state.coins;
  $('hud-xp').textContent = state.xp;

  $('hud-tasks').textContent = `${n}/${total}`;
  $('quest-progress').textContent = `${n} из ${total}`;
  $('quest-fill').style.width = `${n / total * 100}%`;

  $('quest-text').textContent = n === total
    ? 'Все задания выполнены! Иди к порталу.'
    : 'Найди светящиеся терминалы и реши задания.';
}

function setMode(next, html = '') {
  mode = next;
  $('ui').innerHTML = html;

  const playing = next === 'play';

  const inGame = playing ||
    ['task', 'feedback', 'pause', 'result', 'final'].includes(next);

  $('hud').classList.toggle('hidden', !inGame);
  $('quest-panel').classList.toggle('hidden', !playing);
  $('minimap').classList.toggle('hidden', !playing);
  $('controls-help').classList.toggle('hidden', !playing);

  $('mobile-controls').classList.toggle(
    'hidden',
    !playing || !isTouch()
  );

  $('interact-hint').classList.add('hidden');

  if (!playing) {
    keys.clear();
    joystick.x = 0;
    joystick.y = 0;
  }
}

function isTouch() {
  return matchMedia('(pointer:coarse)').matches || innerWidth < 700;
}

function screen(content, cls = '') {
  return `<section class="screen ${cls}"><div class="panel ${cls.includes('wide') ? 'wide' : ''}">${content}</div></section>`;
}

function menu() {
  const hasSave = !!state.name;

  setMode('menu', screen(`
    <div class="eyebrow">ИССЛЕДОВАТЕЛЬСКИЙ ПРОЕКТ «ЗЕРДЕ» · 8 КЛАСС</div>
    <h1 class="hero-title">Цифровой<br><span>речевой код</span><br>подростка</h1>
    <p class="lead">Пять трёхмерных миров. 28 речевых испытаний. Один главный навык — общаться грамотно и ответственно в цифровой среде.</p>
    <div class="button-row">
      ${hasSave
        ? '<button class="btn primary" data-action="continue">▶ Продолжить</button>'
        : '<button class="btn primary" data-action="create">▶ Начать игру</button>'}
      ${hasSave
        ? '<button class="btn" data-action="create">Новый персонаж</button>'
        : ''}
      <button class="btn secondary" data-action="about">О проекте</button>
      <button class="btn secondary" data-action="achievements">Достижения</button>
    </div>
    ${hasSave ? `
      <div class="stat-strip">
        <div class="stat-chip">
          <strong>${escapeHtml(state.name)}</strong>
          <small>Игрок</small>
        </div>
        <div class="stat-chip">
          <strong>${totalDone()}/${TOTAL_QUESTIONS}</strong>
          <small>Заданий</small>
        </div>
        <div class="stat-chip">
          <strong>${state.score}</strong>
          <small>Баллов</small>
        </div>
      </div>
      <button class="btn small danger" data-action="reset-confirm">Сбросить прогресс</button>
    ` : ''}
  `));
}

function about() {
  setMode('about', screen(`
    <div class="eyebrow">НАУЧНО-ПРАКТИЧЕСКАЯ КОНФЕРЕНЦИЯ «ЗЕРДЕ»</div>
    <h2>Культура речи подростков в эпоху скроллинга</h2>
    <p class="lead">Игра — практический продукт исследовательского проекта «Культура речи подростков в эпоху скроллинга: языковая грамотность и ответственность в цифровой среде».</p>
    <div class="feature-grid">
      <div class="feature">
        <b>✍ Грамотность</b>
        <small>Орфография, пунктуация, словарный запас, точность формулировок.</small>
      </div>
      <div class="feature">
        <b>◎ Речевой этикет</b>
        <small>Уважение, выбор стиля, общение в школьных чатах.</small>
      </div>
      <div class="feature">
        <b>◈ Цифровая ответственность</b>
        <small>Проверка информации, реакция на конфликт и провокации.</small>
      </div>
      <div class="feature">
        <b>✦ Обучение через действие</b>
        <small>Исследуй миры, находи задания, получай объяснения и награды.</small>
      </div>
    </div>
    <div class="button-row">
      <button class="btn primary" data-action="back-menu">Вернуться в меню</button>
    </div>
  `));
}

function creator() {
  makeAvatar();

  const a = state.avatar;

  setMode('creator', screen(`
    <div class="eyebrow">СОЗДАНИЕ ГЕРОЯ</div>
    <h2>Твой аватар. Твоя история.</h2>

    <div class="creator-grid">
      <div>
        <label class="field">
          Игровое имя
          <input id="player-name" maxlength="20" autocomplete="off"
            placeholder="Например, Айару"
            value="${escapeHtml(state.name)}">
        </label>

        <label class="field">
          Стиль одежды
          <select id="avatar-outfit">
            <option value="hoodie" ${a.outfit === 'hoodie' ? 'selected' : ''}>Худи</option>
            <option value="jacket" ${a.outfit === 'jacket' ? 'selected' : ''}>Куртка</option>
            <option value="tee" ${a.outfit === 'tee' ? 'selected' : ''}>Футболка</option>
          </select>
        </label>

        <label class="field">
          Причёска
          <select id="avatar-hair">
            <option value="short" ${a.hair === 'short' ? 'selected' : ''}>Короткая</option>
            <option value="curly" ${a.hair === 'curly' ? 'selected' : ''}>Кудри</option>
            <option value="cap" ${a.hair === 'cap' ? 'selected' : ''}>Кепка</option>
          </select>
        </label>

        <span class="field">Цвет одежды</span>

        <div class="color-row">
          ${COLORS.map(c => `
            <button class="swatch ${a.color === c ? 'selected' : ''}"
              data-action="color"
              data-color="${c}"
              style="background:${c}"
              aria-label="Цвет ${c}">
            </button>
          `).join('')}
        </div>

        <label class="field">
          Оттенок кожи
          <select id="avatar-skin">
            <option value="#d8a57f" ${a.skin === '#d8a57f' ? 'selected' : ''}>Тёплый</option>
            <option value="#b47d58" ${a.skin === '#b47d58' ? 'selected' : ''}>Смуглый</option>
            <option value="#f0c9a7" ${a.skin === '#f0c9a7' ? 'selected' : ''}>Светлый</option>
            <option value="#80553f" ${a.skin === '#80553f' ? 'selected' : ''}>Тёмный</option>
          </select>
        </label>
      </div>

      <div class="creator-note">
        <div id="avatar-preview" aria-label="Трёхмерный предпросмотр персонажа"></div>
        <p class="muted">Меняй одежду и причёску — результат виден сразу.</p>
      </div>
    </div>

    <div class="button-row">
      <button class="btn primary" data-action="save-avatar">В мир приключений</button>
      <button class="btn secondary" data-action="back-menu">Назад</button>
    </div>
  `));

  setupPreview();
}

function worldSelect() {
  setMode('select', screen(`
    <div class="eyebrow">КАРТА ПРИКЛЮЧЕНИЯ</div>
    <h2>Выбери игровой мир</h2>
    <p class="muted">Миры открываются последовательно. Пройденные локации доступны для повторения.</p>

    <div class="world-grid">
      ${WORLD_CONFIG.map((w, i) => {
        const locked = i >= state.unlocked;
        const done = state.completedWorlds.includes(i);

        return `
          <button class="world-card ${locked ? 'locked' : ''} ${done ? 'complete' : ''}"
            data-action="world"
            data-index="${i}"
            ${locked ? 'disabled' : ''}
            style="--world-color:${w.color}">
            <span class="world-icon">${w.icon}</span>
            <b>${String(i + 1).padStart(2, '0')} · ${w.name}</b>
            <small>${locked
              ? '🔒 Открой предыдущий мир'
              : `${done ? '✓ Пройден · ' : ''}${doneCount(i)}/${QUESTIONS[w.id].length} заданий`}
            </small>
          </button>
        `;
      }).join('')}
    </div>

    <div class="button-row">
      <button class="btn secondary" data-action="back-menu">В главное меню</button>
      <button class="btn" data-action="achievements">Награды</button>
    </div>
  `));
}

function enterWorld(i, restore = false) {
  if (i >= state.unlocked) {
    notify('Сначала пройди предыдущие миры.');
    return;
  }

  if (!restore) {
    state.position = { x: 0, z: 8 };
  }

  buildWorld(i, restore);
  setMode('play');

  // Запускаем аудио после первого действия пользователя.
  if (!audio.started) {
    audio.start().then(() => {
      audio.setWorld(i);

      audio.speak(
        `Добро пожаловать! Ты находишься в мире ${WORLD_CONFIG[i].name}. ${WORLD_CONFIG[i].description}`
      );
    }).catch(() => {
      notify('Браузер не разрешил воспроизведение звука.');
    });
  } else {
    audio.setWorld(i);

    audio.speak(
      `Добро пожаловать! Ты находишься в мире ${WORLD_CONFIG[i].name}. ${WORLD_CONFIG[i].description}`
    );
  }

  $('world-banner').classList.remove('hidden');

  $('banner-kicker').textContent =
    `МИР ${String(i + 1).padStart(2, '0')}`;

  $('banner-title').textContent = WORLD_CONFIG[i].name;
  $('banner-subtitle').textContent = WORLD_CONFIG[i].description;

  clearTimeout(bannerTimer);

  bannerTimer = setTimeout(
    () => $('world-banner').classList.add('hidden'),
    3400
  );
}

function openTask(i) {
  currentTask = i;

  const q = QUESTIONS[world.config.id][i];

  setMode('task', screen(`
    <div class="eyebrow">
      МИР ${state.currentWorld + 1} · ЗАДАНИЕ ${i + 1} · ${escapeHtml(q.skill)}
    </div>

    <h2>${escapeHtml(q.title)}</h2>

    <p class="lead">${escapeHtml(q.prompt)}</p>

    <div class="answers">
      ${q.options.map((v, j) => `
        <button class="answer" data-action="answer" data-index="${j}">
          <span class="letter">${'АБВГ'[j]}</span>
          ${escapeHtml(v)}
        </button>
      `).join('')}
    </div>

    <p class="muted">Выбери один вариант. После ответа появится объяснение.</p>

    <div class="button-row">
      <button class="btn small secondary" data-action="resume">Вернуться в мир</button>
    </div>
  `));

  audio.speak(
    `Новое задание. ${q.title}. ${q.prompt}. Выбери правильный ответ.`
  );
}

function answer(i) {
  if (mode !== 'task' || currentTask === null) return;

  const q = QUESTIONS[world.config.id][currentTask];
  const key = taskKey(currentTask);
  const correct = i === q.answer;
  const first = !state.completedTasks[key];

  if (first) {
    state.attempts[key] = (state.attempts[key] || 0) + 1;

    if (correct) {
      state.completedTasks[key] = true;
      state.score += 100;
      state.xp += 50;
      state.stats.correct++;

      if (state.attempts[key] === 1) {
        state.stats.streak++;

        state.stats.bestStreak = Math.max(
          state.stats.bestStreak,
          state.stats.streak
        );
      } else {
        state.stats.streak = 0;
      }

      burst(world.tasks[currentTask].position, 0x7dffc4);
      sound('good');
    } else {
      state.stats.wrong++;
      state.stats.streak = 0;
      sound('bad');
    }
  } else {
    sound(correct ? 'good' : 'bad');
  }

  worldResultPending =
    correct &&
    first &&
    doneCount(state.currentWorld) === QUESTIONS[world.config.id].length;

  if (worldResultPending) {
    if (!state.completedWorlds.includes(state.currentWorld)) {
      state.completedWorlds.push(state.currentWorld);
    }

    state.unlocked = Math.max(
      state.unlocked,
      Math.min(5, state.currentWorld + 2)
    );
  }

  updateNodes();
  updateHUD();
  checkAchievements();
  save();

  lastAnswer = {
    correct,
    selected: i,
    correctIndex: q.answer,
    explanation: q.explanation,
    first
  };

  const title = correct
    ? 'Верно! Отличная работа.'
    : 'Разберём ошибку';

  audio.speak(
    correct
      ? `Правильно! ${q.explanation}`
      : `Ответ неверный. ${q.explanation}`
  );

  setMode('feedback', screen(`
    <div class="feedback-symbol ${correct ? 'correct' : 'incorrect'}">
      ${correct ? '✓' : '✧'}
    </div>

    <div class="eyebrow">
      ${correct ? 'ПРАВИЛЬНЫЙ ОТВЕТ' : 'ОБЪЯСНЕНИЕ ОШИБКИ'}
    </div>

    <h2>${title}</h2>

    <p class="lead">${escapeHtml(q.explanation)}</p>

    <div class="answer-reveal">
      <b>Правильный ответ:</b><br>
      ${escapeHtml(q.options[q.answer])}
    </div>

    <p class="muted">
      ${correct
        ? (first
          ? 'Награда: +100 баллов и +50 опыта.'
          : 'Повторение пройденного задания: баллы не начисляются повторно.')
        : 'За ошибку баллы не снимаются. Попробуй ещё раз, чтобы закрепить навык.'}
    </p>

    <div class="button-row">
      ${!correct
        ? '<button class="btn primary" data-action="retry">Попробовать снова</button>'
        : ''}
      <button class="btn ${correct ? 'primary' : 'secondary'}" data-action="after-feedback">
        ${worldResultPending
          ? 'Получить награду'
          : correct
            ? 'Продолжить исследование'
            : 'Вернуться в мир'}
      </button>
    </div>
  `));
}

function showResult() {
  const i = state.currentWorld;
  const w = WORLD_CONFIG[i];

  setMode('result', screen(`
    <div class="eyebrow">МИР ${i + 1} ПРОЙДЕН</div>

    <div class="trophy">${w.icon}</div>

    <h2>Награда получена!</h2>

    <p class="lead">
      ${escapeHtml(w.award)}. Ты выполнил все ${QUESTIONS[w.id].length}
      заданий мира и открыл новые возможности.
    </p>

    <div class="stat-strip">
      <div class="stat-chip">
        <strong>${doneCount(i)}</strong>
        <small>Заданий мира</small>
      </div>
      <div class="stat-chip">
        <strong>${state.score}</strong>
        <small>Всего баллов</small>
      </div>
      <div class="stat-chip">
        <strong>${state.coins}</strong>
        <small>Монет</small>
      </div>
      <div class="stat-chip">
        <strong>${state.stats.correct} / ${state.stats.wrong}</strong>
        <small>Верно / неверно</small>
      </div>
    </div>

    <div class="button-row">
      <button class="btn primary" data-action="${i === 4 ? 'show-final' : 'next-world'}">
        ${i === 4 ? 'Получить итоговый кубок' : 'Перейти в следующий мир'}
      </button>
      <button class="btn secondary" data-action="world-select">Карта миров</button>
    </div>
  `));

  audio.achievement();
  audio.speak(`Поздравляю! Мир ${i + 1} пройден.`);
}

function showFinal() {
  setMode('final', screen(`
    <div class="finale">
      <div class="eyebrow">ВСЕ ПЯТЬ МИРОВ ПРОЙДЕНЫ</div>

      <div class="trophy">🏆</div>

      <h2>Мастер цифровой грамотности</h2>

      <p class="lead">
        Поздравляем, ${escapeHtml(state.name)}!
        Ты доказал, что умеешь выбирать точные слова,
        уважать собеседника и ответственно общаться в цифровой среде.
      </p>

      <div class="stat-strip" style="justify-content:center">
        <div class="stat-chip">
          <strong>${state.score}</strong>
          <small>Баллов</small>
        </div>
        <div class="stat-chip">
          <strong>${state.coins}</strong>
          <small>Монет</small>
        </div>
        <div class="stat-chip">
          <strong>${totalDone()}/${TOTAL_QUESTIONS}</strong>
          <small>Заданий</small>
        </div>
        <div class="stat-chip">
          <strong>${state.achievements.length}</strong>
          <small>Достижений</small>
        </div>
      </div>

      <p class="muted">Исследовательский проект «Зерде» · 8 класс</p>

      <div class="button-row" style="justify-content:center">
        <button class="btn primary" data-action="world-select">Исследовать миры снова</button>
        <button class="btn secondary" data-action="achievements">Мои достижения</button>
        <button class="btn secondary" data-action="back-menu">Главное меню</button>
      </div>
    </div>
  `));

  audio.achievement();
  audio.speak('Поздравляем! Ты стал мастером цифровой грамотности!');
}

function achievements() {
  const back = mode === 'play' || mode === 'pause'
    ? 'pause'
    : mode === 'select'
      ? 'select'
      : 'menu';

  window.__achBack = back;

  setMode('achievements', screen(`
    <div class="eyebrow">КОЛЛЕКЦИЯ НАГРАД</div>

    <h2>Достижения: ${state.achievements.length} / ${ACHIEVEMENTS.length}</h2>

    <div class="achievements-grid">
      ${ACHIEVEMENTS.map(a => `
        <div class="achievement ${state.achievements.includes(a.id) ? '' : 'locked'}">
          <div class="ach-icon">${a.icon}</div>
          <div>
            <b>${escapeHtml(a.name)}</b>
            <small>${escapeHtml(a.description)}</small>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="button-row">
      <button class="btn primary" data-action="back-achievements">Назад</button>
    </div>
  `));
}

function pause() {
  if (mode !== 'play') return;

  setMode('pause', screen(`
    <div class="eyebrow">ИГРА НА ПАУЗЕ</div>

    <h2>Продолжим приключение?</h2>

    <p class="lead">
      Прогресс сохраняется автоматически.
      Ты можешь вернуться к исследованию в любой момент.
    </p>

    <div class="button-row">
      <button class="btn primary" data-action="resume">Продолжить</button>
      <button class="btn secondary" data-action="world-select">Карта миров</button>
      <button class="btn secondary" data-action="achievements">Достижения</button>
      <button class="btn secondary" data-action="back-menu">Главное меню</button>
    </div>
  `, 'transparent'));

  save();
}

function resetConfirm() {
  setMode('confirm', screen(`
    <div class="eyebrow">ПОДТВЕРЖДЕНИЕ</div>

    <h2>Сбросить весь прогресс?</h2>

    <p class="lead">
      Будут удалены имя, аватар, результаты заданий,
      монеты и достижения. Это действие нельзя отменить.
    </p>

    <div class="button-row">
      <button class="btn danger" data-action="reset">Да, удалить прогресс</button>
      <button class="btn primary" data-action="back-menu">Отмена</button>
    </div>
  `, 'transparent'));
}

function reset() {
  localStorage.removeItem(STORAGE_KEY);

  state = DEFAULT();

  buildWorld(0, false);
  makeAvatar();
  menu();

  notify('Прогресс сброшен.');
}

function interact() {
  if (mode !== 'play') return;

  const near = findNearby();
  if (!near) return;

  if (near.type === 'task') {
    openTask(near.index);
  } else if (near.type === 'portal') {
    if (doneCount(state.currentWorld) !== QUESTIONS[world.config.id].length) {
      notify('Сначала выполни все задания этого мира.');
      return;
    }

    audio.portal();

    if (state.currentWorld === 4) {
      showFinal();
    } else {
      enterWorld(state.currentWorld + 1);
    }
  } else if (near.type === 'checkpoint') {
    state.checkpoint = {
      world: state.currentWorld,
      x: 0,
      z: 0
    };

    save();
    notify('Контрольная точка сохранена!');
    sound('good');
  }
}

function findNearby() {
  if (!world || !avatar) return null;

  const p = avatar.position;

  let closest = null;
  let d = 4.1;

  for (const t of world.tasks) {
    const dt = p.distanceTo(t.position);

    if (dt < d) {
      closest = {
        type: 'task',
        index: t.index,
        label: `Задание ${t.index + 1}${state.completedTasks[`${world.config.id}-${t.index}`] ? ' · повторить' : ''}`
      };

      d = dt;
    }
  }

  const dp = p.distanceTo(world.portal.position);

  if (dp < d) {
    closest = {
      type: 'portal',
      label: 'Войти в портал'
    };

    d = dp;
  }

  const dc = p.distanceTo(world.checkpoint.position);

  if (dc < d) {
    closest = {
      type: 'checkpoint',
      label: 'Сохранить контрольную точку'
    };
  }

  return closest;
}

function move(dt) {
  if (mode !== 'play') return;

  const x =
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
    joystick.x;

  const z =
    (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
    joystick.y;

  const mag = Math.hypot(x, z);
  const running =
    keys.has('ShiftLeft') ||
    keys.has('ShiftRight') ||
    touchRun;

  const speed = running ? 11 : 6.7;

  if (mag > .08) {
    const nx = x / mag;
    const nz = z / mag;

    const dx =
      (nx * Math.cos(yaw) + nz * Math.sin(yaw)) * speed * dt;

    const dz =
      (nx * Math.sin(yaw) - nz * Math.cos(yaw)) * speed * dt;

    const next = avatar.position.clone().add(
      new THREE.Vector3(dx, 0, dz)
    );

    const r = Math.hypot(next.x, next.z);

    if (r > 41) {
      next.x *= 41 / r;
      next.z *= 41 / r;
    }

    let collide = false;

    for (const o of world.obstacles) {
      if (Math.hypot(next.x - o.x, next.z - o.z) < o.r + .65) {
        collide = true;
        break;
      }
    }

    if (!collide) {
      avatar.position.x = next.x;
      avatar.position.z = next.z;
    }

    const angle = Math.atan2(dx, dz);

    let delta =
      ((angle - avatar.rotation.y + Math.PI * 3) % (Math.PI * 2)) -
      Math.PI;

    avatar.rotation.y += delta * Math.min(1, dt * 10);

    walkTime += dt * (running ? 14 : 9);
  } else {
    walkTime += dt * 2;
  }

  // Звуки шагов во время движения.
  if (mag > .08) {
    stepTimer += dt;

    const stepInterval = running ? .34 : .48;

    if (stepTimer >= stepInterval) {
      audio.step();
      stepTimer = 0;
    }
  } else {
    stepTimer = 0;
  }

  const swing = mag > .08
    ? Math.sin(walkTime) * (running ? .75 : .5)
    : Math.sin(elapsed * 1.8) * .04;

  avatarParts.arms[0].rotation.x = swing;
  avatarParts.arms[1].rotation.x = -swing;

  avatarParts.legs[0].rotation.x = -swing;
  avatarParts.legs[1].rotation.x = swing;

  avatarParts.torso.position.y =
    2.05 +
    (mag > .08
      ? Math.abs(Math.sin(walkTime)) * .06
      : Math.sin(elapsed * 1.5) * .025);

  // Прыжок.
  if (jumpQueued && grounded) {
    velocityY = 9.6;
    grounded = false;

    audio.tone(220, .2, 'sine', .14);
    audio.tone(440, .25, 'sine', .12, audio.sfxBus, .08);
  }

  jumpQueued = false;

  if (!grounded) {
    velocityY -= 25 * dt;
    avatar.position.y += velocityY * dt;

    if (avatar.position.y <= 0) {
      avatar.position.y = 0;
      velocityY = 0;
      grounded = true;
    }
  }

  // Сбор монет.
  for (const c of world.coins) {
    if (
      c.group.visible &&
      Math.hypot(
        avatar.position.x - c.position.x,
        avatar.position.z - c.position.z
      ) < 1.35
    ) {
      c.group.visible = false;

      state.collectedCoins[c.id] = true;
      state.coins++;
      state.score += 10;
      state.xp += 5;

      burst(c.position, 0xffd36c);
      sound('coin');

      checkAchievements();
      updateHUD();
      save();
    }
  }

  // Контрольная точка.
  if (
    Math.hypot(avatar.position.x, avatar.position.z) < 2.3 &&
    !checkpointTriggered
  ) {
    checkpointTriggered = true;

    state.checkpoint = {
      world: state.currentWorld,
      x: 0,
      z: 0
    };

    save();
    notify('Контрольная точка активирована!');
  }

  if (Math.hypot(avatar.position.x, avatar.position.z) > 5) {
    checkpointTriggered = false;
  }

  const near = findNearby();

  $('interact-hint').classList.toggle('hidden', !near);

  if (near) {
    $('interact-text').textContent = near.label;
  }

  state.position = {
    x: +avatar.position.x.toFixed(2),
    z: +avatar.position.z.toFixed(2)
  };

  saveTick += dt;

  if (saveTick > 4) {
    save();
    saveTick = 0;
  }
}

function drawMap() {
  if (mode !== 'play') return;

  const c = $('minimap');
  const ctx = c.getContext('2d');
  const s = c.width;
  const scale = s / 100;

  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.translate(s / 2, s / 2);

  ctx.fillStyle = '#0c1930';
  ctx.beginPath();
  ctx.arc(0, 0, 43 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(128,217,222,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const t of world.tasks) {
    ctx.fillStyle = state.completedTasks[
      `${world.config.id}-${t.index}`
    ] ? '#6af2a9' : '#a6b8ff';

    ctx.beginPath();
    ctx.arc(
      t.position.x * scale,
      t.position.z * scale,
      4,
      0,
      7
    );
    ctx.fill();
  }

  ctx.fillStyle = '#ffda83';
  ctx.beginPath();
  ctx.arc(
    world.portal.position.x * scale,
    world.portal.position.z * scale,
    5,
    0,
    7
  );
  ctx.fill();

  ctx.translate(
    avatar.position.x * scale,
    avatar.position.z * scale
  );

  ctx.rotate(-avatar.rotation.y);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-5, 6);
  ctx.lineTo(5, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(.045, clock.getDelta());

  elapsed += dt;

  if (mode === 'play') {
    move(dt);
  }

  if (mode === 'creator') {
    avatar.rotation.y += dt * .3;

    avatarParts.arms[0].rotation.x =
      Math.sin(elapsed * 1.4) * .08;

    avatarParts.arms[1].rotation.x =
      -Math.sin(elapsed * 1.4) * .08;

    if (previewRenderer && previewAvatar) {
      previewAvatar.rotation.y = elapsed * .5;
      previewRenderer.render(previewScene, previewCamera);
    }
  }

  for (const t of world.tasks) {
    t.crystal.rotation.y += dt * .9;

    t.crystal.position.y =
      2.05 + Math.sin(elapsed * 2 + t.index) * .14;
  }

  world.portal.frame.rotation.z = Math.sin(elapsed * .5) * .035;

  world.portal.inner.material.opacity +=
    Math.sin(elapsed * 2) * .002;

  world.checkpoint.gem.rotation.y += dt * .5;

  for (const c of world.coins) {
    c.group.rotation.y += dt * 1.4;

    c.group.position.y =
      1.35 + Math.sin(elapsed * 2 + c.phase) * .2;
  }

  for (let i = bursts.length - 1; i >= 0; i--) {
    const p = bursts[i];

    p.life -= dt * 1.7;
    p.mesh.position.addScaledVector(p.v, dt);
    p.v.y -= 9 * dt;
    p.mesh.scale.setScalar(Math.max(.01, p.life));

    if (p.life <= 0) {
      scene.remove(p.mesh);
      bursts.splice(i, 1);
    }
  }

  const target = avatar.position.clone().add(
    new THREE.Vector3(0, 2.1, 0)
  );

  const dist = mode === 'creator' ? 9 : zoom;

  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * dist,
    Math.sin(pitch) * dist + 1.3,
    Math.cos(yaw) * Math.cos(pitch) * dist
  );

  const desired = target.clone().add(offset);

  camera.position.lerp(desired, Math.min(1, dt * 6));
  camera.lookAt(target);

  renderer.render(scene, camera);

  if (mode === 'play') {
    drawMap();
  }
}

const clock = new THREE.Clock();

// Обработка нажатий на кнопки интерфейса.
$('ui').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  switch (action) {
    case 'continue':
      enterWorld(state.currentWorld, true);
      break;

    case 'create':
      creator();
      break;

    case 'about':
      about();
      break;

    case 'back-menu':
      menu();
      break;

    case 'save-avatar': {
      const name = $('player-name').value
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 20);

      if (!name) {
        notify('Введи игровое имя.');
        $('player-name').focus();
        break;
      }

      state.name = name;
      state.position = { x: 0, z: 8 };

      save();
      worldSelect();
      break;
    }

    case 'color':
      state.avatar.color = btn.dataset.color;
      creator();
      break;

    case 'world-select':
      worldSelect();
      break;

    case 'world':
      enterWorld(Number(btn.dataset.index));
      break;

    case 'answer':
      answer(Number(btn.dataset.index));
      break;

    case 'retry':
      openTask(currentTask);
      break;

    case 'after-feedback':
      if (worldResultPending) {
        worldResultPending = false;
        showResult();
      } else {
        setMode('play');
      }
      break;

    case 'resume':
      setMode('play');
      break;

    case 'next-world':
      enterWorld(state.currentWorld + 1);
      break;

    case 'show-final':
      showFinal();
      break;

    case 'achievements':
      achievements();
      break;

    case 'back-achievements':
      if (window.__achBack === 'pause') {
        pauseFromAchievements();
      } else if (window.__achBack === 'select') {
        worldSelect();
      } else {
        menu();
      }
      break;

    case 'reset-confirm':
      resetConfirm();
      break;

    case 'reset':
      reset();
      break;
  }
});

function pauseFromAchievements() {
  setMode('play');
  pause();
}

// Изменение внешнего вида персонажа.
$('ui').addEventListener('change', e => {
  if (mode !== 'creator') return;

  const id = e.target.id;

  if (id === 'avatar-outfit') {
    state.avatar.outfit = e.target.value;
  } else if (id === 'avatar-hair') {
    state.avatar.hair = e.target.value;
  } else if (id === 'avatar-skin') {
    state.avatar.skin = e.target.value;
  } else {
    return;
  }

  makeAvatar();
});

$('ui').addEventListener('input', e => {
  if (e.target.id === 'player-name') {
    state.name = e.target.value;
  }
});

$('pause-button').addEventListener('click', pause);

// Управление клавиатурой.
window.addEventListener('keydown', e => {
  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) &&
    !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
  }

  if (e.code === 'Escape') {
    if (mode === 'play') {
      pause();
    } else if (mode === 'pause') {
      setMode('play');
    } else if (mode === 'task' || mode === 'feedback') {
      setMode('play');
    }

    return;
  }

  if (
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)
  ) {
    return;
  }

  keys.add(e.code);

  if (e.code === 'Space' && mode === 'play') {
    jumpQueued = true;
  }

  if (e.code === 'KeyE' && !e.repeat) {
    interact();
  }
});

window.addEventListener('keyup', e => {
  keys.delete(e.code);
});

window.addEventListener('blur', () => {
  keys.clear();

  if (mode === 'play') {
    pause();
  }
});

// Управление камерой мышью.
let dragging = false;
let prevX = 0;
let prevY = 0;

renderer.domElement.addEventListener('pointerdown', e => {
  dragging = true;
  prevX = e.clientX;
  prevY = e.clientY;

  renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener('pointermove', e => {
  if (!dragging) return;

  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;

  prevX = e.clientX;
  prevY = e.clientY;

  yaw -= dx * .006;

  pitch = Math.max(
    -.12,
    Math.min(1.12, pitch + dy * .004)
  );
});

renderer.domElement.addEventListener('pointerup', () => {
  dragging = false;
});

renderer.domElement.addEventListener('pointercancel', () => {
  dragging = false;
});

renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault();

  zoom = Math.max(
    6,
    Math.min(20, zoom + e.deltaY * .012)
  );
}, { passive: false });

// Сенсорное управление.
$('touch-interact').addEventListener('pointerdown', e => {
  e.preventDefault();
  interact();
});

$('touch-jump').addEventListener('pointerdown', e => {
  e.preventDefault();
  jumpQueued = true;
});

$('touch-run').addEventListener('pointerdown', e => {
  e.preventDefault();

  touchRun = !touchRun;

  $('touch-run').style.background =
    touchRun ? '#69d9d0' : '';
});

const stick = $('joystick');
const knob = $('joystick-knob');

let stickId = null;

function updateStick(e) {
  const r = stick.getBoundingClientRect();

  const x = e.clientX - (r.left + r.width / 2);
  const y = e.clientY - (r.top + r.height / 2);

  const len = Math.hypot(x, y);
  const max = 42;
  const k = Math.min(1, max / Math.max(1, len));

  joystick.x = x * k / max;
  joystick.y = y * k / max;

  knob.style.transform = `translate(${x * k}px, ${y * k}px)`;
}

stick.addEventListener('pointerdown', e => {
  e.preventDefault();

  stickId = e.pointerId;
  stick.setPointerCapture(stickId);

  updateStick(e);
});

stick.addEventListener('pointermove', e => {
  if (e.pointerId === stickId) {
    updateStick(e);
  }
});

function endStick(e) {
  if (e.pointerId !== stickId) return;

  stickId = null;

  joystick.x = 0;
  joystick.y = 0;

  knob.style.transform = '';
}

stick.addEventListener('pointerup', endStick);
stick.addEventListener('pointercancel', endStick);

// Изменение размеров окна.
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);

  $('mobile-controls').classList.toggle(
    'hidden',
    mode !== 'play' || !isTouch()
  );
});

window.addEventListener('beforeunload', save);

// Запуск игры.
makeAvatar();
buildWorld(
  state.currentWorld < state.unlocked
    ? state.currentWorld
    : 0,
  true
);

menu();
animate();