# Plan: Chỉnh số lượng đội ở màn hình /pin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép Host chọn số lượng đội (2–7) ngay trên màn hình `/pin`, lưu lựa chọn vào `localStorage`, và `/host` dùng lựa chọn đó khi tạo phòng mới — phòng mới chỉ tạo đúng N hàng `teams` trong DB thay vì luôn 7 đội.

**Ngày tạo:** 2026-09-27

## Hiện trạng (đã khảo sát code)

- `/pin` (`src/pages/PinEntry.jsx:144-236`): chỉ nhập PIN → lưu `localStorage['vnr_game_pin']` → link sang `/host` hoặc `/pick-team`. Không có cấu hình số đội.
- `/host` (`src/pages/Host.jsx:284-289`): khi chưa có phòng → `createGame(gamePin, createShuffledCardDeck(), createShuffledEffectDeck())`. `createGame` (`src/game/gameRepository.js:12-32`) gọi RPC `create_game(p_pin)` — luôn tạo **7 đội cố định**.
- `create_game` (`supabase/schema.sql:174-206`): `UPDATE games ... finished` cũ theo PIN + `INSERT` 7 đội từ JSONB hardcode (red→lam). RPC chỉ nhận 1 tham số `p_pin`.
- `/pick-team` (`src/pages/PickTeam.jsx:7-64`): grid render từ mảng `TEAMS` **hardcode 7 đội** (tên/màu/icon/desc/rotate). Trạng thái "đã có người tham gia" đọc từ DB (`fetchTeams` + `takenKeys` theo `team_key`) — riêng phần này đã động theo DB. **Grid không hề lọc theo DB**: `:373` là `TEAMS.map`, nên phòng 3 đội vẫn hiện đủ 7 thẻ → bấm thẻ thứ 4-7 sẽ gọi `joinGame` với `team_key` không tồn tại, hàm này là conditional `UPDATE` + `maybeSingle()` (`gameRepository.js:65-92`) nên throw `Error("Invalid game, team, or team code.")` **không kèm `err.code`**, và `PickTeam.jsx:138` in thẳng `err.message` ra UI. Phải sửa cả hai đầu (Task 4b + Task 2b).
- Luồng chơi **đã tương thích N đội**: `openCard` (`Host.jsx:739-740`) dựng `attempt_order` từ `tms.length`; `nextTeamIndex`/`closeCard` (`transitions.js`) dùng `teams.length`; bảng điểm, ScoreFx, WinnerPodium, popup `/play` đều render từ mảng `teams` trong DB. Không có hằng "7" nào trong logic chơi.
- Ràng buộc cứng còn lại: **tối đa 7 metadata đội** (`catalog.js:216-224` `DEFAULT_TEAMS`, `PickTeam.jsx:7-64` `TEAMS`, JSONB trong `create_game`). `MAX_WRONG_BEFORE_ABANDON = 3` (`Host.jsx:47`) độc lập với số đội, không cần đổi. Text "7 đội" rải ở `DESIGN.md:116` (+ bảng liệt kê 7 đội ở `DESIGN.md:118-124`), `GAMEPLAY.md:11,19-30,195,244`, `README.md:3`, `SETUP.md:46,48`.
- `/pin` **không có lối vào từ UI**: `App.jsx:12` chỉ là route trần, toàn repo không có `<Link to="/pin">` nào, và không có route guard nào (`src/` không dùng `Navigate`). Thêm vào: `Landing.jsx:10` cũng ghi `localStorage['vnr_game_pin']` qua PIN input riêng nhưng **không** có cấu hình số đội và cũng **không** có link `/host`. Đã chốt: giữ stepper chỉ ở `/pin`, ghi rõ trong docs (Task 6).

## Quyết định thiết kế

1. **Phạm vi số đội: 2–7**, mặc định 7 (giữ hành vi cũ). Giới hạn trên = 7 vì chỉ có 7 bộ metadata (màu/icon/tên); vượt 7 đòi hỏi thiết kế đội mới — out of scope.
2. **Số đội là cấu hình "lúc tạo phòng", không phải realtime**: chỉ áp dụng khi `/host` tạo phòng mới (`create_game`). Phòng đang chơi dở không đổi số đội giữa chừng.
3. **Chọn đội = N đội ĐẦU TIÊN** trong danh sách (Đỏ, Xanh, Vàng, Tím, Cam, Hồng, Lam) — thứ tự cố định, `team_key`/`team_code`/`display_order` giữ nguyên. Không cho custom thứ tự (out of scope).
4. **Tương thích ngược RPC**: `create_game` nhận thêm tham số `p_team_count INT DEFAULT 7`. Vì `CREATE OR REPLACE` **không** thay được hàm cũ khi signature đổi (Postgres tạo *overload*), phải `DROP FUNCTION IF EXISTS create_game(TEXT);` trước đó — nếu không DB sẽ có hai hàm trùng tên. Lưu ý về `DEFAULT 7`: nó chỉ có tác dụng với caller *bỏ trốn* tham số, **không** bảo vệ trường hợp "DB chưa chạy migration" — client mới luôn truyền `p_team_count` nên DB cũ sẽ fail `function create_game(pin, integer) does not exist`. Vì vậy thứ tự deploy bắt buộc: **chạy SQL trước, deploy frontend sau**.
5. **Không sửa `game_state`**: không thêm cột, không thêm phase. Chỉ chạm bảng `teams` lúc tạo phòng.

