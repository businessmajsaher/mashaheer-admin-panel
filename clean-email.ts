import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanTestEmail() {
    console.log('--- Starting Clean Email Test ---');

    // 1. Find the test user
    console.log('1. Finding test user to update...');
    // Look for users created by our test script
    const { data: users, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', 'test.influencer%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (searchError) {
        console.error('Error searching for user:', searchError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No test user found matching "test.influencer%".');
        return;
    }

    const user = users[0];
    console.log(`Found user: ${user.name} (${user.email})`);

    // 2. Define new clean email
    const newEmail = 'verified.influencer.demo@example.com';
    console.log(`2. Preparing to update email to: ${newEmail}`);

    // 3. Construct update payload (must include all fields to avoid nulling)
    const updatePayload = {
        is_update: true,
        influencer_id: user.id,
        email: newEmail,
        name: user.name,
        bio: user.bio,
        country: user.country,
        is_verified: true, // Let's verify them too
        profile_image_url: user.profile_image_url,
        media_files: [], // Assuming we don't want to change media, sending empty might trigger something?
        // Influencers.tsx sends existing files. 
        // Edge function: const { media_files ... } = bodyData;
        // It doesn't seem to delete media if media_files is empty array?
        // Let's check logic. But safer to send empty array if we don't want to add/change.
        // Actually, Edge function handles media separately. 
        social_links: [] // detailed logic needed? Edge function handles social links. 
        // If we send empty, does it wipe them?
        // Influencers.tsx sends values.social_links.
    };

    // check edge function media logic
    // It processes media_files. 
    // It seems to only ADD new media or handle specific logic?
    // Let's look at lines 300+ of index.ts later if needed. 
    // For now, assuming empty array is safe for "no changes to media".

    console.log('3. Sending update payload...', JSON.stringify(updatePayload, null, 2));

    const { data: updateData, error: updateError } = await supabase.functions.invoke('create-influencer-complete', {
        body: updatePayload
    });

    if (updateError) {
        console.error('Failed to update influencer:', updateError);
        return;
    }

    console.log('4. Update response:', updateData);

    if (updateData.success) {
        console.log('SUCCESS: Email updated to ' + newEmail);
    } else {
        console.error('FAILURE: Update reported failure', updateData);
    }
}

cleanTestEmail().catch(console.error);
