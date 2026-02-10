-- Sync email from profiles to auth.users when profile email is updated
-- This ensures that auth.users.email always matches profiles.email

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS sync_email_to_auth_users ON public.profiles;
DROP FUNCTION IF EXISTS sync_email_to_auth_users();

-- Create function to sync email from profiles to auth.users
CREATE OR REPLACE FUNCTION sync_email_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if email has changed and is not a temporary email
  IF NEW.email IS NOT NULL 
     AND NEW.email != '' 
     AND NEW.email NOT LIKE '%@temp.mashaheer.com'
     AND (OLD.email IS NULL OR OLD.email != NEW.email) THEN
    
    -- Update auth.users email to match profiles email
    UPDATE auth.users
    SET 
      email = NEW.email,
      updated_at = now()
    WHERE id = NEW.id
      AND (email IS NULL OR email != NEW.email OR email LIKE '%@temp.mashaheer.com');
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
CREATE TRIGGER sync_email_to_auth_users
  AFTER UPDATE OF email ON public.profiles
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_email_to_auth_users();

-- Add comment
COMMENT ON FUNCTION sync_email_to_auth_users() IS 'Syncs email from profiles table to auth.users table when profile email is updated';

