# PLAN: Redesign trang `/host` theo phong cách Art Deco Royal Casino Arena

> Nguồn tham chiếu: mockup HTML "Thử Vận May - Art Deco Royal Casino Arena" (Tailwind CDN, Google Fonts Be Vietnam Pro / Playfair Display / Marcellus, Material Symbols).
>
> Trang đích: `src/pages/Host.jsx` (1321 dòng) + `src/pages/Host.css` (1129 dòng).

---

## 0. Quyết định kỹ thuật (áp dụng cho toàn bộ plan)

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **KHÔNG thêm Tailwind CDN.** Tái hiện toàn bộ mockup bằng CSS thuần trong `Host.css` (+ token CSS variables). | Dự án không dùng Tailwind; thêm CDN sẽ tạo xung đột style, nặng trang, mâu thuẫn với DESIGN.md. |
| D2 | **Không đổi logic/state trong `Host.jsx`** — chỉ sửa phần render (JSX className/structure) và `Host.css`. Các handler `openCard`, `applyAnswer`, `rollDice`… giữ nguyên. | Mockup là tĩnh; toàn bộ game logic phải hoạt động y như cũ. |
| D3 | Font: thêm **Be Vietnam Pro + Playfair Display + Marcellus** vào `index.html`, đặt Be Vietnam Pro làm font-body của `.host-wrap`. | Mockup dùng 3 font này thay cho Noto Sans/Noto Serif hiện tại. |
| D4 | Icons: **Material Symbols Outlined đã có sẵn** trong `index.html` → dùng trực tiếp cho crown/diamond/casino/vpn_key… | Đúng mockup, không cần emoji-dependent icon cho phần quan trọng. |
| D5 | Mockup là **mục tiêu style**, không phải cấu trúc DOM đúng 1-1. Giữ cấu trúc React hiện tại (`.masthead`, `.board`, `.panel`, `.overlay`…) và map sang style Art Deco. | Tránh refactor rủi ro, dễ review. |
| D6 | Tokens màu mới khai báo trong block `:root`/`.host-wrap` của `Host.css` (giữ token cũ 1 phần cho overlay đang dùng). | DESIGN.md §12.1 — tránh hardcode rải rác. |

### Bảng map Mockup → Hiện tại

| Khu vực mockup | Hiện tại (Host.jsx) | Ghi chú |
|---|---|---|
| `<header>` Art Deco (crest crown, badge ★ GRAND TOURNAMENT ★, trạng thái, huy hiệu ROYAL 35 CARDS) | `.masthead` (1077-1087) + `.stamp` | Thêm phần trạng thái & medallion |
| Toolbar "35 Lá Thẻ Bài" + 6 nút quick-action | `.legend` chips (1089-1102) + `.controls` test panel (1186-1210) + BGM (1163-1185) | Map: 9 nút test effect → quick-action bar; legend category/effect giữ lại (hoặc gộp) |
| Grid 35 thẻ `.art-deco-token` | `.board` + 35 `.ncard` (1104-1128) | clip-path góc boiamond, hover lift |
| Scoreboard "BẢNG ĐIỂM XẾP HẠNG / 7 Đội Hoàng Gia" | `.panel > .teams` (1131-1144) | rank badge, thanh màu dọc, "Lượt chơi hiện tại" |
| Game controller "ĐIỀU KHIỂN VÁN CHƠI" | `.panel > .controls` (1146-1217) | Turn showcase dark, PIN vault, nút giải đấu, BGM, test, rules footnote |
| (không có trong mockup) Question overlay, EffectCard, ScoreFx, WinnerPodium | `.overlay` (1220-1282), `EffectCard.jsx`, `ScoreFx.jsx`, `WinnerPodium.jsx` (CSS `wp-*` ở Host.css:694-1129) | **Task riêng** — phải đồng bộ style Art Deco |

---

## Task 1 — Nạp font & khai báo Design Tokens Art Deco

**Files:** `index.html`, `src/pages/Host.css`

1. `index.html`: thêm link Google Fonts `Be Vietnam Pro (300–900, italic 600)`, `Playfair Display (600–900, italic 700)`, `Marcellus` (giữ Noto fonts cho các trang khác).
2. `Host.css` block token (dòng 1-17): bổ sung biến mới, giữ biến cũ đang dùng:
   ```css
   --gold-primary:#cba135; --gold-light:#f7e6a4; --gold-dark:#8c671a;
   --gold-bevel:linear-gradient(135deg,#faebb4 0%,#d4af37 40%,#aa821d 80%,#5e4308 100%);
   --ivory-base:#f9f7f2; --deco-frame-border:rgba(197,160,89,.45);
   --deco-ink:#171d2b; --deco-header-dark:#0c1322;
   ```
