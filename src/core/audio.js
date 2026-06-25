// Звук без файлов: синтез коротких эффектов через Web Audio.
// Контекст создаётся лениво и оживает после первого клика/клавиши (старт смены).

let ctx = null;
let muted = localStorage.getItem('apparat_muted') === '1';

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Один тон с огибающей; freq может «съезжать» к slideTo.
function tone({ freq = 440, dur = 0.12, type = 'square', vol = 0.2, slideTo = null, delay = 0 }) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export const SFX = {
  catch:  () => tone({ freq: 520, slideTo: 760, dur: 0.07, type: 'square', vol: 0.14 }),
  good:   () => { tone({ freq: 660, dur: 0.09, type: 'triangle', vol: 0.18 });
                  tone({ freq: 990, dur: 0.12, type: 'triangle', vol: 0.16, delay: 0.07 }); },
  combo:  (n) => { const base = 660; for (let i = 0; i < 3; i++)
                  tone({ freq: base * Math.pow(1.18, i + Math.min(n, 6)), dur: 0.08, type: 'triangle', vol: 0.16, delay: i * 0.06 }); },
  bad:    () => tone({ freq: 200, slideTo: 110, dur: 0.26, type: 'sawtooth', vol: 0.2 }),
  life:   () => { tone({ freq: 320, slideTo: 130, dur: 0.4, type: 'triangle', vol: 0.22 });
                  tone({ freq: 160, slideTo: 90,  dur: 0.4, type: 'sawtooth', vol: 0.12 }); },
  over:   () => { tone({ freq: 300, slideTo: 90, dur: 0.7, type: 'sawtooth', vol: 0.2 }); },
  record: () => { [0, 1, 2, 3].forEach((i) => tone({ freq: 523 * Math.pow(1.26, i), dur: 0.14, type: 'square', vol: 0.18, delay: i * 0.1 })); },
};

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('apparat_muted', muted ? '1' : '0');
  return muted;
}
export function isMuted() { return muted; }
