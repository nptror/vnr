# PLAN: Redesign giao diện trang `/play` theo phong cách "Bàn Thi Đấu Casino Editorial"

> Nguồn tham chiếu: mockup HTML **"THỬ VẬN MAY"** (Tailwind CDN, Google Fonts Cinzel / Lora / Playfair Display / Be Vietnam Pro, Material Symbols).
>
> Trang đích: `src/pages/Play.jsx` (865 dòng, `PLAY_STYLE` dòng 49-351) + `src/components/MemePanel.jsx` (252 dòng, `STYLE` dòng 14-151).
>
> Phạm vi: **chỉ giao diện**. Không đổi state, handler, truy vấn Supabase, realtime, âm thanh, route hay component dùng chung khác.

---

## 0. Quyết định kỹ thuật (áp dụng cho toàn bộ plan)

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **KHÔNG thêm Tailwind CDN.** Tái hiện toàn bộ mockup bằng CSS thuần trong `PLAY_STYLE` (+ token CSS variables). | Dự án không dùng Tailwind; thêm CDN sẽ xung đột style, nặng trang, mâu thuẫn `DESIGN.md` §1. Cùng cách đã chọn cho `2026-10-07-host-art-deco-redesign.md` (D1). |
| D2 | **Không đổi logic/state trong `Play.jsx`** — chỉ sửa phần render (JSX className/structure) và `PLAY_STYLE`. Giữ nguyên `reload`, `subscribeToGame`, `TurnTimer` tick, `handleSelect`, `handleRollDice`, `handleEffectTarget`, `handleMemeDrop`, các điều kiện phase. | Mockup là tĩnh; toàn bộ luồng chơi/realtime phải hoạt động y như cũ. |
| D3 | Giữ `PLAY_STYLE` là template literal trong `Play.jsx` (không tách file `.css`). | Plan `2026-09-27-web-performance.md` Task 5 (tách CSS) còn **chưa làm**; plan này chỉ đổi UI, tránh trộn hai thay đổi. Có thể tách `.css` sau ở plan riêng. |
| D4 | Font: thêm **Cinzel (700)** + **Lora (400–700, italic)** vào `index.html`. `Be Vietnam Pro` + `Playfair Display` đã có sẵn (đợt Host redesign) → tái dùng. Body `/play` = `Lora`, tiêu đề = `Playfair Display`, nhãn trang trí = `Cinzel`. | Đúng mockup, không tải lại font đã có. |
| D5 | Icons: **Material Symbols Outlined đã có sẵn** trong `index.html` → dùng trực tiếp (`format_list_numbered`, `verified`, `schedule`, `image`…). | Đúng mockup, không phụ thuộc emoji cho chi tiết quan trọng. |
| D6 | Mockup là **mục tiêu style**, không phải cấu trúc DOM 1-1. Giữ cấu trúc React hiện tại (`.play-page`, `.play-sidebar`, `.play-doc`, `MemePanel`…) và map sang style casino. | Tránh refactor rủi ro, dễ review, không đụng logic. |
| D7 | Màu đội **luôn lấy từ `team.color`** (catalog Supabase), không hardcode màu mockup (`#dc2626`, `#2563eb`…). | Mockup hardcode màu demo; app phải theo `TEAM_CATALOG` để đúng đội thật (`DESIGN.md` §3.4, checklist §13). |
| D8 | Giữ nguyên component/Meme drop khác: `MemeDrop` (chỉ Host dùng), `ScoreFx`, `EffectCard`, `WinnerPodium` **không đụng**. | Ngoài phạm vi `/play`; chỉ `MemePanel` là component riêng của `/play`. |

### Bảng map Mockup → Hiện tại

