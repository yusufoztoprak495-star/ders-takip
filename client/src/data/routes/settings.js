import { TRACK_IDS } from "../../lib/tracks.js";
import { ensureTrackSeeded } from "../seed.js";
import { requireBody, requireOneOf } from "../validation.js";

// Kullanıcıya yalnızca seçili hedef döner (hangi listelerin yüklendiği iç bilgidir)
export function getSettings({ state }) {
  return { status: 200, body: { track: state.settings.track } };
}

// Hedef değişince o hedefin hazır ders listesi (ilk seferde) yüklenir
export function updateSettings({ state, body }) {
  const track = requireOneOf(requireBody(body).track, "Çalışma hedefi", TRACK_IDS);
  state.settings.track = track;
  ensureTrackSeeded(state, track);
  return { status: 200, body: { track } };
}
