import catLaugh from '../assets/meme/fun/gif_fun/Cat Laugh GIF.gif'
import dogLaughing from '../assets/meme/fun/gif_fun/Dog Laughing GIF.gif'
import lerolero from '../assets/meme/fun/gif_fun/Lerolero Otag Sticker.gif'
import sad1 from '../assets/meme/sad/kindpng_1046489.png'
import suprise1 from '../assets/meme/suprise/kindpng_1290620.png'
import suprise2 from '../assets/meme/suprise/kindpng_3708768.png'
import other1 from '../assets/meme/other/kindpng_7159180.png'
import other2 from '../assets/meme/other/pngwing.com.png'
import catGive from '../assets/meme/other/gif_other/Cat Give GIF.gif'

/**
 * Danh sách meme theo folder.
 * folder: { id, name, icon } — folder hiển thị trên UI
 * memes: array meme thuộc folder đó
 */
const MEME_FOLDERS = [
  {
    folder: { id: 'fun', name: 'Vui nhộn', icon: '😂' },
    memes: [
      { id: 'fun_cat_laugh', label: 'Mèo cười', file: catLaugh },
      { id: 'fun_dog_laugh', label: 'Chó cười', file: dogLaughing },
      { id: 'fun_lerolero', label: 'Lerolero', file: lerolero },
    ],
  },
  {
    folder: { id: 'sad', name: 'Buồn bã', icon: '😢' },
    memes: [
      { id: 'sad1', label: 'Buồn', file: sad1 },
    ],
  },
  {
    folder: { id: 'suprise', name: 'Ngạc nhiên', icon: '😮' },
    memes: [
      { id: 'suprise1', label: 'Ngạc nhiên 1', file: suprise1 },
      { id: 'suprise2', label: 'Ngạc nhiên 2', file: suprise2 },
    ],
  },
  {
    folder: { id: 'other', name: 'Khác', icon: '🙂' },
    memes: [
      { id: 'other_cat_give', label: 'Mèo đưa', file: catGive },
      { id: 'other1', label: 'Khác 1', file: other1 },
      { id: 'other2', label: 'Khác 2', file: other2 },
    ],
  },
]

// Flatten for quick lookup
const MEMES = MEME_FOLDERS.flatMap(f => f.memes)

export { MEME_FOLDERS }
export default MEMES