| Khu vực mockup | Hiện tại (`Play.jsx`) | Ghi chú |
|---|---|---|
| Nền `#e5ebf0` + chấm bi 10px | `.play-page` (`#faf8ff` + polka 20px) | Đổi nền + texture (Task 1) |
| Header trắng viền gold: badge `BÀN THI ĐẤU`, tiêu đề `♦ THỬ VẬN MAY ♦`, pill `TRỰC TIẾP` | `.play-header` + `.play-title` (583-587) | Dựng lại layout 3 cột (Task 2) |
| Sidebar `LƯỢT THI ĐẤU` + badge `7 ĐỘI`, timeline 7 đội, dot màu, `ĐANG ĐẤU` / `LƯỢT KẾ` / `Chờ đến lượt`, nhãn `BẠN` | `.play-sidebar` + `.sidebar-*` (590-635) | Restyle, giữ logic `answeringIdx`, `session.teamKey`, phase (Task 3) |
| Thẻ bao ngoài trắng viền gold + thanh navy `MÀN HÌNH THÀNH VIÊN ĐỘI` / `VÒNG 1: THỬ THÁCH` | `.play-doc` (638) | Thêm thanh tiêu đề trên đỉnh thẻ (Task 4) |
| Banner navy `ĐỘI CỦA BẠN` + badge `ĐÃ KẾT NỐI` + tên/điểm đội + ô `THỜI GIAN CÒN LẠI 00:15` | `.team-info-bar` + `TurnTimer` (639-654) | Restyle; timer giữ `formatTime` `mm:ss` (Task 5) |
| Khối chờ: ⏳ + `Chờ câu hỏi từ Người Điều Phối` | nhánh `!activeCard` (662-667) | Restyle + thêm dải gợi ý (Task 6) |
| (mockup đang ở trạng thái chờ, không có câu hỏi) | câu hỏi `.q-*` + `.opt-btn` (668-705) | Cần style đồng bộ dù mockup không vẽ (Task 7) |
| (không có trong mockup) banner kết quả + giải thích | `.result-banner` (707-710) | Style lại theo casino (Task 8) |
| Dải `TƯƠNG TÁC MEME` + `Thả Meme` + tem `Gửi yêu thương` + nút lọc `Vui nhộn (9)`/`Buồn bã (1)`/`Ngạc nhiên (4)`/`Khác (6)` + lưới 4 cột | `MemePanel` (tab folder + `meme-grid`) | Lọc = folder tabs hiện có; count lấy động (Task 9) |
| (không có trong mockup) 3 popup xúc xắc / chọn mục tiêu / cơ hội may mắn | inline style (728-773, 776-818, 821-862) | Buộc phải đồng bộ style casino (Task 10) |
| Footer `© 2026 … · HỆ THỐNG ĐẤU TRÍ TRỰC TIẾP` + `PHIÊN BẢN BÀN CHƠI CHÍNH THỨC` | `.play-footer` (720-724) | Dựng lại 2 cột (Task 11) |

---

## Task 1 — Nạp font & khai báo Design Tokens "Casino"

**Files:** `index.html`, `src/pages/Play.jsx` (`PLAY_STYLE` 49-351), `src/components/MemePanel.jsx` (`STYLE` 14-151)

1. `index.html:10-13`: thêm `Cinzel:wght@700` và `Lora:ital,wght@0,400;0,500;0,600;0,700;1,400` vào link Google Fonts (giữ nguyên các family hiện có).
2. Đầu `PLAY_STYLE`, khai báo token trong `.play-page` (scope riêng, không rò sang trang khác):
   ```css
   .play-page {
     --casino-bg:#e6ebf0;
     --paper:#fcf9f2; --paper-warm:#f6f3ec; --paper-line:#d1c5b0;
     --gold:#caa048; --gold-dark:#8c671a; --gold-pale:#f7e6a4; --gold-cream:#ede3d0;
     --navy-950:#091424; --navy-900:#0b192c; --navy-800:#0e1f38; --navy-700:#162b48;
     --maroon-700:#751a24; --maroon-800:#5c131c; --maroon-900:#480d14;
     --ink:#111927; --red:#ba1a1a; --forest:#3F5D45;
   }
   ```
