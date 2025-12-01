# Multi-Tenant Authentication System - Implementation Plan

## Overview

Implementing a complete multi-tenant authentication system with team-based data isolation, similar to Monday.com and ClickUp. Users can belong to multiple teams, switch between them, and each team has completely isolated data (components, quotations, projects, etc.). Includes system admin role for feature flag management.

## User Review Required

> [!IMPORTANT]
> **Breaking Change:** This implementation requires all existing data to be associated with teams. Since you mentioned starting fresh, all existing data in the database will need to be cleared or migrated to default teams.

> [!IMPORTANT]
> **Environment Configuration:** A new environment variable `VITE_SYSTEM_ADMIN_EMAILS` will be added to identify system administrators. You'll need to add your email to this variable.

> [!WARNING]
> **Authentication Provider:** This implementation uses Supabase Auth. All users will need to sign up/login through Supabase authentication. Current anonymous access will be removed.

## Proposed Changes

### Backend Tasks (Backend Agent)

---

#### B1: Database Schema - Authentication & Teams

**New Tables:**

##### [NEW] Auth & Team Tables

```sql
-- User profiles (global, cross-team data)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_system_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email_domain TEXT, -- For domain-based team matching
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ, -- Soft delete with 90-day retention
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations (for future email invite feature)
CREATE TABLE team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Feature flags for system-wide feature control
CREATE TABLE feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key TEXT UNIQUE NOT NULL, -- e.g., 'ai_import', 'analytics'
  flag_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team-level feature access
CREATE TABLE team_feature_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, feature_flag_id)
);
```

**Indexes:**

```sql
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_teams_email_domain ON teams(email_domain);
CREATE INDEX idx_teams_deleted_at ON teams(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
```

---

#### B2: Database Schema - Add Team Isolation

**Modified Tables:**

##### [MODIFY] [database-schema.sql](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/migrations/database-schema.sql)

Add `team_id` columns and foreign keys to all existing tables:

```sql
-- Components table
ALTER TABLE components ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_components_team_id ON components(team_id);

-- Assemblies table
ALTER TABLE assemblies ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_assemblies_team_id ON assemblies(team_id);

-- Quotations table
ALTER TABLE quotations ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_quotations_team_id ON quotations(team_id);

-- Quotation systems table
ALTER TABLE quotation_systems ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_quotation_systems_team_id ON quotation_systems(team_id);

-- Quotation items table
ALTER TABLE quotation_items ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_quotation_items_team_id ON quotation_items(team_id);

-- Projects table
ALTER TABLE projects ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_projects_team_id ON projects(team_id);

-- User table configs
ALTER TABLE user_table_configs ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_user_table_configs_team_id ON user_table_configs(team_id);

-- User settings
ALTER TABLE user_settings ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX idx_user_settings_team_id ON user_settings(team_id);

-- Make team_id NOT NULL after data migration
-- (In fresh start, this is immediate)
ALTER TABLE components ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE assemblies ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE quotations ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE quotation_systems ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE quotation_items ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN team_id SET NOT NULL;
-- user_table_configs and user_settings can remain nullable for global configs
```

---

#### B3: Row-Level Security Policies

**Security Changes:**

##### [MODIFY] All RLS Policies

Replace permissive `USING (true)` policies with team-based policies:

```sql
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable all operations for components" ON components;
DROP POLICY IF EXISTS "Enable all operations for assemblies" ON assemblies;
DROP POLICY IF EXISTS "Enable all operations for quotations" ON quotations;
-- ... (drop all existing policies)

-- Components: Users can only see/modify their team's components
CREATE POLICY "Team members can view components"
  ON components FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert components"
  ON components FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update components"
  ON components FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can delete components"
  ON components FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Similar policies for all other tables: assemblies, quotations, quotation_systems,
-- quotation_items, projects, user_table_configs, user_settings

-- Teams table policies
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR deleted_at IS NULL -- Allow viewing non-deleted teams for join flow
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Team admins can update teams"
  ON teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Team members policies
CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team admins can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User profiles (global)
CREATE POLICY "Users can view all user profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Feature flags (system admin only for write, all for read)
CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);

CREATE POLICY "System admins can manage feature flags"
  ON feature_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_system_admin = true
    )
  );
```

---

#### B4: Supabase Auth Setup

**Configuration Changes:**