3. `.host-wrap`: `font-family:'Be Vietnam Pro',sans-serif;` + background mới của mockup (radial gold glow + dot pattern 28px + linear gradient `#fdfbf7→#f4ede0`).
4. Thêm class dùng chung: `.font-playfair`, `.font-marcellus`, `.text-gold-deco` (gradient text), `.art-deco-frame`, `.gold-foil-border`.

**Acceptance:** font mới render đúng tiếng Việt ( dấu không bị cắt), tokens không đè style trang khác (scope `.host-wrap`).

---

## Task 2 — Header Art Deco (thay `.masthead`)

**Files:** `src/pages/Host.jsx` (1077-1087), `src/pages/Host.css` (31-75)

1. JSX giữ `h1 "THỬ VẬN MAY"` + `.sub`, mở rộng cấu trúc:
   - Crest 56/64px: khối dark `#0c1322` viền gold 2px, icon Material `crown` gradient gold (`.text-gold-deco`), viền dashed trong.
   - Badge `★ GRAND TOURNAMENT ★` (nền `#111927`, chữ `#f5d77f`, tracking .25em).
   - Cột phải: label "Trạng Thái Bàn Đấu" + pill xanh lá "Đang Khai Cuộc" (dot pulse) — map từ logic phase hiện tại (dùng trạng thái đang có, không thêm state mới).
   - Medallion "ART DECO / ROYAL / 35 CARIDS": khung gold gradient bọc khối dark, nội dung tĩnh.
   - 4 corner inlay `.absolute` (dùng `::before/::after` + 2 span hoặc pseudo đôi) viền gold ở 4 góc.
2. CSS: `.art-deco-frame` (nền gradient trắng→ivory, border rgba gold, inset white shadow), bo `border-radius:16px`, `overflow:hidden`.

**Acceptance:** header đúng layout md:flex-row, 4 góc inlay hiển thị, không vỡ khi 35 cards/7 teams đổi số.

---

## Task 3 — Toolbar: badge đếm lá + Quick-action bar

**Files:** `Host.jsx` (`.legend` 1089-1102, test panel 1186-1210), `Host.css` (77-105, 596-630)

1. Hàng trên (`.legend` hiện tại):
   - Badge trái `◆ 35 Lá Thẻ Bài` (nền dark→gold text) + hint "Bấm vào bất kỳ thẻ vàng để mở thử thách".
   - Giữ legend category (L/S/V) + legend 9 hiệu ứng (cần cho nhận diện thẻ) — style lại dạng chip trắng viền `#c5ad7a`.
2. Hàng dưới (`data-purpose="quick-actions"`): map 9 nút test effect hiện tại → nút pill trắng viền `#c5ad7a`, chấm màu `EFFECT_COLORS` ring 2px, hover border gold `#966d18`, chữ đậm 12px. Giữ nguyên `onClick` force-draw hiện có.
3. (Tùy chọn) Di chuyển nút "Thử nghiệm hiệu ứng đặc biệt" (1187-1210) lên toolbar để `.controls` gọn lại — nếu di chuyển, cập nhật cả hai chỗ trong cùng task này.

**Acceptance:** số lượng nút = số hiệu ứng trong `EFFECT_DEFINITIONS`, hover/active không lệch layout khi wrap (flex-wrap).

---

## Task 4 — Grid 35 thẻ `.art-deco-token`

**Files:** `Host.jsx` (1104-1128), `Host.css` (107-171)

1. `.ncard` → class kết hợp `.art-deco-token` (giữ `.ncard` cho logic `used`/`:disabled` hiện có):
   - `clip-path` góc cắt 7px (polygon 8 điểm), border `1px rgba(212,175,55,.55)`, nền gradient 145deg trắng→ivory.
   - `::before` inset 3px viền gold mờ (clone clip-path 5px) — thay texture giấy hiện tại.
   - Hover: `translateY(-4px) scale(1.02)` + shadow gold `0 12px 24px -4px rgba(184,134,11,.25)`.
