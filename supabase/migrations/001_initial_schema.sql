-- ============================================
-- Reminder App: Full Database Schema
-- ============================================

-- Profiles table (auto-created on signup)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  timezone text DEFAULT 'America/New_York',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  UNIQUE(user_id, value)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own non-default categories" ON categories
  FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Reminders table
CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'personal',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  event_time timestamptz NOT NULL,
  estimated_minutes integer DEFAULT 30,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notify_before_minutes integer DEFAULT 15,
  last_notified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_event_time ON reminders(event_time);
CREATE INDEX idx_reminders_user_completed ON reminders(user_id, completed);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- User schedules table (for AI planner)
CREATE TABLE user_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  block_name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT false
);

ALTER TABLE user_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON user_schedules
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedules" ON user_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON user_schedules
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedules" ON user_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Day plans table (AI-generated daily plans)
CREATE TABLE day_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz DEFAULT now(),
  accepted boolean DEFAULT false,
  UNIQUE(user_id, plan_date)
);

ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own day plans" ON day_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own day plans" ON day_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own day plans" ON day_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile + default categories on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- Create default categories
  INSERT INTO public.categories (user_id, value, label, icon, color, is_default, sort_order) VALUES
    (NEW.id, 'homework', 'Homework', '📚', '#3b82f6', true, 1),
    (NEW.id, 'applications', 'Applications', '📄', '#8b5cf6', true, 2),
    (NEW.id, 'gym', 'Gym', '💪', '#f97316', true, 3),
    (NEW.id, 'personal', 'Personal', '👤', '#10b981', true, 4),
    (NEW.id, 'work', 'Work', '💼', '#6b7280', true, 5);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