1. Enable Supabase Auth in Supabase dashboard:
   - Email/Password authentication
   - Email confirmations enabled
   - Redirect URLs: `http://localhost:5173/auth/callback`, `https://your-domain.com/auth/callback`

2. Customize auth email templates in Supabase dashboard:
   - Confirmation email
   - Password reset email
   - Magic link email (optional)

3. Configure auth settings:
   - Session timeout: 7 days
   - Refresh token rotation: enabled

---

#### B5: Database Functions & Triggers

**New Functions:**

##### [NEW] Database Functions

```sql
-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Get user's active teams
CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  user_role TEXT,
  last_accessed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    tm.role,
    tm.last_accessed_at
  FROM teams t
  INNER JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid
    AND t.deleted_at IS NULL
  ORDER BY tm.last_accessed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Switch active team (updates last_accessed_at)
CREATE OR REPLACE FUNCTION switch_team(user_uuid UUID, target_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify user is member of target team
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = user_uuid AND team_id = target_team_id
  ) THEN
    RETURN false;
  END IF;

  -- Update last accessed timestamp
  UPDATE team_members
  SET last_accessed_at = NOW()
  WHERE user_id = user_uuid AND team_id = target_team_id;

  UPDATE teams
  SET last_accessed_at = NOW()
  WHERE id = target_team_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(user_uuid UUID, target_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = user_uuid
      AND team_id = target_team_id
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soft delete team (90-day retention)
CREATE OR REPLACE FUNCTION soft_delete_team(target_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE teams
  SET deleted_at = NOW()
  WHERE id = target_team_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for teams deleted > 90 days ago
CREATE OR REPLACE FUNCTION cleanup_deleted_teams()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM teams
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check feature flag for team
CREATE OR REPLACE FUNCTION check_feature_flag(
  flag_key_input TEXT,
  target_team_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  global_enabled BOOLEAN;
  team_enabled BOOLEAN;
BEGIN
  -- Check global flag
  SELECT is_enabled INTO global_enabled
  FROM feature_flags
  WHERE flag_key = flag_key_input;

  -- If global is disabled, return false
  IF NOT global_enabled THEN
    RETURN false;
  END IF;

  -- Check team-specific override
  SELECT tfa.is_enabled INTO team_enabled
  FROM team_feature_access tfa
  INNER JOIN feature_flags ff ON ff.id = tfa.feature_flag_id
  WHERE ff.flag_key = flag_key_input AND tfa.team_id = target_team_id;

  -- If no team-specific setting, use global
  RETURN COALESCE(team_enabled, global_enabled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### B6: Feature Flag System

**Initial Feature Flags:**

##### [NEW] Seed Feature Flags

```sql
-- Seed initial feature flags
INSERT INTO feature_flags (flag_key, flag_name, description, is_enabled)
VALUES
  ('ai_import', 'AI Document Import', 'Enable AI-powered document parsing and import', true),
  ('analytics', 'Analytics Dashboard', 'Enable analytics and reporting features', false),
  ('advanced_pricing', 'Advanced Pricing', 'Enable advanced pricing rules and calculations', false),
  ('api_access', 'API Access', 'Enable REST API access for integrations', false),
  ('custom_branding', 'Custom Branding', 'Allow teams to customize branding and themes', false);
