-- Make eli.dejou@radion.co.il the SYSTEM ADMIN (developer)
UPDATE user_profiles
SET is_system_admin = true
WHERE email = 'eli.dejou@radion.co.il';

-- Verify it worked
SELECT 
  email, 
  full_name, 
  is_system_admin,
  created_at
FROM user_profiles 
WHERE email = 'eli.dejou@radion.co.il';
