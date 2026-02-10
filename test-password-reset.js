#!/usr/bin/env node

/**
 * Test script for password reset functionality
 * 
 * Usage: node test-password-reset.js <email> [supabase-url] [service-role-key]
 */

const https = require('https');
const http = require('http');

async function testPasswordReset(email, supabaseUrl, serviceRoleKey) {
  const url = `${supabaseUrl}/functions/v1/password-reset`;
  
  const postData = JSON.stringify({
    email: email,
    redirect_url: 'https://your-domain.com/password-reset-callback.html'
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  };

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node test-password-reset.js <email> [supabase-url] [service-role-key]');
    console.log('');
    console.log('Example:');
    console.log('  node test-password-reset.js user@example.com https://your-project.supabase.co your-service-role-key');
    process.exit(1);
  }

  const email = args[0];
  const supabaseUrl = args[1] || process.env.SUPABASE_URL || 'https://your-project.supabase.co';
  const serviceRoleKey = args[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('Error: Service role key is required');
    console.log('You can provide it as:');
    console.log('  1. Third argument: node test-password-reset.js email url key');
    console.log('  2. Environment variable: SUPABASE_SERVICE_ROLE_KEY=your-key');
    process.exit(1);
  }

  console.log('Testing password reset functionality...');
  console.log(`Email: ${email}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Role Key: ${serviceRoleKey.substring(0, 20)}...`);
  console.log('');

  try {
    const result = await testPasswordReset(email, supabaseUrl, serviceRoleKey);
    
    console.log('Response Status:', result.status);
    console.log('Response Headers:', JSON.stringify(result.headers, null, 2));
    console.log('Response Data:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('');
      console.log('✅ Password reset test successful!');
      if (result.data.reset_link) {
        console.log(`Reset link: ${result.data.reset_link}`);
      }
    } else {
      console.log('');
      console.log('❌ Password reset test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing password reset:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testPasswordReset };

