import { seeded } from "./random.js";

// Odak sesi: Pomodoro'nun çalışma süresi boyunca arkada çalan sakin müzik/ortam sesi.
// Bu dosyada yalnızca saf (tarayıcıya dokunmayan, test edilebilen) yardımcılar var.
// Sesin kendisi lib/focusPlayer.js içinde Web Audio ile anlık üretilir: dosya indirilmez,
// internetsiz de çalışır ve telif sorunu olmaz.

// group: seçim listesinde başlık altında toplanır ("music" ezgili, "ambience" ezgisiz ortam sesi)
export const SOUND_KINDS = [
  { id: "off", label: "Kapalı" },
  { id: "piano", label: "Sakin piyano", group: "music" },
  { id: "musicbox", label: "Müzik kutusu", group: "music" },
  { id: "synth", label: "Gece sentezi", group: "music" },
  { id: "ambient", label: "Derin odak (ambiyans)", group: "ambience" },
  { id: "rain", label: "Yağmur", group: "ambience" },
  { id: "brown", label: "Kahverengi gürültü", group: "ambience" },
];

const SOUND_KEY = "odak.sesi";
const DEFAULT_SOUND = { kind: "piano", volume: 0.5 };
const KIND_IDS = new Set(SOUND_KINDS.map((k) => k.id));

export function loadSoundSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOUND_KEY));
    if (
      parsed &&
      KIND_IDS.has(parsed.kind) &&
      typeof parsed.volume === "number" &&
      parsed.volume >= 0 &&
      parsed.volume <= 1
    ) {
      return { kind: parsed.kind, volume: parsed.volume };
    }
  } catch {
    // okunamadı: varsayılana düş
  }
  return { ...DEFAULT_SOUND };
}

export function saveSoundSettings(settings) {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(settings));
  } catch {
    // kaydedilemedi: ayar yalnızca bu oturumda geçerli
  }
}

// Ses yalnızca çalışma turunda çalar; molada ve sayaç dururken susar
export function shouldPlay(phase, sound) {
  return Boolean(phase && phase.kind === "work" && sound.kind !== "off");
}

// Kaydırıcı 0–1 arası; kulak sesi doğrusal duymadığı için karesi alınır
// (0.5'te gerçekten "yarı yüksek" gibi gelir)
export function volumeToGain(volume) {
  const v = Math.min(1, Math.max(0, volume));
  return v * v;
}

// MIDI nota numarası → frekans (69 = La = 440 Hz, her 12 adım bir oktav)
export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// --- Piyano: yavaş, tekrar eden bir akor yürüyüşü ---
// Her ölçü 8 saniye. Notalar yalnızca o ölçünün akorundan seçilir, böylece rastgele
// olsa da hiçbir zaman "yanlış" ses çıkmaz. tones: 0=Do, 2=Re, 4=Mi, 5=Fa, 7=Sol, 9=La, 11=Si
export const BAR_SECONDS = 8;
export const CHORDS = [
  { name: "Cmaj7", root: 0, tones: [0, 4, 7, 11] },
  { name: "Am7", root: 9, tones: [9, 0, 4, 7] },
  { name: "Fmaj7", root: 5, tones: [5, 9, 0, 4] },
  { name: "G6sus2", root: 7, tones: [7, 9, 2, 4] },
  { name: "Em7", root: 4, tones: [4, 7, 11, 2] },
  { name: "Fmaj7", root: 5, tones: [5, 9, 0, 4] },
];

// Do majör gamı (ezgideki geçiş notaları bundan seçilir; akor sesleri de hep bu gamın içindedir)
export const SCALE = [0, 2, 4, 5, 7, 9, 11];
const BEAT = BAR_SECONDS / 8; // bir ölçü 8 vuruş, vuruş 1 sn (yavaş, dakikada 60)

const pitchClass = (midi) => ((midi % 12) + 12) % 12;

// Gamdaki derece (…-1, 0, 1, …) → MIDI. Derece 0 = orta Do (60)
function degreeToMidi(degree) {
  const octave = Math.floor(degree / 7);
  return 60 + octave * 12 + SCALE[((degree % 7) + 7) % 7];
}

