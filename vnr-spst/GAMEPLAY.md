# 🎮 Hướng dẫn trò chơi — HÀNH TRÌNH ĐỔI MỚI

> Trò chơi thuyết trình lịch sử Đảng — Đại hội VI (1986) → Đại hội VIII (1996) → Đại hội IX (2001) → 2006

---

## 📋 Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Số lượng đội | **7 đội** (Đỏ, Xanh, Vàng, Tím, Cam, Hồng, Lam) |
| Số lượng lá bài | **35 lá** (xáo ngẫu nhiên mỗi ván) |
| Số câu hỏi | **35 câu** |
| Thời gian trả lời | **15 giây** mỗi câu (trên màn hình Play) |
| Mã PIN | `1986` |

---

## 👥 Các đội

| Đội | Màu | Key |
|-----|-----|-----|
| Đội Đỏ | 🔴 `#7A2430` | `red` |
| Đội Xanh | 🔵 `#1F4E66` | `blue` |
| Đội Vàng | 🟡 `#B8860B` | `yellow` |
| Đội Tím | 🟣 `#4A3A6B` | `purple` |
| Đội Cam | 🟠 `#D97706` | `orange` |
| Đội Hồng | 🩷 `#DB2777` | `pink` |
| Đội Lam | 💙 `#2563EB` | `lam` |

> Host có thể chỉnh sửa tên đội trực tiếp trên màn hình.

---

## 🃏 3 loại câu hỏi

| Mã | Tên | Màu | Số câu | Chủ đề |
|----|-----|-----|--------|--------|
| **L** | Lý luận | 🔴 `#7A2430` | 8 câu | Đường lối Đổi mới, Đại hội VIII, IX |
| **S** | Số liệu thống kê | 🔵 `#1F4E66` | 8 câu | GDP, tăng trưởng, thống kê kinh tế |
| **V** | Vận dụng hiện nay | 🟢 `#3F5D45` | 7 câu | Nghị quyết 57, 68, mục tiêu chuyển đổi số |

---

## 🔄 luồng chơi 1 lượt

```
┌─────────────────────────────────────────────────────┐
│ 1. ĐANG CÓ LƯỢT CHỌN BÀI                          │
│    → Đội đang có quyền chọn 1 lá bài (1–35)        │
│    → Host click lá bài trên bảng                    │
└───────────────────────┬─────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│ 2. CÂU HỎI HIỆN RA                                 │
│    → Hiển thị câu hỏi + 4 đáp án (A, B, C, D)      │
│    → Đội đầu tiên trong lượt trả lời                │
│    → Có 15 giây để trả lời                          │
└───────────────────────┬─────────────────────────────┘
                        ▼
            ┌───────────┴───────────┐
            ▼                       ▼
    ┌───────────────┐       ┌───────────────┐
    │  TRẢ LỜI ĐÚNG │       │ TRẢ LỜI SAI   │
    │  ✅            │       │ ❌             │
    └───────┬───────┘       └───────┬───────┘
            ▼                       ▼
┌──────────────────┐    ┌──────────────────────────────┐
│ Hiện giải thích   │    │ Lượt trả lời chuyển sang đội  │
│ + Tung xúc xắc    │    │ KẾ TIẾP trong thứ tự vòng tròn │
│ nhận điểm + có    │    │                                │
│ thể thêm Cơ Hội   │    │ ⚠️ Nếu 3 đáp án sai liên tiếp  │
│ May Mắn (mục dưới)│    │ (hoặc hết 15s không ai đúng)   │
└──────────────────┘    │ → TIẾT LỘ đáp án đúng, không   │
                         │   có hiệu ứng gì                │
                         └──────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────┐
            │ Dù kết quả thế nào, quyền CHỌN LÁ BÀI MỚI  │
            │ luôn chuyển cho đội KẾ TIẾP theo thứ tự cố  │
            │ định (1→2→3→...) — thắng KHÔNG có nghĩa      │
            │ được chọn câu tiếp theo.                    │
            └──────────────────────────────────────────┘
```

---

## 🎲 Thưởng khi trả lời đúng (2 tầng)

Trả lời đúng luôn dẫn tới **Tầng 1** (chắc chắn có), rồi có 50% cơ hội thêm **Tầng 2**:

```
Trả lời đúng
   │
   ▼
[TẦNG 1 — luôn luôn] Host bấm "Tung xúc xắc may mắn"
   → tung xúc xắc 3D, CỘNG NGAY điểm theo mặt xúc xắc: 100 / 200 / 300 /
     400 / 500 / 600 (mỗi mặt 1 giá trị, tăng đều)
   ▼
[TẦNG 2 — 50/50 ngẫu nhiên] Có "Cơ Hội May Mắn" xuất hiện không?
   ├─ 50% KHÔNG → hết lượt, chuyển lượt chọn lá cho đội kế tiếp
   └─ 50% CÓ → đội đó (trên /play) hoặc Host (chọn hộ) được CHỌN 1 trong 2:
        ├─ Nhận chắc +200đ, hoặc
        └─ Thử vận may — bốc 1 trong 6 lá phép bên dưới (theo đúng tỉ lệ),
           kể cả khi lại ra "rút điểm/trừ điểm" thì tung xúc xắc thêm 1 lần
           nữa (cùng dải giá trị 100–600) — không xét lại Tầng 2 thêm lần
           thứ hai trong cùng 1 câu trả lời đúng
```

