// Odak sesi çalar: Web Audio API ile sesi tarayıcıda anlık üretir (ses dosyası yok).
// Yapı: her ses türü bir "ses kaynağı" (voice) üretir → kendi ses düğmesi (yavaşça açılıp kapanır)
// → ana ses düğmesi → sıkıştırıcı (ani yüksek sesleri yumuşatır) → hoparlör.
// Ezgilerin hangi notalardan oluşacağı (saf, test edilen kısım) lib/focusSound.js içinde.
import { BAR_SECONDS, CHORDS, midiToFrequency, musicBoxBar, pianoBar, synthBar, volumeToGain } from "./focusSound.js";

const FADE_SECONDS = 1.6;
const LOOKAHEAD_SECONDS = 2; // notalar bu kadar önceden planlanır; sekme arkada kalsa da aksamaz

// --- Ortak parçalar ---

// Yapay yankı (reverb). Gerçek bir odanın "cevabı" taklit edilir: önce birkaç belirgin erken yansıma,
// sonra sönen yoğun bir kuyruk. Sol ve sağ kanal ayrı rastgele üretilir (geniş, ferah stereo);
// kuyruk zamanla koyulaşır (gerçek odada tiz sesler daha çabuk sönümlenir).
function createReverb(ctx, seconds = 3.2, darkness = 0.6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Yumuşatma katsayısı zamanla artar: kuyruğun sonu boğuklaşır
      const k = 1 - darkness * t;
      smooth = smooth * (1 - k) + (Math.random() * 2 - 1) * k;
      data[i] = smooth * (1 - t) ** 2.4;
    }
    // Erken yansımalar: ilk 80 ms içinde birkaç keskin yankı
    for (let e = 0; e < 6; e++) {
      const at = Math.floor(ctx.sampleRate * (0.008 + Math.random() * 0.07));
      data[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - e * 0.06);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

// Kuru (doğrudan) ve ıslak (yankılı) yol: her ses türü kendi oranını seçer
function createSpace(ctx, out, { reverbSeconds = 3.2, wet = 0.4, dry = 0.9, darkness = 0.6 } = {}) {
  const reverb = createReverb(ctx, reverbSeconds, darkness);
  const wetGain = ctx.createGain();
  wetGain.gain.value = wet;
  const dryGain = ctx.createGain();
  dryGain.gain.value = dry;
  reverb.connect(wetGain).connect(out);
  dryGain.connect(out);
  // Bir nota hem kuru yola hem yankıya gönderilir
  const input = ctx.createGain();
  input.connect(dryGain);
  input.connect(reverb);
  return input;
}

// Stereo konumlandırma (-1 sol … 1 sağ). Eski Safari'de StereoPanner yoksa sesi ortada bırakır.
function panner(ctx, pan) {
  if (!ctx.createStereoPanner) return ctx.createGain();
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  return p;
}

// Yankılı gecikme (delay): sesin ritimli tekrarları, her tekrarda biraz koyulaşıp azalır
function createEcho(ctx, out, { time = 0.375, feedback = 0.35, mix = 0.25, tone = 2600 } = {}) {
  const input = ctx.createGain();
  const delay = ctx.createDelay(2);
  delay.delayTime.value = time;
  const fb = ctx.createGain();
  fb.gain.value = feedback;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = tone;
  const mixGain = ctx.createGain();
  mixGain.gain.value = mix;
  input.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(mixGain).connect(out);
  input.connect(out);
  return input;
}

// Döngüyle çalınacak gürültü: "white" düz hışırtı, "pink" doğal (yağmur, rüzgâr), "brown" derin uğultu
function createNoiseBuffer(ctx, type, seconds = 6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else if (type === "pink") {
        // Paul Kellet'in yaklaşık pembe gürültü süzgeci
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
      } else {
        data[i] = white;
      }
    }
  }
  return buffer;
}

