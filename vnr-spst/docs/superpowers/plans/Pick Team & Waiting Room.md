 PLAN DOC: Chỉnh UI trang Pick Team & Waiting Room (React SPA – Chỉ giao diện)

## 1. Mục tiêu

- **Chỉ thay đổi giao diện (UI)**: Chỉnh sửa `className`, class Tailwind, và CSS trong file `.css`/`<style>` để đạt hiệu ứng visual mong muốn.
- **KHÔNG thay đổi chức năng**: Giữ nguyên toàn bộ `id`, `name`, `data-purpose`, `data-*`, `type`, `value`, `href`, `aria-*`, `title`, `placeholder`, `readonly`, `disabled`, `required`, props, state, hooks, event handlers (`onClick`, `onChange`, `onSubmit`, ...) hiện có.
- **KHÔNG sửa logic**: Không động vào logic render, điều kiện, API call, state management hoặc luồng điều hướng.
- **Tập trung 2 trang (theo thực tế repo):**
  - **Pick Team (Chọn đội may mắn)** – `src/pages/PickTeam.jsx` (đã tồn tại)
  - **Waiting Room (Hàng chờ)** – `src/pages/Host.jsx` + `src/pages/Host.css` (đã tồn tại)

> **Lưu ý quan trọng:** Repo là **React SPA** (không có file `.html` tĩnh). `PickTeam.jsx` đã tồn tại trong codebase → **KHÔNG tạo file mới**.

## 2. Phân tích file hiện tại

### A. `src/pages/PickTeam.jsx` (Pick Team – đã tồn tại)

Màn hình "CHỌN ĐỘI MAY MẮN CỦA BẠN". Dự kiến có các block sau:

| STT | Block | Ghi chú |
|---|---|---|
| 1 | Header/Logo | Logo "Thử Vận May", border-bottom, backdrop-blur |
| 2 | Hero Title | H1 "CHỌN ĐỘI MAY MẮN CỦA BẠN", divider Art Deco, mô tả ngắn |
| 3 | Current Membership Banner | Banner "Bạn đã tham gia đội..." + nút "Tiếp tục vào ván chơi" |
| 4 | Teams Grid | Grid 7 thẻ đội: Đỏ, Xanh, Vàng, Tím, Cam, Hồng, Lam. Badge "ĐÃ CHỌN", nút "Tham gia"/"Đã chọn" |
| 5 | Join Team Modal | Modal nhập mã tham gia (form, input mã, nút Hủy/Xác Nhận) |
| 6 | Footer | Copyright |

### B. `src/pages/Host.jsx` + `src/pages/Host.css` (Waiting Room – đã tồn tại)

Trùng khớp với màn Hàng chờ (Mã PIN + "VÀO PHÒNG"):

| STT | Block | Ghi chú |
|---|---|---|
| 1 | Main Card Frame | Khung chính Art Deco (viền kép + 4 góc decor) – `data-purpose="main-game-portal"` |
| 2 | Header trong card | Label "CASINO ENTERTAINMENT", H1 "THỬ VẬN MAY", tagline, divider hình thoi |
| 3 | PIN Display | Label "MÃ PIN PHÒNG CHƠI", input `#roomPin` (readonly) |
| 4 | Role Selection | Khối "NGƯỜI CHƠI" + CTA "VÀO PHÒNG" (`href="#join"` hoặc điều hướng hiện có) |
| 5 | Footer | Thông tin phụ |

### C. `src/pages/Landing.jsx`

**Nằm ngoài scope** theo yêu cầu này. **KHÔNG chỉnh sửa**.

## 3. Quy tắc cứng (Hard Constraints) – BẮT BUỘC TUÂN THỦ

> **TUYỆT ĐỐI KHÔNG VI PHẠM CÁC QUY TẮC DƯỚI ĐÂY.**

