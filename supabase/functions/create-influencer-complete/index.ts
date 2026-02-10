import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');

// Simple API key check instead of JWT verification
async function checkAuthorization(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing token');
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // For now, just check if token exists (you can add more validation later)
  if (!token) {
    throw new Error('Unauthorized: Invalid token');
  }
  
  return { token };
}

serve(async (req: Request) => {
  // Log the complete request details
  console.log('=== COMPLETE INFLUENCER CREATION EDGE FUNCTION ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    console.log('Processing POST request...');
    
    // Check authorization (basic token check)
    await checkAuthorization(req);
    console.log('Authorization passed');
    
    // Log the raw request body for debugging
    const rawBody = await req.text();
    console.log('=== REQUEST BODY DETAILS ===');
    console.log('Raw request body length:', rawBody.length);
    console.log('Raw request body:', rawBody);
    
    // Parse request body
    let bodyData;
    try {
      bodyData = JSON.parse(rawBody);
      console.log('=== PARSED BODY DATA ===');
      console.log('Parsed body data:', bodyData);
      console.log('Parsed body keys:', Object.keys(bodyData));
    } catch (parseError) {
      console.error('=== JSON PARSE ERROR ===');
      console.error('Failed to parse JSON:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: parseError.message,
        rawBody: rawBody.substring(0, 200) + (rawBody.length > 200 ? '...' : '')
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const { 
      email, 
      password, 
      name, 
      bio, 
      country,
      profile_image_url, 
      is_verified, 
      commission_percentage,
      social_links, 
      media_files,
      is_update,
      influencer_id 
    } = bodyData;
    
    // Log individual fields for debugging
    console.log('=== EXTRACTED FIELDS ===');
    console.log('Email:', email, 'Type:', typeof email, 'Present:', !!email);
    console.log('Password:', password ? '[HIDDEN]' : 'missing', 'Type:', typeof password, 'Present:', !!password);
    console.log('Name:', name, 'Type:', typeof name, 'Present:', !!name);
    console.log('Bio:', bio, 'Type:', typeof bio, 'Present:', !!bio);
    console.log('Country:', country, 'Type:', typeof country, 'Present:', !!country);
    console.log('Profile Image URL:', profile_image_url, 'Type:', typeof profile_image_url, 'Present:', !!profile_image_url);
    console.log('Is Verified:', is_verified, 'Type:', typeof is_verified, 'Present:', !!is_verified);
    console.log('Social Links:', social_links, 'Type:', typeof social_links, 'Present:', !!social_links);
    console.log('Media Files:', media_files, 'Type:', typeof media_files, 'Present:', !!media_files);
    console.log('Is Update:', is_update, 'Type:', typeof is_update, 'Present:', !!is_update);
    console.log('Influencer ID:', influencer_id, 'Type:', typeof influencer_id, 'Present:', !!influencer_id);
    
    if (!email || !name) {
      console.log('=== MISSING REQUIRED FIELDS ===');
      console.log('Missing required fields. Email:', !!email, 'Name:', !!name);
      
      return new Response(JSON.stringify({
        error: 'Missing required fields: email, name',
        received: {
          email: !!email,
          name: !!name,
          bodyKeys: Object.keys(bodyData)
        }
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('=== ALL REQUIRED FIELDS PRESENT ===');
    console.log('Proceeding with influencer creation/update...');

    // Create Supabase client with service role key
    console.log('=== SUPABASE CLIENT SETUP ===');
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'Present' : 'Missing');
    console.log('SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? 'Present (length: ' + SERVICE_ROLE_KEY.length + ')' : 'Missing');
    
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({
        error: 'Edge Function configuration error',
        details: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('Supabase client created successfully');

    let userId: string;
    let isNewUser = false;

    if (is_update && influencer_id) {
      // Update existing influencer
      console.log('=== UPDATING EXISTING INFLUENCER ===');
      userId = influencer_id;
      
      // Update profile
      // Build update data object
      const updateData: any = {
        name,
        bio: bio || null,
        country: country || null,
        profile_image_url: profile_image_url || null,
        is_verified: is_verified || false
      };

      // Add commission_percentage only if explicitly provided
      if (commission_percentage !== undefined && commission_percentage !== null && commission_percentage !== '') {
        try {
          updateData.commission_percentage = Number(commission_percentage);
        } catch (e) {
          console.warn('Could not parse commission_percentage for update, omitting:', e);
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', influencer_id);
      
      if (updateError) {
        console.error('Profile update error:', updateError);
        return new Response(JSON.stringify({
          error: 'Failed to update influencer profile',
          details: updateError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      console.log('Profile updated successfully');
      
    } else {
      // Create new influencer
      console.log('=== CREATING NEW INFLUENCER ===');
      
      // Create user in Auth (only if password provided)
      if (password) {
        console.log('=== AUTH USER CREATION ===');
        console.log('Email:', email);
        console.log('Password:', password ? '[HIDDEN]' : 'missing');
        console.log('Name:', name);
        
        try {
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              role: 'influencer',
              name
            }
          });

          if (authError) {
            console.error('Auth creation error:', authError);
            console.error('Error code:', authError.status);
            console.error('Error message:', authError.message);
            console.error('Error details:', authError);
            
            return new Response(JSON.stringify({
              error: 'Failed to create user in authentication system',
              details: authError.message,
              code: authError.status
            }), {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          userId = authUser.user.id;
          isNewUser = true;
          console.log('Auth user created successfully with ID:', userId);
        } catch (authError: any) {
          console.error('Auth creation error:', authError);
          console.error('Error code:', authError.status);
          console.error('Error message:', authError.message);
          console.error('Error details:', authError);
          
          return new Response(JSON.stringify({
            error: 'Failed to create user in authentication system',
            details: authError.message,
            code: authError.status
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      } else {
        // Generate a UUID for the profile if no password provided
        userId = crypto.randomUUID();
        console.log('Generated UUID for profile:', userId);
      }

      // Check if profile already exists by ID or email (might be from a previous failed attempt)
      console.log('Checking for existing profile with ID:', userId, 'or email:', email);
      
      const { data: existingProfileById, error: checkByIdError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', userId)
        .maybeSingle();

      const { data: existingProfileByEmail, error: checkByEmailError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();

      const existingProfile = existingProfileById || existingProfileByEmail;
      
      if (checkByIdError && checkByIdError.code !== 'PGRST116') {
        console.warn('Error checking existing profile by ID:', checkByIdError);
      }
      if (checkByEmailError && checkByEmailError.code !== 'PGRST116') {
        console.warn('Error checking existing profile by email:', checkByEmailError);
      }

      if (existingProfile) {
        console.log('Found existing profile:', existingProfile);
        
        // If profile exists with different ID but same email, that's a problem
        if (existingProfile.id !== userId) {
          console.error('Profile with email already exists with different ID:', existingProfile.id, 'vs', userId);
          
          // If auth user was created, clean it up
          if (isNewUser) {
            try {
              await supabase.auth.admin.deleteUser(userId);
              console.log('Cleaned up auth user - profile exists with different ID');
            } catch (cleanupError) {
              console.error('Failed to cleanup auth user:', cleanupError);
            }
          }
          
          return new Response(JSON.stringify({
            error: 'Influencer with this email already exists',
            details: `An influencer with email "${email}" already exists with ID ${existingProfile.id}. Please edit the existing influencer instead.`,
            existingProfileId: existingProfile.id
          }), {
            status: 409, // Conflict
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      // If profile exists with same ID, update it instead of creating
      if (existingProfile && existingProfile.id === userId) {
        console.log('Profile already exists with same ID, updating instead of creating:', existingProfile);
        
        // Build update data object
        const updateData: any = {
          name,
          email,
          role: 'influencer',
          bio: bio || null,
          country: country || null,
          profile_image_url: profile_image_url || null,
          is_verified: is_verified || false,
          updated_at: new Date().toISOString()
        };

        // Add commission_percentage only if explicitly provided
        if (commission_percentage !== undefined && commission_percentage !== null && commission_percentage !== '') {
          try {
            updateData.commission_percentage = Number(commission_percentage);
          } catch (e) {
            console.warn('Could not parse commission_percentage, omitting from update:', e);
          }
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          console.error('Profile update error:', updateError);
          
          // If auth user was created, clean it up
          if (isNewUser) {
            try {
              await supabase.auth.admin.deleteUser(userId);
              console.log('Cleaned up auth user after profile update failure');
            } catch (cleanupError) {
              console.error('Failed to cleanup auth user:', cleanupError);
            }
          }
          
          return new Response(JSON.stringify({
            error: 'Failed to update existing influencer profile',
            details: updateError.message,
            code: updateError.code
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        console.log('Existing profile updated successfully');
      } else {
        // Create new profile
        // Build profile data object
        const profileData: any = {
          id: userId,
          name,
          email,
          role: 'influencer',
          bio: bio || null,
          country: country || null,
          profile_image_url: profile_image_url || null,
          is_verified: is_verified || false,
          is_suspended: false,
          is_approved: false,
          created_at: new Date().toISOString()
        };

        // Add commission_percentage only if explicitly provided and column exists
        // If migration hasn't been run, this field will be omitted to avoid errors
        if (commission_percentage !== undefined && commission_percentage !== null && commission_percentage !== '') {
          try {
            profileData.commission_percentage = Number(commission_percentage);
          } catch (e) {
            console.warn('Could not parse commission_percentage, omitting from insert:', e);
          }
        }

        // Try to insert, but if it fails due to duplicate key, update instead
        let { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData);

        // Check if error is due to duplicate key
        const isDuplicateKey = profileError && (
          profileError.code === '23505' || 
          profileError.message?.includes('duplicate key') ||
          profileError.message?.includes('profiles_pkey')
        );

        if (isDuplicateKey) {
          console.log('Duplicate key detected during insert, attempting to update existing profile instead');
          console.log('Profile ID:', userId);
          
          // Try to update instead
          const updateData: any = {
            name,
            email,
            role: 'influencer',
            bio: bio || null,
            country: country || null,
            profile_image_url: profile_image_url || null,
            is_verified: is_verified || false,
            updated_at: new Date().toISOString()
          };

          if (commission_percentage !== undefined && commission_percentage !== null && commission_percentage !== '') {
            try {
              updateData.commission_percentage = Number(commission_percentage);
            } catch (e) {
              console.warn('Could not parse commission_percentage:', e);
            }
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

          if (updateError) {
            console.error('Profile update error after duplicate key:', updateError);
            // If auth user was created, clean it up
            if (isNewUser) {
              try {
                await supabase.auth.admin.deleteUser(userId);
                console.log('Cleaned up auth user after profile update failure');
              } catch (cleanupError) {
                console.error('Failed to cleanup auth user:', cleanupError);
              }
            }
            
            return new Response(JSON.stringify({
              error: 'Failed to create or update influencer profile',
              details: `Profile with ID ${userId} already exists but update also failed: ${updateError.message}`,
              code: updateError.code
            }), {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          } else {
            console.log('Successfully updated existing profile after duplicate key error');
            profileError = null; // Clear error so we continue with success flow
          }
        }

        if (profileError) {
          console.error('Profile creation error:', profileError);
          console.error('Error code:', profileError.code);
          console.error('Error message:', profileError.message);
          console.error('Error details:', JSON.stringify(profileError, null, 2));
          console.error('Profile data attempted:', JSON.stringify(profileData, null, 2));
          
          // If auth user was created, clean it up
          if (isNewUser) {
            try {
              await supabase.auth.admin.deleteUser(userId);
              console.log('Cleaned up auth user after profile creation failure');
            } catch (cleanupError) {
              console.error('Failed to cleanup auth user:', cleanupError);
            }
          }
          
          // Check if error is due to missing column
          const errorMessage = profileError.message || '';
          const isColumnError = errorMessage.includes('column') && errorMessage.includes('does not exist');
          
          return new Response(JSON.stringify({
            error: 'Failed to create influencer profile',
            details: profileError.message,
            code: profileError.code,
            hint: isColumnError ? 'The commission_percentage column may not exist. Please run the migration: 20241206000000_add_influencer_commission_percentage.sql' : undefined
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } else {
          console.log('Profile created/updated successfully');
        }
      }
    }

    // Handle social links
    if (social_links && social_links.length > 0) {
      console.log('=== PROCESSING SOCIAL LINKS ===');
      
      try {
        // Delete existing social links if updating
        if (is_update) {
          const { error: deleteError } = await supabase
            .from('social_links')
            .delete()
            .eq('user_id', userId);

          if (deleteError) {
            console.warn('Failed to delete existing social links:', deleteError);
          }
        }

        // Create new social links
        const socialLinksData = social_links.map((link: any) => ({
          user_id: userId,
          platform_id: link.platform_id,
          handle: link.handle,
          profile_url: link.profile_url,
          created_at: new Date().toISOString()
        }));

        const { error: socialError } = await supabase
          .from('social_links')
          .insert(socialLinksData);

        if (socialError) {
          console.error('Social links creation error:', socialError);
          throw socialError;
        }

        console.log('Social links created successfully');
      } catch (socialError: any) {
        console.error('Failed to process social links:', socialError);
        // Don't fail the entire operation for social links
      }
    }

    // Handle media files
    if (media_files && media_files.length > 0) {
      console.log('=== PROCESSING MEDIA FILES ===');
      console.log('Media files received:', media_files);
      console.log('Media files count:', media_files.length);
      console.log('User ID for media:', userId);
      
      try {
        // First, check if the table exists
        console.log('Checking if influencer_media table exists...');
        const { data: tableCheck, error: tableError } = await supabase
          .from('influencer_media')
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.error('❌ Table check error - influencer_media table might not exist:', tableError);
          console.error('❌ Error details:', JSON.stringify(tableError, null, 2));
          
          if (tableError.message && tableError.message.includes('relation "influencer_media" does not exist')) {
            console.error('❌ CRITICAL: influencer_media table does not exist!');
            console.error('❌ Please run the create_influencer_media_table.sql script in your Supabase database');
            console.error('❌ Skipping media file processing due to missing table');
          } else {
            console.error('❌ Other table error, skipping media file processing');
          }
          return;
        }
        
        console.log('✅ Table check successful, influencer_media table exists');
        
        // Delete existing media if updating
        if (is_update) {
          console.log('Deleting existing media for user:', userId);
          const { error: deleteError } = await supabase
            .from('influencer_media')
            .delete()
            .eq('influencer_id', userId);

          if (deleteError) {
            console.warn('⚠️ Failed to delete existing media:', deleteError);
          } else {
            console.log('✅ Existing media deleted successfully');
          }
        }

        // Create media records
        console.log('Preparing media data for insertion...');
        const mediaData = media_files.map((media: any, index: number) => {
          console.log(`Processing media file ${index + 1}:`, media);
          return {
            influencer_id: userId,
            file_url: media.file_url,
            file_type: media.file_type || 'image',
            file_name: media.file_name,
            file_size: media.file_size || 0,
            mime_type: media.mime_type || 'image/jpeg',
            created_at: new Date().toISOString()
          };
        });

        console.log('✅ Prepared media data for insertion:', mediaData);
        console.log('Media data count:', mediaData.length);

        console.log('Inserting media records into database...');
        const { data: insertedMedia, error: mediaError } = await supabase
          .from('influencer_media')
          .insert(mediaData)
          .select();

        if (mediaError) {
          console.error('❌ Media creation error:', mediaError);
          console.error('❌ Error details:', JSON.stringify(mediaError, null, 2));
          console.error('❌ Media data that failed to insert:', mediaData);
          throw mediaError;
        }

        console.log('✅ Media files processed successfully:', insertedMedia);
        console.log('✅ Inserted media count:', insertedMedia?.length || 0);
      } catch (mediaError: any) {
        console.error('❌ Failed to process media files:', mediaError);
        console.error('❌ Error details:', JSON.stringify(mediaError, null, 2));
        console.error('❌ This error will not fail the entire operation');
        // Don't fail the entire operation for media files
      }
    } else {
      console.log('ℹ️ No media files to process');
    }

    // Create default wallet if new user
    if (isNewUser) {
      try {
        const { error: walletError } = await supabase
          .from('wallets')
          .insert({
            user_id: userId,
            balance: 0,
            currency: 'USD',
            created_at: new Date().toISOString()
          });

        if (walletError) {
          console.warn('Failed to create default wallet:', walletError);
        } else {
          console.log('Default wallet created successfully');
        }
      } catch (walletError: any) {
        console.warn('Failed to create default wallet:', walletError);
      }
    }

    console.log('=== SUCCESS ===');
    console.log('Influencer operation completed successfully');

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: userId,
        email,
        name,
        role: 'influencer',
        is_new: isNewUser
      },
      message: is_update ? 'Influencer updated successfully' : 'Influencer created successfully'
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('=== EDGE FUNCTION ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({
      error: error.message || 'Internal Server Error'
    }), {
      status: error.message?.includes('Unauthorized') ? 403 : 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}); 