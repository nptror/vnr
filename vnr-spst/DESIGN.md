# DESIGN.md — Hành Trình Đổi Mới

Tài liệu này ghi lại **design system đang thực sự chạy trong code** của app `vnr-spst`,
để người làm tiếp có thể thêm màn hới / component mới mà vẫn giữ được đúng "chất"
của sản phẩm. Mọi giá trị ở đây đều truy được về file nguồn theo dạng `file:line`.

> Nguyên tắc đọc tài liệu: nếu token ở đây khác code, **code là chuẩn** — hãy cập nhật
> lại `DESIGN.md` cùng lúc sửa code.

---

## 1. Tổng quan

| Mục | Giá trị |
|-----|---------|
| Tên sản phẩm | **HÀNH TRÌNH ĐỔI MỚI** |
| Chủ đề | Trò chơi thuyết trình lịch sử Đảng — Đại hội VI (1986) → VIII (1996) → IX (2001) → 2006 |
| Ngôn ngữ UI | Tiếng Việt, không dịch tự động |
| Định dạng hình | Desktop-first (máy chiếu của Host) + mobile-first cho thiết bị từng đội |
| Stack UI | React 19 + Vite, **không có UI framework / component library** — toàn bộ CSS viết tay |
| Nguồn dữ liệu | Supabase (Postgres + Realtime) — không liên quan design, xem `docs/superpowers/specs/` |

### Ngôn ngữ thị giác: "Văn kiện Lưu trữ quốc gia"

Toàn bộ giao diện mô phỏng **một tờ văn kiện hành chính cũ**: giấy vàng đã ngả, mực
son đỏ thẫm, viền kép, con dấu tròn nghiêng, góc bìa hơi lệch, đổ bóng kiểu in
(offset cứng), số liệu gõ như máy đánh chữ. Mọi chi tiết "sang trọng hiện đại"
(biển gradient kim loại, blur, bo góc lớn) là **ngoại lệ có chủ đích** dành riêng cho
các khoảnh khắc ăn mừng (bục nhấp, lá hiệu ứng), không áp dụng cho màn hình nhập liệu.

---

## 2. Nguyên tắc thiết kế

1. **Mọi thứ là một tờ giấy.** Nền trang luôn là giấy (vàng `#F1E7CF` hoặc trắng lạnh
   `#faf8ff`); vùng nội dung là một "lá văn kiện" bo góc nhẹ, viền kép hoặc viền 1px,
   có bóng đổ lệch 1–4px. Không dùng card bo tròn + shadow mềm kiểu SaaS hiện đại.
2. **Mực son đỏ là hành động chính.** Đỏ thẫm `#7A2430` (nền dày) và `#5c0c1c` (chữ
   tiêu đề) chỉ dùng cho: nút chính, tiêu đề trang người chơi, dải màu nhóm câu hỏi
   Lý luận, trạng thái lỗi. Dùng đỏ cho thông tin thường sẽ mất nghĩa.
3. **Vàng kim là danh vọng.** Vàng chỉ dành cho: huy hiệu/điểm cao, lá hiệu ứng bốc
   được, xếp hạng nhất, confetti. Không dùng vàng cho nút thường.
4. **Xanh rừng = đúng, đỏ lửa = sai.** Ngữ nghĩa điểm luôn gắn màu: cộng điểm/xanh
   rừng, trừ điểm/đỏ `#9B2335`, sai/`#ba1a1a`. Người chơi phải đọc được trạng thái
   mà không cần đọc chữ.
5. **Số luôn nổi.** Điểm, số thứ tự lá bài, số đồng hồ, mã PIN dùng font monospace
   và serif đậm, cỡ lớn — đây là thứ được nhìn từ xa trên máy chiếu.
6. **Lệch 0.2–0.6° là có chủ đích.** Giấy được cầm lên bằng tay, không phải render từ
   máy. Áp dụng cho lá văn kiện, thẻ đội, nút thẻ. Không lạm dụng ở vùng nhập liệu.
7. **Chiều cao tối thiểu cho màn hình lớn.** Nội dung Host phải đọc được từ hàng ghế
   cuối: nút ≥ 20px, câu hỏi ≥ 28px, điểm ≥ 26px, timer 40px.

---

## 3. Design tokens

### 3.1 Màu — nền & bề mặt

| Token | Hex | Dùng ở đâu |
|-------|-----|------------|
| `--paper` | `#F1E7CF` | Nền trang giấy vàng: Host (`Host.css:2`), Landing `.reg-body`, `/pin` `.pin-body` |
| `--paper-dark` | `#E6D8B8` | Bảng bài `.board`, chân bục `.wp-pod-base`, nền `.team-code` |
| `--paper-ink-active` | `#FBF3E0` | Nền hàng đội đang có lượt |
| `--doc` | `#fdfbf7` | Lá văn kiện "trắng": Landing `.doc-card`, `/pin` `.pin-card`, mặt trước lá hiệu ứng, `.sf-stage`, modal chọn đội |
| `--surface` | `#ffffff` | Thẻ/bảng trắng: `.teams`, `.controls`, `.ncard`, `.pt-card`, `.play-doc`, `.opt-btn` |
| `--surface-cool` | `#faf8ff` | Nền lạnh dùng cho nội dung số: `/play`, sidebar, `.meme-panel`, mặt xúc xắc |
| `--surface-tint` | `#f1f3ff` | Vùng nhấn: `.team-info-bar`, `.opt-btn.selected`, `.sidebar-item.active` |
| `--surface-hover` | `#e1e8ff` | Hover option |
| `--surface-accent` | `#d3d9f0` | Footer bản quyền, nút phụ `.pin-save-btn` |
| `--surface-dock` | `#f7f3e8` | Dock hành động dưới lá hiệu ứng |
| `--bg` pick-team | `#f4f1ea` | Nền trang `/pick-team` |
| `--success-bg` | `#e8f5e9` | Banner kết quả đúng |

### 3.2 Màu — mực & chữ