- **CHỈ UI, KHÔNG LOGIC.** Chỉ được sửa `className` (React), `class`, và CSS (trong `<style>` hoặc file `.css`/`.module.css`). **KHÔNG** sửa, xóa, thêm logic, hooks, state, API call, route hoặc event handler mới.
- **KHÔNG tạo/xóa file.** **KHÔNG** tạo file mới. Chỉ chỉnh sửa các file đã tồn tại: `src/pages/Host.jsx`, `src/pages/Host.css`, `src/pages/PickTeam.jsx` và file CSS đi kèm của chúng (nếu có: `PickTeam.css`, `PickTeam.module.css`).
- **Bảo toàn toàn bộ Attribute & Props.** Giữ nguyên tuyệt đối: `id`, `name`, `data-purpose`, `data-*`, `type`, `value`, `defaultValue`, `href`, `action`, `method`, `onsubmit`, `aria-label`, `aria-*`, `title`, `placeholder`, `readonly`, `disabled`, `required`, `autoComplete`, `selected`, `checked`, `ref`, `key`, props truyền xuống.
- **Bảo toàn Event Handlers.** Giữ nguyên hoàn toàn tất cả `onClick`, `onChange`, `onSubmit`, `onFocus`, `onBlur`, `onKeyDown`, ... hiện có. **KHÔNG** thêm/xóa/đổi tên handler.
- **Bảo toàn State & Hooks.** Không thay đổi cách sử dụng `useState`, `useEffect`, `useMemo`, `useCallback`, custom hooks hoặc biến điều kiện render.
- **Ưu tiên thay đổi Class, không tái cấu trúc JSX.** Chỉ thay đổi `className`/class. **KHÔNG** di chuyển, gộp, tách, thêm, xóa element có `id`, `data-purpose`, `data-*` hoặc element mà logic đang phụ thuộc. Nếu không chắc chắn có ảnh hưởng → **GIỮ NGUYÊN cấu trúc JSX**.
- **Không thay đổi nội dung text.** Giữ nguyên 100% tất cả chữ tiếng Việt, dấu câu, khoảng trắng hiện có. Không dịch, thêm, bớt, sửa từ.
- **Bảo toàn trạng thái.** Giữ nguyên `readonly` trên `#roomPin` (hoặc input mã PIN), `disabled` trên nút trạng thái "Đã chọn", `event.preventDefault()` trong form (nếu đang dùng).
- **Không can thiệp vào logic.** Tuyệt đối không sửa bất kỳ selector, điều kiện render, hoặc hành vi mà JS/React logic đang dựa vào.

## 4. Design Tokens (Tông màu – Đồng bộ Art Deco/Parchment)

Ưu tiên kế thừa biến CSS có sẵn trong `Host.css` (`--ivory-base`, `--ivory-panel`, `--gold-*`, `--deco-ink`, `--crimson-*`, ...). Chỉ thêm HEX mới khi biến tương ứng chưa tồn tại. Sử dụng bộ màu tham khảo sau để đảm bảo nhất quán:

| Token | Màu HEX | Mục đích sử dụng |
|---|---|---|
| `bg-parchment-primary` | `#faf6ee` | Nền chính (card, header, footer, banner) |
| `bg-parchment-card` | `#fcf9f2` | Nền thẻ (team cards) |
| `bg-parchment-base` | `#F7F3E9` | Nền nền tổng thể |
| `border-subtle` | `#d1c5b0` | Border chính (khung, card, divider) |
| `border-inner` | `#e5e2db` | Border viền trong (double-frame) |
| `border-card-hover` | `#807664` | Border khi hover nhẹ |
| `text-primary` | `#1c1c18` | Chữ chính |
| `text-secondary` | `#575e6f` | Chữ phụ, tagline, mô tả |
| `text-accent-gold` | `#775a00` | Chữ nhấn vàng Art Deco |
| `accent-gold` | `#caa048` / `#cba135` | Điểm nhấn (divider hình thoi) |
| `cta-primary` | `#111927` | Nền CTA chính (nút Tham gia, VÀO PHÒNG) |
| `cta-primary-hover` | `#1f293d` | Hover CTA chính |
| `surface-white` | `#ffffff` | Nền input, hộp PIN |