function loopSource(ctx, buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

// Notaları önceden planlayan zamanlayıcı. scheduleBar(barIndex, startTime) her ölçü için çağrılır.
function createBarScheduler(ctx, scheduleBar) {
  let bar = 0;
  let nextBarTime = ctx.currentTime + 0.1;
  const tick = () => {
    while (nextBarTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
      scheduleBar(bar, nextBarTime);
      bar += 1;
      nextBarTime += BAR_SECONDS;
    }
  };
  tick();
  const id = setInterval(tick, 400);
  return () => clearInterval(id);
}

// Kısa, renkli bir gürültü patlaması: piyano çekicinin "tık"ı, yağmur damlası, müzik kutusu mandalı
function noiseHit(ctx, dest, noise, time, { freq = 3000, q = 1.5, gain = 0.05, decay = 0.02, pan = 0 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  src.connect(bp).connect(env).connect(panner(ctx, pan)).connect(dest);
  // Her seferinde gürültünün farklı bir yerinden başla: tıklar birbirinin kopyası gibi duyulmasın
  src.start(time, Math.random() * (noise.duration - 0.2), decay + 0.05);
}

// --- Ses türleri ---

// Sakin piyano. Her nota iki hafif farklı akortlu "telden" (koro etkisi) oluşur; üst tonlar gerçek tel
// gibi azıcık tizleşir (esneklik), çekicin vuruşu kısa bir tık olarak duyulur. Pes notalar solda, tizler
// sağda durur (piyanonun önünde oturuyormuş gibi). Ses zamanla koyulaşarak söner.
function pianoVoice(ctx, out) {
  const warm = ctx.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = 4200;
  warm.connect(out);
  const room = createSpace(ctx, warm, { reverbSeconds: 3.6, wet: 0.42, dry: 0.85 });
  const clickNoise = createNoiseBuffer(ctx, "white", 1);
  const STRETCH = 0.00035; // tel esnekliği: n. üst ton n·f·√(1+B·n²)

  function playNote(midi, time, velocity, hand) {
    const freq = midiToFrequency(midi);
    // Sol el pedallı gibi uzun, tiz notalar daha kısa çınlar
    const decay = hand === "left" ? 6.5 : midi < 70 ? 4.2 : 3.2;
    const pan = (midi - 64) / 34;
    const voiceOut = panner(ctx, pan);
    voiceOut.connect(room);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(freq * (5 + velocity * 6), 6500), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.4, 260), time + decay * 0.7);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(velocity, time + 0.008);
    // İki aşamalı sönüm: önce hızlı bir düşüş, sonra uzun kuyruk (gerçek piyanodaki gibi)
    env.gain.exponentialRampToValueAtTime(velocity * 0.35, time + 0.5);
    env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    filter.connect(env).connect(voiceOut);

    const partials = [
      [1, 1],
      [2, 0.42],
      [3, 0.16],
      [4, 0.08],
      [5, 0.035],
    ];
    for (const cents of [-2.5, 2.5]) {
      for (const [n, amp] of partials) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq * n * Math.sqrt(1 + STRETCH * n * n);
        osc.detune.value = cents + (Math.random() - 0.5) * 2;
        const g = ctx.createGain();
        g.gain.value = amp * 0.5;
        osc.connect(g).connect(filter);
        osc.start(time);
        osc.stop(time + decay + 0.1);
      }
    }
    noiseHit(ctx, voiceOut, clickNoise, time, { freq: 2400 + midi * 20, q: 0.8, gain: velocity * 0.06, decay: 0.018 });
  }

  const stopScheduler = createBarScheduler(ctx, (bar, start) => {
    for (const n of pianoBar(Math.random, bar)) playNote(n.midi, start + n.offset, n.velocity, n.hand);
  });
  return () => stopScheduler();
}

// Müzik kutusu: metal dilin sesi. Ana sesin üstünde gerçek müzik kutusundaki gibi uyumsuz, hızla sönen
// üst tonlar var (çın sesi bunlardan gelir); her notada mandalın küçük tıkı. Notalar iki yana dağılır,
// arkasında yumuşak bir yankı ve ritimli tekrar.
function musicBoxVoice(ctx, out) {
  const echo = createEcho(ctx, out, { time: 0.75, feedback: 0.28, mix: 0.22, tone: 3800 });
  const room = createSpace(ctx, echo, { reverbSeconds: 2.6, wet: 0.5, dry: 0.8, darkness: 0.4 });
  const clickNoise = createNoiseBuffer(ctx, "white", 1);
  // [frekans çarpanı, genlik, sönüm süresi]: 1. ses uzun, uyumsuz üst tonlar kısa
  const TINE = [
    [1, 1, 2.6],
    [2.0, 0.18, 1.4],
    [5.4, 0.12, 0.35],
    [8.9, 0.05, 0.18],
  ];

  function playNote(midi, time, velocity) {
    const freq = midiToFrequency(midi);
    const voiceOut = panner(ctx, (Math.random() - 0.5) * 1.1);
    voiceOut.connect(room);
    for (const [mult, amp, decay] of TINE) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(velocity * amp, time + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
      osc.connect(env).connect(voiceOut);
      osc.start(time);
      osc.stop(time + decay + 0.05);
    }
    noiseHit(ctx, voiceOut, clickNoise, time, { freq: 5200, q: 3, gain: velocity * 0.05, decay: 0.012 });
  }

  const stopScheduler = createBarScheduler(ctx, (bar, start) => {
    for (const n of musicBoxBar(Math.random, bar)) playNote(n.midi, start + n.offset + Math.random() * 0.02, n.velocity);
  });
  return () => stopScheduler();
}

