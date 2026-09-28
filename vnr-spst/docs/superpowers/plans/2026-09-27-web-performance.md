# Plan: Tối ưu performance cho web

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web nhẹ hơn và mượt hơn trên mạng lớp học yếu + máy chiếu/điện thoại cấu hình thấp — không đổi gameplay, không đổi visual design.

**Ngày tạo:** 2026-09-27 (viết lại lần 2 — xem "Vì sao viết lại")

## Vì sao viết lại

Bản plan đầu (2026-09-27, đã xoá) nhắm vào **transfer size** (route split, BGM, font) và **GPU paint** (blur, cooldown). Đo thực tế cho thấy cả hai đều không phải nút thắt:

- Bundle đã là **162,843 B gzip (159 kB)** — nhỏ hơn ngay ngưỡng 250 kB mà bản cũ tự đặt ra ở tiêu chí nghiệm thu. Route split **không giảm byte mạng**, chỉ giảm parse/exec CPU.
- Task "thêm `&display=swap`" là **no-op**: tham số đã có sẵn trong `index.html:10-13`.
- Ba chỗ trong `/play` có `backdrop-filter` đều **conditional**, tối đa 1 cái mount — GPU paint không phải vấn đề.

Nút thắt thật là **payload vô nghĩa + re-render vô nghĩa**, plan cũ không task nào chạm tới:

| Vấn đề | Quy mô (đo được) |
|---|---|
| `saveGameState` trả về nguyên hàng 25,7 kB mỗi lần ghi, **mọi caller đều vứt** | 8-12 ghi/lá bài ⇒ 200-300 kB rác/lá |
| `loadGame` dùng `select("*")`, ship `card_deck` + `effect_deck` cho mọi máy | Host 43,7 kB · Play 27,2 kB mỗi 5 s |
| Zero `React.memo` trong toàn repo | re-render **cả cây** 12×/min kể cả khi 0 byte đổi |
| 46,674 B CSS ship như chuỗi JS | 8,2% bundle, 2 file còn **dựng lại chuỗi trong JSX mỗi render** |
| `EffectCard` gọi `buildConfetti()` không memo | animation confetti **khởi động lại 12×/min** trên máy chiếu |
| 20 sticker tĩnh, tab mặc định `fun` | **745,724 B** tải về trên **mỗi** máy học sinh |

Con số dưới đây đo bằng cách chạy `createShuffledCardDeck()`/`createShuffledEffectDeck()` từ `src/game/catalog.js` rồi serialize một hàng `game_state` thực tế, và bằng kích thước file thật trong `dist/`. Không phải capture mạng.

## Quyết định thiết kế

1. **Cắt payload trước, giảm tần suất sau.** Sửa *nội dung* data (Task 1-3) rẻ và triệt để hơn sửa *tần suất* poll — plan cũ chỉ sửa tần suất.
2. **Không đổi visual, không đổi gameplay, không thêm dependency, không test suite** (convention repo: manual + `npm run build` + `npm run lint`).
3. **Task 1-2 là zero-risk** (chỉ thu hẹp `.select()`, không đổi hợp đồng dữ liệu) — làm trước, đo lại, rồi mới sang Task 3-5 cần đổi schema/render.
4. `card_deck` **không** bỏ được khỏi `/play` bằng cách tự dựng lại client: `getCardByNumber` (`catalog.js:420-422`) khớp `card.num === cardNum` mà `num` là **vị trí sau shuffle** (`:328` `shuffle(pool).concat(shuffle(pool)).slice(0, TOTAL_CARDS)`, `:330` `num: i + 1`). Vị trí N chứa câu nào phụ thuộc shuffle → không dựng lại được local. Phải denormalize lá đang mở (Task 3).

## Task 1: Write path — `.select()` trả về cả hàng 25,7 kB, không ai dùng

**Files:** `src/game/gameRepository.js`

**Produces:** Mỗi lần ghi còn ~40 B thay vì ~25,7 kB. Zero risk: không đổi logic, không đổi hợp đồng dữ liệu.