| Token | Hex | Vai trò |
|-------|-----|---------|
| `--ink` | `#141b2c` | Mực chính ở Landing / `/pin` / `/play` / `/pick-team` |
| `--ink` (Host) | `#22293A` | Mực chính trong `Host.css` — **cùng ý, khác hệ mã** |
| heading global | `#08060d` | `--text-h` của `index.css` (mặc định, hầu như bị override) |
| `--text-2` | `#554243` | Chữ phụ, caption, label nhỏ, mô tả |
| `--text-3` | `#6b6455` | Chữ phụ trong Host + mô tả lá hiệu ứng |
| `--text-4` | `#887272` | Chữ rất nhạt / viền mảnh, chờ đợi |
| `--line` | `#A9895F` | Viền giấy nâu trong Host (`.board`, `.teams`, `.opt-btn`, `.rank`) |
| `--line-2` | `#887272` | Viền tím-nâu dùng ở Player pages, `.meme-panel`, `.meme-tab` |
| `--line-3` | `#dbc0c1` | Viền hairline, chấm halftone, `.pt-card-divider` |
| `--line-4` | `#d8d2c2` | Viền đứt trên dock lá hiệu ứng |
| `--muted` | `#B4B2A9` | Lá đã dùng, hiệu ứng `lose_all` |
| scrollbar | `rgba(20,16,10,.3)` | Thumb tròn 10px, nền trong suốt (`index.css:65-76`) |

### 3.3 Màu — thương hiệu & ngữ nghĩa

| Token | Hex | Dùng cho |
|-------|-----|----------|
| Maroon đậm | `#5c0c1c` | Tiêu đề masthead người chơi, focus input PIN, popup trên `/play` |
| Maroon | `#7A2430` | Nút chính `.host-btn`, nền `.role-card.coordinator`, nhóm câu L |
| Maroon dark | `#5A1A22` | Eyebrow, label nhỏ, `.eff-target` |
| Gold | `#B8860B` | Đội Vàng, viền trên lá hiệu ứng, `.winner-card` viền kép |
| Gold light | `#D9A930` | Confetti, `--gold-light` Host |
| Gold effect | `#c9a227` | `bonus_choice`, `flat_bonus`, confetti chủ đạo, mặt sau lá bài |
| Gold pale | `#f4d47c` | Chữ `?` mặt lưng lá, sáng kim loại, confetti |
| Gold đậm | `#7b5800` | Nhãn role "Người Chơi", cảnh báo "đã gửi", footer `/pick-team` |
| Forest | `#3F5D45` | **Đúng** / cộng điểm / nhóm câu Vận dụng / nút bật nhạc nền |
| Forest light | `#5C7F62` | `--forest-light` Host |
| Navy | `#1F4E66` | Nhóm câu Số liệu, đội Xanh |
| Tím | `#4A3A6B` | Đội Tím, hiệu ứng `swap`, glyph `⇄` |
| Nâu | `#8A4B08` | Hiệu ứng `steal`, số tiền cướp được |
| Đỏ tối | `#9B2335` | Điểm giảm, `dice_subtract` |
| Đỏ lỗi | `#ba1a1a` | Sai, con dấu đỏ, chữ báo lỗi |
| Đỏ chữ | `#93000a` | Chữ trên nền đỏ `#ffdad6` |
| Đỏ nền | `#ffdad6` | Nền banner sai / option sai |
| Đỏ viền sáng | `#ffdadb` | Vòng sáng quanh chấm đội đang lượt |

### 3.4 Màu đội, nhóm câu, hiệu ứng

**7 đội** — nguồn: `game/catalog.js:217-223` và `pages/PickTeam.jsx:7-64`

| Key | Tên | Hex | Icon Material Symbols |
|-----|-----|-----|----------------------|
| `red` | Đội Đỏ | `#7A2430` | `star` |
| `blue` | Đội Xanh | `#1F4E66` | `menu_book` |
| `yellow` | Đội Vàng | `#B8860B` | `grass` |
| `purple` | Đội Tím | `#4A3A6B` | `local_fire_department` |
| `orange` | Đội Cam | `#D97706` | `flag` |
| `pink` | Đội Hồng | `#DB2777` | `favorite` |
| `lam` | Đội Lam | `#2563EB` | `verified_user` |

**3 nhóm câu hỏi** — `game/catalog.js:213`

| Mã | Tên | Hex | Số câu |
|----|-----|-----|--------|
| `L` | Lý luận | `#7A2430` | 8 |
| `S` | Số liệu thống kê | `#1F4E66` | 8 |
| `V` | Vận dụng hiện nay | `#3F5D45` | 7 |

Nhóm màu được dùng nhất quán ở 3 nơi: dải 6px trên đỉnh lá (`.ncard`, `.card`),
chữ eyebrow (`.card-eyebrow`), chấm tròn trong `.legend`.

**9 hiệu ứng** — `game/catalog.js:322-334`

| Type | Hex |
|------|-----|
| `points` | `#3F5D45` |
| `points_base` | `#3F5D45` |
| `dice_subtract` | `#9B2335` |
| `lose_all` | `#B4B2A9` |
| `reset` | `#22293A` |
| `steal` | `#8A4B08` |
| `swap` | `#4A3A6B` |
| `bonus_choice` | `#c9a227` |
| `flat_bonus` | `#c9a227` |

**Confetti chỉ dùng màu thương hiệu** — không có hue lạ:
`#c9a227, #7a2430, #3F5D45, #1F4E66, #f4d47c, #D9A930, #ff9098`
(`WinnerPodium.jsx:5`; bản EffectCard dùng 5 màu đầu, `EffectCard.jsx:15`).

### 3.5 Typography

Ba họ chữ, tải từ Google Fonts trong `index.html:10-13`:

| Vai trò | Family | Ghi chú |
|---------|--------|---------|
| **Display / tiêu đề / số lớn** | `Noto Serif` (400/600/700 + italic) | Toàn bộ tiêu đề masthead, tên đội, điểm, số lá, tên hiệu ứng |
| **Chữ chạy / UI / nút** | `Noto Sans` (400/500/600/700) | Mọi nội dung chữ thường, nút, input, mô tả |
| **Số / mã** | `Courier New, monospace` | PIN, timer, điểm trong `.sf-score`, mặt xúc xắc, `.team-code` |
| **Icon** | `Material Symbols Outlined` (FILL 0..1) | Icon đội, tab meme, nút BGM, nút "Thử lại" |