2. Cấu trúc nội dung thẻ (giữ React map 1..35): góc trên = số + ký hiệu ◆/✦/★ (xoay vòng theo `(n-1)%3`), giữa = số lớn `font-playfair` 30-36px, góc dưới = bản sao `rotate-180` — đúng mockup.
3. Trạng thái `.used`: ngoài ✓ "Đã mở" hiện có, thêm overlay mờ (`opacity`/`filter:grayscale`) để phân biệt — giữ aria/title cũ.
4. Grid responsive: `grid-template-columns: repeat(5,1fr)` → `7` (sm 640) → `10` (md 768) → `12` (lg 1024) → `14` (xl 1280); `gap:10px/12px`. Chiều cao thẻ ~98px (`aspect` hoặc `min-height`).
5. Xóa texture/tilt ±0.5° cũ trong `.ncard` (không còn phong cách giấy).

**Acceptance:** 35 thẻ hiển thị đủ số, hover lift mượt, trạng thái used/drawing/disabled vẫn đúng, không tràn grid ở 360px/768px/1440px.

---

## Task 5 — Scoreboard "BẢNG ĐIỂM XẾP HẠNG"

**Files:** `Host.jsx` (1131-1144), `Host.css` (173-261)

1. Header section: icon `workspace_premium` trong khối dark viền gold, title `font-playfair` "BẢNG ĐIỂM XẾP HẠNG", badge phải "7 Đội Hoàng Gia" (gradient gold `#fae8be→#ebd296`) — đổi badge "n Đội" theo `teams.length` (không hardcode 7).
2. Divider gold: `height:4px; background:linear-gradient(90deg,#8c671a,#f5d77f,transparent)`.
3. Row đội (giữ logic `rankedTeams`, input sửa tên, `.active`):
   - Thanh màu dọc `w-8px h-32px` round bằng `TEAM_CATALOG` color (thay dot tròn).
   - Rank badge tròn: **hạng 1** nền gold gradient chữ dark; **hạng 2-7** nền `#111927` viền `#d4af37/60`.
   - Tên đội `font-bold 16px`; row dẫn đầu: nền gradient `red-50→white`, border gold-red, badge "Lượt chơi hiện tại" (chỉ khi `.active`).
   - Điểm: `font-playfair` 24-30px, màu theo team color, suffix `pts` nhỏ uppercase.
   - Hover: border theo màu team (mượn pattern `hover:border-*` của mockup → map sang màu team).
4. Row thường: nền trắng, border `#e7e0d2`, shadow-xs, radius 12px.

**Acceptance:** sắp xếp theo điểm giữ nguyên, sửa tên đội vẫn hoạt động, highlight lượt chơi đúng, badge đếm đội động.

---

## Task 6 — Game Controller "ĐIỀU KHIỂN VÁN CHƠI"

**Files:** `Host.jsx` (1146-1217), `Host.css` (263-309, 311-340, 596-680)

1. Header section icon `tune` + tiêu đề uppercase tracking-wider + divider gold (giống Task 5).
2. **Turn showcase** (dark card): nền `linear-gradient(135deg,#0c1322,#162238,#0a101d)`, border `2px rgba(212,175,55,.7)`, icon `casino` watermark góc phải (`opacity:.05`), label "Lượt bốc lá bài hiện tại" (icon `schedule`, gold `#e5be65`), tên team lớn `font-playfair` + dot màu team `ring-2`. Map từ state phase hiện tại (đang hiển thị team nào).
3. **PIN vault**: khung gold gradient `#fff9eb→#faf0d7`, border 2px `#caa048`, icon `vpn_key`, label "MÃ PIN PHÒNG / Bảo mật máy chủ", PIN `font-playfair` letter-spacing `.35em` trong ô trắng viền gold (giữ copy/nhấp chuột hiện có nếu có).
4. **Nút giải đấu**: "Kết Thúc & Xếp Hạng Giải Đấu" = nút primary dark gradient gold text + icon `workspace_premium` (thay `.host-btn` hiện tại, giữ `finishGame`); "Khởi Tạo Ván Mới" = nút trắng viền gold + icon `refresh` (giữ `resetGame`).
5. **BGM block** (giữ logic `useBackgroundMusic`): wrap `stone-50` border, icon `volume_up`, toggle "Đang Bật/Tắt" (emerald khi bật), slider `input[type=range]` style lại theo mockup (track gradient gold, thumb gradient gold 16px).
6. **Rules footnote**: chân section, border-top `#dfd2be`, text 11px màu `#5e503f` — giữ nội dung luật hiện tại (1211-1216).

**Acceptance:** mọi nút gọi đúng handler cũ; PIN hiển thị đủ; slider volume thay đổi nhạc thật; layout không tràn ở cột 5/12.

---

## Task 7 — Question Overlay Art Deco