- [x] `saveGameState:233` — `.select()` → `.select("revision")`. `data` chỉ dùng cho kiểm tra null (`:236`) và `return data` (`:245`); cả 20 call site ở `Host.jsx` đều `await ...` và **không gán kết quả** (`:247,363,378,406,513,543,555,591,616,712,753,819,840,871,878,893,906,919,940,965`), cộng thêm `createGame` (`gameRepository.js:25`) cũng vứt. **Không mất tín hiệu conflict**: UPDATE rỗng (revision lệch) ⇒ PostgREST trả mảng rỗng ⇒ `maybeSingle()` → `null` ⇒ `:236` vẫn bắt `STALE_REVISION` như cũ.
- [x] `saveTeams:261` — `.select()` → `.select("team_key")`. Cùng lý do; `Host.jsx` chỉ dùng để chờ ghi xong.
- [x] `appendGameEvent:270` — `.select()` → `.select("id")`. `id` cần cho `log_game_event`/caller, nhưng không cần cả hàng.
- [x] **Giữ nguyên** `.select()` ở `joinGame:82,89` — chúng đã hẹp và có thật trong code (`TEAM_TAKEN` dựa trên `existing?.joined_at`).
- [x] Comment tại `gameRepository.js:206-209` mô tả diff-patch: bổ sung rằng diff-patch chỉ áp dụng cho **request**, còn **response** trước đây luôn là cả hàng — nếu không đọc kỹ sẽ tưởng đã tối ưu xong.

## Task 2: Read path — mỗi trang chỉ select cột nó dùng

**Files:** `src/game/gameRepository.js`, `src/pages/Play.jsx`, `src/pages/PickTeam.jsx`

**Produces:** `/play` giảm ~15% payload ngay, không cần schema. `/pick-team` giảm 3 binding thừa.

- [ ] `loadGame:105` nhận option `columns` cho bảng `game_state`, mặc định `"*"` (giữ nguyên hành vi cho `/host`).
- [ ] `Play.jsx:373` gọi `loadGame(session.gameId, { stateColumns: PLAY_STATE_COLUMNS })`, với danh sách cột = **mọi cột trừ** `card_deck`, `effect_deck`, `used_card_numbers`. Cơ sở (đã grep toàn `src/`): `effect_deck`/`effect_cursor` chỉ đọc ở `Host.jsx:438-485` và `gameRepository.js:484-485`; `used_card_numbers` chỉ đọc ở `Host.jsx:1048,1070` và `transitions.js:90-91`. `/play` **không** đọc bộ nào — nó chỉ dùng `card_deck` tại `Play.jsx:437`.
- [ ] Giữ `revision` trong danh sách — `Play.jsx` truyền nó cho `submitAnswerEvent` (đối chiếu server).
- [ ] `PickTeam.jsx:38` dùng `fetchTeams` (`gameRepository.js:60-71`) — thu hẹp `.select("*")` → `.select("team_key, joined_at")`, đúng 2 cột trang này đọc (`:57,67`). **Không** đụng `fetchTeams` dùng chung ở `/play` (`Play.jsx` cần `name`,`color`,`score`): tách `fetchTeamsForPicking()` mới, giữ nguyên `fetchTeams()`.
- [ ] Kiểm: sau Task 3 xong, payload poll `/play` phải < 3 kB (mục tiêu đo ở Task 11).

## Task 3: `active_card` — chỉ ship lá đang mở, thay vì cả 35 lá

**Files:** `supabase/schema.sql`, `src/game/gameRepository.js`, `src/pages/Host.jsx`, `src/pages/Play.jsx`, `src/game/transitions.js`

**Produces:** `card_deck` (19,984 B) chỉ còn nằm ở Host và 1 lần ghi; `/play` chỉ nhận ~600 B thay vì 20 kB. Đây là thắng lợi lớn nhất còn lại.