Quy tắc dùng font:

- Tiêu đề trang người chơi: **serif 700, `text-transform: uppercase`**,
  `letter-spacing` âm (`-0.02em`) ở Landing/PickTeam/Play, dương (`0.01em`–`1px`) ở
  WinnerPodium. Cùng một họ chữ, hai "giọng" khác nhau có chủ đích: trang nhập dùng
  tracking âm cho gọn, trang nghi thức dùng tracking rộng.
- **Eyebrow / label** (mẫu lặp nhiều nhất trong dự án): sans hoặc serif, `11–13px`,
  `font-weight: 700`, `letter-spacing: 0.08em–0.14em`, `text-transform: uppercase`,
  màu `--maroon-dark` / `--text-2`. Khoảng cách dưới label: `8–12px`.
- **Số lớn**: serif 700 hoặc Courier bold, cỡ theo vai trò:
  điểm bảng Host `26px` · số lá `.ncard-num` `32px` · câu hỏi `.card-q` `28px` ·
  tên lượt `.turn-name` `26px` · nhãn hiệu ứng `.eff-label` `32px` ·
  điểm ScoreFx `42px` · số bục `48/64/80px` · timer `40px`.
- Câu hỏi trên `/play` (`.q-text`) là **mẫu duy nhất dùng `font-style: italic`**
  cho nội dung dài + `border-left: 4px solid` maroon: trích dẫn trong văn bản.

Base toàn cục (`index.css:18`): `font: 18px/145%`, giảm còn `16px` khi `≤1024px`.
Header mặc định `h1 56px` / `h2 24px` — nhưng **mọi trang đều tự đặt lại** cỡ riêng.

Thang cỡ chữ theo từng bề mặt:

| Bề mặt | Tiêu đề | Nhãn | Nội dung | Nhỏ |
|--------|---------|------|----------|-----|
| Host masthead | `42px` serif 700 (ls .3px) | `.sub 18px` maroon ls 1.5px | input `22px` | `12px` legend/hint |
| Landing doc | `clamp(26,6vw,44)` | `13px` ls .1em | `15/24`, mô tả `15/22` | footer `12px` |
| `/pin` doc | `clamp(24,5vw,34)` | `13px` ls .1em | PIN input `30px` Courier ls .35em | status `14px` |
| `/pick-team` | `clamp(28,5vw,48)` | `13px` ls .08em | tên đội `22/30`, mô tả `14/20` | footer `13px` |
| `/play` doc | `clamp(22,4vw,40)` | `13px` ls .1em | câu hỏi `18/28`, option `16/24` | ghi chú `12–13px` |
| ScoreFx | tên `15px` ls .04em | — | điểm `42px` Courier | đơn vị `17px` |
| EffectCard | tên `24px` serif | `11px` ls .14em | mô tả `17/1.5` | note `15–16px` |
| WinnerPodium | `36px` uppercase ls 1px | `11px` ls 1.5px | tên `22–28px`, điểm `32–40px` | — |

### 3.6 Bo góc

| Bán kính | Dùng cho |
|----------|----------|
| `0` | Lá văn kiện viền kép (`.doc-card`, `.pin-card`, `.er-face--front`, `.winner-card`) — góc vuông là dấu hiệu giấy dựng |
| `3–4px` | Chip, nút, `.opt-btn`, `.card`, `.pin-*` nhỏ, `.ncard` (5px) |
| `6px` | Panel lớn: `.board`, `.teams`, `.controls`, `.wp-rest` |
| `8px` | `.sf-stage`, nút trong popup `/play` |
| `10–12px` | `.sf-card`, mặt xúc xắc |
| `16–18px` | **Chỉ** popup lá hiệu ứng + popup trên `/play` (điểm nhấn "hiện đại") |
| `9999px` | Con dấu tròn, chấm đội, dot timeline, avatar |

### 3.7 Viền

| Bề dày | Kiểu | Dùng cho |
|--------|------|----------|
| `8px` | solid (màu nhóm/đội) | `.pt-card` (chọn đội) |
| `6px` | solid | Dải màu đỉnh `.ncard`, `.card`, `.er-face`, `.wp-pod-card` |
| `3px` | **double** | `.masthead`, `.doc-card`, `.pin-card`, `.er-face--front`, `.sf-stage`, `.wp-header` — dấu hiệu viền kép hành chính |
| `4px` | double | `.play-title` |
| `2px` | solid / dashed | Input lớn, nút nhấn mạnh, `.stamp`, `.meme-stamp`, `.er-dock` |
| `1px` | solid | Viền panel tiêu chuẩn `--line` / `--line-2` |
| `0.5px` | solid | Hairline dưới masthead, `.play-divider` (`0.5pt`), `.wp-doc-title` |
| — | dashed `1px` | Dải phân cách trong `.team-row`, `.rank`, `.wp-rest-row`, `.bgm-controls` |
| — | dashed `2px` | `.sidebar-timeline-line`, `.er-dock` |

### 3.8 Bóng đổ

| Kiểu | Giá trị | Dùng cho |
|------|---------|----------|
| **Offset cứng** (chủ đạo) | `1px 1px 0 rgba(136,114,114,.2/.5)`, `4px 4px 0 rgba(20,27,44,.18)` | Lá văn kiện, `.play-doc`, `.sf-card`, `.wp-pod-card` — trông như in thay vì nổi 3D |
| Nhẹ | `0 2px 4px rgba(0,0,0,.12)` | `.ncard` |
| Overlay mềm | `0 10px 30px rgba(0,0,0,.3)`, `0 12px 32px rgba(0,0,0,.35)`, `0 10px 25px .4` | `.overlay`, `.wp-overlay`, popup |
| Hào quang | `0 0 30px rgba(184,134,11,.4)` | Chỉ `.wp-pod-card.rank-1` |
| Drop | `drop-shadow(0 4px 12px rgba(0,0,0,.4))` | Meme drop nổi trên nền |
| Focus | `border-color: #5c0c1c; box-shadow: 2px 2px 0 rgba(92,12,28,.25)` | Input `/pin` (thay outline truyền thống) |

