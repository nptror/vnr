import catLaugh from '../assets/meme/fun/gif_fun/Cat Laugh GIF.webp'
import dogLaughing from '../assets/meme/fun/gif_fun/Dog Laughing GIF.webp'
import lerolero from '../assets/meme/fun/gif_fun/Lerolero Otag Sticker.webp'
import catDance from '../assets/meme/fun/gif_fun/cat-dance.webp'
import catLew from '../assets/meme/fun/gif_fun/cat-lew.webp'
import funnyCat from '../assets/meme/fun/gif_fun/funny-cat.webp'
import hamsterDance from '../assets/meme/fun/gif_fun/hamster-dance.webp'
import pugDogDancing from '../assets/meme/fun/gif_fun/pug-dog-dancing.webp'
import rigbyCat from '../assets/meme/fun/gif_fun/rigby-cat.webp'
import sad1 from '../assets/meme/sad/kindpng_1046489.png'
import suprise1 from '../assets/meme/suprise/kindpng_1290620.png'
import suprise2 from '../assets/meme/suprise/kindpng_3708768.png'
import catEating from '../assets/meme/suprise/cat-eating.webp'
import sharkWow from '../assets/meme/suprise/gif_suprise/shark-wow.webp'
import other1 from '../assets/meme/other/kindpng_7159180.png'
import other2 from '../assets/meme/other/pngwing.com.png'
import catGive from '../assets/meme/other/gif_other/Cat Give GIF.webp'
import catAngry from '../assets/meme/other/gif_other/cat-angry.webp'
import catNo from '../assets/meme/other/gif_other/cat-no.webp'
import catYes from '../assets/meme/other/gif_other/cat-yes.webp'

/**
 * Danh sách meme theo folder.
 * folder: { id, name, icon, soundPool } — folder hiển thị trên UI.
 *   soundPool: mảng key âm thanh (xem game/sounds.js) "phù hợp tâm trạng"
 *   của folder đó — khi thả 1 sticker, Host random 1 key trong pool này
 *   thay vì random hoàn toàn trong mọi âm thanh của game. Vẫn giữ được
 *   cảm giác bất ngờ/đa dạng nhưng luôn đúng "vibe" của nhóm sticker.
 * memes: array meme thuộc folder đó — mỗi meme có thể override bằng field
 *   `sound` (1 key cố định) nếu muốn 1 sticker riêng biệt có âm thanh
 *   luôn-luôn-là-nó thay vì random trong soundPool của folder; không bắt
 *   buộc, chỉ dùng khi thật sự cần khớp 1-1 cho 1 sticker cụ thể.
 * Thêm sticker/âm thanh mới sau này: bỏ file vào đúng folder + thêm entry
 * vào mảng memes — không cần đụng tới logic chọn âm thanh ở Host.jsx.
 */
const MEME_FOLDERS = [
  {
    folder: { id: 'fun', name: 'Vui nhộn', icon: '😂', soundPool: ['meme-quack', 'meme-ack', 'meme-rizz', 'meme-taco-bell'] },
    memes: [
      { id: 'fun_cat_laugh', label: 'Mèo cười', file: catLaugh },
      { id: 'fun_dog_laugh', label: 'Chó cười', file: dogLaughing },
      { id: 'fun_lerolero', label: 'Lerolero', file: lerolero },
      { id: 'fun_cat_dance', label: 'Nhảy múa', file: catDance },
      { id: 'fun_cat_lew', label: 'Mèo lè lưỡi', file: catLew },
      { id: 'fun_funny_cat', label: 'Mèo phấn khích', file: funnyCat },
      { id: 'fun_hamster_dance', label: 'Hamster nhảy', file: hamsterDance },
      { id: 'fun_pug_dog_dancing', label: 'Cuộn tròn', file: pugDogDancing },
      { id: 'fun_rigby_cat', label: 'Liếm láp', file: rigbyCat },
    ],
  },
  {
    folder: { id: 'sad', name: 'Buồn bã', icon: '😢', soundPool: ['meme-bell'] },
    memes: [
      { id: 'sad1', label: 'Buồn', file: sad1 },
    ],
  },
  {
    folder: { id: 'suprise', name: 'Ngạc nhiên', icon: '😮', soundPool: ['meme-vine-boom'] },
    memes: [
      { id: 'suprise1', label: 'Ngạc nhiên 1', file: suprise1 },
      { id: 'suprise2', label: 'Ngạc nhiên 2', file: suprise2 },
      { id: 'suprise_cat_eating', label: 'Người ngoài hành tinh', file: catEating },
      { id: 'suprise_shark_wow', label: 'Cá mập', file: sharkWow },
    ],
  },
  {
    folder: { id: 'other', name: 'Khác', icon: '🙂', soundPool: ['meme-money', 'meme-taco-bell'] },
    memes: [
      { id: 'other_cat_give', label: 'Mèo đưa', file: catGive },
      { id: 'other1', label: 'Khác 1', file: other1 },
      { id: 'other2', label: 'Khác 2', file: other2 },
      { id: 'other_cat_angry', label: 'Sinh vật bí ẩn', file: catAngry },
      { id: 'other_cat_no', label: 'Doge 1', file: catNo },
      { id: 'other_cat_yes', label: 'Doge 2', file: catYes },
    ],
  },
]

// Flatten for quick lookup
const MEMES = MEME_FOLDERS.flatMap(f => f.memes)

// memeId -> mảng key âm thanh hợp lệ để random khi thả sticker đó: ưu tiên
// override riêng của sticker (`sound`) nếu có, không thì dùng soundPool của
// folder chứa nó. Trả về [] nếu không tìm thấy memeId (Host tự fallback).
export function getMemeSoundPool(memeId) {
  for (const f of MEME_FOLDERS) {
    const meme = f.memes.find((m) => m.id === memeId)
    if (meme) return meme.sound ? [meme.sound] : f.folder.soundPool || []
  }
  return []
}

export { MEME_FOLDERS }
export default MEMES
