-- ============================================================
-- Database Schema cho "Hành Trình Đổi Mới" — Supabase Realtime
-- Questions & Cards → giữ trong frontend code
-- Database chỉ sync trạng thái realtime giữa các thiết bị
-- ============================================================
--
-- CÁCH DÙNG (Supabase Dashboard → SQL Editor)
--
--   A. Database mới / vừa drop toàn bộ:
--      paste TOÀN BỘ file này, chạy 1 lần. Xong.
--
--   B. Database cũ đang có dữ liệu muốn xoá sạch tạo lại:
--      1. chạy khối "RESET" ở dưới (paste riêng, chạy trước) — xoá sạch
--         toàn bộ bảng, function, policy, và gỡ bảng khỏi publication
--      2. paste TOÀN BỘ phần còn lại của file này, chạy 1 lần.
--
--   File idempotent: chạy lại nhiều lần cũng không lỗi, không nhân bản.
--   Toàn bộ dữ liệu game cũ (games, teams, game_state, game_events) sẽ mất
--   khi chạy phần B — đó là chủ đích, không có bước khôi phục.
--
-- ============================================================


-- ============================================================
-- RESET — xoá sạch (chỉ chạy ở trường hợp B)
-- Bỏ qua khối này nếu bạn đang tạo database mới hoặc chỉ muốn nâng cấp.
-- Thứ tự: ba bảng con (game_events, game_state, teams) trước, bảng cha
-- games sau — khớp với quan hệ FK, CASCADE thừa nhưng để lỡ FK nào đổi thì
-- vẫn chạy được.
-- Thả bảng sẽ tự gỡ bảng khỏi publication `supabase_realtime`, và mọi RLS
-- policy gắn với bảng cũng bị xoá theo — không cần lệnh dọn policy riêng.
-- ============================================================
DROP TABLE IF EXISTS game_events  CASCADE;
DROP TABLE IF EXISTS game_state  CASCADE;
DROP TABLE IF EXISTS teams       CASCADE;
DROP TABLE IF EXISTS games       CASCADE;

-- create_game từng có 2 phiên bản: bản 1 tham số (trước đây) và bản 2 tham số
-- (hiện tại). CREATE OR REPLACE KHÔNG thay được hàm cũ khi signature đổi —
-- Postgres tạo thêm một *overload* và giữ lại hàm cũ. Xoá cả hai nên xoá cả
-- hai tham số để không sót phiên bản nào từ các lần deploy trước.
DROP FUNCTION IF EXISTS create_game(TEXT, INT);
DROP FUNCTION IF EXISTS create_game(TEXT);
DROP FUNCTION IF EXISTS log_game_event(UUID, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS update_updated_at();
-- ============================================================


CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. BANG GAME — Phòng chơi
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin             TEXT NOT NULL DEFAULT '1986',  -- mã PIN (set sẵn, 1 phòng = 1 PIN)
  status          TEXT NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting', 'playing', 'finished')),
  current_team_idx INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. BANG TEAMS — Các đội
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_key      TEXT NOT NULL,            -- 'red', 'blue', 'yellow', ...
  team_code     TEXT NOT NULL DEFAULT '', -- stable code used by classroom devices
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#888888',
  score         INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  UNIQUE(game_id, team_key),
  UNIQUE(game_id, team_code)
);

