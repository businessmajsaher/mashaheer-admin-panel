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
        status,
        booking_id,
        booking:bookings!payments_booking_id_fkey(
          id,
          is_published,
          service_id
        )
      `);

    if (error) {
        console.error(error);
    } else {
        console.log("Raw payments:", JSON.stringify(data, null, 2));
    }
}
run();