### 3.9 Kết cấu bề mặt (texture)

Chỉ có 3 loại, dùng để phá bề mặt phẳng — không thêm loại thứ tư:

1. **Nhiễu giấy** — SVG `feTurbulence` `baseFrequency=.65 numOctaves=3`, opacity `.05`,
   tile 200×200, nhúng dạng data-URI. Dùng ở Landing `.reg-body` và `/pin` `.pin-body`.
2. **Chấm halftone 4px** — `radial-gradient(rgba(0,0,0,.03) 1px, transparent 1px)`
   + `background-size: 4px 4px`. Dùng ở `.host-wrap` và `.wp-overlay`.
3. **Polka 20px lệch pha** — hai lớp `radial-gradient(#dbc0c1 1px, …)` cùng
   `background-size: 20px 20px` nhưng `background-position: 0 0, 10px 10px`.
   Dùng ở `.play-page` (nền "lạnh").

### 3.10 Nghiêng

| Element | `rotate` |
|---------|---------|
| `.doc-card`, `.pin-card` | `-0.5deg` |
| `.play-doc` | `-0.2deg` |
| `.card` (câu hỏi Host) | `-0.6deg` |
| `.meme-panel` | `0.3deg` |
| `.sidebar-item.active` | `-1deg` |
| `.pt-card` (mỗi đội) | `rotate: -0.5 … +0.4deg` — lấy từ field `rotate` trong `PickTeam.jsx` |
| Con dấu `.stamp` (Host) | `-6deg` |
| Con dấu `.stamp`/`.pin-stamp` (Player) | `15deg` |
| `.meme-stamp` | `-8deg` |
| Nhãn "bạn" trên sidebar | `-3deg` |

### 3.11 Motion

**Thời lượng**: `120ms` (ncard hover) · `150ms` (nền/border) · `180–220ms` (overlay vào) ·
`300ms` · `400ms` (podium fade) · `480–520ms` (nội dung lá hiệu ứng) ·
`700–800ms` (flip, xúc xắc chốt) · `900ms` (tick điểm) · `1100ms` (số bay) ·
`1500ms` (suspense) · `2200ms` (swap) · `vô hạn` (confetti, shine).

**Easing**
| Tên | Hằng số | Dùng cho |
|-----|---------|----------|
| chuẩn | `ease` / `ease-out` | hover, fade |
| back-out | `cubic-bezier(.175,.885,.32,1.275)` | `.meme-pop-in` |
| pop | `cubic-bezier(.34,1.56,.64,1)` | icon lá hiệu ứng, `.sf-pop` |
| reveal | `cubic-bezier(.34,1.2,.5,1)` | suspense lá bài |
| flip | `cubic-bezier(.35,.05,.2,1)` | lật lá 3D |
| glide | `cubic-bezier(.2,.8,.2,1)` | cột bục trượt vào |
| travel | `cubic-bezier(.45,0,.2,1)` | thẻ swap bay ngang |
| dice | `cubic-bezier(.25,1,.5,1)` | nảy xúc xắc |
| coin | `cubic-bezier(.5,0,.9,.4)` | đồng xu bay |

**Chiều cao overlay**: `rgba(20,16,10,.55)` (chung) · `.45` (ScoreFx, không chặn click) ·
`.7` (winner) · `rgba(0,0,0,.6)` + `backdrop-filter: blur(3px)` (popup `/play`) ·
`.55` + `blur(2px)` (lá hiệu ứng, ScoreFx).

**Khoảng dừng bắt buộc**: mọi overlay dùng cùng 1 trục căn giữa; `html` giữ
`overflow-y: scroll` và scrollbar mỏng để không nhảy layout khi mở/đóng
(`index.css:55-76`).

### 3.12 z-index

| Giá trị | Lớp |
|---------|------|
| `5` | `.wp-vignette` (tối viền WinnerPodium) |
| `10` | `.play-sidebar` |
| `12 / 15` | `.wp-confetti-layer` / `.wp-stamps-layer` |
| `20` | `.wp-header`, `.wp-main` |
| `50` | `.play-header`, `.play-footer`, `.overlay` (Host) |
| `60` | `.winner` (khung legacy, `.winner-card`) |
| `80` | `.pt-modal-backdrop` |
| `130` | `.sf-overlay` (ScoreFx — cao hơn lá hiệu ứng để chiếu ngay khi chọn đội) |
| `100` | Popup `/play` (dice / chọn mục tiêu / cơ hội may mắn) |
| `120` | `.er-overlay` (lá hiệu ứng) |
| `130` | `.wp-overlay` (bục nhấp) |
| `200` | `.wp-flash` (chớp sáng lộ nhất) |
| `9999` | `.meme-drop-layer` — luôn trên cùng, `pointer-events: none` |

---

## 4. Bảng màn hình

| Route | Vai trò | Bố cục | Nền | Ràng buộc thiết bị |
|-------|---------|--------|-----|-------------------|
| `/` | Trang chính + chọn vai | Cột giữa, lá văn kiện `max-width: 768px`, nghiêng `-0.5deg`, con dấu đỏ tròn góc phải, footer bản quyền dạng băng xanh `#d3d9f0` | `#F1E7CF` + noise | Mọi thiết bị |
| `/pin` | Nhập PIN + chọn vai | Lá văn kiện `max-width: 560px`, ô PIN 220px font Courier | `#F1E7CF` + noise | Mọi thiết bị |
| `/pick-team` | Chọn đội | Header sticky viền kép · lưới đội `1/2/4 cột` (640px / 1024px), mỗi thẻ có icon 56px, dải 8px màu đội, xoay nhẹ, nút "THAM GIA" nền màu đội | `#f4f1ea` | Điện thoại (ưu tiên) |
| `/play` | Trả lời | Header sticky (≥1024px: sidebar "Lượt Thi Đấu" 280px + lá văn kiện `max-width: 900px`); dưới lá là panel meme; footer bản quyền | `#faf8ff` + polka 20px | Điện thoại (ưu tiên) |
| `/host` | Bảng điều khiển | Masthead viền kép → 2 dải legend → bảng 35 lá (wrap, 90×110px) → lưới 2 cột `1.3fr / 1fr` (bảng điểm · điều khiển) | `#F1E7CF` + halftone 4px | Máy chiếu / laptop |