- [ ] `schema.sql`: thêm `active_card JSONB` vào bảng `game_state` (cạnh `active_card_num` ở `:101`) + `ALTER TABLE game_state ADD COLUMN IF NOT EXISTS active_card JSONB;` vào khối upgrade shim, đặt cạnh dòng `steal_target_idx` (`:155`). File idempotent nên chạy lại được, khối RESET không liên quan.
- [ ] `Host.jsx openCard` (`:753-767`): thêm `active_card: card` vào **cùng patch** `saveGameState` đang ghi `active_card_num`. Cùng patch ⇒ atomic, không có trạng thái trung gian Host-crash mà học sinh thấy lá rỗng.
- [ ] `transitions.js closeCard` (`:109-129`): thêm `active_card: null` vào object trả về. Bắt buộc vì `closeCard` spread `...state` (`:110`) nên sẽ **mang theo** lá cũ nếu không xoá tường minh.
- [ ] `Play.jsx:437`: đổi `getCardByNumber(state.card_deck, state.active_card_num)` → đọc `state.active_card`, có fallback về `card_deck` nếu cột chưa có (phòng DB cũ chưa migrate, và để không hỏng nếu host build cũ đang chạy).
- [ ] Sau khi fallback đã ổn định, **xoá** `card_deck` khỏi `PLAY_STATE_COLUMNS` (Task 2).
- [ ] `Host.jsx:1046,1069-1070` **giữ nguyên** `card_deck` + `used_card_numbers` — Host cần cả 35 lá để vẽ lưới bài và đếm số lá còn lại.

## Task 4: Chặn re-render vô nghĩa

**Files:** `src/pages/Host.jsx`, `src/pages/Play.jsx`, `src/pages/PickTeam.jsx`, `src/components/EffectCard.jsx`, `src/components/ScoreFx.jsx`, `src/components/MemeDrop.jsx`, `src/components/WinnerPodium.jsx`

**Produces:** Host idle không còn re-render 12×/min; confetti không bị khởi động lại giữa chừng.

- [ ] `EffectCard.jsx:125` — `const confetti = buildConfetti();` → `useState(() => buildConfetti())`. Hiện gọi `Math.random()` mỗi render ⇒ 10 object `--dx/--dy/--c` mới ⇒ React ghi lại inline style của 10 `<span>` (`:147-149`) ⇒ animation `er-confetti-fly` 720ms (`:527`, keyframes `:529`) **restart từ đầu**. Sửa mẫu đúng đã có sẵn trong `WinnerPodium.jsx:31-32` (`useState(() => buildStamps(30))`).
- [ ] `Host.jsx:208-219` và `Play.jsx:371-382` — bỏ chỗ set state với object identity mới khi nội dung không đổi. Cách rẻ nhất không cần `useRef` phụ: so sánh `revision` của `game_state` (đã có sẵn, `:250` schema) rồi `setState` cũ — nhưng `state` còn phụ thuộc `teams`, nên thực thi dạng: bỏ qua `setTeams`/`setEvents` khi payload tương đương. Cân nhắc `React.memo` cho 4 component con (`EffectCard`, `ScoreFx`, `MemeDrop`, `WinnerPodium`) — repo hiện có **0** occurrence `memo(`.
- [ ] `Host.jsx:1100-1109` — `[...teams].map(...).sort(...).map(...)` đang cấp phát 2 mảng trung gian **trong JSX mỗi render**; bọc `useMemo` (deps `[teams]`).
- [ ] `Play.jsx:374-377` — 4 setter không điều kiện; đặc biệt `setTeams` tạo array mới mỗi chu kỳ dù 0 đội đổi.
- [ ] Đo lại trước/sau bằng React DevTools Profiler (record 60 s, Host idle + 1 Host đang chơi), ghi kết quả vào PR description.

## Task 5: 46 kB CSS đang ship như chuỗi JS

**Files:** 8 file có `const STYLE` / `PLAY_STYLE` / template literal trong JSX

**Produces:** CSS ra file `.css` thật, cache được, không phải JS phải parse trước khi áp.

Bảng kích thước đo được:

| file | const | bytes | ghi chú |
|---|---|---|---|
| `components/EffectCard.jsx` | `STYLE:286-643` | 11,763 | dùng `className="host-btn ghost"` ×6 → rule nằm ở `Host.css` |
| `pages/Play.jsx` | `PLAY_STYLE:13-315` | 8,314 | inject 2 chỗ: `:415`, `:530` |
| `pages/PickTeam.jsx` | literal trong JSX `:105` | 6,003 | **dựng lại chuỗi mỗi render** |
| `components/ScoreFx.jsx` | `STYLE:108-256` | 5,654 | re-render 60 fps × 2 |
| `pages/PinEntry.jsx` | `STYLE:13-175` | 5,638 | re-render **mỗi lần gõ phím** (`:239-242`) |
| `pages/Landing.jsx` | literal trong JSX `:15` | 4,730 | **dựng lại chuỗi mỗi render** |
| `components/MemePanel.jsx` | `STYLE:14-151` | 3,305 | 20 Hz khi cooldown |
| `components/MemeDrop.jsx` | `STYLE:10-65` | 1,267 | |

- [ ] Tách mỗi block thành `*.css` cạnh component; xoá hẳn `<style>{...}</style>`.
- [ ] Gỡ coupling trước khi tách `EffectCard`: 8 rule `host-btn.ghost` đang ở `Host.css` mà `EffectCard` dùng class đó — chuyển chúng sang `EffectCard.css` cùng lúc, **không** để lại class trỏ sang stylesheet không được import ở `/play`.
- [ ] `PickTeam.jsx` và `Landing.jsx` phải tạo `.css` file (không dựng lại chuỗi) — đây là 2 chỗ tệ nhất vì hiện đang allocate chuỗi 6 kB mỗi render.
- [ ] `Host.jsx` **không** có `STYLE` — nó dùng `import "./Host.css"` (`:43`). Không "sửa" nhầm file này.
- [ ] Sau khi tách: `Host.css` (23,536 B) chỉ còn được load ở `/host`. Hiện `App.jsx:3` import tĩnh `Host` ⇒ **mọi** route đều tải 4,564 B gzip CSS của Host.
- [ ] Xoá `src/App.css` (2,891 B) — grep toàn repo: **không nơi nào import**. Và thay `src/index.css` (2,969 B, boilerplate Vite: `--accent: #aa3bff`, `.counter`) bằng nội dung thật hoặc rút gọn; nó đang tải ở mọi route.

## Task 6: Meme — 745 kB trên mỗi máy học sinh + 120 setState/lần thả

**Files:** `src/components/MemePanel.jsx`, `src/config/memes.js`, `src/components/MemeDrop.jsx`

**Produces:** `MemePanel` không tải ảnh của tab chưa mở; cooldown không render lại cả panel 20 Hz.

- [ ] **Chỉ tải ảnh của tab đang mở.** Hiện 20 URL là static import (`config/memes.js:1-20`) và `MemePanel` render không điều kiện trên `/play` (`Play.jsx:665`), mặc định tab `fun` (`MemePanel.jsx:166`) = 9 file / **745,724 B** tải về trên **7 điện thoại** chỉ để vẽ bộ chọn. `loading="lazy"` (`:160`) vô dụng vì cả 9 ô nằm trong viewport. Chuyển sang URL string (`/src/assets/...` hoặc để Vite phát hash) + `src` gán khi `activeFolder` đổi, kèm placeholder.
- [ ] **Cooldown 50 ms → 500 ms**: `MemePanel.jsx:179` `setInterval(..., 50)` → `500`. 3000/50 = 60 tick × **2 setter** (`:187-188` `setCooldownLeft` + `setCooldownPct`) = **120 setState/lần thả**; ở 500 ms còn 6 tick. `useCallback` (`:191`) cũng bị tạo lại mỗi tick vì `cooldownLeft` nằm trong deps — sửa luôn bằng `cooldownLeftRef` để dep chỉ còn `[onDrop]`.
- [ ] **Thêm cleanup khi unmount**: hiện `interval` chỉ nằm trong closure, `componentWillUnmount` không `clearInterval` ⇒ setState trên component đã unmount tới 3 s. Dùng `useEffect` với `useRef` giữ id interval.
- [ ] Hoặc gọn hơn: bỏ `cooldownPct`, cho `.meme-cooldown-fill` chạy CSS animation `width: 100% → 0` trong 3 s (`animation: cooldown 3s linear forwards`) ⇒ chỉ 2 setState (bắt đầu/kết thúc).
- [ ] `MemeDrop.jsx:71-79` có **component thứ hai cùng tên `MemeImg`, không có** `loading="lazy"` — thêm (đây là cái dán sticker lên bảng điểm Host, plan cũ nhầm là đã tốt).
- [ ] Cân nhắc re-encode 5 file `.png` sang `.webp` (tổng 169,6 kB) để giảm thêm. **Không bắt buộc** — ghi lý do nếu bỏ.