```

---

### Frontend Tasks (Frontend Agent)

---

#### F1: Authentication Context & Hooks

##### [NEW] [src/contexts/AuthContext.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/contexts/AuthContext.tsx)

Create authentication context that wraps Supabase Auth:

- `AuthProvider` component
- `useAuth()` hook exposing:
  - `user`: Current authenticated user
  - `session`: Current session
  - `loading`: Auth state loading
  - `signUp(email, password, fullName)`: Sign up new user
  - `signIn(email, password)`: Sign in user
  - `signOut()`: Sign out user
  - `resetPassword(email)`: Request password reset
  - `updateProfile(data)`: Update user profile

##### [NEW] [src/hooks/useUser.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/hooks/useUser.ts)

User profile management hook:

- Fetch user profile from `user_profiles` table
- Update user profile (name, avatar)
- Upload avatar to Supabase Storage
- Check system admin status

---

#### F2: Team Context & Management

##### [NEW] [src/contexts/TeamContext.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/contexts/TeamContext.tsx)

Team management context:

- `TeamProvider` component
- `useTeamContext()` hook exposing:
  - `activeTeam`: Currently selected team
  - `teams`: List of user's teams
  - `switchTeam(teamId)`: Switch active team
  - `loading`: Team data loading state

##### [NEW] [src/hooks/useTeams.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/hooks/useTeams.ts)

Team CRUD operations:

- `createTeam(name, emailDomain)`: Create new team
- `updateTeam(teamId, data)`: Update team details
- `deleteTeam(teamId)`: Soft delete team
- `getUserTeams()`: Fetch user's teams
- `findTeamByEmailDomain(email)`: Find matching team by email domain

##### [NEW] [src/hooks/useTeamMembers.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/hooks/useTeamMembers.ts)

Team member management:

- `getTeamMembers(teamId)`: Fetch team members
- `addTeamMember(teamId, userId, role)`: Add member to team
- `updateMemberRole(teamId, userId, role)`: Change member role
- `removeMember(teamId, userId)`: Remove member from team
- `isTeamAdmin(teamId)`: Check if current user is admin

---

#### F3: Feature Flag Context

##### [NEW] [src/contexts/FeatureFlagContext.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/contexts/FeatureFlagContext.tsx)

Feature flag management:

- `FeatureFlagProvider` component
- `useFeatureFlags()` hook exposing:
  - `isEnabled(flagKey)`: Check if feature enabled for active team
  - `allFlags`: All available feature flags
  - `isSystemAdmin`: Whether current user is system admin
  - `updateGlobalFlag(flagKey, enabled)`: System admin only
  - `updateTeamFlag(teamId, flagKey, enabled)`: System admin only

---

#### F4: Authentication UI Components

##### [NEW] [src/pages/auth/LoginPage.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/pages/auth/LoginPage.tsx)

Login page with:

- Email/password form
- "Forgot password" link
- "Sign up" link
- Error handling
- Redirect to dashboard after login

##### [NEW] [src/pages/auth/SignupPage.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/pages/auth/SignupPage.tsx)

Signup page with:

- Email/password/full name form
- Email confirmation flow
- Redirect to team creation/join after signup

##### [NEW] [src/pages/auth/ForgotPasswordPage.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/pages/auth/ForgotPasswordPage.tsx)

Password reset flow:

- Email input form
- Success message
- Link back to login

##### [NEW] [src/components/auth/AuthGuard.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/auth/AuthGuard.tsx)

Protected route wrapper:

- Check if user is authenticated
- Redirect to login if not
- Check if user has active team
- Redirect to team creation/join if not

##### [MODIFY] [src/components/shared/AppRoutes.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/shared/AppRoutes.tsx)

Update routing:

- Add public routes for auth pages
- Wrap protected routes with `AuthGuard`
- Add team selection route

---

#### F5: Team Management UI

##### [NEW] [src/components/teams/CreateTeamDialog.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/teams/CreateTeamDialog.tsx)

Team creation dialog:

- Team name input
- Email domain restriction input (optional)
- Create team and make user admin

##### [NEW] [src/components/teams/JoinTeamDialog.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/teams/JoinTeamDialog.tsx)

Team join dialog:

- Search for teams by email domain
- Show matching teams based on user's email
- Join team as member

##### [NEW] [src/components/teams/TeamSwitcher.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/teams/TeamSwitcher.tsx)

Team switcher dropdown (in navigation):

- Show active team
- List all user's teams
- Switch team on click
- Link to create/join team

##### [NEW] [src/pages/teams/TeamSettingsPage.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/pages/teams/TeamSettingsPage.tsx)

Team settings page (admin only):

- Edit team name
- Edit email domain restriction
- Manage team members
- Delete team (soft delete with confirmation)

##### [NEW] [src/components/teams/ManageTeamMembersDialog.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/teams/ManageTeamMembersDialog.tsx)

Team member management:

- List current members
- Change member roles (admin/member)
- Remove members

---

#### F6: User Profile UI

##### [NEW] [src/pages/profile/UserProfilePage.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/pages/profile/UserProfilePage.tsx)

User profile page:

- Display/edit full name
- Upload/change avatar
- Display email (read-only)
- Link to change password

##### [NEW] [src/components/profile/UserAvatarUpload.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/profile/UserAvatarUpload.tsx)

Avatar upload component:

- Drag-and-drop or click to upload
- Image preview
- Upload to Supabase Storage
- Update user profile with avatar URL

##### [NEW] [src/components/navigation/UserMenu.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/navigation/UserMenu.tsx)

User menu dropdown (in header):

- Show user name and avatar
- Link to profile page
- Link to settings
- Sign out button

---

#### F7: System Admin UI

##### [NEW] [src/pages/admin/SystemAdminPage.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/pages/admin/SystemAdminPage.tsx)

System admin dashboard (only accessible to system admins):

- Global feature flag management
- Team-level feature access control
- System statistics

##### [NEW] [src/components/admin/FeatureFlagManager.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/admin/FeatureFlagManager.tsx)

Feature flag management table:

- List all feature flags
- Toggle global enable/disable
- Description of each flag

##### [NEW] [src/components/admin/TeamFeatureAccessTable.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/components/admin/TeamFeatureAccessTable.tsx)

Per-team feature access:

- List all teams
- For each team, show which features are enabled
- Toggle features per team

---

#### F8: Integration & Updates

##### [MODIFY] [src/contexts/CPQProvider.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/contexts/CPQProvider.tsx)

Update to use team context:

- Inject `team_id` into all queries
- Filter data by active team
- Include `AuthProvider` and `TeamProvider`

##### [MODIFY] [src/hooks/useComponents.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/hooks/useComponents.ts)

Update to filter by team:

- Add `team_id` filter to queries
- Include `team_id` in create/update operations

##### [MODIFY] [src/hooks/useQuotations.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/hooks/useQuotations.ts)

Update to filter by team:

- Add `team_id` filter to queries
- Include `team_id` in create/update operations

##### [MODIFY] [src/hooks/useAssemblies.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/hooks/useAssemblies.ts)

Update to filter by team:

- Add `team_id` filter to queries
- Include `team_id` in create/update operations

##### [MODIFY] [src/hooks/useProjects.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/hooks/useProjects.ts)

Update to filter by team:

- Add `team_id` filter to queries
- Include `team_id` in create/update operations

##### [MODIFY] [src/lib/config.ts](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/lib/config.ts)

Add system admin email configuration:

```typescript
systemAdmin: {
  emails: string[]; // From VITE_SYSTEM_ADMIN_EMAILS env var
}
```

##### [NEW] [src/pages/onboarding/TeamOnboardingPage.tsx](file:///c:/Users/Eli/Desktop/Claude%20Code/CPQ-System/src/pages/onboarding/TeamOnboardingPage.tsx)

First-time user onboarding:

- Choice: Create new team or join existing team
- If create: Show create team form
- If join: Show join team form (email domain matching)
- After team selection, redirect to dashboard

---

## Verification Plan

### Automated Tests

#### Backend Verification (Supabase Dashboard + SQL)

1. **Schema Verification**

   ```sql
   -- Run in Supabase SQL Editor to verify tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'user_profiles', 'teams', 'team_members', 'team_invitations',
     'feature_flags', 'team_feature_access'
   );

   -- Verify team_id columns added
   SELECT column_name, table_name
   FROM information_schema.columns
   WHERE column_name = 'team_id'
   AND table_schema = 'public';
   ```

2. **RLS Policy Verification**

   ```sql
   -- List all RLS policies to verify they exist
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';

   -- Verify permissive policies are dropped
   SELECT COUNT(*) FROM pg_policies
   WHERE policyname LIKE '%Enable all operations%';
   -- Should return 0
   ```

3. **Function Verification**
   ```sql
   -- Verify functions exist
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN (
     'handle_new_user', 'get_user_teams', 'switch_team',
     'is_team_admin', 'soft_delete_team', 'check_feature_flag'
   );
   ```

#### Frontend Unit Tests

Backend agent should create these test files for frontend agent to run:

1. **Auth Hook Tests**
   - Create: `src/hooks/__tests__/useAuth.test.ts`
   - Run: `npm test src/hooks/__tests__/useAuth.test.ts`
   - Tests: signup, login, logout, session persistence

2. **Team Hook Tests**
   - Create: `src/hooks/__tests__/useTeams.test.ts`
   - Run: `npm test src/hooks/__tests__/useTeams.test.ts`
   - Tests: create team, join team, switch team, team member management

3. **Feature Flag Tests**
   - Create: `src/hooks/__tests__/useFeatureFlags.test.ts`
   - Run: `npm test src/hooks/__tests__/useFeatureFlags.test.ts`
   - Tests: check feature enabled, system admin detection

### Manual Verification

#### Phase 1: Backend Verification (After B1-B6)

**Backend Agent:** After completing B1-B6, provide screenshots of:

1. Supabase Dashboard â†’ Database â†’ Tables showing new tables created
2. Supabase Dashboard â†’ Authentication â†’ Settings showing auth enabled
3. SQL query results from schema verification queries above

#### Phase 2: Auth Flow Verification (After F1 + F4)

**Frontend Agent:** Test the following flow and document results:

1. Navigate to app URL (should redirect to login)
2. Click "Sign Up"
3. Fill in: email, password, full name
4. Submit form
5. Check email for confirmation link
6. Click confirmation link
7. Should redirect to team onboarding page
8. **Expected:** User is authenticated and redirected properly

#### Phase 3: Team Management Verification (After F2 + F5)

**Frontend Agent:** Test the following flow:

1. **Create Team Flow:**
   - On onboarding page, click "Create New Team"
   - Enter team name: "Test Company"
   - Enter email domain: "example.com" (matching your signup email)
   - Submit
   - **Expected:** Team created, user is team admin, redirected to dashboard

2. **Switch Team Flow:**
   - Create second team: "Second Company"
   - Click team switcher in navigation
   - **Expected:** See both teams listed
   - Click "Second Company"
   - **Expected:** Active team switches, data refreshes for new team

3. **Join Team Flow (requires 2 users):**
   - Sign up second user with same email domain
   - On onboarding, click "Join Existing Team"
   - **Expected:** See "Test Company" in list (matching domain)
   - Join team
   - **Expected:** User added as member

4. **Team Admin Flow:**
   - As admin user, go to Team Settings
   - View team members
   - Change second user's role to "Admin"
   - Remove second user
   - **Expected:** All operations succeed

#### Phase 4: Feature Flag Verification (After F3 + F7)

**Frontend Agent:** Test as system admin user:

1. Add your email to `.env.local`: `VITE_SYSTEM_ADMIN_EMAILS=you@example.com`
2. Restart dev server: `npm run dev`
3. Login and navigate to `/admin` (System Admin page)
4. **Expected:** Page loads (non-admin users should see 403)
5. View feature flag list
6. Toggle "AI Import" feature globally to OFF
7. Navigate to document import page
8. **Expected:** AI import UI hidden/disabled
9. Return to admin page, toggle AI import ON
10. Return to document import
11. **Expected:** AI import UI visible/enabled
12. Test per-team feature access:
    - Create team "Premium Team"
    - Create team "Basic Team"
    - In admin page, disable "AI Import" for "Basic Team" only
    - Switch to Basic Team
    - **Expected:** AI import disabled
    - Switch to Premium Team
    - **Expected:** AI import enabled

#### Phase 5: Data Isolation Verification (After F8)

**Frontend Agent:** Test data isolation:

1. **Setup:**
   - Create Team A
   - Add 3 components in team A
   - Create quotation in team A
   - Create Team B
   - Switch to Team B

2. **Verification:**
   - Navigate to Component Library
   - **Expected:** No components visible (empty library)
   - Navigate to Quotations
   - **Expected:** No quotations visible (empty list)
   - Add 2 components in Team B
   - Switch back to Team A
   - **Expected:** See original 3 components (Team B's data not visible)

3. **RLS Enforcement (Critical Security Test):**
   - In browser dev tools, run:
     ```javascript
     // Try to fetch Team A components while in Team B
     const { data } = await supabase.from('components').select('*');
     console.log(data);
     ```
   - **Expected:** Only see Team B components (RLS blocks Team A data)

#### Phase 6: End-to-End Full Flow

**Frontend Agent:** Complete end-to-end test:

1. Clear browser data / incognito window
2. Sign up new user: `testuser@acme.com`
3. Create team: "ACME Corp" with domain "acme.com"
4. Add 5 components
5. Create assembly from components
6. Create project
7. Create quotation with assembly
8. Create second team: "Beta Corp"
9. Switch to Beta Corp
10. Verify ACME data not visible
11. Sign out
12. Sign in again
13. **Expected:** Last accessed team (Beta Corp) loads by default
14. Switch back to ACME Corp
15. **Expected:** All original data still present

**Success Criteria:**

- âœ… All data correctly scoped to teams
- âœ… Last accessed team persists across sessions
- âœ… Team switching works smoothly
- âœ… Feature flags control UI/features
- âœ… System admin can manage features
- âœ… RLS prevents cross-team data access