### 6 loại lá phép (bốc ở Tầng 2, "Thử vận may")

### 🎲 Rút Điểm May Mắn (12 lá)

- Tung xúc xắc 3D trên màn hình
- Kết quả: **+100 đến +600 điểm** theo mặt xúc xắc
- Xúc xắc có thể được tung từ **Play** (người chơi) hoặc **Host**

### 💸 Tung Xúc Xắc Trừ Điểm (4 lá)

- Tung xúc xắc 3D trên màn hình
- Kết quả: **-100 đến -600 điểm** theo mặt xúc xắc
- Điểm không xuống dưới 0
- Xúc xắc có thể được tung từ **Play** (người chơi) hoặc **Host**

### 💥 Mất Hết Điểm (3 lá)

- Toàn bộ điểm hiện có của đội đó → **về 0**
- 💀 Gây bất ngờ lớn nếu đội đang dẫn đầu!

### ♻️ Reset Điểm (3 lá)

- Điểm của **TẤT CẢ các đội** → về 0
- 🌪️ Reset toàn bộ trận đấu

### 🗡️ Cướp Điểm (4 lá)

- Chọn **1 đội khác** để cướp tối đa **500 điểm**
- Nếu đội bị cướp có ít hơn 500 điểm → lấy hết
- Host chọn đội nạn nhân trên màn hình

### 🔄 Đổi Điểm (3 lá)

- Chọn **1 đội khác** để **hoán đổi toàn bộ điểm số**
- Ví dụ: Đội A có 1200 điểm, Đội B có 500 điểm → Đội A còn 500, Đội B thành 1200

### Phân bổ 6 loại lá phép (bốc khi chọn "Thử vận may" ở Tầng 2)

| Loại | Số lá | Tỷ lệ |    
|------|-------|-------|
| 🎲 Rút Điểm May Mắn (+) | 12 | 37.5% |
| 💸 Tung Xúc Xắc Trừ Điểm (-) | 4 | 12.5% |
| 💥 Mất Hết Điểm | 3 | 9.4% |
| ♻️ Reset Điểm | 3 | 9.4% |
| 🗡️ Cướp Điểm | 4 | 12.5% |
| 🔄 Đổi Điểm | 3 | 9.4% |
| **Tổng** | **32** | **100%** |

> Bộ bài hiệu ứng được xáo ngẫu nhiên mỗi ván. Khi hết 32 lá → tự động xáo lại.

---

## 🏆 Kết thúc & Xếp hạng

- Khi **tất cả 35 lá bài** đã được mở → game kết thúc
- Hoặc Host có thể bấm **"Kết thúc & xếp hạng"** bất kỳ lúc nào
- Xếp hạng dựa trên **điểm số** (cao → thấp)
- Đội có điểm cao nhất = **🏆 Người chiến thắng**

---

## 😂 Thả meme (Meme Drop)

Bất kỳ lúc nào, người chơi trên `/play` có thể mở panel **"THẢ MEME"** và chọn 1 ảnh/GIF
trong 4 nhóm (Vui nhộn, Buồn bã, Ngạc nhiên, Khác). Meme sẽ "rơi" xuống màn hình `/host`
kèm tên và màu đội, tự biến mất sau ~3.5 giây. Có cooldown 3 giây giữa 2 lần thả.

- Đây là tính năng **thuần giải trí, không ảnh hưởng điểm số hay trạng thái ván chơi**.
- Vì không cần lưu trữ hay đồng bộ chặt, meme drop dùng kênh **Supabase Realtime Broadcast**
  (ephemeral, không qua bảng nào trong DB) thay vì BroadcastChannel — vẫn hoạt động
  xuyên nhiều thiết bị/trình duyệt.
- Mỗi lần thả, Host phát 1 âm thanh **random trong "túi" âm thanh riêng của nhóm sticker đó**
  (vd nhóm "Ngạc nhiên" luôn ra tiếng vine-boom, "Buồn bã" luôn ra tiếng chuông trầm) — vừa
  đúng "vibe" của sticker, vừa giữ được sự bất ngờ nếu 1 nhóm có nhiều âm thanh trong túi.
  Cấu hình túi âm thanh theo từng nhóm nằm ở `src/config/memes.js` (`soundPool`); 1 sticker
  riêng lẻ cũng có thể override bằng field `sound` nếu cần khớp âm thanh cố định 1-1.
