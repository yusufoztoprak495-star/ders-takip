// Odak sesi: Pomodoro'nun çalışma süresi boyunca arkada çalan sakin müzik/ortam sesi.
// Bu dosyada yalnızca saf (tarayıcıya dokunmayan, test edilebilen) yardımcılar var.
// Sesin kendisi lib/focusPlayer.js içinde Web Audio ile anlık üretilir: dosya indirilmez,
// internetsiz de çalışır ve telif sorunu olmaz.

export const SOUND_KINDS = [
  { id: "off", label: "Kapalı" },
  { id: "piano", label: "Sakin piyano" },
  { id: "ambient", label: "Derin odak (ambiyans)" },
  { id: "rain", label: "Yağmur" },
  { id: "brown", label: "Kahverengi gürültü" },
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

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// Bir ölçünün notaları: [{ offset (sn), midi, velocity (0–1) }]
// rng: 0–1 arası sayı veren fonksiyon (testte sabit tohumlu, uygulamada Math.random)
export function pianoBar(rng, barIndex) {
  const chord = CHORDS[barIndex % CHORDS.length];
  // Bas notası: akorun kökü, alçak oktavda, ölçünün başında
  let bass = 36 + chord.root;
  if (bass < 40) bass += 12;
  const notes = [{ offset: 0, midi: bass, velocity: 0.32 }];

  // Ezgi: ölçüyü 16 yarım-vuruşa böl, 3–6 tanesine nota koy (gerisi sessizlik = nefes)
  const count = 3 + Math.floor(rng() * 4);
  const slots = new Set();
  while (slots.size < count) slots.add(1 + Math.floor(rng() * 15));
  for (const slot of [...slots].sort((a, b) => a - b)) {
    const tone = pick(rng, chord.tones);
    let midi = (rng() < 0.6 ? 60 : 72) + tone;
    if (midi > 81) midi -= 12; // çok tiz notalar yorar
    notes.push({ offset: slot * 0.5, midi, velocity: 0.14 + rng() * 0.28 });
  }
  return notes;
}
