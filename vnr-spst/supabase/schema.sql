-- ============================================================
-- Database Schema cho "Hành Trình Đổi Mới" — Supabase Realtime
-- Questions & Cards → giữ trong frontend code
-- Database chỉ sync trạng thái realtime giữa các thiết bị
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. BANG GAME — Phòng chơi
-- ============================================================
CREATE TABLE games (
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
CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_key      TEXT NOT NULL,            -- 'red', 'blue', 'yellow', ...
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#888888',
  score         INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  UNIQUE(game_id, team_key)
);

-- ============================================================
-- 3. BANG GAME_STATE — Trạng thái realtime (1 row / game)
--    UPDATE liên tục → Supabase Realtime push đến clients
-- ============================================================
CREATE TABLE game_state (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id             UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE UNIQUE,

  -- Câu hỏi đang mở
  active_card_num     INT,                                   -- NULL = chưa có câu hỏi
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

-- ============================================================
-- 4. BANG GAME_EVENTS — Nhật ký sự kiện (audit log)
-- ============================================================
CREATE TABLE game_events (
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
CREATE INDEX idx_teams_game_id ON teams(game_id);
CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_game_events_created_at ON game_events(created_at);

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

CREATE TRIGGER trg_games_updated
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_game_state_updated
  BEFORE UPDATE ON game_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: Tạo game mới + teams mặc định (gọi từ frontend)
-- ============================================================
CREATE OR REPLACE FUNCTION create_game(p_pin TEXT DEFAULT '1986')
RETURNS UUID AS $$
DECLARE
  v_game_id UUID;
  v_team_data JSONB;
BEGIN
  INSERT INTO games (pin, status) VALUES (p_pin, 'waiting') RETURNING id INTO v_game_id;

  INSERT INTO game_state (game_id) VALUES (v_game_id);

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
    INSERT INTO teams (game_id, team_key, name, color, display_order)
    VALUES (v_game_id, v_team_data->>'key', v_team_data->>'name', v_team_data->>'color', (v_team_data->>'order')::INT);
  END LOOP;

  UPDATE games SET status = 'playing' WHERE id = v_game_id;

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
-- REALTIME — Bật cho các bảng cần sync
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;

-- ============================================================
-- RLS — Cho phép anonymous (game demo)
-- ============================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for games"       ON games       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for teams"      ON teams       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for game_state" ON game_state  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for game_events" ON game_events FOR ALL USING (true) WITH CHECK (true);