- Âm thanh luôn tự cắt đúng lúc sticker biến mất (~3.5 giây, `MEME_LIFETIME` trong
  `hooks/useMemeDrop.js`) dù file âm thanh gốc dài hơn — tránh tiếng kêu tiếp sau khi hình
  đã biến mất khỏi màn hình.

---

## 🎬 Các bước Setup (nhiều thiết bị)

Tất cả thiết bị (Host và 7 đội) phải trỏ tới **cùng một bản deploy** đã cấu hình
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — xem `supabase/SETUP.md`.

| Bước | Hành động |
|------|-----------|
| 1 | Host mở `/host` trên máy trình chiếu — game mới (PIN `1986`) được tạo tự động và lưu trong Supabase |
| 2 | Host đọc mã PIN + mã đội (`red`, `blue`, `yellow`, `purple`, `orange`, `pink`, `lam`) cho từng nhóm |
| 3 | Mỗi đại diện đội mở `/pick-team` trên thiết bị riêng, nhập PIN, chọn đội, nhập mã đội |
| 4 | Sau khi tham gia, thiết bị chuyển tới `/play` và chờ Host mở lá bài đầu tiên |

### Host (Điều phối viên) — `/host`

- Là nơi **duy nhất** mở lá bài, chấm đáp án, bốc/áp dụng hiệu ứng, tung xúc xắc, reset và kết thúc ván
- Reload `/host` sẽ tự động khôi phục đúng ván đang chơi (lưu `gameId` trong `localStorage`)
- Có ô "Nhập thủ công" để ghi đáp án thay khi thiết bị Play không kết nối được

### Player (Người chơi) — `/pick-team` → `/play`

- `/play` chỉ đọc dữ liệu chia sẻ (`games`, `teams`, `game_state`) và chỉ có thể gửi **một** đáp án khi đúng lượt đội mình
- Reload `/play` khôi phục đúng câu hỏi/điểm/hiệu ứng hiện tại vì mọi state nằm trong Supabase, không nằm trong trình duyệt

---

## 🔗 Đồng bộ (Sync)

Game dùng **Supabase làm nguồn dữ liệu chung duy nhất** — không còn `BroadcastChannel`
hay `localStorage` cho state chia sẻ:

- `games`, `teams`, `game_state`, `game_events` được đọc lần đầu qua `loadGame`, sau đó
  theo dõi thay đổi realtime qua `postgres_changes` (`subscribeToGame`).
- Host là actor duy nhất ghi vào `game_state`/`teams`; mỗi lần ghi tăng `revision` để
  tránh ghi đè chồng chéo.
- Player chỉ ghi một dòng vào `game_events` (loại `PLAYER_ANSWER`); Host đọc sự kiện này,
  xác thực đúng đội/đúng lá bài/đúng revision rồi mới cập nhật `game_state`.
- Thả meme dùng kênh Supabase Realtime Broadcast riêng (ephemeral, không lưu DB) — xem mục
  "Thả meme" ở trên.
- `localStorage` trên mỗi thiết bị chỉ giữ `gameId`/`teamKey` (Player) hoặc `gameId` (Host)
  để tiện việc rejoin sau khi reload — không phải nơi lưu trạng thái ván chơi.

Xem chi tiết schema và cấu hình tại `supabase/SETUP.md`.

---

## 📊 Tóm tắt flow 1 ván chơi

```
Mở PIN 1986
    │
    ▼
Host tạo game (7 đội, 35 lá bài xáo)
    │
    ▼
┌─── Loop: Mỗi lượt ────────────────────────────────┐
│                                                     │
│  Đội có quyền chọn lá bài (theo thứ tự cố định)     │
│       │                                             │
│       ▼                                             │
│  Host click lá bài (1–35)                           │
│       │                                             │
│       ▼                                             │
│  Câu hỏi hiện ra ──► Player chọn đáp án             │
│       │                                             │
│       ├── ĐÚNG ──► Tung xúc xắc, +100..600 điểm     │
│       │           + 50% thêm Cơ Hội May Mắn          │
│       │             (chọn +200đ hoặc bốc lá phép)    │
│       │                                             │
│       └── SAI ──► Lượt trả lời chuyển đội kế        │
│                   + Nếu 3 đáp án sai (hoặc hết giờ) │
│                     → TIẾT LỘ đáp án đúng            │
│                                                     │
│  Dù kết quả nào, quyền CHỌN LÁ tiếp theo luôn        │
│  chuyển cho đội KẾ TIẾP theo thứ tự cố định          │
│                                                     │
└─────────────────────────────────────────────────────┘
    │
    ▼
Khi hết 35 lá → Hiện bảng xếp hạng 🏆
```

---

## ⚙️ Cài đặt nhanh

```bash
# Cài Supabase client
npm install @supabase/supabase-js

# Chạy SQL schema
# Vào Supabase Dashboard → SQL Editor → paste supabase/schema.sql → Run

# Chạy dev
npm run dev
```