## Task 1: DB — `create_game` nhận số đội

**Files:** `supabase/schema.sql`

**Produces:** RPC tạo đúng N đội; phòng cũ/re-run an toàn.

- [ ] `DROP FUNCTION IF EXISTS create_game(TEXT);` ngay trước `CREATE OR REPLACE` — bắt buộc, nếu không Postgres tạo overload và giữ lại hàm 1 tham số cũ (xem Quyết định thiết kế #4).
- [ ] Đổi signature: `CREATE OR REPLACE FUNCTION create_game(p_pin TEXT DEFAULT '1986', p_team_count INT DEFAULT 7)`.
- [ ] Clamp trong SQL: `v_count := GREATEST(2, LEAST(7, COALESCE(p_team_count, 7)))`.
- [ ] Thay vòng `FOR ... LOOP` hiện tại bằng loop có điều kiện chèn: chỉ `INSERT` khi `(v_team_data->>'order')::INT < v_count` (giữ nguyên JSONB 7 đội, `display_order` 0..N-1).
- [ ] Thêm comment cạnh JSONB 7 đội (`:191-197`): đây là bản sao metadata thứ 4, thứ tự/tên/màu phải khớp `TEAM_CATALOG` trong `src/game/catalog.js` (Task 4) — sửa một bên mà quên bên kia sẽ lệch màu giữa DB và UI.
- [ ] Copy câu lệnh migration cho user chạy trên Supabase: paste toàn bộ function đã sửa vào SQL Editor (file schema.sql vốn idempotent, re-run cả file cũng được). Ghi rõ thứ tự: **SQL Editor trước, deploy frontend sau** (xem Quyết định thiết kế #4).

## Task 2: `gameRepository.js` — truyền số đội

**Files:** `src/game/gameRepository.js`

**Produces:** `createGame(pin, cardDeck, effectDeck, teamCount)` gọi RPC với `p_team_count`.

- [ ] Đổi signature `createGame(pin, cardDeck, effectDeck, teamCount = 7)`; dùng `normalizeTeamCount` từ `catalog.js` (Task 4) thay vì tự clamp.
- [ ] `client.rpc("create_game", { p_pin: pin, p_team_count: count })`.
- [ ] Cập nhật comment/docs nội bộ của hàm nếu có.

## Task 2b: `joinGame` — lỗi join team không tồn tại phải có mã + tiếng Việt

**Files:** `src/game/gameRepository.js`

**Produces:** `joinGame` phân biệt được "đội đã có người" (`TEAM_TAKEN`) với "đội không thuộc phòng này" (`TEAM_NOT_FOUND`), thay vì trả thẳng chuỗi tiếng Anh cho UI.

- [ ] `gameRepository.js:92`: thay `throw new Error("Invalid game, team, or team code.")` bằng error có `err.code = 'TEAM_NOT_FOUND'` và message tiếng Việt, ví dụ `"Đội này không tồn tại trong phòng hiện tại."`. Giữ `TEAM_TAKEN` ở `:88-90` như cũ (UI đã phân biệt qua `err.code`).
- [ ] Không cần sửa `PickTeam.jsx:138` — nó đã in thẳng `err.message`, sẽ tự hiện message mới.

## Task 3: `/pin` — UI chọn số đội

**Files:** `src/pages/PinEntry.jsx`

**Produces:** Stepper − / + (2–7) lưu `localStorage['vnr_team_count']`, theo đúng ngôn ngữ "văn kiện" của trang.

- [ ] State `teamCount` khởi từ `localStorage('vnr_team_count')` qua `normalizeTeamCount` (Task 4).
- [ ] Lưu trong handler `−`/`+` (`localStorage.setItem('vnr_team_count', next)`), **không** gắn `saveTeamCount()` vào 2 nút + 2 `<Link>`: 1 chỗ duy nhất không thể sót, và cấu hình đã lưu xong trước khi user rời trang.
- [ ] UI: sau `.pin-input-row`, thêm block cùng style `.pin-card`: label "Số lượng đội" + hàng `[−] 7 đội [+]`; nút −/+ dùng class `.pin-save-btn` có sẵn (padding nhỏ hơn qua inline style); số hiển thị font Courier 30px như ô PIN; `aria-label` cho 2 nút; `disabled` khi chạm biên 2/7.
- [ ] Hiển thị tên đội sẽ dùng (preview text nhỏ, italic `#554243`): ví dụ với 4 → "Đỏ · Xanh · Vàng · Tím" — lấy từ shared metadata (Task 4) để khỏi hardcode 2 nơi.
- [ ] Không đổi logic `checkRoom` — số đội chỉ có nghĩa khi TẠO phòng mới. Thêm hint nhỏ phải nói rõ cơ chế resume, không chỉ nói "phòng đang chơi không đổi": **"Áp dụng khi /host tạo phòng mới. Nếu còn phòng đang chạy với mã này, /host sẽ mở lại phòng cũ — hãy đổi mã phòng."** (Lý do: `findGameByPin` lọc `neq('status', 'finished')` — `gameRepository.js:39-50` — nên chỉ đổi mã PIN, hoặc kết thúc ván cũ (`create_game` tự `UPDATE ... 'finished'` mọi game cùng PIN), mới tạo được phòng N đội.)

## Task 4: Gom metadata 7 đội về một nguồn chung

**Files:** `src/game/catalog.js` (mới: export `TEAM_CATALOG`), `src/pages/PickTeam.jsx`

**Produces:** Một mảng duy nhất `{ id, name, color, icon, desc, rotate }` dùng cho cả grid `/pick-team` lẫn preview ở `/pin`.

- [ ] Trong `catalog.js`, export `TEAM_CATALOG` = 7 đội gộp từ `DEFAULT_TEAMS` + metadata đang hardcode trong `PickTeam.jsx:7-64` (icon/desc/rotate).
- [ ] `PickTeam.jsx`: xoá mảng `TEAMS` local, `import { TEAM_CATALOG as TEAMS }` — grid, `takenKeys`, `existingSession` lookup giữ nguyên hành vi. `catalog.js` là leaf module (0 import) nên chiều import này an toàn, không tạo vòng.
- [ ] `PinEntry.jsx`: import `TEAM_CATALOG` cho preview tên đội.
- [ ] `DEFAULT_TEAMS`: suy ra từ `TEAM_CATALOG` (`TEAM_CATALOG.map(t => ({ id: t.id, name: t.name, color: t.color, score: 0 }))`) thay vì giữ literal trùng lặp. Hiện chưa nơi nào import nó (dead code) — suy ra giữ được public API cũ mà không còn danh sách thứ 3 phải đồng bộ.
- [ ] **Export thêm `normalizeTeamCount(raw)`** trong `catalog.js` cạnh `TEAM_CATALOG` — clamp 2–7 + `Math.floor` + fallback 7 khi NaN. Cần vì **3 nơi đọc cùng một giá trị** (Task 2 `gameRepository.js`, Task 3 `PinEntry.jsx`, Task 5 `Host.jsx`) và repo **không có** helper `clamp` JS nào (chỉ có `clamp()` CSS trong các style inline). Đặt ở `catalog.js` vì đó đã là nguồn chung của plan này; Task 2/3/5 chuyển sang dùng nó thay vì tự viết lặp lại.

## Task 4b: `/pick-team` — chỉ hiện thẻ của N đội thật trong DB

**Files:** `src/pages/PickTeam.jsx`

**Produces:** Grid khớp số đội của phòng. Không có task này, phòng 3 đội vẫn hiện 7 thẻ và acceptance Task 7 không đạt được.

- [ ] Thêm `const roomKeys = useMemo(() => new Set(dbTeams.map((t) => t.team_key)), [dbTeams])` cạnh `takenKeys` (`:115-118`).
- [ ] Thêm `const visibleTeams = dbTeams.length ? TEAMS.filter((t) => roomKeys.has(t.id)) : []`. **Guard `dbTeams.length` là bắt buộc**: `fetchTeams` chạy lần đầu qua poll 5s + realtime, không guard thì grid rỗng rồi mới có data nhấp nháy.
- [ ] `PickTeam.jsx:373` đổi `TEAMS.map(...)` → `visibleTeams.map(...)`. Các style/handler bên trong thẻ giữ nguyên.
- [ ] `handleDirectJoin` (`:125`): thêm `if (!roomKeys.has(team.id)) return;` cạnh guard `takenKeys` — lướt an toàn nếu DB đổi giữa lúc render.
- [ ] `existingSession` lookup tên ở `:347` vẫn tra `TEAMS`: giữ nguyên, team đã join luôn nằm trong `dbTeams` nên không mất tên.

## Task 5: `/host` — đọc số đội khi tạo phòng

**Files:** `src/pages/Host.jsx` (~dòng 284-289)

**Produces:** Phòng mới tạo đúng N đội theo cấu hình `/pin`.

- [ ] Trong bootstrap (nhánh `if (!id)`): `const teamCount = normalizeTeamCount(localStorage.getItem('vnr_team_count'))` → `createGame(gamePin, createShuffledCardDeck(), createShuffledEffectDeck(), teamCount)`.
- [ ] Nhánh resume (`findGameByPin` / `loadGame`): KHÔNG đụng số đội — phòng cũ giữ nguyên đội hình. Thêm comment giải thích: `findGameByPin` (`gameRepository.js:39-50`) lọc `neq('status', 'finished')`, nên khi `existing` truthy thì `createGame` không bao giờ được gọi và cấu hình `/pin` bị bỏ qua — đó là hành vi cố ý, không phải bug.
- [ ] `resetGame` ("Ván mới"): giữ đội hình hiện tại (chỉ reset điểm + xáo thứ tự như cũ) — không tạo/xoá hàng teams. Đã xác nhận: `Host.jsx:940-995` chỉ zero điểm + shuffle `display_order` qua `saveTeams` (upsert `onConflict: game_id,team_key`), không insert/delete.

## Task 6: Copy + docs cập nhật

**Files:** `GAMEPLAY.md`, `DESIGN.md`, `supabase/SETUP.md`, `README.md` (chỉ text "7 đội" cứng)

- [ ] `GAMEPLAY.md:11` bảng thông tin: "7 đội" → "2–7 đội (chọn ở /pin, mặc định 7)"; `:244` flow "Host tạo game (7 đội…)" → "(N đội…)"; `:195` setup "Host và 7 đội" → "Host và các đội"; `:19-30` bảng "## 👥 Các đội" liệt kê cứng 7 đội → ghi rõ đây là 7 đội **khả dụng**, phòng dùng N đội đầu tiên.
- [ ] `DESIGN.md:116` "7 đội — nguồn…" → liệt kê nguồn mới (`TEAM_CATALOG` trong `catalog.js`, slice N đội trong `create_game`, JSONB trong `schema.sql` là bản sao phải đồng bộ); `:118-124` bảng `Key | Tên | Hex | Icon` 7 dòng → thêm cột/ghi chú N đội đầu; `:559` là **một dòng trong bảng inventory file** (không phải note đứng riêng) → sửa phải giữ cân bằng pipe-table.
- [ ] `supabase/SETUP.md:48`: "the seven `teams` rows" → "N `teams` rows (2–7, via `p_team_count`)"; `:46` **có thật** chữ ký `createGame(pin, cardDeck, effectDeck)` → cập nhật thành `createGame(pin, cardDeck, effectDeck, teamCount)`. Thêm ghi chú thứ tự deploy SQL-trước-frontend.
- [ ] `README.md:3`: "seven-team" → "2–7 team".
- [ ] Ghi chú entry point ở `GAMEPLAY.md` + `README.md`: **`/pin` không có link từ bất kỳ trang nào, phải truy cập bằng URL**; `Landing.jsx:10` ghi `vnr_game_pin` qua input riêng mà không có stepper số đội, nên host muốn đổi số đội phải vào `/pin` (đã chốt giữ phạm vi chỉ `/pin`).

## Task 7: Kiểm thử chấp nhận (manual, theo convention repo)

- [ ] `npm run build` pass **và** `npm run lint` pass (CI `../../.github/workflows/ci.yml:38` chạy lint; Task 2b, 3, 4, 4b, 5 đều sửa JS).
- [ ] Chạy migration `create_game` mới trên Supabase (SQL Editor), rồi kiểm tra trên DB: tạo phòng với `p_team_count = 3` → đúng 3 hàng teams (red/blue/yellow, order 0–2).
- [ ] Xác nhận `DROP FUNCTION IF EXISTS create_game(TEXT)` chạy đúng: `\df create_game` trên SQL Editor chỉ còn **một** hàm `create_game(text, integer)`, không còn hàm 1 tham số.
- [ ] Flow E2E: /pin đặt 3 đội → /host mở phòng mới → bảng điểm Host hiện 3 đội → /pick-team chỉ hiện 3 thẻ (Đỏ/Xanh/Vàng) → 3 máy join → mở lá, trả lời xoay vòng đúng 3 đội → steal/swap target list chỉ 3 đội → "Ván mới" giữ 3 đội, điểm về 0.
- [ ] Grid `/pick-team` đúng số đội: phòng 3 đội không có thẻ thứ 4-7; reload trang lúc poll chưa về không để lại grid rỗng.
- [ ] Lỗi join: nếu thẻ stale được render (race DB) thì bấm vào hiện message tiếng Việt "Đội này không tồn tại trong phòng hiện tại.", **không** phải "Invalid game, team, or team code."; `TEAM_TAKEN` vẫn ra "Đội này đã có người tham gia."
- [ ] Hồi quy 7 đội mặc định: xoá `vnr_team_count` trong localStorage → tạo phòng mới vẫn 7 đội như cũ, `/pick-team` hiện 7 thẻ.
- [ ] Phòng cũ (7 đội, đã tạo trước migration): mở lại, chơi tiếp bình thường; chỉnh /pin xuống 3 rồi mở /host (resume cùng PIN) → vẫn 7 đội, không mất đội.
- [ ] Biên clamp: `/pin` bấm `−` tới 2 và `+` tới 7 thì nút tương ứng `disabled`; gõ tay `vnr_team_count = 99` hoặc `abc` → tạo phòng vẫn an toàn (clamp 7 / fallback 7).
- [ ] `commit as \`feat(pin): configurable team count 2-7 for new rooms\``

## Plan self-review

- **Đã xác minh trên code, không phải suy đoán**: mọi trích dẫn `file:line` trong mục Hiện trạng đã đối chiếu với working tree. Kết luận quan trọng nhất: **không có hằng "7" nào trong logic chơi** (`openCard` xoay theo `tms.length`, `transitions.js` dùng `teams.length`), và `resetGame` không hề tạo/xoá hàng `teams` — nên phần "cho N đội" chỉ là cấu hình lúc tạo phòng, không cần đụng gì khác.
- **Điểm dễ sót nhất đã được đóng**: `/pick-team` render grid từ mảng hardcode 7 phần tử, không lọc theo DB (Task 4b), và `joinGame` trả lỗi không có `err.code` cho thẻ không tồn tại (Task 2b). Thiếu 2 task này thì acceptance "/pick-team chỉ hiện 3 thẻ" không bao giờ đạt.
- **Hệ quả DB đã tính trước**: `CREATE OR REPLACE` + thêm tham số tạo *overload* chứ không thay hàm, nên cần `DROP`; `DEFAULT 7` không cứu được trường hợp "DB chưa migrate" → thứ tự deploy DB-trước-frontend là bắt buộc, đã ghi vào Quyết định thiết kế #4, Task 1 và Task 6.
- **Metadata có 4 bản sao** (`catalog.js` `DEFAULT_TEAMS`, `PickTeam.jsx` `TEAMS`, JSONB `schema.sql`, và các bảng docs) — Task 4 gom về một nguồn JS + thêm comment "sync" ở JSONB; phần docs chỉ vá text, chưa tách bảng.
- **Không có test suite** trong repo (`package.json` chỉ có `dev`/`build`/`lint`/`preview`), nên Task 7 là kiểm thử manual theo đúng convention 3 plan trước.
- **Còn nợ chưa làm trong plan này**: chưa có spec đi kèm trong `docs/superpowers/specs/` (3 plan trước đều có cặp spec+plan), và `/pin` vẫn phải truy cập bằng URL — đã chốt chấp nhận, ghi vào docs ở Task 6 thay vì mở rộng scope.

## Out of scope (không làm)

- Đổi số đội giữa ván đang chơi; custom thứ tự/tên/màu đội ở /pin.
- Vượt quá 7 đội (hết metadata màu/icon).
- Sửa `MAX_WRONG_BEFORE_ABANDON = 3` (độc lập với số đội).
- Thêm `<Link to="/pin">` từ `Landing.jsx` hoặc đưa stepper sang `Landing.jsx` (đã chốt: chỉ `/pin`, ghi rõ trong docs). `Landing.jsx` vẫn tự ghi `vnr_game_pin` mà không có cấu hình số đội — chấp nhận inconsistency này.
- Ràng buộc DB/RLS để chặn join vào team không tồn tại (đã chốn ở tầng UI: lọc grid + `TEAM_NOT_FOUND`).
- Test suite tự động (repo convention: manual + `npm run build` + `npm run lint`).
- Tách bảng "7 đội" trong docs thành "7 đội khả dụng"; Task 6 chỉ vá text chứng minh.