**Cấu trúc chân trang bản quyền** — một dấu hiệu nhận diện xuất hiện ở cả 3 trang
Player: nền `#d3d9f0`, viền trên hairline, chữ `12–13px` màu `#554243`, canh giữa,
`letter-spacing` vừa, chuyển hàng ngang ở ≥540–640px.
Bản chữ dùng: `© 1986-2026 BAN TUYÊN GIÁO TRUNG ƯƠNG` (`/play`),
`© 1986-2024 BAN TUYÊN GIÁO TRUNG ƯƠNG` (`/`),
`© 1986 BAN TUYÊN GIÁO TRUNG ƯƠNG - LƯU TRỮ QUỐC GIA` (`/pick-team`).

---

## 5. Thư viện component

### 5.1 Lá văn kiện (`doc card`)
Nền `#fdfbf7` · `border: 3px double #141b2c` · không bo góc (Landing/PinEntry) hoặc
`border-radius: 4px` (`.card` Host, `.play-doc`) · shadow offset 1px · `rotate(-0.5deg)`.
Bên trong: masthead (h1 uppercase serif + sub italic/xám) → `hr` hairline → nội dung.
**Con dấu tròn** đặc trưng: 90–96px, `border: 2px dashed #ba1a1a`, chữ serif 700
`11–12px` uppercase `ls .08em`, `opacity .8`, `transform: rotate(15deg)`, `z-index: 10`,
`pointer-events: none`. Nội dung dấu: `VĂN KIỆN ĐẢNG` (Landing), `MẬT LỆNH` (`/pin`),
`VĂN KIỆN ĐẢNG` (Host, viền solid maroon).

### 5.2 Lá bài trên bảng Host (`.ncard`)
`90×110px` · nền trắng · `border-top: 6px solid var(--cat-color)` (màu nhóm câu) ·
shadow nhẹ · hover `translateY(-3px)` trong `120ms` · nội dung: số `32px` serif 700 +
tên nhóm `14px` xám.
Trạng thái `.used`: nền `--paper-dark`, dải trên xám `#B4B2A9`, `opacity .55`,
`cursor: not-allowed`, không hover, thay số bằng `✓` xanh rừng `32px` + chữ "Đã mở".

### 5.3 Lá câu hỏi (`.card` Host)
`max-width: 800px` · nền `--paper` · `padding: 32px 36px` · `border-top: 6px` đổi màu
theo nhóm (`.cat-S` navy, `.cat-V` forest) · `rotate(-0.6deg)` · `max-height: 85vh` + scroll.
Bên trong theo thứ tự: eyebrow 11px uppercase → câu hỏi serif 600 `28px/1.5` →
nhãn lượt → 4 option → khối giải thích → hàng nút.

### 5.4 Nút

| Loại | Dùng cho | Đặc điểm |
|------|----------|-----------|
| `.host-btn` | hành động chính | nền maroon `#7A2430`, chữ trắng, `20px` sans 600, `padding: 10px 14px`, `radius 4px`, hover `--maroon-dark` |
| `.host-btn.ghost` | hành động phụ | nền trong, chữ `--ink`, viền `--line`, hover `--paper-dark` |
| `.host-btn:disabled` | không dùng được | `opacity .4` + `not-allowed` |
| `.opt-btn` (Player) | chọn đáp án | nền `#faf8ff`, viền `--line-2`, `16/24`, hover `#e1e8ff` + viền maroon |
| `.pt-join-btn` | vào đội | nền = màu đội, serif 700 `13px` uppercase ls .1em, viền 2px cùng màu |
| `.pin-save-btn` | lưu/kiểm tra | nền `#d3d9f0`, serif 700 `14px` uppercase ls .1em, `:active` dịch `1px,1px` |
| `.dice-roll-btn` | tung xúc xắc | nền maroon, serif 700 `19px` uppercase, hover `translateY(2px)` + `box-shadow: 0 0 0 2px` |

Mọi nút dùng `cursor: pointer`, không có hiệu ứng ripple/shadow phồng lên — chỉ đổi
nền, viền, hoặc dịch 1–3px.

### 5.5 Dải legend (`.legend`)
Hai dải ngay dưới masthead Host: (1) chip màu nhóm câu — nền màu nhóm, chữ trắng,
`12px` 600, `padding 4px 10px`, `radius 3px`; (2) chip hiệu ứng — nền trắng, viền
`--line`, chấm tròn 9px màu hiệu ứng đứng trước chữ. Dùng để giải mã màu mà không
cần đọc chú thích.

### 5.6 Bảng điểm Host (`.teams`)
Bảng trắng viền `--line` `radius 6px`; `h2` serif 24px gạch chân dưới `--line`.
Mỗi hàng: chấm màu đội 16px → input tên không viền (`22px` sans 600, sửa trực tiếp) →
`.team-code` (Courier 700, nền `--paper-dark`) → `.team-score` serif 700 `26px` đẩy
sang phải. Hàng `.active` nền `#FBF3E0`, bo góc 4px. **Thứ tự hiển thị: điểm cao
xuống thấp**, nhưng chỉ số `i` giữ nguyên vị trí thật trong mảng `teams`.

### 5.7 Timeline lượt thi đấu (sidebar `/play`)
Dọc 280px, viền phải `3px double #887272`, nền `rgba(250,248,255,.85)`.
Mỗi mục: chấm 12px trên đường kẻ đứt dọc 2px + thẻ `.sidebar-card` (nền `#faf8ff`,
viền 1px `--line-2`). Mục `.active`: viền 2px maroon, nền `#f1f3ff`, xoay `-1deg`,
shadow `4px 4px 0 rgba(92,12,28,.15)`, chấm có `box-shadow: 0 0 0 4px #ffdadb`.
Trạng thái: `.live` (đỏ đậm + chấm `pulse-dot` 1.5s) vs `.waiting` (xám "Chờ đến lượt").
Nhãn "bạn" cho đội của thiết bị: chip viền đứt đỏ, `rotate(-3deg)`.

