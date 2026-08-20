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
│ Hiện giải thích   │    │ Lượt chuyển sang đội KẾ TIẾP  │
│ + Bốc lá hiệu ứng │    │ trong thứ tự vòng tròn         │
│ (bài may mắn 🎲)  │    │                                │
│                    │    │ ⚠️ Nếu 3 đáp án sai liên tiếp  │
│ Đội trả lời đúng   │    │ → BỎ câu hỏi (không hiện đáp │
│ TIẾP TỤC LƯỢT     │    │   án, không hiệu ứng)          │
└──────────────────┘    │ → Đội tiếp theo được quyền     │
                         │   CHỌN CÂU HỎI MỚI           │
                         └──────────────────────────────┘
```

---

## 🎲 Bài hiệu ứng may mắn (Effect Cards)

Khi trả lời đúng, đội đó bốc **1 lá bài hiệu ứng** từ bộ 35 lá. Sau đây là các loại:

### 🎲 Rút Điểm May Mắn (12 lá)

- Tung xúc xắc 3D trên màn hình
- Kết quả: **+1 đến +5 điểm** (mặt xúc xắc 6 được tính = 5)
- Xúc xắc có thể được tung từ **Play** (người chơi) hoặc **Host**

### 🎲 Tung Xúc Xắc Trừ Điểm (4 lá)

- Tung xúc xắc 3D trên màn hình
- Kết quả: **-1 đến -5 điểm** (mặt xúc xắc 6 được tính = 5)
- Điểm không xuống dưới 0
- Xúc xắc có thể được tung từ **Play** (người chơi) hoặc **Host**

### 💥 Mất Hết Điểm (3 lá)

- Toàn bộ điểm hiện có của đội đó → **về 0**
- 💀 Gây bất ngờ lớn nếu đội đang dẫn đầu!

### ♻️ Reset Điểm (3 lá)

- Điểm của **TẤT CẢ các đội** → về 0
- 🌪️ Reset toàn bộ trận đấu

### 🗡️ Cướp Điểm (4 lá)

- Chọn **1 đội khác** để cướp **5 điểm**
- Nếu đội bị cướp có ít hơn 5 điểm → lấy hết
- Host chọn đội nạn nhân trên màn hình

### 🔄 Đổi Điểm (3 lá)

- Chọn **1 đội khác** để **hoán đổi toàn bộ điểm số**
- Ví dụ: Đội A có 12 điểm, Đội B có 5 điểm → Đội A becomes 5, Đội B becomes 12

### Phân bổ bài hiệu ứng

| Loại | Số lá | Tỷ lệ |    
|------|-------|-------|
| 🎲 Rút Điểm May Mắn (+) | 12 | 37.5% |
| 🎲 Tung Xúc Xắc Trừ Điểm (-) | 4 | 12.5% |
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
┌─── Loop: Mỗi lượt ────────────────────────┐
│                                             │
│  Đội có quyền chọn lá bài                   │
│       │                                     │
│       ▼                                     │
│  Host click lá bài (1–35)                   │
│       │                                     │
│       ▼                                     │
│  Câu hỏi hiện ra ──► Player chọn đáp án     │
│       │                                     │
│       ├── ĐÚNG ──► +0 điểm câu hỏi          │
│       │           + Bốc bài hiệu ứng        │
│       │           + random effect           │
│       │           + Đội tiếp tục lượt       │
│       │                                     │
│       └── SAI ──► Lượt chuyển đội kế       │
│                   + Nếu 3 đáp án sai →      │
│                     BỎ câu, chọn câu mới   │
│                                             │
└─────────────────────────────────────────────┘
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