// Verilen sese en yakın akor sesi (aynı uzaklıkta iki ses varsa aşağıdaki)
function nearestChordTone(midi, tones) {
  for (let d = 0; d < 7; d++) {
    if (tones.includes(pitchClass(midi - d))) return midi - d;
    if (tones.includes(pitchClass(midi + d))) return midi + d;
  }
  return midi;
}

// En yakın gam derecesi (akor sesini dereceye geri çevirmek için)
function midiToDegree(midi) {
  const octave = Math.floor((midi - 60) / 12);
  const idx = SCALE.indexOf(pitchClass(midi));
  return octave * 7 + (idx === -1 ? 0 : idx);
}

// Bir notanın üstündeki ilk verilen ses (sol el arpeji için)
function nextAbove(midi, pc) {
  let m = midi + 1;
  while (pitchClass(m) !== pc) m += 1;
  return m;
}

// Cümlenin motifi: hangi vuruşlarda nota çalınacağı ve ezginin inip çıkışı. Motif cümle numarasından
// türetilir (sabit tohum), böylece aynı cümlenin ölçüleri aynı motifi paylaşır: kulak tekrarı tanır.
function phraseMotif(phrase) {
  const r = seeded(9001 + phrase * 7919);
  const candidates = [1, 1.5, 2, 3, 3.5, 4, 5, 5.5, 6, 6.5];
  const count = 4 + Math.floor(r() * 2);
  const beats = new Set([[2, 4, 6][Math.floor(r() * 3)]]); // en az bir güçlü vuruş
  while (beats.size < count) beats.add(candidates[Math.floor(r() * candidates.length)]);
  const steps = Array.from({ length: count }, () => [-2, -1, -1, 1, 1, 2, 0][Math.floor(r() * 7)]);
  return { beats: [...beats].sort((a, b) => a - b), steps, lift: Math.floor(r() * 3) };
}

// --- Piyano: dört ölçülük cümleler ---
// Sol el: akorun kökü, beşlisi ve üçlüsüyle yavaş bir arpej. Sağ el: cümlenin motifi; ilk iki ölçü aynı
// ritim (tanıdık), üçüncüsü biraz daha hareketli, dördüncüsü uzun bir akor sesiyle "nefes alır".
// rng yalnızca insan elindeki küçük kaymaları (zamanlama, vuruş gücü) üretir.
export function pianoBar(rng, barIndex) {
  const chord = CHORDS[barIndex % CHORDS.length];
  const phrase = Math.floor(barIndex / 4);
  const inPhrase = barIndex % 4;
  const motif = phraseMotif(phrase);
  const human = () => (rng() - 0.5) * 0.03;
  const at = (beat) => Math.min(BAR_SECONDS - 0.05, Math.max(0, beat * BEAT + (beat === 0 ? 0 : human())));

  // Sol el
  let bass = 36 + chord.root;
  if (bass < 40) bass += 12;
  const fifth = nextAbove(bass, chord.tones[2]);
  const third = nextAbove(fifth, chord.tones[1]);
  const notes = [
    { hand: "left", beat: 0, offset: 0, midi: bass, velocity: 0.3 },
    { hand: "left", beat: 1.5, offset: at(1.5), midi: fifth, velocity: 0.2 + rng() * 0.05 },
    { hand: "left", beat: 3, offset: at(3), midi: third, velocity: 0.18 + rng() * 0.05 },
    { hand: "left", beat: 5, offset: at(5), midi: fifth, velocity: 0.16 + rng() * 0.04 },
  ];

  // Sağ el
  let beats = motif.beats;
  if (inPhrase === 2) beats = [...new Set([...beats, 7])].sort((a, b) => a - b); // biraz daha hareket
  if (inPhrase === 3) beats = [beats[0], 4]; // kapanış: iki nota, ikincisi uzun
  // Başlangıç: cümleye göre biraz yukarıda, akorun en yakın sesine oturur
  let midi = nearestChordTone(degreeToMidi(4 + motif.lift + inPhrase), chord.tones);
  let degree = midiToDegree(midi);
  beats.forEach((beat, i) => {
    if (i > 0) {
      let step = motif.steps[i % motif.steps.length];
      // Aralığın dışına taşmasın: tepeye yaklaşınca in, dibe yaklaşınca çık
      if (degreeToMidi(degree + step) > 79) step = -Math.abs(step || 1);
      if (degreeToMidi(degree + step) < 62) step = Math.abs(step || 1);
      degree += step;
      midi = degreeToMidi(degree);
    }
    // Güçlü vuruşta (0, 2, 4, 6) ezgi akorla uyuşsun
    if (beat % 2 === 0) {
      midi = nearestChordTone(midi, chord.tones);
      degree = midiToDegree(midi);
    }
    // Cümlenin üçüncü ölçüsünde biraz daha güçlü, kapanışta yumuşak (dinamik çizgi)
    const shape = [1, 0.95, 1.15, 0.8][inPhrase];
    const velocity = Math.min(0.55, (0.2 + rng() * 0.18) * shape);
    notes.push({ hand: "right", beat, offset: at(beat), midi, velocity });
  });
  return notes;
}