### 5.8 Thanh thông tin đội + đồng hồ (`.team-info-bar`)
Nền `#f1f3ff`, viền `--line-2`, `flex space-between wrap`. Trái: label 12px +
tên đội serif 600 `24px` **màu đội**. Phải: label "THỜI GIAN CÒN LẠI" + đồng hồ
Courier 700 `40px` `ls .1em`, chuyển màu theo ngưỡng: `>10s` xám mực ·
`6–10s` cam `#D97706` · `≤5s` đỏ `#ba1a1a` + `pulse-dot .8s`.

### 5.9 Lá hiệu ứng bốc được (`EffectCard`)
Cấu trúc một form duy nhất cho cả 9 loại: **banner màu hiệu ứng → emblem tròn →
mô tả → dock hành động**.
- Overlay: nền `rgba(20,16,10,.55)` + `blur(2px)`, `z-index 120`.
- Thẻ: `min(400px, 94vw)` × `clamp(480px, 100vh - 110px, 600px)`, `preserve-3d`,
  `radius 18px`, `border: 3px double #141b2c`.
- **Mặt lưng**: nền đỏ chìm `linear-gradient(160deg,#7a2430,#43121c 72%)` +
  sọc chéo 45° rgba vàng, viền `3px double #f4d47c`, khung trong viền 1px vàng,
  dấu `?` serif italic 130px vàng có `text-shadow` đen và nhấp nháy 550ms,
  vệt sáng `skewX(-18deg)` quét 2 lần.
- **Mặt trước**: nền `#fdfbf7`; banner nền `var(--fx)` chữ trắng + chấm đội 13px
  viền trắng, có `inset 0 -4px 0 rgba(0,0,0,.18)`; emblem tròn 118px viền
  `3px double var(--fx)`, icon 62px; mô tả 17px `#6b6455`; **dock** nền `#f7f3e8`
  viền trên đứt, `min-height 172px`, luôn có mặt dù nội dung đổi (kể cả khi rỗng),
  `margin-top: auto` để bám đáy.
- Nút ✕ 30px tròn góc phải — chỉ cho ẩn tạm, tự hiện lại khi có kết quả.
- Mặt xúc xắc 3D đặt trong dock: khối 96px, `perspective 1000px`, 6 mặt
  `translateZ(48px)`, chữ Courier 700 28px, `transition 1500ms ease-out`, kèm bóng
  elip blur 4px nhấp theo.

### 5.10 Panel meme (`MemePanel`)
Lá nhỏ trong `.play-doc`: viền `--line-2`, nền `#faf8ff`, `rotate(0.3deg)`.
Header: icon + "THẢ MEME" 12px uppercase + chip "Gửi yêu thương" (viền đứt đỏ,
`rotate(-8deg)`, `opacity .7`). 4 tab folder, tab active = nền maroon chữ trắng.
Lưới 4 cột (3 cột ≤640px), ô vuông `aspect-ratio: 1`, hover `scale(1.08)` +
shadow, ảnh `object-fit: cover`. Dưới cùng: thanh cooldown 3px lấp đầy bằng **màu
đội** + dòng "Đợi x.xs...".

### 5.11 Meme drop (`MemeDrop`)
Lớp `fixed inset 0`, `pointer-events: none`, `z-index 9999`. Mỗi meme 160px
(`object-fit: contain`) + chấm đội 12px viền trắng + nhãn tên đội nền đen 70%
`radius 9999px`; `pop-in .4s` back-out rồi `fade-out 1.5s` bắt đầu ở `2s`, tổng
đúng `MEME_LIFETIME = 3500ms`.

### 5.12 ScoreFx (điểm cướp/đổi trên Host)
Sân khấu: nền `#fdfbf7`, viền `3px double #141b2c`, `radius 8px`, Courier.
Hai thẻ đội 230×130 (`radius 10px`, `shadow 4px 4px 0 rgba(20,27,44,.18)`), mỗi thẻ
có chấm màu đội, tên serif 700 15px uppercase (ellipsis nếu dài), điểm Courier 42px +
đơn vị 17px, và số delta bay lên rồi mờ. Giữa hai thẻ: `⇄` tím 54px (swap) hoặc
`🗡️` + số tiền nâu + 5 đồng xu vàng bay vòng cung (steal).

### 5.13 Bục nhấp WinnerPodium
Overlay phủ toàn màn, nền `--paper` + halftone, `overflow-y auto`, fade 400ms; các
lớp trang trí: vignette tối dần 1s, confetti 60 mảnh rơi vô hạn 4–8s, 30 con dấu
chữ `CHIẾN THẮNG / VICTORY / XUẤT SẮC / VÔ ĐỊCH` rơi từ trên 3s, chớp trắng lúc
lộ hạng nhất. Bục: 3 cột lệch nhau — cao `130/190/250px` cho hạng 3/2/1, số
`48/64/80px`, thẻ tên `22px` (nhất `28px`) và điểm `32px` (nhất `40px`).
Hạng nhất thêm: viền dày hơn, hào quang vàng, **chữ kim loại** gradient 5 chặt
(`#bf953f → #fcf6ba → #b38728 → #fbf5b7 → #aa771c`) shine 3s vô hạn, và con dấu
tròn viền đứt `mix-blend-mode: multiply` ghim ở góc trên-phải.

---

## 6. Choreography (thứ tự chạy)

Mọi mốc thời gian đều export từ component để Host/Player đồng bộ âm thanh.