> **Nguyên tắc:** Ưu tiên dùng CSS Variables đã có trong repo. Chỉ override qua className/class, không viết lại logic style động không cần thiết.

## 5. Nhiệm vụ (Tasks) – Chia theo từng bước

### TASK 1 – Đọc code thực tế & xác nhận phạm vi
- [ ] **Đọc file Host.** Đọc `src/pages/Host.jsx` và `src/pages/Host.css` để nắm cấu trúc DOM/JSX, className đang dùng, biến CSS có sẵn.
- [ ] **Đọc file PickTeam.** Đọc `src/pages/PickTeam.jsx` để nắm rõ cấu trúc JSX, state, điều kiện render, các nút/modal đang có (quan trọng vì file đã tồn tại).
- [ ] **Kiểm tra CSS đi kèm PickTeam.** Tìm và đọc file CSS liên quan nếu có: `src/pages/PickTeam.css`, `src/pages/PickTeam.module.css`, hoặc các import CSS trong `PickTeam.jsx`.
- [ ] **Tham khảo router (chỉ đọc).** Xem nhanh `src/App.jsx` hoặc cấu hình route (nếu cần) để hiểu ngữ cảnh – **KHÔNG sửa**.
- [ ] **Xác nhận phạm vi.** Chỉ làm việc với các file trên. **KHÔNG tạo file mới**. Xác nhận không động đến `src/pages/Landing.jsx`.

### TASK 2 – PickTeam.jsx: Header & Hero Title
**Vùng sửa:** Header + `section/heading` Hero Title (theo cấu trúc JSX hiện có)

- [ ] **Header**: Giữ nguyên cấu trúc, logo/link hiện có. Chỉ tinh chỉnh `className` (backdrop-blur, border-bottom, nền `#faf6ee`, giảm shadow nhẹ).
- [ ] **H1**: Giữ nguyên text "CHỌN ĐỘI MAY MẮN CỦA BẠN". Chỉ chỉnh `tracking/leading`, dùng `drop-shadow-sm` rất nhẹ. Giữ nguyên font family.
- [ ] **Art Deco Divider**: Giữ nguyên cấu trúc element hiện có. Chỉ sửa class để làm mảnh, cân đối, đều hơn.
- [ ] **Mô tả phụ**: Giữ nguyên nội dung text. Chỉ tinh chỉnh spacing/line-height.

### TASK 3 – PickTeam.jsx: Current Membership Banner
**Vùng sửa:** Block banner trạng thái "đã tham gia đội" (theo JSX hiện có)

- [ ] **Nền & Border**: Sang `#faf6ee`, border `#d1c5b0`, giảm box-shadow nhẹ. Chỉ qua `className`.
- [ ] **Icon Check**: Giữ nguyên SVG hoàn toàn (path, viewBox, props). Chỉ có thể thu nhỏ nhẹ.
- [ ] **Nội dung động**: **Bắt buộc giữ nguyên toàn bộ text động** (tên đội). Không tách, không sửa string.
- [ ] **CTA Banner**: Giữ nguyên href/handler hiện có. Chỉ restyle màu/border/padding/transition để đồng bộ.
- [ ] **Giữ cấu trúc JSX**: Không di chuyển element.

### TASK 4 – PickTeam.jsx: Team Cards Grid
**Vùng sửa:** Grid 7 thẻ đội (tất cả card)

