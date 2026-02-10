-- 1. Create the function to handle new user insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the public profile
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    country,
    is_verified,
    is_approved,
    is_suspended,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name', -- Extract name from metadata
    COALESCE(new.raw_user_meta_data->>'role', 'influencer'), -- Default to influencer
    COALESCE(new.raw_user_meta_data->>'country', 'OTHER'),
    FALSE, -- Not verified by default
    FALSE, -- Not approved by default
    FALSE, 
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if admin created it first

  -- Create the default wallet
  INSERT INTO public.wallets (
    user_id,
    balance,
    currency,
    created_at
  )
  VALUES (
    new.id,
    0,
    'USD',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Verify RLS Policies
-- Allow users to update their own profile (Bio, Image, Country)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own social links
DROP POLICY IF EXISTS "Users can manage own social links" ON public.social_links;
CREATE POLICY "Users can manage own social links" ON public.social_links
  FOR ALL USING (auth.uid() = user_id);

-- Allow users to insert their own media
DROP POLICY IF EXISTS "Users can manage own media" ON public.influencer_media;
CREATE POLICY "Users can manage own media" ON public.influencer_media
  FOR ALL USING (auth.uid() = influencer_id);