// --- Müzik kutusu: tiz, çınlayan, ninni gibi bir beşli gam ezgisi (Pastel tema ile iyi gider) ---
const PENTA = [0, 2, 4, 7, 9];
export function musicBoxBar(rng, barIndex) {
  const notes = [];
  // Ezgi yukarı-aşağı dalgalanan bir merdiven: her ölçü bir önceki ölçünün devamı gibi
  const r = seeded(77 + Math.floor(barIndex / 2));
  let idx = 5 + Math.floor(r() * 4); // PENTA sesleri 72'den itibaren sıralı dizinin indeksi
  const ladder = [];
  for (let m = 72; m <= 96; m++) if (PENTA.includes(m % 12)) ladder.push(m);
  for (let beat = 0; beat < 8; beat++) {
    // Her vuruşta nota var, bazı vuruşlarda yarım vuruşluk süs notası da
    const dir = r() < 0.5 ? -1 : 1;
    idx = Math.min(ladder.length - 1, Math.max(0, idx + dir * (1 + Math.floor(r() * 2))));
    notes.push({ offset: beat * BEAT, midi: ladder[idx], velocity: 0.22 + rng() * 0.16 });
    if (beat % 4 === 3 && r() < 0.6) {
      const grace = Math.max(0, idx - 2);
      notes.push({ offset: beat * BEAT + BEAT / 2, midi: ladder[grace], velocity: 0.14 + rng() * 0.08 });
    }
  }
  return notes;
}

// --- Gece sentezi: yavaş bir arpej, alçak bas ve uzun pad (Neon tema ile iyi gider) ---
// Minör renkli dört akor: Lam9 · Fa maj7 · Do maj7 · Mi m7
export const SYNTH_CHORDS = [
  { name: "Am9", root: 9, tones: [9, 0, 4, 11] },
  { name: "Fmaj7", root: 5, tones: [5, 9, 0, 4] },
  { name: "Cmaj7", root: 0, tones: [0, 4, 7, 11] },
  { name: "Em7", root: 4, tones: [4, 7, 11, 2] },
];
export function synthBar(barIndex) {
  const chord = SYNTH_CHORDS[barIndex % SYNTH_CHORDS.length];
  const ladder = [];
  for (let m = 57; m <= 76; m++) if (chord.tones.includes(m % 12)) ladder.push(m);
  // Yukarı çıkıp inen arpej (0 1 2 3 4 3 2 1 …); her ölçü bir adım kaydırılır, tekdüze olmasın
  const path = [0, 1, 2, 3, 4, 3, 2, 1];
  const step = BAR_SECONDS / 16;
  const arp = Array.from({ length: 16 }, (_, i) => {
    const k = path[(i + barIndex) % path.length] % ladder.length;
    return { offset: i * step, midi: ladder[k], velocity: i % 4 === 0 ? 0.32 : 0.2 };
  });
  let low = 33 + ((chord.root - 33 + 120) % 12);
  if (low > 44) low -= 12;
  const bass = [
    { offset: 0, midi: low, velocity: 0.4 },
    { offset: BAR_SECONDS / 2, midi: low, velocity: 0.32 },
  ];
  return { chord, arp, bass };
}