3. `.play-page`: đổi `font-family` sang `'Lora', Georgia, serif`; đổi nền sang `var(--casino-bg)` + dotted pattern `radial-gradient(#b8c4cf 1.25px, transparent 1.25px)` size `10px 10px` (đúng mockup).
4. Thêm class dùng chung: `.deco-title` (`Playfair Display`, `letter-spacing:.22em`, uppercase), `.deco-label` (Cinzel/serif 700, uppercase, tracking rộng), `.gold-line` (đường gradient gold).
5. `MemePanel.jsx` `STYLE`: đổi base sans hiện tại sang `'Lora'` cho chữ mô tả, label dùng serif; giữ token cục bộ trong `.meme-panel` (scope riêng).

**Acceptance:** font mới render đúng tiếng Việt (dấu không bị cắt); token không đè trang khác (đã scope `.play-page` / `.meme-panel`); `npm run build` pass.

---

## Task 2 — Header "Bàn Thi Đấu"

**Files:** `src/pages/Play.jsx` (583-587, CSS `.play-header` 67-89)

1. JSX giữ `h1 "THỬ VẬN MAY"` (dùng trong nhánh lỗi/early-return, dòng 585). Mở rộng header thành 3 cột:
   - Trái: chip `BÀN THI ĐẤU` (nền `--gold-cream`, viền gold mờ, chữ `--gold-dark` 11px tracking `.25em`).
   - Giữa: `♦ THỬ VẬN MAY ♦` (`Playfair Display` 900, `--ink`, tracking `.22em`, `♦` màu `--gold-dark`) kèm 2 đường gradient gold 2 bên.
   - Phải: pill `TRỰC TIẾP` (nền `--navy-900`, chữ `--gold-pale`, chấm `emerald` pulse).
2. Pill `TRỰC TIẾP` là **tĩnh** (luôn hiển thị) — không thêm state mới, không dùng `game.status`.
3. CSS `.play-header`: nền trắng, `border-bottom:2px solid var(--gold)`, shadow nhẹ, `position:sticky` (giữ nguyên sticky hiện có dòng 71).

**Acceptance:** header `display:flex; justify-content:space-between`; tiêu đề không vỡ khi hẹp; `♦` render đúng.

---

## Task 3 — Sidebar "LƯỢT THI ĐẤU"

**Files:** `src/pages/Play.jsx` (590-635, CSS `.play-sidebar`/`.sidebar-*` 100-190)

1. Header side: icon Material `format_list_numbered` xanh gold + `LƯỢT THI ĐẤU` (Task 1 `.deco-label`) + badge phải `{teams.length} ĐỘI` (động, thay vì hardcode 7).
2. Giữ nguyên vòng map `teams.map((team, i) => …)` và biến `answeringIdx` (không đổi logic).
3. Đường timeline dọc: gradient `#dc2626 → #2563eb → gold mờ` (dùng pseudo-element như mockup; hiện `.sidebar-timeline-line` là dashed — đổi thành gradient 2px).
4. Mỗi mục:
   - Dot trái vị trí tuyệt đối; màu dot theo `team.color`; mục active có `ring` cùng màu.
   - Thẻ: `Đội Xanh` 13px extrabold uppercase; nhãn `BẠN` (chip viền đứt đỏ, `rotate(-3deg)`) giữ nguyên điều kiện `team.team_key === session.teamKey`.
   - Trạng thái: active → `ĐANG ĐẤU` (nền đỏ + dot ping) khi `state.phase === 'answering'`, else `Vừa trả lời`; không active → `Chờ đến lượt`. **Giữ đúng logic phase hiện tại** (622-629).
5. Item active mang class `.active`: nền maroon `var(--maroon-900)`, chữ trắng, viền gold 2px; item thường: nền trắng, viền `--paper-line`, hover viền gold.
6. Giữ responsive: ẩn sidebar `<1024px` như hiện tại (dòng 113).

**Acceptance:** 2–7 đội hiển thị đúng; đội đang trả lời highlight đúng; nhãn "BẠN" đúng thiết bị; không phụ thuộc số đội cố định.

