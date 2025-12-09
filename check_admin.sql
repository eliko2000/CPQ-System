-- Check if current user is system admin
SELECT 
  id,
  email,
  full_name,
  is_system_admin,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