- [ ] **Card Container**: Nền `#fcf9f2`, border `#d7d0c0`, shadow nhẹ (`shadow-sm` hoặc `shadow-[0_4px_12px_rgba(28,25,23,0.05)]`). Hover border `#807664`, transition mượt. Chỉ sửa `className`.
- [ ] **Icon vòng tròn**: Giữ nguyên SVG 100% (path/viewBox, className SVG). Scale hover rất nhẹ (`scale-[1.03]`), giữ màu team accent hiện có.
- [ ] **Tên đội**: Giữ nguyên text. Chỉ tinh chỉnh tracking nhẹ.
- [ ] **Divider dưới tên**: Làm mảnh hơn, chỉ sửa class.
- [ ] **Badge "ĐÃ CHỌN"**: Giữ nguyên vị trí absolute hiện có. Chỉ tinh chỉnh font-size/background/border nhẹ. Không di chuyển.
- [ ] **Trạng thái Đã chọn**: Giữ nguyên `disabled`. Chỉ restyle để đồng bộ tone. **KHÔNG** bỏ `disabled`.
- [ ] **Trạng thái Chưa chọn**: Giữ nguyên toàn bộ `onClick`/handler hiện có. Chỉ restyle CTA (ưu tiên `#111927` → hover `#1f293d`), giữ icon mũi tên & transition.
- [ ] **Bảo toàn attribute**: Giữ nguyên `data-purpose`, `id`, `key`, props hoàn toàn.

### TASK 5 – PickTeam.jsx: Modal Join Team
**Vùng sửa:** Modal nhập mã

- [ ] **Overlay**: Giữ nguyên cấu trúc, chỉ chỉnh opacity/backdrop nhẹ qua class.
- [ ] **Dialog**: Border `#d1c5b0`, shadow mềm, giữ max-width. Giữ `relative`.
- [ ] **Nút đóng**: Giữ nguyên vị trí, ký tự `×`, handler hiện có. Chỉ chỉnh màu/size/hover.
- [ ] **Tiêu đề modal**: Giữ nguyên text động (tên đội). Chỉ đồng bộ font/spacing.
- [ ] **Label + Input mã**: Giữ nguyên `id`, `name`, `type`, `placeholder`, `value/defaultValue`, `onChange`, `onSubmit`... Chỉ chỉnh border/ring/focus.
- [ ] **Nút Hủy/Xác Nhận**: Giữ nguyên `type`, `onClick`/`onSubmit` hiện có. Chỉ đồng bộ style. **Bắt buộc giữ nguyên** `event.preventDefault()` nếu form đang dùng.
- [ ] **Không động logic**: Tuyệt đối không sửa state/modal logic.

### TASK 6 – PickTeam.jsx: Footer
**Vùng sửa:** Footer trang PickTeam

- [ ] **Style đồng bộ**: Border-top `#d1c5b0`, nền `#faf6ee`. Chỉ sửa `className`.
- [ ] **Text**: Giữ nguyên chính xác nội dung hiện có.
- [ ] **Spacing**: Cân đối padding, responsive.

### TASK 7 – Host.jsx + Host.css: Main Card Frame (Waiting Room)
**Vùng sửa:** `div[data-purpose="main-game-portal"]`, `.double-border-frame`, 4 góc decor (nếu có)

- [ ] **Nền đồng bộ**: `#faf6ee`. Chỉ sửa class/CSS.
- [ ] **Border**: Ngoài `#d1c5b0`, trong `#e5e2db`. Làm mảnh, đều hơn.
- [ ] **4 góc Decor**: Giữ nguyên hoàn toàn. Chỉ có thể giảm opacity rất nhẹ (không xóa).
- [ ] **Padding**: Tinh chỉnh cân đối, giữ tỷ lệ gốc.

### TASK 8 – Host.jsx + Host.css: Header trong Card
**Vùng sửa:** Header bên trong card