-- ============================================================
-- 3. BANG GAME_STATE — Trạng thái realtime (1 row / game)
--    UPDATE liên tục → Supabase Realtime push đến clients
-- ============================================================
CREATE TABLE IF NOT EXISTS game_state (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id             UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE UNIQUE,

  -- Whole-game state kept in the database so a device can reconnect safely.
  phase               TEXT NOT NULL DEFAULT 'selecting_card'
                      CHECK (phase IN ('selecting_card', 'answering', 'explaining', 'resolving_effect', 'closing_card', 'finished')),
  card_deck           JSONB NOT NULL DEFAULT '[]'::JSONB,
  used_card_numbers   JSONB NOT NULL DEFAULT '[]'::JSONB,
  effect_deck         JSONB NOT NULL DEFAULT '[]'::JSONB,
  effect_cursor       INT NOT NULL DEFAULT 0,
  deadline_at         TIMESTAMPTZ,
  answering_team_key  TEXT,
  answer_submission_team_key TEXT,
  revision            INT NOT NULL DEFAULT 0,

  -- Câu hỏi đang mở
  active_card_num     INT,                                   -- NULL = chưa có câu hỏi
  active_card         JSONB,                                 -- bản denormalize của lá đang mở; NULL = không có lá mở
                                                             -- (để /play tra lá bài mà không phải tải cả card_deck)
  attempt_order       JSONB NOT NULL DEFAULT '[]'::JSONB,    -- [team_idx, ...]
  attempt_idx         INT NOT NULL DEFAULT 0,
  answering_team_idx  INT,
  option_states       JSONB NOT NULL DEFAULT '[]'::JSONB,    -- ["", "correct", "wrong", ""]
  attempt_label       TEXT NOT NULL DEFAULT '',

  -- Giải thích
  show_explain        BOOLEAN NOT NULL DEFAULT false,

  -- Hiệu ứng bài may mắn
  show_effect         BOOLEAN NOT NULL DEFAULT false,
  effect_type         TEXT,                                   -- 'points'|'lose_all'|'reset'|'steal'|'swap'
  effect_icon         TEXT,
  effect_label        TEXT,
  effect_desc         TEXT,
  effect_team_idx     INT,
  effect_result       TEXT,
  show_eff_continue   BOOLEAN NOT NULL DEFAULT false,
  eff_body_buttons    TEXT,                                   -- 'dice'|'steal'|'swap'|NULL
  effect_revealed     BOOLEAN NOT NULL DEFAULT false,         -- false = animation lật bài chưa xong, Play chưa được thao tác
  steal_target_idx    INT,                                    -- đội bị cướp đã chọn (lá 'steal', chờ tung xúc xắc)

  -- Xúc xắc
  show_dice           BOOLEAN NOT NULL DEFAULT false,
  dice_rolling        BOOLEAN NOT NULL DEFAULT false,
  dice_value          INT,
  dice_result_visible BOOLEAN NOT NULL DEFAULT false,

  -- Kết thúc
  show_winner         BOOLEAN NOT NULL DEFAULT false,
  winner_name         TEXT,
  rank_list           JSONB NOT NULL DEFAULT '[]'::JSONB,

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep upgrades safe for projects that created the original schema already.
-- Trên database mới (hoặc sau khi chạy khối RESET) tất cả các lệnh dưới đây
-- đều là no-op: CREATE TABLE phía trên đã khai báo đủ cột và UNIQUE
-- (game_id, team_code) nên constraint cũng đã tự sinh đúng tên. Chúng được
-- giữ lại để file vẫn chạy được (chậm hơn một chút, vô hại) trên DB cũ chưa
-- muốn xoá dữ liệu.
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'selecting_card'
  CHECK (phase IN ('selecting_card', 'answering', 'explaining', 'resolving_effect', 'closing_card', 'finished'));
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS card_deck JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS used_card_numbers JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS effect_deck JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS effect_cursor INT NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS answering_team_key TEXT;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS answer_submission_team_key TEXT;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS revision INT NOT NULL DEFAULT 0;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS effect_revealed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS steal_target_idx INT;
ALTER TABLE game_state ADD COLUMN IF NOT EXISTS active_card JSONB;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_code TEXT NOT NULL DEFAULT '';
UPDATE teams SET team_code = team_key WHERE team_code = '';

-- Set the moment a representative claims this team on /pick-team. NULL = still
-- open. Used to grey out already-taken teams and to block a second claim.
ALTER TABLE teams ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teams_game_id_team_code_key'
      AND conrelid = 'teams'::regclass
  ) THEN
    ALTER TABLE teams ADD CONSTRAINT teams_game_id_team_code_key UNIQUE (game_id, team_code);
  END IF;
END;
$$;