---

## Task 4 — Khung lá văn kiện + thanh tiêu đề "MÀN HÌNH THÀNH VIÊN ĐỘI"

**Files:** `src/pages/Play.jsx` (637-638, CSS `.play-main`/`.play-doc` 193-215)

1. `.play-main`: giữ `flex:1`, padding; cho phép `align-items:flex-start` để thẻ dài không bị kéo giữa (mockup canh trên).
2. `.play-doc`: nền trắng, `border:2px solid var(--gold)`, `border-radius:2px`, `box-shadow` offset; **bỏ** `transform:rotate(-.2deg)` kiểu giấy cũ.
3. Thêm thanh navy trên đỉnh thẻ (JSX mới trong `.play-doc`):
   - Trái: `✦ MÀN HÌNH THÀNH VIÊN ĐỘI` (chữ `--gold-pale` 11px tracking `.25em`).
   - Phải: `VÒNG 1: THỬ THÁCH` (chữ slate 10px) + 1 chấm gold.
   - Nền `linear-gradient(90deg, var(--navy-900), var(--navy-700), var(--navy-900))`, `border-bottom:2px solid var(--gold)`.
4. Thanh này là tĩnh (label trang trí), không nhận dữ liệu game.

**Acceptance:** thẻ không còn nghiêng giấy; thanh navy sát `-mx` đúng; `max-width:860px` (đổi từ 900px cho khớp mockup).

---

## Task 5 — Banner thông tin đội + đồng hồ

**Files:** `src/pages/Play.jsx` (639-654, CSS `.team-info-bar`/`team-info-*`/`.timer-*` 217-249), component `TurnTimer` (363-381)

1. `.team-info-bar` → banner navy: nền `--navy-800`, viền `2px var(--gold)`, `border-radius:2px`, shadow.
2. Trái:
   - Ô vuông 48px nền màu đội trang trí (dùng `myTeam?.color`), chữ `X` hoặc **chữ cái đầu tên đội** (không đổi dữ liệu).
   - Label `ĐỘI CỦA BẠN` (`--gold-pale`, tracking `.2em`) + badge `ĐÃ KẾT NỐI` (emerald mờ) — **tĩnh**.
   - Tên đội `Playfair Display` trắng + `· {score} Điểm` (giữ `myTeam?.score ?? 0`).
3. Phải: label `THỜI GIAN CÒN LẠI` + `.team-info-timer` trong ô `--navy-950` viền gold; giữ `TurnTimer`, `formatTime` (`mm:ss`), các class `timer-normal/warn/danger` và ngưỡng 10s/5s.
4. **Không đổi** `TurnTimer` logic (deps `[deadlineAt, active]`, `key={state.deadline_at ?? 'idle'}`).

**Acceptance:** đồng hồ vẫn đếm ngược 15s và đổi màu đúng ngưỡng; điểm đội cập nhật realtime; `key` remount giữ nguyên.

---

## Task 6 — Trạng thái chờ / đang giải quyết thẻ

**Files:** `src/pages/Play.jsx` (656-667)

1. Nhánh `!activeCard` (662-667): thay inline style bằng khối casino — vòng tròn/ô 64px viền gold chứa `⏳` (animate bounce nhẹ), tiêu đề `Playfair Display` `Chờ câu hỏi từ Người Điều Phối`, dải gợi ý nền `--paper-warm` viền `--paper-line`: "Host sẽ mở lá bài trên màn hình chính · Giữ bình tĩnh và sẵn sàng!".
2. Nhánh `resolving_effect` (656-661): cùng khung, icon `🎉`, tiêu đề `Đang giải quyết Thẻ chức năng`, phụ đề `Hãy hướng mắt lên màn hình Host!`.
3. Giữ nguyên **điều kiện render** và thứ tự ưu tiên (`resolving_effect` trước `!activeCard`) — chỉ đổi markup/style.

**Acceptance:** không thay đổi khi nào hiện khối nào; style khớp banner/nền casino.

---

