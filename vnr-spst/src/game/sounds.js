// Âm thanh game — file tĩnh trong public/sound/, phát trên màn Host (loa phòng)
// và một số tương tác nhẹ phía Play. Trình duyệt chặn autoplay trước cú click
// đầu tiên nên module tự "mở khoá" bằng cú pointerdown đầu tiên.

const SOUNDS = {
  "answer-correct": { src: "/sound/answer-correct.mp3", volume: 1 },
  "answer-wrong": { src: "/sound/answer-wrong.mp3", volume: 1 },
  "card-abandoned": { src: "/sound/card-abandoned.mp3", volume: 1 },
  "card-flip": { src: "/sound/card-flip.mp3", volume: 1 },
  "dice-roll": { src: "/sound/dice-roll.mp3", volume: 1 },
  "effect-draw": { src: "/sound/effect-draw.mp3", volume: 0.9 },
  steal: { src: "/sound/steal.mp3", volume: 1 },
  victory: { src: "/sound/victory/victory.mp3", volume: 1 },
  "victory-appear": { src: "/sound/victory/appear.mp3", volume: 0.9 },
  "victory-slide": { src: "/sound/victory/slide-in-swoosh.mp3", volume: 0.9 },
  "timer-tick": { src: "/sound/timer-tick-7s-left.mp3", volume: 0.8 },
  "turn-pass": { src: "/sound/turn-pass.mp3", volume: 0.9 },
  "ui-click": { src: "/sound/ui-click.mp3", volume: 0.5 },

  // Stinger meme — dùng cho các khoảnh khắc kịch tính/châm biếm và meme drop
  "meme-vine-boom": { src: "/sound/sound-meme/vine-boom.mp3", volume: 0.9 },
  "meme-money": { src: "/sound/sound-meme/money-soundfx.mp3", volume: 0.9 },
  "meme-taco-bell": { src: "/sound/sound-meme/taco-bell-bong-sfx.mp3", volume: 0.9 },
  "meme-bell": { src: "/sound/sound-meme/undertakers-bell_2UwFCIe.mp3", volume: 0.9 },
  "meme-ack": { src: "/sound/sound-meme/ack.mp3", volume: 0.9 },
  "meme-quack": { src: "/sound/sound-meme/mac-quack.mp3", volume: 0.9 },
  "meme-rizz": { src: "/sound/sound-meme/rizz-sound-effect.mp3", volume: 0.9 },
};

const MEME_KEYS = [
  "meme-vine-boom",
  "meme-money",
  "meme-taco-bell",
  "meme-bell",
  "meme-ack",
  "meme-quack",
  "meme-rizz",
];

const cache = new Map();

function getAudio(key) {
  let audio = cache.get(key);
  if (!audio) {
    audio = new Audio(SOUNDS[key].src);
    audio.preload = "auto";
    cache.set(key, audio);
  }
  return audio;
}

// Cú click đầu tiên trên trang được dùng để nạp sẵn + phát-im-lặng một file,
// giúp mọi lời play() sau này không bị chính sách autoplay chặn.
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    () => {
      const audio = getAudio("ui-click");
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    },
    { once: true, capture: true }
  );
}

// key -> timeout id đang chờ tự cắt tiếng (xem tham số maxDurationMs bên dưới).
const stopTimers = new Map();

// maxDurationMs (tuỳ chọn): tự động cắt tiếng nếu file dài hơn khoảng thời
// gian này — dùng cho tiếng meme drop, vì sticker chỉ hiện trên màn hình đúng
// MEME_LIFETIME (hooks/useMemeDrop.js) trong khi vài file âm thanh (vd
// meme-bell 4.2s, meme-ack 5s) dài hơn khung đó, nghe rất lệch nếu để kêu
// tiếp sau khi hình đã biến mất.
export function playSound(key, maxDurationMs) {
  const def = SOUNDS[key];
  if (!def) return;
  const audio = getAudio(key);
  try {
    audio.currentTime = 0;
  } catch {
    /* chưa nạp xong thì bỏ qua reset */
  }
  audio.volume = def.volume ?? 1;
  const playing = audio.play();
  if (playing?.catch) playing.catch(() => {});

  clearTimeout(stopTimers.get(key));
  stopTimers.delete(key);
  if (maxDurationMs) {
    stopTimers.set(
      key,
      setTimeout(() => stopSound(key), maxDurationMs)
    );
  }
}

// Ngắt sound đang phát (dùng cho tiếng tick đồng hồ khi lượt trả lời kết thúc
// sớm). Không làm gì nếu sound chưa từng được phát.
export function stopSound(key) {
  if (!SOUNDS[key] || !cache.has(key)) return;
  const audio = cache.get(key);
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    /* chưa nạp xong thì bỏ qua reset */
  }
}

export function playRandomMemeSound(maxDurationMs) {
  playSound(MEME_KEYS[Math.floor(Math.random() * MEME_KEYS.length)], maxDurationMs);
}

// Random 1 âm thanh trong 1 "túi" theo nhóm sticker (xem
// config/memes.js#getMemeSoundPool) — fallback về random toàn bộ nếu túi
// rỗng/không xác định (memeId lạ, hoặc quên khai báo soundPool). Truyền
// maxDurationMs = MEME_LIFETIME để tiếng luôn cắt đúng lúc sticker biến mất.
export function playMemeSoundFromPool(pool, maxDurationMs) {
  if (!pool?.length) return playRandomMemeSound(maxDurationMs);
  playSound(pool[Math.floor(Math.random() * pool.length)], maxDurationMs);
}
