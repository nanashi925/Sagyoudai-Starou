const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  distance: document.getElementById('distance'),
  score: document.getElementById('score'),
  state: document.getElementById('state'),
  startButton: document.getElementById('startButton')
};

let bgm = null;

function startBgm() {
  if (bgm) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctxAudio = new Ctx();
  const master = ctxAudio.createGain();
  master.gain.value = 0.05;
  master.connect(ctxAudio.destination);

  const chords = [
    [220.0, 277.18, 329.63],
    [196.0, 246.94, 293.66],
    [174.61, 220.0, 261.63],
    [196.0, 246.94, 293.66]
  ];

  let seqTimer = null;
  let beat = 0;

  const playBeat = () => {
    const chord = chords[Math.floor((beat % 16) / 4)];
    chord.forEach((f, i) => {
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, ctxAudio.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.48);
      osc.connect(gain).connect(master);
      osc.start();
      osc.stop(ctxAudio.currentTime + 0.5);
    });

    if (beat % 2 === 0) {
      const bass = ctxAudio.createOscillator();
      const bassGain = ctxAudio.createGain();
      bass.type = 'square';
      bass.frequency.value = chord[0] / 2;
      bassGain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.03, ctxAudio.currentTime + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.22);
      bass.connect(bassGain).connect(master);
      bass.start();
      bass.stop(ctxAudio.currentTime + 0.24);
    }

    beat += 1;
  };

  playBeat();
  seqTimer = window.setInterval(playBeat, 500);

  bgm = {
    stop: () => {
      if (seqTimer) window.clearInterval(seqTimer);
      master.gain.setValueAtTime(master.gain.value, ctxAudio.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.2);
      setTimeout(() => ctxAudio.close(), 250);
      bgm = null;
    }
  };
}

const sprites = {
  bg: new Image(),
  player: new Image(),
  enemy: new Image(),
  item: new Image(),
  decor: new Image()
};
sprites.bg.src = './assets/img/bg_bar.svg';
sprites.player.src = './assets/img/s_taro_run.svg';
sprites.enemy.src = './assets/img/rival_shadow.svg';
sprites.item.src = './assets/img/rose_token.svg';
sprites.decor.src = './assets/img/chandelier.svg';

const game = {
  running: false,
  over: false,
  speed: 6,
  gravity: 0.7,
  jumpPower: -17,
  frame: 0,
  distance: 0,
  score: 0,
  obstacles: [],
  items: [],
  keys: new Set(),
  player: {
    x: 220,
    y: 470,
    w: 140,
    h: 220,
    vy: 0,
    onGround: true,
    dash: 0,
    invuln: 0
  }
};

function reset() {
  game.running = false;
  game.over = false;
  game.speed = 6;
  game.frame = 0;
  game.distance = 0;
  game.score = 0;
  game.obstacles = [];
  game.items = [];
  Object.assign(game.player, { y: 470, vy: 0, onGround: true, dash: 0, invuln: 0 });
  updateUI('Ready');
  draw();
}

function start() {
  if (game.running) return;
  game.running = true;
  game.over = false;
  try {
    startBgm();
  } catch (_e) {
    ui.state.textContent = 'BGM unavailable in this browser';
  }
  updateUI('Running');
  requestAnimationFrame(loop);
}

function updateUI(stateText) {
  ui.distance.textContent = `Distance: ${Math.floor(game.distance)}m`;
  ui.score.textContent = `Score: ${game.score}`;
  ui.state.textContent = stateText;
}

function spawnObstacle() {
  const h = 90 + Math.random() * 90;
  game.obstacles.push({ x: canvas.width + 30, y: 690 - h, w: 70, h });
}

