- [ ] Create `useUser.ts` hook for user profile data
- [ ] Create session management utilities
- [ ] Add auth state persistence

### F2: Team Context & Management

- [ ] Create `TeamContext.tsx` for active team state
- [ ] Create `useTeams.ts` hook for team CRUD operations
- [ ] Create `useTeamMembers.ts` hook for member management
- [ ] Create team switcher utility functions
- [ ] Add team state persistence (last accessed team)

### F3: Feature Flag Context

- [ ] Create `FeatureFlagContext.tsx` for feature state
- [ ] Create `useFeatureFlags.ts` hook
- [ ] Add system admin detection utility
- [ ] Create feature toggle helpers
- [ ] Integrate with existing feature flag usage

### F4: Authentication UI Components

- [ ] Create `LoginPage.tsx` component
- [ ] Create `SignupPage.tsx` component
- [ ] Create `ForgotPasswordPage.tsx` component
- [ ] Create email verification flow UI
- [ ] Create `AuthGuard.tsx` for protected routes
- [ ] Update `AppRoutes.tsx` to use AuthGuard

### F5: Team Management UI

- [ ] Create `CreateTeamDialog.tsx` component
- [ ] Create `JoinTeamDialog.tsx` component (email domain matching)
- [ ] Create `TeamSwitcher.tsx` dropdown component
- [ ] Create `TeamSettingsPage.tsx` for team admins
- [ ] Create `ManageTeamMembersDialog.tsx` for user management
- [ ] Create `TeamMemberRoleManager.tsx` (Admin/Member)

### F6: User Profile UI

- [ ] Create `UserProfilePage.tsx` for global profile
- [ ] Create `UserAvatarUpload.tsx` component
- [ ] Create profile settings form (name, avatar, email)
- [ ] Add user menu dropdown in header/navigation

### F7: System Admin UI (Feature Flags)

- [ ] Create `SystemAdminPage.tsx` (accessible only to system admins)
- [ ] Create `FeatureFlagManager.tsx` component
- [ ] Create `TeamFeatureAccessTable.tsx` for per-team feature control
- [ ] Add UI to enable/disable global features
- [ ] Add UI to enable/disable features per team

### F8: Integration & Updates

- [ ] Update `CPQProvider.tsx` to include team_id in queries
- [ ] Update all data hooks to filter by active team
- [ ] Update all create/update operations to include team_id
- [ ] Add team context to error boundaries
- [ ] Update navigation to show team switcher
- [ ] Add onboarding flow (signup → create/join team)

## Recommended Execution Order

### Phase 1: Backend Foundation (Backend Agent)

**Order:** B1 → B2 → B3 → B4 → B5 → B6

**Rationale:**

- B1 creates core auth tables
- B2 adds team isolation to existing data
- B3 enforces data security
- B4 sets up Supabase Auth
- B5 adds helper functions
- B6 implements feature flags

**Verification:** After Phase 1, verify database schema and RLS policies in Supabase dashboard

### Phase 2: Frontend Auth Foundation (Frontend Agent)

**Order:** F1 → F4

**Rationale:**

- F1 creates auth context/hooks
- F4 builds auth UI components
- Can test login/signup flow

**Verification:** After Phase 2, verify user can signup and login

### Phase 3: Team Management (Mix)

**Order:** F2 (Frontend) → F5 (Frontend)

**Rationale:**

- F2 creates team context/hooks
- F5 builds team management UI
- Can test create/join team flow

**Verification:** After Phase 3, verify user can create/join teams and switch between them

### Phase 4: Feature Flags (Mix)

**Order:** F3 (Frontend) → F7 (Frontend)

**Rationale:**

- F3 creates feature flag context
- F7 builds admin UI for feature management

**Verification:** After Phase 4, verify system admin can control features

### Phase 5: Integration & Polish (Frontend Agent)

**Order:** F6 → F8

**Rationale:**

- F6 adds user profile management
- F8 integrates everything with existing app

**Verification:** After Phase 5, full end-to-end testing of multi-tenant system

## Success Criteria

- [ ] Users can signup and login via Supabase Auth
- [ ] Users can create new teams
- [ ] Users can join existing teams (email domain matching)
- [ ] Users can switch between teams
- [ ] All data is isolated by team (RLS enforced)
- [ ] Team admins can manage team members
- [ ] System admin can control feature flags globally and per-team
- [ ] User profile (name, avatar) persists across teams
- [ ] Last accessed team is remembered
- [ ] All existing functionality works within team context
