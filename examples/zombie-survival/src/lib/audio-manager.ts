type SoundName = string;

interface SoundEntry {
  audio: HTMLAudioElement;
  loop: boolean;
}

const sounds = new Map<SoundName, SoundEntry>();
const oneShots = new Set<HTMLAudioElement>();

export function loadSound(name: SoundName, url: string, loop = false, volume = 1) {
  const audio = new Audio(url);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = "auto";
  sounds.set(name, { audio, loop });
}

export function playSound(name: SoundName) {
  const entry = sounds.get(name);
  if (!entry) return;
  if (!entry.loop) {
    entry.audio.currentTime = 0;
  }
  entry.audio.play().catch(() => {});
}

export function stopSound(name: SoundName) {
  const entry = sounds.get(name);
  if (!entry) return;
  entry.audio.pause();
  entry.audio.currentTime = 0;
}

export function playSoundOneShot(url: string, volume = 1) {
  const audio = new Audio(url);
  audio.volume = volume;
  oneShots.add(audio);
  audio.addEventListener("ended", () => oneShots.delete(audio), { once: true });
  audio.play().catch(() => {});
}

export function playRandomSound(urls: string[], volume = 1) {
  const url = urls[Math.floor(Math.random() * urls.length)];
  playSoundOneShot(url, volume);
}

export function disposeAllSounds() {
  sounds.forEach((entry) => {
    entry.audio.pause();
    entry.audio.src = "";
  });
  sounds.clear();
  oneShots.forEach((audio) => {
    audio.pause();
    audio.src = "";
  });
  oneShots.clear();
}
