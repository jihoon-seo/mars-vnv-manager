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
-- 현재 개발 중이므로 RLS를 비활성화한 상태입니다.
-- 프로덕션 배포 전에 아래 DISABLE → ENABLE로 변경하세요.
-- =============================================================

ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE input_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE mars_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings DISABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
-- SECURITY DEFINER로 RLS를 우회하여 user_roles 조회 (무한 재귀 방지)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================
-- RLS 정책 (RLS를 ENABLE로 변경하면 적용됨)
-- 권한 구조:
--   User:  SELECT + INSERT
--   Admin: SELECT + INSERT + UPDATE + DELETE
-- =============================================================

-- ---- user_roles ----
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "user_roles_update" ON user_roles
  FOR UPDATE USING (is_admin());

CREATE POLICY "user_roles_delete" ON user_roles
  FOR DELETE USING (is_admin());

-- ---- input_files ----
CREATE POLICY "input_files_select" ON input_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "input_files_insert" ON input_files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "input_files_update" ON input_files
  FOR UPDATE USING (is_admin());

CREATE POLICY "input_files_delete" ON input_files
  FOR DELETE USING (is_admin());

-- ---- mars_versions ----
CREATE POLICY "mars_versions_select" ON mars_versions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "mars_versions_insert" ON mars_versions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

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

CREATE POLICY "global_settings_update" ON global_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY "global_settings_insert" ON global_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "global_settings_delete" ON global_settings
  FOR DELETE USING (is_admin());

-- =============================================================
-- Storage 정책 (storage.objects)
-- =============================================================
-- 사전 조건: Supabase 대시보드 > Storage에서
-- 'input-files'와 'plotfl-results' bucket을 생성해야 합니다.
-- =============================================================

-- ---- input-files bucket ----
CREATE POLICY "auth_users_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'input-files' AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_users_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'input-files' AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_users_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'input-files' AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_users_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'input-files' AND auth.role() = 'authenticated'
  );

-- ---- plotfl-results bucket ----
CREATE POLICY "auth_users_upload_plotfl" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'plotfl-results' AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_users_select_plotfl" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'plotfl-results' AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_users_update_plotfl" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'plotfl-results' AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_users_delete_plotfl" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'plotfl-results' AND auth.role() = 'authenticated'
  );

-- =============================================================
-- 초기 데이터: 기본 비교 설정
-- =============================================================
INSERT INTO global_settings (key, value)
VALUES ('comparison_settings', '{"tolerance_type": "absolute", "tolerance_value": 0.001}');

-- =============================================================
-- 자동으로 새 가입자에게 'user' 역할 부여하는 트리거
-- =============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 함수 실행 권한 부여
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.user_roles TO supabase_auth_admin;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