// Gece sentezi: yavaş, filtreli bir arpej (kısa "pluck"), alçak yuvarlak bas ve geniş bir pad.
// Pad her vuruşta hafifçe kısılıp açılır (pompa etkisi), arpejin ritimli yankısı iki yana sıçrar.
// Filtre ölçüler boyunca çok yavaş açılıp kapanır: ses zamanla "nefes alır".
function synthVoice(ctx, out) {
  // Yumuşak doyum: sesi sıcaklaştıran hafif "teyp" bükülmesi
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
  }
  shaper.curve = curve;
  shaper.connect(out);
  const room = createSpace(ctx, shaper, { reverbSeconds: 4.2, wet: 0.45, dry: 0.75 });

  // Arpejin ritimli yankısı: noktalı sekizlik, sol ve sağ ayrı
  const step = BAR_SECONDS / 16;
  const left = panner(ctx, -0.7);
  const right = panner(ctx, 0.7);
  left.connect(room);
  right.connect(room);
  const echoL = createEcho(ctx, left, { time: step * 1.5, feedback: 0.3, mix: 0.3, tone: 2200 });
  const echoR = createEcho(ctx, right, { time: step * 3, feedback: 0.25, mix: 0.25, tone: 1800 });

  // Ölçüler boyunca yavaşça açılıp kapanan ortak filtre (arpej için)
  const arpFilter = ctx.createBiquadFilter();
  arpFilter.type = "lowpass";
  arpFilter.Q.value = 6;
  arpFilter.frequency.value = 1400;
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 1 / (BAR_SECONDS * 4);
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 900;
  sweep.connect(sweepDepth).connect(arpFilter.frequency);
  sweep.start();
  arpFilter.connect(echoL);
  arpFilter.connect(echoR);

  // Pad'in pompası: vuruşta kısılır, vuruş arasında açılır
  const pump = ctx.createGain();
  pump.gain.value = 0.85;
  const pumpLfo = ctx.createOscillator();
  pumpLfo.type = "sawtooth";
  pumpLfo.frequency.value = 8 / BAR_SECONDS; // her vuruşta bir
  const pumpDepth = ctx.createGain();
  pumpDepth.gain.value = 0.15;
  pumpLfo.connect(pumpDepth).connect(pump.gain);
  pumpLfo.start();
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 900;
  padFilter.connect(pump).connect(room);

  function pluck(midi, time, velocity) {
    const freq = midiToFrequency(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(velocity * 0.22, time + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
    env.connect(arpFilter);
    for (const [type, cents] of [["sawtooth", -6], ["square", 5]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(env);
      osc.start(time);
      osc.stop(time + 0.5);
    }
  }

  function bassNote(midi, time, velocity) {
    const freq = midiToFrequency(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(velocity * 0.5, time + 0.03);
    env.gain.exponentialRampToValueAtTime(velocity * 0.25, time + 0.8);
    env.gain.exponentialRampToValueAtTime(0.0001, time + BAR_SECONDS / 2);
    env.connect(room);
    for (const [type, mult, amp] of [["sine", 1, 1], ["triangle", 2, 0.25]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g).connect(env);
      osc.start(time);
      osc.stop(time + BAR_SECONDS / 2 + 0.05);
    }
  }

  function pad(chord, time) {
    const end = time + BAR_SECONDS + 1.5;
    chord.tones.slice(0, 3).forEach((tone, i) => {
      for (const cents of [-9, 9]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = midiToFrequency(48 + tone);
        osc.detune.value = cents;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.03, time + 1.5);
        env.gain.setValueAtTime(0.03, end - 1.5);
        env.gain.linearRampToValueAtTime(0, end);
        const p = panner(ctx, (i - 1) * 0.6 + (cents > 0 ? 0.15 : -0.15));
        osc.connect(env).connect(p).connect(padFilter);
        osc.start(time);
        osc.stop(end + 0.05);
      }
    });
  }

  const stopScheduler = createBarScheduler(ctx, (bar, start) => {
    const { chord, arp, bass } = synthBar(bar);
    pad(chord, start);
    for (const n of arp) pluck(n.midi, start + n.offset, n.velocity);
    for (const n of bass) bassNote(n.midi, start + n.offset, n.velocity);
  });
  return () => {
    stopScheduler();
    sweep.stop();
    pumpLfo.stop();
  };
}

// Derin odak: akorlar yumuşak, uzun, üst üste binen tabaka sesler (pad). Altında akorun kökü çok alçak
// bir uğultu olarak durur; arada bir, bir oktav yukarıda cam gibi ince bir ses belirip kaybolur.
// Tabakalar iki yana açılmıştır, filtre çok yavaş salınır: ses "nefes alır".
function ambientVoice(ctx, out) {
  const room = createSpace(ctx, out, { reverbSeconds: 6, wet: 0.65, dry: 0.6, darkness: 0.7 });
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 650;
  filter.Q.value = 0.4;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 250;
  lfo.connect(lfoDepth).connect(filter.frequency);
  lfo.start();
  filter.connect(room);

  const span = BAR_SECONDS * 2; // her akor 16 sn
  const stopScheduler = createBarScheduler(ctx, (bar, start) => {
    if (bar % 2 !== 0) return; // yalnızca çift ölçülerde yeni akor
    const chord = CHORDS[(bar / 2) % CHORDS.length];
    const end = start + span + 4; // sonraki akorla 4 sn üst üste biner
    chord.tones.slice(0, 3).forEach((tone, i) => {
      for (const cents of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = midiToFrequency(48 + tone);
        osc.detune.value = cents;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(0.04, start + 4);
        env.gain.setValueAtTime(0.04, end - 4);
        env.gain.linearRampToValueAtTime(0, end);
        osc.connect(env).connect(panner(ctx, (i - 1) * 0.7)).connect(filter);
        osc.start(start);
        osc.stop(end + 0.1);
      }
    });
    // Kök sesin alçak uğultusu
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = midiToFrequency(36 + chord.root);
    const subEnv = ctx.createGain();
    subEnv.gain.setValueAtTime(0, start);
    subEnv.gain.linearRampToValueAtTime(0.08, start + 5);
    subEnv.gain.linearRampToValueAtTime(0, end);
    sub.connect(subEnv).connect(out);
    sub.start(start);
    sub.stop(end + 0.1);
    // Cam ses: akorun bir sesi, iki oktav yukarıda, yavaşça belirip kaybolur
    const glassTone = chord.tones[Math.floor(Math.random() * chord.tones.length)];
    const glass = ctx.createOscillator();
    glass.type = "sine";
    glass.frequency.value = midiToFrequency(72 + glassTone);
    const glassEnv = ctx.createGain();
    const gStart = start + 3 + Math.random() * 6;
    glassEnv.gain.setValueAtTime(0, gStart);
    glassEnv.gain.linearRampToValueAtTime(0.018, gStart + 2.5);
    glassEnv.gain.linearRampToValueAtTime(0, gStart + 8);
    glass.connect(glassEnv).connect(panner(ctx, Math.random() * 1.4 - 0.7)).connect(room);
    glass.start(gStart);
    glass.stop(gStart + 8.1);
  });
  return () => {
    stopScheduler();
    lfo.stop();
  };
}

// Yağmur: üç katman. Uzaktaki sağanak (pembe gürültü, yavaşça dalgalanır), yakındaki tek tek damlalar
// (iki yana dağılmış kısa tıkırtılar, sıklığı da dalgalanır) ve alçak bir uğultu (toprağa, çatıya çarpan su).
function rainVoice(ctx, out) {
  const wash = loopSource(ctx, createNoiseBuffer(ctx, "pink"));
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 400;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 5200;
  const washGain = ctx.createGain();
  washGain.gain.value = 0.35;
  wash.connect(hp).connect(lp).connect(washGain).connect(out);

  const rumble = loopSource(ctx, createNoiseBuffer(ctx, "brown"));
  const rumbleLp = ctx.createBiquadFilter();
  rumbleLp.type = "lowpass";
  rumbleLp.frequency.value = 300;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.42;
  rumble.connect(rumbleLp).connect(rumbleGain).connect(out);

  // Sağanağın şiddeti çok yavaş inip çıkar
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const depth = ctx.createGain();
  depth.gain.value = 0.1;
  lfo.connect(depth).connect(washGain.gain);

  // Damlalar: her 120 ms'de bir sonraki 300 ms'nin damlaları planlanır
  const dropNoise = createNoiseBuffer(ctx, "white", 2);
  const drops = ctx.createGain();
  drops.gain.value = 1;
  drops.connect(out);
  let planned = ctx.currentTime;
  let phase = 0;
  const tick = () => {
    const until = ctx.currentTime + 0.3;
    while (planned < until) {
      phase += 0.004;
      // Yoğunluk sinüsle dalgalanır: bazen seyrek, bazen sık
      const density = 0.035 + 0.05 * (0.5 + 0.5 * Math.sin(phase));
      planned += density * (0.4 + Math.random() * 1.2);
      const big = Math.random() < 0.08;
      noiseHit(ctx, drops, dropNoise, planned, {
        freq: big ? 1200 + Math.random() * 800 : 2500 + Math.random() * 4500,
        q: big ? 4 : 2 + Math.random() * 4,
        gain: big ? 0.06 : 0.012 + Math.random() * 0.03,
        decay: big ? 0.05 : 0.008 + Math.random() * 0.02,
        pan: Math.random() * 1.8 - 0.9,
      });
    }
  };
  tick();
  const id = setInterval(tick, 120);

  wash.start();
  rumble.start();
  lfo.start();
  return () => {
    clearInterval(id);
    wash.stop();
    rumble.stop();
    lfo.stop();
  };
}

// Kahverengi gürültü: derin, geniş bir uğultu; dış sesleri maskeler. Sol ve sağ ayrı gürültü
// (kafanın içinde değil, odaya yayılmış gibi), parlaklığı çok yavaş dalgalanır (tekdüze yorgunluğu azalır).
function brownVoice(ctx, out) {
  const src = loopSource(ctx, createNoiseBuffer(ctx, "brown", 8));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 800;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.03;
  const depth = ctx.createGain();
  depth.gain.value = 260;
  lfo.connect(depth).connect(lp.frequency);
  const g = ctx.createGain();
  g.gain.value = 0.6;
  src.connect(lp).connect(g).connect(out);
  src.start();
  lfo.start();
  return () => {
    src.stop();
    lfo.stop();
  };
}

const VOICES = {
  piano: pianoVoice,
  musicbox: musicBoxVoice,
  synth: synthVoice,
  ambient: ambientVoice,
  rain: rainVoice,
  brown: brownVoice,
};

// --- Çalar ---
export function createFocusPlayer() {
  let ctx = null;
  let master = null;
  let current = null; // { kind, out, stop }

  // Tarayıcılar sesi ancak bir tıklamadan sonra başlatmaya izin verir: unlock() "Başlat"
  // düğmesine basıldığı anda çağrılır.
  function ensure() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null; // çok eski tarayıcı: ses özelliği sessizce devre dışı
      ctx = new AudioCtx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0;
      // Sıkıştırıcının kıstığı sesi geri yükselt: kaydırıcının ortası dizüstü hoparlörde de duyulsun
      const makeup = ctx.createGain();
      makeup.gain.value = 2.5;
      master.connect(compressor).connect(makeup).connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function fadeOutCurrent() {
    if (!current) return;
    const { out, stop } = current;
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + FADE_SECONDS);
    setTimeout(() => {
      stop();
      out.disconnect();
    }, FADE_SECONDS * 1000 + 100);
    current = null;
  }

  function setVolume(volume) {
    if (!ctx) return;
    master.gain.setTargetAtTime(volumeToGain(volume), ctx.currentTime, 0.15);
  }

  return {
    unlock() {
      ensure();
    },
    play(kind, volume) {
      const voice = VOICES[kind];
      if (!voice || !ensure()) return;
      setVolume(volume);
      if (current?.kind === kind) return;
      fadeOutCurrent(); // tür değiştiyse eskisi sönerken yenisi yükselir
      const out = ctx.createGain();
      out.gain.setValueAtTime(0, ctx.currentTime);
      out.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_SECONDS * 1.5);
      out.connect(master);
      current = { kind, out, stop: voice(ctx, out) };
    },
    setVolume,
    stop() {
      if (ctx) fadeOutCurrent();
    },
  };
}
