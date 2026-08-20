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
│                    │    │ Nếu TẤT CẢ đội đều sai →      │
│ Đội trả lời đúng   │    │ → Hiện đáp án đúng              │
│ TIẾP TỤC LƯỢT     │    │ → Đóng lá bài (không hiệu ứng)│
└──────────────────┘    │ → Chuyển sang đội tiếp theo   │
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

## 🎬 Các bước Setup

### 1. Đăng nhập

| Bước | Hành động |
|------|-----------|
| 1 | Mở trang chủ, nhập mã PIN: `1986` |
| 2 | Chọn vai trò: **Điều phối viên** (Host) hoặc **Người chơi** (Player) |
| 3 | Nhấn **Vào chơi** |

### 2. Host (Điều phối viên)

- Mở tab/màn hình `/host`
- Quản lý bảng điểm, click lá bài, điều khiển lượt chơi
- Có thể nhập đáp án thủ công khi Play không kết nối

### 3. Player (Người chơi)

- Mở tab/màn hình `/pick-team` → chọn đội
- Sau đó vào `/play`
- Nhìn thấy câu hỏi同步 từ Host
- Chọn đáp án → kết quả sync về Host
- Tung xúc xắc khi bốc được bài 🎲

---

## 🔗 Đồng bộ (Sync)

Game hiện sử dụng **BroadcastChannel** + **localStorage** (chỉ đồng bộ trong cùng 1 trình duyệt).

Khi tích hợp **Supabase Realtime**, game sẽ:

| Tính năng | BroadcastChannel | Supabase Realtime |
|-----------|-----------------|-------------------|
| Đa thiết bị | ❌ | ✅ |
| Đa trình duyệt | ❌ | ✅ |
| Reload giữ state | ❌ | ✅ |
| Tốc độ | ⚡ Nhanh nhất | ⚡ Rất nhanh |

Xem hướng dẫn tích hợp tại `supabase/SETUP.md`.

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
│                   (nếu hết lượt → đóng bài) │
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