## Task 7 — Câu hỏi + nút đáp án

**Files:** `src/pages/Play.jsx` (668-705, CSS `.q-*`/`.opt-*` 251-309)

1. Eyebrow `.q-eyebrow`: chuyển từ "CÂU HỎI TRUY VẤN · Lá số N" sang chip nền navy/gold (giữ nội dung + `activeCard.num`).
2. `.q-text`: giữ `"…"` và `activeCard.q`; đổi thành serif `Lora` 18-20px, `border-left:3px solid var(--gold)`, bỏ italic nếu cần (hoặc giữ italic — chốt khi implement, mockup không thể hiện).
3. `.opt-eyebrow`: giữ nguyên chuỗi điều kiện `isMyTurn ? 'ĐẾN LƯỢT ĐỘI BẠN…' : LƯỢT TRẢ LỜI: …` (674).
4. Hai dòng ghi chú trạng thái (đã gửi / lỗi gửi) 676-690: style lại chip nhỏ, **không đổi điều kiện** `isMyTurn && !alreadySubmitted`, `alreadySubmitted`, `submitErrorMessage`.
5. `.opt-btn`: nền `--paper`, viền `--paper-line`, hover viền `--gold` + nền sáng; `.selected` viền gold; `.correct` giữ `--forest`; `.wrong` giữ tông đỏ. `.opt-label` (A/B/C/D) viền phải `--paper-line`.
6. Giữ `disabled={!isMyTurn || alreadySubmitted}` và `onClick={() => handleSelect(i)}` **nguyên vẹn**.

**Acceptance:** 4 đáp án render đúng thứ tự; chọn chỉ khi đến lượt; trạng thái đúng/sai/đã gửi hiển thị đúng màu.

---

## Task 8 — Banner kết quả + khối giải thích

**Files:** `src/pages/Play.jsx` (707-710, `.result-banner`/`.play-divider` 311-329)

1. `.result-banner.correct`: viền/nền theo `--forest` + dấu `✓` (giữ nội dung `resultBanner.text`). `.pending` cho khối `activeCard.explain` (708-710): nền `--paper-warm`, viền `--paper-line`, chữ `--ink`.
2. `.play-divider`: thành đường gradient gold 1px.
3. **Không đổi** điều kiện `resultBanner` (571-576) và `activeCard && state.show_explain`.

**Acceptance:** banner đúng đội trả lời; giải thích hiện khi `show_explain`; divider khớp mockup.

---

## Task 9 — MemePanel "Tương tác Meme"

**Files:** `src/components/MemePanel.jsx` (JSX 193-249, `STYLE` 14-151), `src/pages/Play.jsx` (712-715)

1. Thêm dải phân cách `TƯƠNG TÁC MEME` (2 đường gold + nhãn `--gold-dark` trên nền `--gold-cream`) phía trên `MemePanel` — có thể đặt trong `Play.jsx` trước `<MemePanel>` (714).
2. `.meme-panel`: nền `--paper`, viền `2px rgba(gold,.8)`, bỏ `rotate(0.3deg)`; header: icon `image` + `Thả Meme` (serif 700) + tem `Gửi yêu thương` (viền đứt đỏ, `rotate(-4deg)`).
3. **Folder tabs → "category filter buttons"**: giữ nguyên `MEME_FOLDERS` + state `activeTab`. Đổi style:
   - Tab active: nền `--navy-900`, chữ `--gold-pale`, viền `--gold` 2px.
   - Tab thường: nền trắng, viền `--paper-line`, hover viền gold.
   - Hiển thị count `({f.memes.length})` **động** (mockup hiển thị Vui nhộn 9 / Buồn bã 1 / Ngạc nhiên 4 / Khác 6 — trùng dữ liệu thật).
4. `.meme-grid`: giữ 4 cột (3 cột ≤640px); ô `aspect-ratio:1`, ảnh `object-fit:cover`, hover `scale(1.05)`; khung `--gold` mờ. Giữ `MemeImg`, `loading="lazy"`.
5. Cooldown: giữ nguyên logic `handleDrop`/`COOLDOWN_MS`; chỉ đổi màu thanh fill sang `--gold`/màu đội và text.