**Files:** `Host.jsx` (1220-1282), `Host.css` (342-470)

1. `.overlay`: nền backdrop dark + blur nhẹ; `.card` → `.art-deco-frame` + corner inlay 4 góc + border 2px gold.
2. Eyebrow: chip dark "CATEGORY · LÁ #n"; câu hỏi `font-playfair` lớn; `.attempt-label` dạng pill.
3. 4 `.opt-btn`: nền trắng viền `#c5ad7a`, hover gold; đúng/sai giữ màu forest/red hiện có + shadow glow.
4. `.card-actions`: "Tung xúc xắc may mắn" → nút dark gradient gold (primary), "Tiếp tục" → nút trắng viền gold; `<details>` trả lời thủ công giữ style paper nhỏ.
5. Zone reveal explanation: khung gold mảnh nền `#fffaf0`.

**Acceptance:** timing 15s, 3-lượt-sai, nút tung xúc xắc/Tiếp tục hoạt động không đổi; style khớp header/controller.

---

## Task 8 — Đồng bộ overlay phụ: EffectCard, ScoreFx, WinnerPodium, MemeDrop

**Files:** `src/components/EffectCard.jsx` (STYLE dòng 290), `ScoreFx.jsx` (STYLE 112), `WinnerPodium.jsx` (dùng `wp-*` ở Host.css:694-1129), `MemeDrop.jsx`

1. `EffectCard`: thay palette paper → Art Deco (frame gold, nền ivory gradient, dice 3D giữ nguyên, các nút steal/swap/bonus theo style nút trắng-viền-gold / dark-gold).
2. `ScoreFx`: giữ animation, đổi màu chữ/背景 sang gold/ink cho khớp.
3. `WinnerPodium`: sửa block `wp-*` (Host.css:694-1129) — nền dark-gold, rank medal gold-gradient, title `font-playfair`; nút "Ván mới" style như Task 6.
4. `MemeDrop`: giữ nguyên (không đụng — sticker là yếu tố vui nhộn ngoài ngôn ngữ thiết kế).

**Acceptance:** mở thẻ hiệu ứng/ăn cắp điểm/cuối game → không còn tông giấy cũ chỏi với trang chính.

---

## Task 9 — Responsive & dọn CSS thừa

**Files:** `Host.css`

1. Rà block responsive duy nhất (683-692): cập nhật breakpoints cho layout mới — masthead stack ≤720px, panel 1 cột ≤980px, quick-actions scroll/wrap, grid breakpoints theo Task 4.
2. Xóa dead CSS `.effect-card/.eff-*/.winner*` legacy (473-594, nếu xác nhận không JSX nào dùng — grep trước) và texture giấy/tilt cũ của `.ncard`, `.masthead`, `.stamp`.
3. Kiểm tra không còn hardcode màu paper `#F1E7CF` ở vùng đã chuyển (giữ ở overlay chưa Task nếu cần).

**Acceptance:** `grep` không còn class dead; trang không lỗi ở 360px / 768px / 1280px / 1560px.

---

## Task 10 — Kiểm chứng

1. `npm run lint` và `npm run build` (nếu script tồn tại trong `package.json`) — không lỗi.
2. Chạy dev, kiểm thử luồng: mở trang → bấm thẻ → trả lời → tung xúc xắc → hiệu ứng → điểm số bảng xếp hạng → ván mới; realtime 2 client (Supabase) không regress.
3. So sánh visual từng khu vực với mockup: header / toolbar / grid / scoreboard / controller (dùng screenshot 2 bên cạnh nhau).
4. Cập nhật `DESIGN.md`: §3 tokens (thêm tông Art Deco gold), §4 `/host` row, §5 component `.ncard`→token, §12 dọn design debt đã xử lý.

---

## Thứ tự thực thi & ước lượng

| # | Task | Phụ thuộc | Effort |
|---|---|---|---|
| 1 | Tokens & fonts | — | S |
| 2 | Header | 1 | S |
| 3 | Toolbar quick-actions | 1 | M |
| 4 | Grid 35 thẻ | 1 | M |
| 5 | Scoreboard | 1 | M |
| 6 | Game controller | 1 | M |
| 7 | Question overlay | 2,6 (style chung) | M |
| 8 | Phụ overlay (Effect/ScoreFx/Podium) | 7 | M |
| 9 | Responsive & dọn CSS | 2-8 | S |
| 10 | Kiểm chứng & DESIGN.md | tất cả | S |

