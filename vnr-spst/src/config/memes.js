import sad1 from '../assets/meme/sad/kindpng_1046489.png'
import suprise1 from '../assets/meme/suprise/kindpng_1290620.png'
import suprise2 from '../assets/meme/suprise/kindpng_3708768.png'
import other1 from '../assets/meme/other/kindpng_7159180.png'
import other2 from '../assets/meme/other/pngwing.com.png'

/**
 * Danh sách meme theo folder.
 * folder: { id, name, icon } — folder hiển thị trên UI
 * memes: array meme thuộc folder đó
 */
const MEME_FOLDERS = [
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
      { id: 'other1', label: 'Khác 1', file: other1 },
      { id: 'other2', label: 'Khác 2', file: other2 },
    ],
  },
]

// Flatten for quick lookup
const MEMES = MEME_FOLDERS.flatMap(f => f.memes)

export { MEME_FOLDERS }
export default MEMES