**Acceptance:** lọc theo folder vẫn hoạt động; count đúng theo dữ liệu; thả meme vẫn gọi `onDrop` (→ `handleMemeDrop`) và chặn 3s như cũ.

---

## Task 10 — 3 popup tương tác (xúc xắc / chọn mục tiêu / cơ hội may mắn)

**Files:** `src/pages/Play.jsx` (728-773, 776-818, 821-862)

1. Thay inline style bằng class casino dùng chung (`.play-popup`, `.play-popup-panel`):
   - Overlay: `rgba(0,0,0,.6)` (bỏ `backdrop-filter` theo `DESIGN.md` §12.3, hoặc giữ nếu muốn — chốt khi implement), `z-index:100` giữ nguyên.
   - Panel: nền `--paper`, viền `2px var(--gold)`, `border-radius:4px` (bỏ `16px` kiểu SaaS), shadow offset.
   - Tiêu đề `Playfair Display` `--maroon-800`; nút primary nền `--navy-900` chữ gold (dice) hoặc màu đội (chọn mục tiêu, giữ `t.color`).
2. **Giữ nguyên 100% điều kiện render** (728, 776, 821), các biến `state.eff_body_buttons`, `state.effect_revealed`, `state.dice_rolling`, `state.dice_result_visible`, `show_eff_continue`.
3. Giữ handler `handleRollDice` (751), `handleEffectTarget` (809, 846, 855) và nội dung nhãn `Cướp từ…` / `Đổi với…` / `Nhận chắc +200đ` / `Thử vận may…`.
4. `animation:fadeIn` giữ nguyên (keyframes đã có).

**Acceptance:** cả 3 popup hiện đúng thời điểm như trước; bấm nút gọi đúng handler; style đồng bộ trang chính.

---

## Task 11 — Footer

**Files:** `src/pages/Play.jsx` (720-724, CSS `.play-footer` 331-351)

1. Nền `#faf6ee` (theo mockup), viền trên `2px gold`, text `--gold-dark` 11px tracking rộng.
2. Trái: `© 2026 THỬ VẬN MAY · HỆ THỐNG ĐẤU TRÍ TRỰC TIẾP`.
3. Phải: icon `verified` + `PHIÊN BẢN BÀN CHƠI CHÍNH THỨC`.
4. Giữ `margin-top:auto` để footer dính đáy trang.

**Acceptance:** footer 2 cột ≥640px, dồn dọc <640px; không đè nội dung.

---

## Task 12 — Responsive & dọn CSS thừa

**Files:** `src/pages/Play.jsx` (`PLAY_STYLE`), `src/components/MemePanel.jsx` (`STYLE`)

1. Rà breakpoints: sidebar ẩn `<1024px` (giữ); `.play-main` padding `2rem`→`3rem` ≥768px (giữ); meme grid 4→3 cột ≤640px (giữ); thêm xử lý header 3 cột co lại ở ≤480px (badge/pill thu gọn).
2. Xoá CSS/token cũ không còn dùng sau khi chuyển: màu `#faf8ff`, `#887272`, `#dbc0c1`, `#ffdadb`… nếu không còn tham chiếu (grep trước khi xoá).
3. Xoá `transform:rotate` kiểu giấy còn sót ở `.play-doc`, `.meme-panel`.

**Acceptance:** trang không vỡ ở 360px / 768px / 1024px / 1440px; `grep` không còn class/token dead.

---

## Task 13 — Kiểm chứng & cập nhật `DESIGN.md`

