# Meme Files

Đặt các file meme (.gif, .png, .jpg) vào đây.

**Các file hiện có trong config** (`src/config/memes.js`):
- laugh.gif
- fire.gif
- clap.gif
- skull.gif
- celebrate.gif
- thumbsup.gif
- mindblown.gif
- cry.gif
- angry.gif
- love.gif
- cool.gif
- trophy.gif

**Hướng dẫn:**
1. Tải meme từ GIPHY, Tenor, hoặc tạo custom
2. Đổi tên file trùng với ID trong `memes.js`
3. Cập nhật trường `file` trong `memes.js` từ `null` thành đường dẫn ảnh:
   ```js
   { id: 'laugh', emoji: '😂', label: 'Cười lăn', file: '/memes/laugh.gif' }
   ```
4. Nếu không có file ảnh, hệ thống tự dùng emoji fallback