-- ============================================================
-- 4. BANG GAME_EVENTS — Nhật ký sự kiện (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS game_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,                -- 'QUESTION_OPEN'|'ANSWER'|'DICE_ROLL'|'EFFECT'|'RESET'|'FINISH'
  payload     JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by  TEXT,                         -- team_key hoặc 'host'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teams_game_id ON teams(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at);
-- Serves the Host's "latest N events per game" query (ORDER BY created_at DESC LIMIT n).
CREATE INDEX IF NOT EXISTS idx_game_events_game_created ON game_events(game_id, created_at DESC);

-- ============================================================
-- AUTO UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_games_updated ON games;
CREATE TRIGGER trg_games_updated
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_game_state_updated ON game_state;
CREATE TRIGGER trg_game_state_updated
  BEFORE UPDATE ON game_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: Tạo game mới + N teams mặc định (gọi từ frontend)
--
-- Thứ tự deploy: chạy SQL này TRƯỚC, deploy frontend SAU. Hàm có tham số
-- `p_team_count` nên frontend mới gọi `create_game(p_pin, p_team_count)` sẽ
-- fail "function does not exist" nếu DB chưa được cập nhật. `DEFAULT 7` ở đây
-- chỉ có tác dụng với caller BỎ TRỐN tham số — nó KHÔNG cứu được trường hợp
-- "DB chưa chạy migration", vì client luôn truyền tham số thứ hai đi kèm.
--
-- DROP bên dưới xoá phiên bản 1 tham số từ các lần deploy cũ: CREATE OR REPLACE
-- không thay được hàm khi signature đổi mà tạo *overload*, để lại hai hàm trùng
-- tên trong DB. An toàn kể cả khi bạn bỏ qua khối RESET. Toàn repo chỉ có một
-- call site (`createGame` trong src/game/gameRepository.js) nên không mất
-- caller nào. Sau khi chạy file này, `\df create_game` phải chỉ ra ĐÚNG MỘT
-- hàm `create_game(text, integer)`.
-- ============================================================
DROP FUNCTION IF EXISTS create_game(TEXT);
CREATE OR REPLACE FUNCTION create_game(p_pin TEXT DEFAULT '1986', p_team_count INT DEFAULT 7)
RETURNS UUID AS $$
DECLARE
  v_game_id UUID;
  v_team_data JSONB;
  v_count    INT;
BEGIN
  -- Only one game per PIN should ever be joinable at a time. Without this,
  -- every test/practice run left its game as 'waiting'/'playing' forever,
  -- so findGameByPin's "newest game with this PIN" could resolve to a stale
  -- leftover game instead of the one the Host is actually running.
  UPDATE games SET status = 'finished' WHERE pin = p_pin AND status != 'finished';

  INSERT INTO games (pin, status) VALUES (p_pin, 'waiting') RETURNING id INTO v_game_id;

  INSERT INTO game_state (game_id) VALUES (v_game_id);

  -- Clamp ở DB vì đây là ranh giới tin cậy cuối: frontend cũng clamp, nhưng
  -- RPC có thể bị gọi trực tiếp. 2 là số đội tối thiểu chơi được, 7 là số
  -- bộ metadata (tên/màu/icon) có sẵn — vượt 7 sẽ phải thiết kế đội mới.
  v_count := GREATEST(2, LEAST(7, COALESCE(p_team_count, 7)));

  -- 7 đội khả dụng. Đây là bản sao metadata thứ hai cạnh `TEAM_CATALOG` trong
  -- src/game/catalog.js (bản JS mà UI đọc). PHẢI giữ đúng thứ tự `order`,
  -- `key`, `name` và `color` của TEAM_CATALOG: UI hiển thị tên/màu từ JS còn
  -- bảng điểm render từ DB, lệch một bên sẽ ra hai màu hai tên cho cùng đội.
  FOR v_team_data IN SELECT * FROM jsonb_array_elements('[
    {"key":"red",    "name":"Đội Đỏ",  "color":"#7A2430", "order":0},
    {"key":"blue",   "name":"Đội Xanh", "color":"#1F4E66", "order":1},
    {"key":"yellow", "name":"Đội Vàng", "color":"#B8860B", "order":2},
    {"key":"purple", "name":"Đội Tím",  "color":"#4A3A6B", "order":3},
    {"key":"orange", "name":"Đội Cam",  "color":"#D97706", "order":4},
    {"key":"pink",   "name":"Đội Hồng", "color":"#DB2777", "order":5},
    {"key":"lam",    "name":"Đội Lam",  "color":"#2563EB", "order":6}
  ]'::JSONB)
  LOOP
    -- Chọn N đội ĐẦU TIÊN theo `order` cố định, nên display_order luôn là
    -- 0..N-1 liền mạch và team_key/team_code không bao giờ đổi.
    IF (v_team_data->>'order')::INT < v_count THEN
      INSERT INTO teams (game_id, team_key, team_code, name, color, display_order)
      VALUES (v_game_id, v_team_data->>'key', v_team_data->>'key', v_team_data->>'name', v_team_data->>'color', (v_team_data->>'order')::INT);
    END IF;
  END LOOP;

  RETURN v_game_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Ghi sự kiện
-- ============================================================
CREATE OR REPLACE FUNCTION log_game_event(
  p_game_id UUID,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'::JSONB,
  p_created_by TEXT DEFAULT 'host'
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO game_events (game_id, event_type, payload, created_by)
  VALUES (p_game_id, p_event_type, p_payload, p_created_by)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REALTIME — Bật cho các bảng cần sync (idempotent)
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY ARRAY['games', 'teams', 'game_state', 'game_events'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- RLS — Cho phép anonymous (game demo)
-- ============================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for games" ON games;
CREATE POLICY "Allow all for games" ON games FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for teams" ON teams;
CREATE POLICY "Allow all for teams" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for game_state" ON game_state;
CREATE POLICY "Allow all for game_state" ON game_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for game_events" ON game_events;
CREATE POLICY "Allow all for game_events" ON game_events FOR ALL USING (true) WITH CHECK (true);