1. `npm run lint` và `npm run build` — không lỗi (convention repo, không có test suite).
2. Chạy dev, kiểm thử luồng thật trên 2 client: chọn đội → `/play` → chờ câu hỏi → mở lá trên Host → chọn đáp án → trả lời đúng → popup tung xúc xắc → hiệu ứng → bảng điểm; thả meme trên nhiều tab; realtime không regress.
3. So sánh visual từng khu vực với mockup (header / sidebar / banner / chờ / meme / footer) — screenshot cạnh nhau.
4. `DESIGN.md`: cập nhật §3 tokens (thêm tông casino: navy + gold + maroon), §4 hàng `/play` (nền `#e6ebf0` + dotted 10px, layout mới), §5.7 sidebar `/play`, §5.8 thanh thông tin đội, §5.10 MemePanel, §3.10 nghiêng (bỏ nghiêng Play), ghi chú token màu đội vẫn lấy từ `catalog.js`.

**Acceptance:** build/lint xanh; visual khớp mockup; `DESIGN.md` không còn mô tả style giấy cũ cho `/play`.

---

## Thứ tự thực thi & ước lượng

| # | Task | Phụ thuộc | Effort |
|---|---|---|---|
| 1 | Tokens & fonts | — | S |
| 2 | Header bàn thi đấu | 1 | S |
| 3 | Sidebar lượt thi đấu | 1 | M |
| 4 | Khung thẻ + thanh tiêu đề | 1 | S |
| 5 | Banner đội + đồng hồ | 1 | M |
| 6 | Trạng thái chờ | 1 | S |
| 7 | Câu hỏi + đáp án | 1 | M |
| 8 | Banner kết quả + giải thích | 1 | S |
| 9 | MemePanel | 1 | M |
| 10 | 3 popup tương tác | 1,2 (style chung) | M |
| 11 | Footer | 1 | S |
| 12 | Responsive & dọn CSS | 2-11 | S |
| 13 | Kiểm chứng & `DESIGN.md` | tất cả | S |

**Rủi ro chính:**
- (a) `Play.jsx` có nhiều điều kiện render (phase, `isMyTurn`, `isMyEffectTurn`, `alreadySubmitted`) — khi dựng lại JSX dễ vô tình đổi điều kiện → **giữ nguyên logic, chỉ đổi className/markup** (D2).
- (b) `TurnTimer` remount theo `key={state.deadline_at}` — không đổi `key`, không đổi deps.
- (c) Màu đội phải lấy `team.color`, không hardcode màu mockup (D7).
- (d) `PLAY_STYLE` inject 2 chỗ (459, 580) — sửa CSS là sửa cả hai (thực chất cùng 1 chuỗi, chỉ cần sửa const).
- (e) Không được đụng `MemeDrop`/`EffectCard`/`ScoreFx`/`WinnerPodium`/Host để tránh vỡ luồng Host (D8).

---

## Out of scope (không làm)

- Không thêm Tailwind/PWA/dependency mới.
- Không đổi state, handler, truy vấn Supabase, `PLAY_STATE_COLUMNS`, realtime, `reload`, `subscribeToGame`, âm thanh.
- Không đổi nội dung dữ liệu meme/đội/câu hỏi, không thêm/bớt sticker.
- Không đụng các trang khác (`/`, `/pin`, `/host`, `/pick-team`) và các component Host (`MemeDrop`, `EffectCard`, `ScoreFx`, `WinnerPodium`).
- Không tách `PLAY_STYLE` ra file `.css` (để dành cho plan performance).

---

## Plan self-review

- **Logic bất biến:** mọi task khoá cứng "giữ nguyên điều kiện/handler"; chỉ Task 4 thêm markup tĩnh, Task 9 giữ nguyên `MemePanel` state/logic.
- **Dữ liệu động:** sidebar `{teams.length}`, count meme lấy từ `f.memes.length`, màu đội lấy `team.color` — không hardcode 7/9/… như mockup demo.
- **Font:** tái dùng Be Vietnam Pro + Playfair Display đã nạp cho Host, chỉ thêm Cinzel + Lora → không phình thêm nhiều.
- **Rủi ro lớn nhất:** dựng lại JSX phần câu hỏi/đáp án (Task 7) — dễ đụng điều kiện `disabled`/`submitErrorMessage`; cần review kỹ diff.