## Task 7: Nhạc nền 4,7 MB tải về không điều kiện

**Files:** `src/hooks/useBackgroundMusic.js`, `public/sound/bgm/bgm.mp3`

**Produces:** Mở `/host` khi nhạc đang tắt không tốn byte nào.

- [ ] **Hiện trạng chính xác**: `useBackgroundMusic.js:27-49` tạo `new Audio(src)` + `preload = "auto"` ngay trong `useEffect` chạy lúc **mount**, không phụ thuộc tương tác. Nên 4,7 MB bị kéo về trước khi user chạm nút. (Plan cũ ghi "có thể kéo" — thực tế là không điều kiện.) Hook chỉ được `Host.jsx:177` dùng, nên đây là chi phí riêng của Host.
- [ ] `preload = "none"`, và chỉ gán `audio.src` ở lần `toggle()` đầu tiên bật nhạc. Giữ nguyên cơ chế `localStorage` + `pointerdown` one-shot (`:36-38`) để không phá autoplay policy.
- [ ] Nén `bgm.mp3` (4,916,035 B) xuống ~80 kbps mono: `ffmpeg -i bgm.mp3 -codec:a libmp3lame -b:a 80k -ac 1 bgm.mp3` ⇒ ~1 MB. Nhạc nền lớp họp không cần bitrate cao.
- [ ] **Không** đụng 23 file SFX trong `public/sound/` (tổng ~1,5 MB, lớn nhất `timer-tick-7s-left.mp3` 232 kB) — cần phát tức thì, dung lượng nhỏ, `preload="auto"` ở `sounds.js:42-50` có chủ đích.

## Task 8: Bỏ `backdrop-filter` ở popup `/play`

**Files:** `src/pages/Play.jsx:681,729,774`, `DESIGN.md:292`

- [ ] Cả 3 popup đều conditional + `rgba(0,0,0,0.6)`; tối đa 1 cái mount (chỉ một `eff_body_buttons` mode active) nên **blur ở đây không tệ như plan cũ nghĩ** — nhưng bỏ vẫn rẻ và đúng hướng: thay bằng `rgba(0,0,0,0.72)`.
- [ ] Giữ `animation: 'fadeIn 0.2s ease-out'` (rẻ, chỉ opacity).
- [ ] Cập nhật `DESIGN.md:292`.
- [ ] Thêm: `ScoreFx.jsx:115` còn `blur(2px)` trên `position: fixed; inset: 0` và chạy 60 fps (Task 4) — cân nhắc cùng lúc.
- [ ] Kiểm trên điện thoại thật: mở/đóng 3 popup khi đang mở câu hỏi → không drop frame.

## Task 9: Event log — Host tải 100 hàng 12×/min rồi vứt, và bảng không có cap

**Files:** `src/pages/Host.jsx:639-692`, `src/game/gameRepository.js`, `supabase/schema.sql`

**Produces:** Host chỉ nhận event **chưa xử lý**; `game_events` không phình vô hạn.