**Rủi ro chính:** (a) `.ncard` có logic state chồng lên texture cũ → tách class state khỏi class style; (b) `WinnerPodium` share `Host.css` → tránh sửa nhầm block; (c) không được đụng handler/state để không vỡ realtime sync (revision check ở Host.jsx:248-257).

---

## Hotfix đã áp dụng (2026-10-07): bấm thẻ không làm gì khi game kẹt lượt

**Triệu chứng:** bấm thẻ chỉ có hiệu ứng bấm, không mở câu hỏi. Nguyên nhân thực tế: game (pin 1986) bị kẹt ở `phase: "closing_card"` (Lá số 1, revision 4) — lượt câu hỏi còn dở từ một session host bị refresh/đóng tab trước khi nhấn "Tiếp tục". `openCard` guard `phase !== "selecting_card"` khiến mọi cú bấm thẻ im lặng vô hiệu.

**Sửa trong `Host.jsx` + `Host.css` (không đụng logic game, realtime):**

1. **Boot auto-recovery** (Host.jsx ~275): mỗi lần mount trang, nếu state lần đầu là `closing_card` (deadline đã hết) → tự gọi `closeCard()` quay về `selecting_card` để bộ bài bấm được ngay. Chỉ áp dụng `closing_card` vì đây là phase **lossless** (đáp án đã lộ, không còn điểm/hiệu ứng chờ bốc). Giữ overlay cho `explaining`/`resolving_effect` vì tự đóng sẽ mất điểm xúc xắc/hiệu ứng của đội đang chơi thật.
2. **Toast hướng dẫn** (`.deco-toast`, Host.css cuối file): bấm thẻ khi đang giữa lượt / lá đã mở / game kẹt → hiện toast giải thích thay vì im lặng. Tự ẩn sau 3,8s, không chặn thao tác (z-index 300, không pointer-block).
3. **Verified** bằng Playwright headless (phòng thử pin 7070 + force state `closing_card` trong Supabase): recovery → bấm thẻ 35 mở được câu hỏi; sau đó mở thẻ 5 bình thường (overlay hiện), phase chuyển đúng `selecting_card → answering`.

**Ghi chú giới hạn:** nếu kẹt ở `answering` (deadline hết), trên load vẫn giữ hành vi cũ (timeout tự chuyển đội tiếp theo) thay vì đóng hẳn — tránh hủy câu hỏi khi người chơi thật đang suy nghĩ. Kẹt `explaining`/`resolving_effect` giữ overlay + toast hướng dẫn host xử lý.

---

## Hotfix (2026-10-07): player không thấy popup tung xúc xắc khi trả lời đúng

**Triệu chứng:** đội trả lời đúng trên /play nhưng điện thoại không hiện popup tung xúc xắc — chỉ host thấy nút "Tung xúc xắc may mắn" trong overlay giải thích.

**Nguyên nhân:** luồng cũ dừng ở phase `explaining` và chờ host bấm "Tung xúc xắc may mắn" (Host.jsx `startGuaranteedDiceRoll`) mới chuyển sang `resolving_effect` — nơi popup player có điều kiện render.

**Sửa trong `Host.jsx` + `GAMEPLAY.md`:**

1. **Tự vào thẳng phase xúc xắc khi trả lời đúng** (`computeAnswerPatch`): thay vì `phase: "explaining"`, patch trả về thẳng `resolving_effect` + đủ field dice (`show_effect`, `show_dice`, `effect_type: "points_base"`, `effect_team_idx`, `effect_revealed: true`, `eff_body_buttons: "dice"`). Giữ `show_explain: true` nên phần giải thích vẫn hiện. Popup player (Play.jsx ~728) hiện **ngay**, đồng thời Host thấy lá EffectCard với nút "🎲 Tung hộ" (EffectCard.jsx) — người chơi tung trên điện thoại, animation chạy trên Host như yêu cầu.
2. **Verified** bằng Playwright headless (phòng thử pin 2468): trả lời đúng → player thấy "Gieo Xúc Xắc" ngay không cần host bấm; Host thấy "Tung hộ"; bấm "TUNG XÚC XẮC" trên player → Host chạy animation và ra kết quả `+600 điểm` ("Tiếp tục" hiện). Cleanup: phòng test đánh dấu finished.

**Ghi chú:** nút "Tung xúc xắc may mắn" cũ trong overlay `explaining` giờ không còn hiện (phase giải thích không còn là điểm dừng); vẫn giữ switch `startGuaranteedDiceRoll` cho trường hợp resume phòng kẹt từ phiên cũ ở `explaining`.