**Lá hiệu ứng** — `EffectCard.jsx:5-14`
| Mốc | ms | Sự kiện |
|-----|----|----------|
| `SUSPENSE_MS` | 1500 | lá bay lên từ dưới lên, lắc nghiêng ±3.5°, mặt lưng quét sáng 2× |
| `FLIP_AT_MS` | 1500 | ↳ phát `card-flip` |
| `FLIP_MS` | 800 | lật 3D 180° |
| `FACE_REVEAL_AT` | 2300 | mặt trước lộ + **burst sáng** 520ms + confetti 10 mảnh 720ms |
| +250 / +150 / +60 | 2550/2450/2360 | banner / icon / mô tả bay lên (`er-rise`, `er-pop`) |
| +140 | 2440 | dock hành động bay lên |
| `HOLD_MS` | 700 | giữ kết quả |
| `REVEAL_TOTAL_MS` | **3000** | tổng |

**Bục nhấp** — `WinnerPodium.jsx:35-51`
`50ms` hiện overlay + `victory-appear` → `0.5s` cột hạng 3 trượt vào + `1.25s` cột
hạng 2 (`victory-slide`) → `2.2s` cột hạng 1 zoom + chớp sáng `2.5s` → confetti vô
hạn. Con dấu rơi từ `1.8s`, mỗi cách `0.1s`.

**Điểm đổi/cướp** — `ScoreFx.jsx:22-23`
fade 180ms → chờ `250ms` → số tick trong `900ms` (ease-out cubic) → POP `520ms` →
số delta bay lên lúc `500ms` trong `1100ms`. Cả bề tổng `2200ms`, Host tự gỡ ~4s.

**Meme drop**: `pop-in .4s` → hiện đủ `2s` → `fade-out 1.5s` → xóa ở `3500ms`;
âm thanh cắt đúng bằng `MEME_LIFETIME`.

---

## 7. Âm thanh

Nguồn: `game/sounds.js` + `public/sound/`. Nguyên tắc: **âm thanh chỉ phát trên máy
Host** (loa phòng), trừ `ui-click` phát nhẹ ở Player. Module tự mở khoá autoplay bằng
cú `pointerdown` đầu tiên.

| Nhóm | Key |
|------|-----|
| Lượt chơi | `card-flip`, `answer-correct`, `answer-wrong`, `card-abandoned`, `turn-pass`, `timer-tick` |
| Xúc xắc / hiệu ứng | `dice-roll`, `effect-draw`, `steal` |
| Ăn mừng | `victory`, `victory-appear`, `victory-slide` |
| UI | `ui-click` (vol 0.5) |
| Meme | `meme-vine-boom`, `meme-money`, `meme-taco-bell`, `meme-bell`, `meme-ack`, `meme-quack`, `meme-rizz` |
| Nhạc nền | `public/sound/bgm/bgm.mp3` qua `useBackgroundMusic` (bật/tắt + slider 0–1) |

Meme gắn âm thanh theo **folder** qua `soundPool` trong `config/memes.js:36-77`
(Buồn bã → `meme-bell`; Ngạc nhiên → `meme-vine-boom`; Vui nhộn → 4 lựa chọn…),
sticker đơn lẻ có thể override bằng field `sound`. Âm luôn bị cắt đúng lúc sticker
biến mất (`playSound(key, MEME_LIFETIME)`).

---

## 8. Quy tắc responsive

| Breakpoint | Thay đổi |
|------------|----------|
| ≤480px | `/pin`: role grid 2 cột |
| ≤540px | `/`: footer bản quyền xuống hàng dọc |
| ≤640px | `/pick-team` 2 cột · `/play` panel meme 3 cột · WinnerPodium thu nhỏ toàn bộ thang số · EffectCard rút gọn (`height: clamp(430px,…)`) |
| ≤720px | Host: `.panel` 1 cột, masthead xuống hàng |
| ≤768px | `/play` padding 2rem→3rem, lá văn kiện padding 2rem→3rem |
| ≤780px | ScoreFx `transform: scale(.78)` — thu cả sân khấu thay vì bẻ layout |
| ≤1024px | `index.css` base 18px→16px · `/play` hiện sidebar 280px |

Ngoài ra: `@media (max-width: 640px), (max-height: 720px)` cho EffectCard — cần theo
**chiều cao** vì lá là overlay phủ toàn màn.

---

## 9. Ngôn ngữ & nội dung

- Tiếng Việt không dấu hoặc có dấu đều dùng; tên game luôn VIETHOA khi là tiêu đề
  (`HÀNH TRÌNH ĐỔI MỚI`).
- Nhãn hành động trong nút thường VIETHOA + `letter-spacing` rộng
  (`THAM GIA`, `TIẾP TỤC VÀO VÁN CHƠI`, `Kết thúc & xếp hạng` — nút Host dùng
  sentence case vì to hơn và nhiều chữ).
- Dấu `…` (ellipsis) cho trạng thái chờ (`Đang kết nối…`, `Đang tung...`).
- Số điểm dùng `toLocaleString()`; đơn vị viết `đ` (điểm) hoặc `điểm` khi đứng riêng.
- Emoji dùng có chủ đích và đúng ngữ cảnh văn hóa: `✓ ✕ ⏳ 🎉 🎲 🗡️ 🍀 ♻️ 💥 💸 🏆 🎖`
  — hiệu ứng bắt buộc có emoji để nhận diện nhanh từ xa.

---

## 10. Accessibility

- `color-scheme: light` cố định + `overflow-y: scroll` luôn giữ chỗ scrollbar
  (`index.css:20-22, 55-63`) — tránh nhảy layout và tránh OS dark scheme làm chữ
  input thành trắng trên nền trắng.
- Mọi input có `id` + `<label htmlFor>` (`landing-pin`, `pin-entry-input`).
- Trạng thái không chỉ dựa vào màu: luôn kèm `✓`, chữ, hoặc `disabled`.
- `aria-hidden` trên lớp ScoreFx (hoàn toàn trang trí).
- Nút icon có `aria-label` (`.er-close` → "Ẩn lá bài").
- Font lớn, tương phản cao ở nền giấy; tránh chữ xám trên nền hồng nhạt.
- Thiếu: chưa có `prefers-reduced-motion` — nên thêm khi động vào lá bài,
  confetti, shine (xem §12).