- [ ] **Label "CASINO ENTERTAINMENT"**: Giữ nguyên text. Chỉ chỉnh spacing.
- [ ] **H1 "THỬ VẬN MAY"**: Giữ nguyên text/font. Chỉ chỉnh letter-spacing rất nhẹ, text-shadow cực nhẹ hoặc bỏ.
- [ ] **Tagline**: Giữ nguyên text, giữ italic. Chỉ chỉnh spacing/line-height.
- [ ] **Divider**: Giữ nguyên cấu trúc, làm đều/mảnh hơn.

### TASK 9 – Host.jsx + Host.css: PIN Display
**Vùng sửa:** `section[data-purpose="pin-display-group"]`

- [ ] **Label "MÃ PIN PHÒNG CHƠI"**: Giữ nguyên text + dấu `♦`. Chỉ chỉnh spacing.
- [ ] **Hộp PIN**: Nền `#ffffff`, border `rgba(17,25,39,0.20)`. Bo góc rất nhẹ hoặc giữ vuông theo tone Art Deco, `shadow-sm`.
- [ ] **Input `#roomPin`**: **BẮT BUỘC GIỮ NGUYÊN** `readonly`, `id`, `name`, `type`, `value`/`defaultValue`, `aria-label`, `onClick/onFocus` (nếu có). Chỉ chỉnh `tracking/letter-spacing/font-size` để dễ đọc. **KHÔNG** thêm logic kích hoạt edit.

### TASK 10 – Host.jsx + Host.css: Role Block + CTA "VÀO PHÒNG"
**Trạng thái:** `N/A` (Not Applicable) – **Không áp dụng được trong phạm vi hiện tại**

**Lý do:** Cấu trúc/component chứa khối `"NGƯỜI CHƠI"` + CTA `"VÀO PHÒNG"` (`href="#join"`) không được tìm thấy trong `Host.jsx`/`Host.css` theo phạm vi rà soát. Do đó không có element nguồn để áp dụng chỉnh UI theo task này.

- [ ] *Không thực hiện* – thiếu component/marker trong phạm vi file yêu cầu.
- [ ] **Ghi nhận:** Để tránh vi phạm Hard Constraints (KHÔNG tái cấu trúc JSX không cần thiết), task này được đánh dấu **N/A**. Cần xác nhận thêm (nếu block này nằm trong component khác ngoài phạm vi đã đọc) trước khi áp dụng.

### TASK 11 – Host.jsx + Host.css: Footer (Waiting Room)
**Trạng thái:** `N/A` (Not Applicable) – **Không áp dụng được trong phạm vi hiện tại**

**Lý do:** Không tìm thấy Footer riêng của trang Waiting Room trong `Host.jsx`/`Host.css`. Phần footer có thể được dùng chung hoặc nằm ở layout/component khác ngoài phạm vi này.

- [ ] *Không thực hiện* – không có component nguồn trong phạm vi chỉnh sửa.
- [ ] **Ghi nhận:** Đánh dấu N/A để đảm bảo chỉ chỉnh sửa những block thực sự tồn tại, tuân thủ nguyên tắc "chỉnh tối thiểu".

### TASK 12 – QA, Verify & Acceptance Check
...
#### A. Bảo toàn Attribute, Props, Handlers (Blocking – Phải Pass 100%)
- [x] `PickTeam.jsx`: `id`, `name`, `data-purpose`, `data-*`, `type`, `href`, `key`, `props`, `onClick/onChange/onSubmit` được bảo toàn. Chỉ sửa `className` + CSS/inline style viền/màu/spacing.
...
#### D. Final Sanity Check
- [x] **Build Production:** `npm run build` – PASS (exit 0). Warning về chunk size > 500kB không phải lỗi build.
- [x] **Preview/Responsive/Behavior Runtime:** *Partial* – Đã kiểm tra diff/build, chưa verify trực quan (preview/runtime), responsive bằng mắt và một số behavior thực tế (modal mở/đóng, disabled/readonly, CTA navigation) do Task 10–11 không có component nguồn để kiểm tra
#### B. Bảo toàn Chức năng (Regression Check)
- [ ] **Modal PickTeam**: Mở/đóng vẫn hoạt động đúng như bản gốc (chỉ className thay đổi).
- [ ] **Trạng thái đội**: Điều kiện render "ĐÃ CHỌN"/"Tham gia", tên đội động vẫn hiển thị đúng.
- [ ] **PIN (Host)**: Vẫn `readonly`, giữ giá trị hiện tại, có thể copy như ban đầu.
- [ ] **CTA**: "Tiếp tục vào ván chơi", "VÀO PHÒNG" giữ nguyên hành vi điều hướng/handler.
- [ ] **Logic chọn đội**: Toàn bộ logic/state trong `PickTeam.jsx` không bị ảnh hưởng.