function spawnItem() {
  game.items.push({
    x: canvas.width + 40,
    y: 340 + Math.random() * 220,
    w: 48,
    h: 48,
    taken: false
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
  game.frame += 1;
  game.distance += game.speed * 0.1;
  game.speed = Math.min(13, game.speed + 0.0009);

  if (game.frame % 120 === 0) spawnObstacle();
  if (game.frame % 180 === 60) spawnItem();

  if (game.keys.has('Space') || game.keys.has('ArrowUp')) {
    if (game.player.onGround) {
      game.player.vy = game.jumpPower;
      game.player.onGround = false;
    }
  }

  if (game.keys.has('KeyD') && game.player.dash <= 0) {
    game.player.dash = 26;
  }

  const dashBonus = game.player.dash > 0 ? 6.5 : 0;
  if (game.player.dash > 0) game.player.dash -= 1;
  if (game.player.invuln > 0) game.player.invuln -= 1;

  game.player.vy += game.gravity;
  game.player.y += game.player.vy;

  if (game.player.y >= 470) {
    game.player.y = 470;
    game.player.vy = 0;
    game.player.onGround = true;
  }

  for (const o of game.obstacles) o.x -= game.speed + dashBonus;
  for (const it of game.items) it.x -= game.speed;

  game.obstacles = game.obstacles.filter(o => o.x + o.w > -100);
  game.items = game.items.filter(it => it.x + it.w > -100 && !it.taken);

  const pBox = {
    x: game.player.x + 24,
    y: game.player.y + 20,
    w: game.player.w - 50,
    h: game.player.h - 24
  };

  for (const o of game.obstacles) {
    if (intersects(pBox, o) && game.player.invuln <= 0) {
      game.player.invuln = 50;
      game.score = Math.max(0, game.score - 30);
      if (game.score === 0) {
        endGame();
        return;
      }
    }
  }

  for (const it of game.items) {
    if (intersects(pBox, it)) {
      it.taken = true;
      game.score += 25;
    }
  }

  if (game.frame % 30 === 0) game.score += 1;
  updateUI(game.over ? 'Game Over' : 'Running');
}

function endGame() {
  game.over = true;
  game.running = false;
  if (bgm) bgm.stop();
  updateUI('Game Over - Press R');
}

function drawBackground() {
  const t = game.frame * 0.2;
  const baseX = -((t * 0.35) % canvas.width);
  for (let i = 0; i < 3; i += 1) {
    ctx.drawImage(sprites.bg, baseX + i * canvas.width, 0, canvas.width, canvas.height);
  }

  const decoX = -((t * 0.7) % 420);
  for (let i = 0; i < 5; i += 1) {
    ctx.drawImage(sprites.decor, decoX + i * 420, 40, 150, 120);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1c120a';
  ctx.fillRect(0, 690, canvas.width, 30);
}

function drawPlayer() {
  if (game.player.invuln > 0 && game.frame % 6 < 3) return;
  const bob = Math.sin(game.frame * 0.25) * 5;
  ctx.drawImage(
    sprites.player,
    game.player.x,
    game.player.y + bob,
    game.player.w,
    game.player.h
  );
}

function draw() {
  drawBackground();

  for (const o of game.obstacles) {
    ctx.drawImage(sprites.enemy, o.x - 8, o.y - 12, o.w + 20, o.h + 18);
  }

  for (const it of game.items) {
    ctx.drawImage(sprites.item, it.x, it.y, it.w, it.h);
  }

  drawPlayer();

  if (!game.running && !game.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e7c27c';
    ctx.font = '52px serif';
    ctx.fillText('S太郎の夜を駆けろ', 390, 300);
    ctx.font = '28px serif';
    ctx.fillText('STARTを押してゲーム開始', 450, 360);
  }

  if (game.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0cd88';
    ctx.font = '60px serif';
    ctx.fillText('GAME OVER', 430, 320);
    ctx.font = '30px serif';
    ctx.fillText(`Final Score: ${game.score}`, 500, 380);
  }
}

function loop() {
  if (!game.running) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'KeyD', 'KeyR'].includes(e.code)) e.preventDefault();
  game.keys.add(e.code);
  if (e.code === 'KeyR') {
    reset();
    start();
  }
});
window.addEventListener('keyup', (e) => game.keys.delete(e.code));

ui.startButton.addEventListener('click', () => {
  if (game.over) reset();
  start();
});

Promise.all(Object.values(sprites).map(img => new Promise(res => {
  img.onload = res;
  img.onerror = res;
}))).then(reset);
