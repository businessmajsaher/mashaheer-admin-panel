import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase
        .from('payments')
        .select(`
        id,
        booking_id,
        payee_id,
        amount,
        currency,
        status,
        paid_at,
        created_at,
        transaction_reference,
        is_settled,
        settled_at,
        payer:profiles!payments_payer_id_fkey(id, name, email),
        payee:profiles!payments_payee_id_fkey(id, name, email, commission_percentage),
        booking:bookings!payments_booking_id_fkey(
          id,
          is_published,
          service_id,
          service:services!bookings_service_id_fkey(
            title,
            service_type,
            price,
            primary_influencer_id,
            invited_influencer_id,
            primary_influencer_earnings_percentage,
            invited_influencer_earnings_percentage
          )
        )
      `)
        .not('payee_id', 'is', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("Success! Fetched", data.length, "rows.");
    }
}
run();