#### C. UI/UX & Quality
- [ ] **Tính nhất quán**: Host và PickTeam đồng bộ tone Art Deco/Parchment (border, nền, spacing).
- [ ] **Responsive**: Mobile (< 640px), Tablet (640–1024px), Desktop (> 1280px) – không vỡ layout.
- [ ] **Accessibility**: `aria-label`, `title` vẫn đầy đủ. Contrast hợp lý.
- [ ] **Hiệu ứng**: Hover/focus mượt, transition hợp lý, không giật.
- [ ] **Clean Code**: Chỉ sửa `className/class` + CSS (`.css`/module). Không thêm inline JS, không để class thừa không cần thiết.

#### D. Final Sanity Check
- [ ] **Diff có trọng tâm UI**: Chỉ thay đổi className/class/CSS. **KHÔNG** thấy thay đổi `id`, `data-purpose`, `data-*`, `href`, `readonly`, `disabled`, `value/defaultValue`, `onClick/onChange/onSubmit`, `type`, `key`, `props`.
- [ ] **Không thay đổi Text**: 0 thay đổi nội dung chữ tiếng Việt.
- [ ] **Không phá vỡ JSX**: Cấu trúc DOM/JSX gần như giữ nguyên tuyệt đối (chỉ className thay đổi). Không tái cấu trúc element có ý nghĩa logic.
- [ ] **Không tạo file mới**: Đã xác nhận chỉ sửa file đã tồn tại.

## 6. Definition of Done (Định nghĩa Hoàn thành)

Agent chỉ được coi là **HOÀN THÀNH** khi:

1. Đã hoàn tất **TẤT CẢ** TASK 1–12.
2. Toàn bộ checklist **TASK 12 (A–D)** đều **PASS 100%**.
3. **Không có** vi phạm nào tại mục 3. Hard Constraints.
4. Diff code **chỉ tập trung vào UI** (`className/class` + CSS). Không chứa thay đổi logic, state, handlers, props, attribute quan trọng.
5. `Host.jsx` và `PickTeam.jsx` đồng bộ thiết kế, responsive ổn định, **chức năng y nguyên 100%** so với bản gốc.
6. **Không tạo file mới**. Chỉ chỉnh sửa các file đã tồn tại.

## 7. Hướng dẫn Thi hành

- **Thực hiện tuần tự**: TASK 1 → 2–6 (PickTeam) → 7–11 (Host) → 12. Không nhảy cóc bỏ qua bước verify.
- **Chỉnh tối thiểu.** Luôn chọn phương án thay đổi **ít nhất** nhưng vẫn đạt được mục tiêu UI (`minimal viable UI change`).
- **Nguyên tắc vàng:** *"Thay đổi `className/class`, không thay đổi cấu trúc JSX/props/handlers có ý nghĩa logic".*
- **Nếu không chắc chắn – KHÔNG SỬA.** Bất cứ khi nào có nghi ngờ có thể ảnh hưởng đến logic, selector, props hoặc event handler → **giữ nguyên, không thay đổi**.
- **Ưu tiên kế thừa biến CSS có sẵn** trong `Host.css` trước khi thêm giá trị HEX mới.