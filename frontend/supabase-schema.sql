-- =============================================================
-- MARS V&V Manager - Supabase Database Schema
-- =============================================================
-- Supabase 대시보드의 SQL Editor 에서 실행하세요.
-- =============================================================

-- 사용자 역할 테이블
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 입력 파일 테이블
CREATE TABLE input_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_path TEXT,
  is_internal_only BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users ON DELETE SET NULL
);

-- MARS 버전 테이블
CREATE TABLE mars_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  os TEXT,
  description TEXT,
  is_reference BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users ON DELETE SET NULL
);

-- 시뮬레이션 결과 테이블
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_file_id UUID REFERENCES input_files ON DELETE CASCADE NOT NULL,
  mars_version_id UUID REFERENCES mars_versions ON DELETE CASCADE NOT NULL,
  plotfl_path TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users ON DELETE SET NULL,
  metadata JSONB,
  UNIQUE(input_file_id, mars_version_id)
);

-- 비교 결과 테이블
CREATE TABLE comparison_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_result_id UUID REFERENCES simulation_results ON DELETE CASCADE NOT NULL UNIQUE,
  reference_result_id UUID REFERENCES simulation_results ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pass', 'fail')) NOT NULL,
  diff_stats JSONB NOT NULL,
  compared_at TIMESTAMPTZ DEFAULT NOW(),
  comparison_settings JSONB NOT NULL
);

-- 글로벌 설정 테이블
CREATE TABLE global_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- Row Level Security (RLS)
-- =============================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE mars_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ---- user_roles ----
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "user_roles_admin" ON user_roles
  FOR ALL USING (is_admin());

-- ---- input_files ----
CREATE POLICY "input_files_select" ON input_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "input_files_insert" ON input_files
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "input_files_update" ON input_files
  FOR UPDATE USING (is_admin());

CREATE POLICY "input_files_delete" ON input_files
  FOR DELETE USING (is_admin());

-- ---- mars_versions ----
CREATE POLICY "mars_versions_select" ON mars_versions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "mars_versions_insert" ON mars_versions
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "mars_versions_update" ON mars_versions
  FOR UPDATE USING (is_admin());

CREATE POLICY "mars_versions_delete" ON mars_versions
  FOR DELETE USING (is_admin());

-- ---- simulation_results ----
CREATE POLICY "sim_results_select" ON simulation_results
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "sim_results_insert" ON simulation_results
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sim_results_update" ON simulation_results
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "sim_results_delete" ON simulation_results
  FOR DELETE USING (is_admin());

-- ---- comparison_results ----
CREATE POLICY "comparison_results_select" ON comparison_results
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "comparison_results_insert" ON comparison_results
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "comparison_results_update" ON comparison_results
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "comparison_results_delete" ON comparison_results
  FOR DELETE USING (is_admin());

-- ---- global_settings ----
CREATE POLICY "global_settings_select" ON global_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "global_settings_admin" ON global_settings
  FOR ALL USING (is_admin());

-- =============================================================
-- 초기 데이터: 기본 비교 설정
-- =============================================================
INSERT INTO global_settings (key, value)
VALUES ('comparison_settings', '{"tolerance_type": "absolute", "tolerance_value": 0.001}');

-- =============================================================
-- 자동으로 새 가입자에게 'user' 역할 부여하는 트리거
-- =============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