- [ ] `Host.jsx:210` `loadGame(gameId, { includeEvents: true })` tải 100 hàng (mỗi hàng ~165 B ⇒ ~16,5 kB) mỗi 5 s. Nhưng effect `Host.jsx:639-692` (loop ở `:643`, deps `[events]` ở `:692`) **chỉ cần event chưa xử lý** — đã có sẵn `processedEventIds` `useRef` (`:175`). Đổi truy vấn sang `?select=id,event_type,payload,created_by,created_at&order=id&lt;lastSeenId&gt;` thay vì "100 hàng mới nhất". (Cần đọc lại `gameRepository.js:105-130` để giữ `Promise.all` và cấu trúc trả về.)
- [ ] **Sửa hệ số fan-out**: `setEvents` tạo array mới mỗi chu kỳ ⇒ `useEffect(..., [events])` (`:639`) **chạy lại 12×/min trên Host idle**, duyệt 100 event đã xử lý (1.200 lượt/phút) để không làm gì.
- [ ] **Cân nhắc bỏ hẳn đường HTTP cho event**: `subscribeToGame` (`gameRepository.js:187-204`) bind cả `game_events` nhưng `Host.jsx:322` callback chỉ gọi `reload.schedule()` — **khung WS đã mang đủ payload rồi bị vứt**. Dùng thẳng payload notification sẽ bỏ được cả request này. Nếu làm, phải giữ đường HTTP làm dự phòng cho socket rớt.
- [ ] `game_events` **không có cap**: `appendGameEvent` (`gameRepository.js:266-274`) insert vô hạn, không DELETE/TTL/trigger nào trong `schema.sql`. Thêm policy prune (vd xoá `created_at` cũ hơn N giờ cho game đã `finished`) hoặc trigger theo thời gian — ghi rõ lựa chọn.
- [ ] Bỏ index `idx_game_events_game_created` (`schema.sql:195`) nếu Task 9 dùng `order=id` — index đó tồn tại để phục vụ một query lẽ ra không nên chạy.

## Task 10: Route splitting

**Files:** `src/App.jsx`

**Produces:** `/pin` và `/pick-team` không parse code của `/host`. **Lưu ý: không giảm byte mạng.**

- [ ] 5 import tĩnh (`App.jsx:2-6`) → `React.lazy` + `<Suspense fallback>`; fallback dùng font Noto Serif, copy "Đang tải…" đồng bộ "Đang kết nối…" sẵn có.
- [ ] Đừng kỳ vọng giảm tải mạng: bundle hiện **162,843 B gzip**, đã dưới ngưỡng 250 kB mà plan cũ đặt ra. Lợi ích là **parse/exec CPU** trên máy yếu.
- [ ] Cân nhắc `build.rollupOptions.output.manualChunks` tách `react` + `react-dom` + `react-router-dom` ra vendor chunk, và tách `@supabase/supabase-js` (~130 kB) — hiện `vite.config.js` (7 dòng) **không có** khoá `build` nào.
- [ ] Biết trước: `/play` vẫn giữ nguyên cả module graph meme (`Play.jsx:8` → `MemePanel.jsx:2` → `config/memes.js:1-20`). Task 6 mới là thứ gỡ tải 745 kB ảnh cho `/play`.

## Task 11: Dọn dead weight (rẻ, làm luôn)

- [ ] `public/icons.svg` (5,031 B) — grep toàn repo: **không nơi nào tham chiếu** (chỉ `favicon.svg` ở `index.html:5`). Xoá.
- [ ] `src/assets/meme/hero.png` (13,057 B), `react.svg` (4,126 B), `vite.svg` (8,709 B) — đồ lưu template Vite, không import. Xoá.
- [ ] `index.html`: `lang="en"` trong khi toàn bộ nội dung là tiếng Việt; thêm `<meta name="theme-color">`. Có `preconnect` ×2 (`:8-9`) nhưng **không** có `preload`/`prefetch` — thêm `preload` cho stylesheet font.
- [ ] **Không** thêm service worker/PWA: ngoài phạm vi, đã ghi ở Out of scope.

## Task 12: Kiểm thử chấp nhận (manual, theo convention repo)

- [ ] `npm run build` **và** `npm run lint` pass (CI `../../.github/workflows/ci.yml:38` chạy lint; Task 1-10 sửa JS ở hầu hết mọi file).
- [ ] **Đo lại sau Task 1-3** (mục tiêu chính của plan):
  - Payload 1 lần poll: Host 43,718 B → mục tiêu < 20 kB; Play 27,217 B → mục tiêu **< 3 kB**; PickTeam 1,191 B → mục tiêu < 500 B. Đo bằng cách log `JSON.stringify` response trong `loadGame` (tạm), hoặc đếm byte trong DevTools → Network → Size.
  - Response của 1 lần `saveGameState`: ~25,7 kB → **< 200 B**.
  - Soi Network 1 phút, 1 Host + 7 Play idle: **≈ 2,8 MB/phút → mục tiêu < 60 kB/phút** trước khi Task 9 đụng tần suất.
