// Odak sesi çalar: Web Audio API ile sesi tarayıcıda anlık üretir (ses dosyası yok).
// Yapı: her ses türü bir "ses kaynağı" (voice) üretir → kendi ses düğmesi (fade) → ana ses düğmesi
// → sıkıştırıcı (ani yüksek sesleri yumuşatır) → hoparlör.
import { BAR_SECONDS, CHORDS, midiToFrequency, pianoBar, volumeToGain } from "./focusSound.js";

const FADE_SECONDS = 1.6;
const LOOKAHEAD_SECONDS = 2; // notalar bu kadar önceden planlanır; sekme arkada kalsa da aksamaz

// --- Ortak parçalar ---

// Yapay yankı (reverb): sönümlenen gürültüden üretilen "oda sesi"
function createReverb(ctx, seconds = 3.2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

// Döngüyle çalınacak gürültü: "white" düz hışırtı, "brown" daha boğuk ve derin uğultu
function createNoiseBuffer(ctx, type, seconds = 6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
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

// --- Ses türleri ---

// Sakin piyano: her nota birkaç sinüs dalgasının (ana ses + üst tonlar) hızla vurulup
// yavaşça sönmesiyle oluşur; parlaklık da zamanla azalır, gerçek piyano teline benzer.
function pianoVoice(ctx, out) {
  const reverb = createReverb(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  const dry = ctx.createGain();
  dry.gain.value = 0.9;
  reverb.connect(wet).connect(out);
  dry.connect(out);

  function playNote(midi, time, velocity) {
    const freq = midiToFrequency(midi);
    // Tiz notalar daha kısa, pes notalar daha uzun çınlar
    const decay = midi < 55 ? 5.5 : midi < 70 ? 4 : 3;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(freq * 6, 5000), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 300), time + decay * 0.6);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(velocity, time + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    filter.connect(env);
    env.connect(dry);
    env.connect(reverb);
    const partials = [
      [1, 1, "sine"],
      [2, 0.35, "sine"],
      [3, 0.12, "triangle"],
      [4, 0.05, "sine"],
    ];
    for (const [mult, amp, type] of partials) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      osc.detune.value = (Math.random() - 0.5) * 6; // çok hafif kayma: daha canlı ses
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(time + decay + 0.1);
    }
  }

  const stopScheduler = createBarScheduler(ctx, (bar, start) => {
    for (const n of pianoBar(Math.random, bar)) playNote(n.midi, start + n.offset, n.velocity);
  });
  return () => stopScheduler();
}

// Derin odak: akorlar yumuşak, uzun ve üst üste binen tabaka sesler (pad) olarak çalar
function ambientVoice(ctx, out) {
  const reverb = createReverb(ctx, 5);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  reverb.connect(wet).connect(out);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 650;
  filter.Q.value = 0.4;
  // Filtreyi çok yavaş açıp kapatan salınım: ses "nefes alır"
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 250;
  lfo.connect(lfoDepth).connect(filter.frequency);
  lfo.start();
  filter.connect(out);
  filter.connect(reverb);

  const span = BAR_SECONDS * 2; // her akor 16 sn
  const stopScheduler = createBarScheduler(ctx, (bar, start) => {
    if (bar % 2 !== 0) return; // yalnızca çift ölçülerde yeni akor
    const chord = CHORDS[(bar / 2) % CHORDS.length];
    const end = start + span + 4; // sonraki akorla 4 sn üst üste biner
    for (const tone of chord.tones.slice(0, 3)) {
      for (const cents of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = midiToFrequency(48 + tone);
        osc.detune.value = cents;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(0.045, start + 4);
        env.gain.setValueAtTime(0.045, end - 4);
        env.gain.linearRampToValueAtTime(0, end);
        osc.connect(env).connect(filter);
        osc.start(start);
        osc.stop(end + 0.1);
      }
    }
  });
  return () => {
    stopScheduler();
    lfo.stop();
  };
}

// Yağmur: filtrelenmiş hışırtı + alçak bir uğultu; şiddeti çok yavaşça dalgalanır
function rainVoice(ctx, out) {
  const hiss = loopSource(ctx, createNoiseBuffer(ctx, "white"));
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4200;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.16;
  hiss.connect(hp).connect(lp).connect(hissGain).connect(out);

  const rumble = loopSource(ctx, createNoiseBuffer(ctx, "brown"));
  const rumbleLp = ctx.createBiquadFilter();
  rumbleLp.type = "lowpass";
  rumbleLp.frequency.value = 350;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.5;
  rumble.connect(rumbleLp).connect(rumbleGain).connect(out);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const depth = ctx.createGain();
  depth.gain.value = 0.04;
  lfo.connect(depth).connect(hissGain.gain);

  hiss.start();
  rumble.start();
  lfo.start();
  return () => {
    hiss.stop();
    rumble.stop();
    lfo.stop();
  };
}

// Kahverengi gürültü: sabit, derin bir uğultu; dış sesleri maskelemek için
function brownVoice(ctx, out) {
  const src = loopSource(ctx, createNoiseBuffer(ctx, "brown"));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.value = 0.6;
  src.connect(lp).connect(g).connect(out);
  src.start();
  return () => src.stop();
}

const VOICES = { piano: pianoVoice, ambient: ambientVoice, rain: rainVoice, brown: brownVoice };

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
