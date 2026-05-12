// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const HESABE_MERCHANT_CODE = Deno.env.get('HESABE_MERCHANT_CODE') || '842217';
const HESABE_SECRET_KEY = Deno.env.get('HESABE_MERCHANT_SECRET_KEY') || 'PkW64zMe5NVdrlPVNnjo2Jy9nOb7v1Xg';
const HESABE_API_KEY = Deno.env.get('HESABE_API_KEY') || 'c333729b-d060-4b74-a49d-7686a8353481';
const HESABE_IV_KEY = Deno.env.get('HESABE_IV_KEY') || '5NVdrlPVNnjo2Jy9';
const HESABE_BASE_URL = 'https://api.hesabe.com';

async function aesEncrypt(plainText: string, key: string, iv: string): Promise<string> {
    const enc = new TextEncoder();
    const keyBytes = enc.encode(key.substring(0, 32));
    const ivBytes = enc.encode(iv.substring(0, 16));

    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ivBytes }, cryptoKey, enc.encode(plainText)
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function aesDecrypt(cipherText: string, key: string, iv: string): Promise<string> {
    const enc = new TextEncoder();
    const keyBytes = enc.encode(key.substring(0, 32));
    const ivBytes = enc.encode(iv.substring(0, 16));

    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']
    );
    const binaryStr = atob(cipherText.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, ''));
    const cipherBytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: ivBytes }, cryptoKey, cipherBytes
    );
    return new TextDecoder().decode(decrypted);
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        const { data: profile } = await supabase
            .from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') throw new Error('Admin access required');

        const url = new URL(req.url);
        const refundId = url.searchParams.get('refund_id');
        if (!refundId) throw new Error('refund_id is required');

        // Encrypt payload
        const payload = JSON.stringify({ merchantCode: HESABE_MERCHANT_CODE });
        const encryptedPayload = await aesEncrypt(payload, HESABE_SECRET_KEY, HESABE_IV_KEY);

        const hesabeResponse = await fetch(`${HESABE_BASE_URL}/payment/refund/${refundId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${HESABE_API_KEY}`,
                'Content-Type': 'application/json',
                'merchantCode': HESABE_MERCHANT_CODE,
                'data': encryptedPayload
            }
        });

        const rawData = await hesabeResponse.json();
        console.log('Hesabe refund details response:', JSON.stringify(rawData));

        let responseData = rawData;
        if (rawData.response && typeof rawData.response === 'string') {
            try {
                const decrypted = await aesDecrypt(rawData.response, HESABE_SECRET_KEY, HESABE_IV_KEY);
                responseData = JSON.parse(decrypted);
            } catch (_e) {
                responseData = rawData;
            }
        }

        return new Response(JSON.stringify({ success: true, data: responseData }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Error in hesabe-refund-details:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