---

## 11. Bản đồ file

| File | Vai trò design |
|------|----------------|
| `index.html:10-13` | Nạp 3 font + Material Symbols |
| `src/index.css` | Base toàn cục: 18px/145%, `--sans/--heading/--mono`, scrollbar, h1/h2 mặc định. **Còn sót từ template Vite** (token tím `--accent` không dùng) |
| `src/App.jsx` | Bảng route |
| `src/pages/Host.css` | Toàn bộ hệ Host: token `.host-wrap`, bảng bài, panel, overlay, effect, WinnerPodium (`1116` dòng) |
| `src/pages/Host.jsx` | Render Host + điều phối phase |
| `src/pages/Landing.jsx` | Style inline (`<style>`) cho trang chính |
| `src/pages/PinEntry.jsx` | Style inline cho `/pin` |
| `src/pages/PickTeam.jsx` | Style inline + metadata 7 đội (màu, icon, desc, rotate) |
| `src/pages/Play.jsx` | `PLAY_STYLE` (315 dòng) + 3 popup inline-style |
| `src/components/EffectCard.jsx` | `STYLE` (357 dòng) + xúc xắc 3D + choreography |
| `src/components/ScoreFx.jsx` | `STYLE` + điều khiển điểm bằng `requestAnimationFrame` |
| `src/components/MemePanel.jsx` | `STYLE` + grid sticker + cooldown |
| `src/components/MemeDrop.jsx` | `STYLE` + keyframes pop/fade |
| `src/components/WinnerPodium.jsx` | Bục nhấp (style nằm ở `Host.css`, phần `wp-*`) |
| `src/game/catalog.js:213, 217-223, 322-334` | Token màu nhóm / đội / hiệu ứng |
| `src/config/memes.js` | Nội dung + `soundPool` theo folder |
| `src/game/sounds.js` | Bảng âm thanh + quy tắc cắt tiếng |
| `src/game/transitions.js:4-12` | Góc xoay 3D cho 6 mặt xúc xắc |
| `src/App.css` | **Không được import ở đâu** — còn sót từ template Vite, có thể xoá |

---

## 12. Nợ kỹ thuật design (cần biết trước khi sửa)

1. **Ba hệ màu song song.** `Host.css` dùng nhóm token `--paper/--ink/--maroon/--gold/--line`
   (bám 1 bảng màu cũ), còn Landing/`/pin`/`Play`/`PickTeam` dùng **hex viết tay**
   (`#F1E7CF`, `#141b2c`, `#5c0c1c`, `#887272`). Kết quả: cùng một ý nghĩa có 2–3 mã
   khác nhau (ví dụ "chữ phụ": `#554243` vs `#6b6455`; "viền": `--line #A9895F` vs
   `--line-2 #887272` vs `#dbc0c1`).
   → **Khuyến nghị:** gom về một bảng token duy nhất ở `index.css` dưới dạng
   `:root { --paper: …; --ink: … }`, rồi mỗi trang chỉ override những gì thực sự khác.
2. **Style nằm rải rác 4 kiểu**: `index.css` (global), `Host.css` (import), và
   `<style>{STRING}</style>` nội tuyến trong 6 component/page. Component mới nên
   theo mẫu `const STYLE = \`…\`` + `<style>{STYLE}</style>` như `ScoreFx`/
   `EffectCard`/`MemePanel` — hoặc tách file `.css` nếu style vượt ~300 dòng.
3. **Inline style lọt vào chỗ không nhất quán**: popup trên `/play`
   (`Play.jsx:679-812`) dùng `borderRadius: 16` + nền `#faf8ff` + shadow mềm, lệch
   ngôn ngữ "văn kiện" của phần còn lại. Đây là chỗ **nên chuẩn hoá** trước tiên.
4. **File thừa từ template**: `src/App.css` (không import), token `--accent` tím
   trong `index.css`, ảnh `react.svg`/`vite.svg`/`hero.png`.
5. **Thiếu `prefers-reduced-motion`**: nên bọc `reduce` cho confetti, shine kim loại,
   `wpFlashEffect`, `er-suspense`.
6. **Cỡ chữ đôi chỗ đã vượt thiết kế**: `ncard-cat 14px` trong thẻ 90×110px và
   `.eff-desc 22px` là lớn so với phần còn lại — chấp nhận được vì mục tiêu là đọc
   từ xa, nhưng đừng nhân bản mức này sang component mới.
7. **Không có khoảng cách dùng chung**: padding `1rem/1.5rem/2rem/2.5rem/3rem` và
   `10/12/14/16/18/20/22/26/28/30/32/36/40px` đang dùng tự do. Khi tách token, bắt
   đầu bằng thang `4 · 8 · 12 · 16 · 24 · 32 · 48`.

---

## 13. Checklist khi làm màn hình / component mới

- [ ] Nền giấy đúng nhóm (vàng cho Host/Player, lạnh cho `/play`) + 1 trong 3 texture sẵn có.
- [ ] Tiêu đề serif 700 uppercase; nhãn/eyebrow 11–13px ls .08–.14em uppercase.
- [ ] Số (điểm, số lá, timer, mã) dùng serif-đậm hoặc Courier, ≥26px trên màn Host.
- [ ] Lá văn kiện: `3px double` hoặc `1px solid --line`, shadow offset, `rotate` ≤0.6deg.
- [ ] Nút chính maroon `#7A2430`; vàng chỉ cho ăn mừng; xanh rừng = đúng, đỏ = sai.
- [ ] Mọi màu nhóm/đội/hiệu ứng lấy từ `catalog.js`, không hardcode lần nữa.
- [ ] Overlay: cùng trục căn giữa, `--scrim` chuẩn, z-index theo §3.12.
- [ ] Chuyển động lấy duration + easing từ §3.11, không tạo keyframes mới nếu đã có.
- [ ] Nhớ các mốc thời gian phải export hằng số để đồng bộ âm thanh.
- [ ] Responsive: xử lý cả `max-height` nếu là overlay.
- [ ] Cập nhật lại chính file `DESIGN.md` này.