- [ ] **Re-render**: React DevTools Profiler, record 60 s Host idle — mục tiêu **0 commit** (trước: 12/phút). Tung xúc xắc + thả meme: confetti **không** restart giữa chừng (trước: restart mỗi poll).
- [ ] E2E không đổi hành vi: mở lá → trả lời xoay vòng → dice/steal/swap → bonus → đóng lá → lá kế tiếp. **`/play` phải thấy đúng nội dung lá** (Task 3 đụng đường đọc quan trọng nhất của học sinh — hỏng ở đây là hỏng cả lớp).
- [ ] Host crash giữa lúc lật lá: học sinh không thấy lá rỗng/lệch (kiểm tra atomicity của `active_card` + `active_card_num` trong cùng patch).
- [ ] Chạy lại hết flow số đội 2-7 (plan `2026-09-27-pin-team-count`): không được phá `TEAM_CATALOG` / `normalizeTeamCount` khi tách CSS hay memo.
- [ ] Network: mở `/host` khi nhạc tắt → **không** có request `bgm.mp3`; bấm Bật → mới tải. Nén xong file phải **≤ 1,2 MB**.
- [ ] Throttle CPU 4x + mobile: mở popup, tung xúc xắc, thả meme, chiếu ScoreFx → không giật.
- [ ] Meme: mở `/play` chỉ tải ảnh tab `fun`; bấm sang tab khác mới tải tiếp. Thả meme liên tục vẫn chặn đúng 3 s.
- [ ] `commit as \`perf: cut poll payload and idle re-renders\``

## Out of scope (không làm)

- Thêm dependency (không Workbox/PWA, không virtualize, không thư viện diff).
- Đổi visual/design token; bớt sticker, âm thanh hay hiệu ứng.
- Giảm `tần suất` poll 5 s → 8 s. Sửa *nội dung* payload (Task 1-3) giảm ~98% băng thông với ít rủi ro hơn nhiều; đổi interval chỉ đổi `tần suất` mà **không** đụng nguyên nhân. Nếu vẫn muốn giảm thêm: Host 5 s → 8 s là **đúng 37.5%** (không phải 40%), nhưng nó **không** giảm được đường đi chính — realtime fan-out 8 máy × 3-4 request mỗi lượt chơi lớn hơn nhiều (xem Task 9).
- Sửa `attempt_order` / `MAX_WRONG_BEFORE_ABANDON` — đã xác nhận không có hằng "7" nào trong logic chơi.
- Test suite tự động (repo convention: manual + `npm run build` + `npm run lint`).

## Plan self-review

- **Số liệu đo, không ước lượng**: bảng byte ở "Vì sao viết lại" và Task 5 lấy từ kích thước file thật trong `dist/` và từ serialize `game_state` dựng bằng chính `catalog.js`. Các claim "5 PNG = 169,6 kB", "tab fun = 745,724 B", "46,674 B CSS" cũng từ cộng kích thước file thật.
- **Đã loại trừ giả định sai**: bản đầu của lượt audit cho rằng `/play` có thể tự dựng lại lá bài từ `QUESTIONS` trong bundle. Kiểm lại `catalog.js:420-422` + `:328,330` cho thấy `num` là vị trí sau shuffle ⇒ **không** dựng lại được. Đó là lý do Task 3 phải denormalize chứ không phải xoá cột.
- **Thứ tự có chủ đích**: Task 1-2 zero-risk, đo lại (Task 12) rồi mới làm Task 3-5 cần đổi schema hoặc render. Task 6-11 độc lập, làm song song được.
- **Rủi ro lớn nhất**: Task 3. `active_card` là dữ liệu dẫn xuất phải đồng bộ thủ công với `active_card_num`. Đã giảm về tối thiểu bằng cách ghi trong cùng patch atomic; vẫn cần case kiểm thử crash ở Task 12.
- **Hai task của plan cũ bị loại có chủ đích**: Task font (`&display=swap` đã có sẵn trong `index.html:10-13`) và Task giảm poll (con số sai + không chạm nguyên nhân).
