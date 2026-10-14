// Çalışma hedefleri: uygulama aynı anda tek bir hedef için çalışır.
// Her dersin bir hedefi (track) vardır; seçili hedefin dışındaki dersler ve kayıtları gizlenir, silinmez.
export const TRACKS = [
  {
    id: "yks",
    label: "YKS",
    title: "YKS hazırlığı",
    hint: "TYT ve AYT dersleri hazır gelir",
    groupLabel: "Sınav",
  },
  {
    id: "dgs",
    label: "DGS",
    title: "DGS hazırlığı",
    hint: "Sayısal ve sözel bölüm konuları hazır gelir",
    groupLabel: "Bölüm",
  },
  {
    id: "uni",
    label: "Üniversite",
    title: "Üniversite dersleri",
    hint: "Kendi derslerini ve konularını sen eklersin",
    groupLabel: "Dönem",
  },
];

export const TRACK_IDS = TRACKS.map((t) => t.id);
export const DEFAULT_TRACK = "yks";

export function isTrack(value) {
  return TRACK_IDS.includes(value);
}

export function trackInfo(id) {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

// Dersin ekranda görünen adı: grup (TYT, Sayısal, 1. Dönem...) varsa parantez içinde
export function subjectLabel(name, group) {
  return group ? `${name} (${group})` : name;
}
