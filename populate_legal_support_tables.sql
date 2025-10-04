-- Populate Legal & Support Tables with Mock Data
-- Run this after creating the tables with legal_support_supabase_tables.sql

-- Clear existing data (optional - remove if you want to keep existing data)
TRUNCATE TABLE support_ticket_responses CASCADE;
TRUNCATE TABLE support_tickets CASCADE;
TRUNCATE TABLE faq_items CASCADE;
TRUNCATE TABLE help_sections CASCADE;
TRUNCATE TABLE contact_support_info CASCADE;
TRUNCATE TABLE legal_notices CASCADE;

-- Reset sequences
ALTER SEQUENCE ticket_sequence RESTART WITH 1;

-- Insert Legal Notices
INSERT INTO legal_notices (id, title, content, category, is_active, version, last_updated, created_at, updated_by) VALUES
(
  uuid_generate_v4(),
  'Copyright Notice',
  '<h3>Copyright Information</h3>
<p>© 2024 Mashaheer. All rights reserved.</p>
<p>This website and its content are protected by copyright laws. The content includes but is not limited to:</p>
<ul>
    <li>Text, graphics, logos, and images</li>
    <li>Software and applications</li>
    <li>Audio and video content</li>
    <li>Database and data collections</li>
</ul>
<h4>Usage Rights</h4>
<p>Users may not reproduce, distribute, or modify any content without explicit written permission from Mashaheer.</p>
<h4>DMCA Compliance</h4>
<p>We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA).</p>',
  'copyright',
  true,
  1,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'Legal Disclaimer',
  '<h3>General Disclaimer</h3>
<p>The information provided on this platform is for general informational purposes only. While we strive to keep the information accurate and up-to-date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the platform or the information contained on it.</p>

<h4>No Professional Advice</h4>
<p>Any content or information provided should not be construed as professional advice. Users should consult with appropriate professionals for specific advice relevant to their circumstances.</p>

<h4>Limitation of Liability</h4>
<p>In no event shall Mashaheer be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with the use of this platform.</p>

<h4>Third-Party Content</h4>
<p>This platform may contain links to third-party websites or content. We do not endorse or assume responsibility for the content of such third-party sites.</p>',
  'disclaimer',
  true,
  1,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'Governing Law',
  '<h3>Jurisdiction and Governing Law</h3>
<p>These legal notices are governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to conflict of law principles.</p>

<h4>Dispute Resolution</h4>
<p>Any disputes arising from these notices or the use of this platform shall be resolved through:</p>
<ul>
    <li>Good faith negotiations</li>
    <li>Mediation (if negotiations fail)</li>
    <li>Binding arbitration (if mediation fails)</li>
</ul>

<h4>Severability</h4>
<p>If any provision of these legal notices is found to be unenforceable or invalid, the remaining provisions shall continue to be valid and enforceable.</p>

<h4>Updates</h4>
<p>These legal notices may be updated from time to time. Users are encouraged to review them periodically for any changes.</p>',
  'governing-law',
  true,
  1,
  NOW(),
  NOW(),
  NULL
);

-- Insert Contact Support Information
INSERT INTO contact_support_info (id, title, content, contact_type, priority, is_active, last_updated, created_at, updated_by) VALUES
(
  uuid_generate_v4(),
  'Email Support',
  '<h4>📧 Email Support</h4>
<p><strong>General Support:</strong> support@mashaheer.com</p>
<p><strong>Technical Issues:</strong> tech@mashaheer.com</p>
<p><strong>Billing Questions:</strong> billing@mashaheer.com</p>
<p><strong>Business Inquiries:</strong> business@mashaheer.com</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Response time: Within 24 hours</p>',
  'email',
  1,
  true,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'Phone Support',
  '<h4>📞 Phone Support</h4>
<p><strong>Support Line:</strong> +1 (555) 123-4567</p>
<p><strong>Business Hours:</strong> Mon-Fri, 9 AM - 6 PM EST</p>
<p><strong>Emergency Line:</strong> +1 (555) 123-4568</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Available for urgent issues</p>',
  'phone',
  2,
  true,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'Live Chat',
  '<h4>💬 Live Chat</h4>
<p><strong>Platform Chat:</strong> Available in-app</p>
<p><strong>Website Chat:</strong> Click chat widget</p>
<p><strong>Response Time:</strong> Usually within 5 minutes</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Best for quick questions</p>',
  'chat',
  3,
  true,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'Social Media',
  '<h4>📱 Social Media</h4>
<p><strong>Twitter:</strong> @MashaheerSupport</p>
<p><strong>Facebook:</strong> Mashaheer Official</p>
<p><strong>LinkedIn:</strong> Mashaheer Company</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Follow for updates and tips</p>',
  'social',
  4,
  true,
  NOW(),
  NOW(),
  NULL
);

-- Insert Help Sections
INSERT INTO help_sections (id, title, content, category, order_index, is_active, last_updated, created_at, updated_by) VALUES
(
  uuid_generate_v4(),
  'Getting Started Guide',
  '<h3>Welcome to Mashaheer!</h3>
<p>This comprehensive guide will help you get started on our influencer marketing platform.</p>

<h4>🚀 Quick Start Steps</h4>
<ol>
    <li><strong>Create Your Account:</strong> Sign up with your email and verify your account</li>
    <li><strong>Complete Your Profile:</strong> Add your bio, profile picture, and social media links</li>
    <li><strong>Choose Your Role:</strong> Select whether you''re an influencer or brand</li>
    <li><strong>Verify Your Identity:</strong> Complete the verification process</li>
    <li><strong>Start Exploring:</strong> Browse campaigns or create your first campaign</li>
</ol>

<h4>👤 For Influencers</h4>
<ul>
    <li>Set up your creator profile with portfolio examples</li>
    <li>Connect your social media accounts</li>
    <li>Set your rates and availability</li>
    <li>Browse and apply to relevant campaigns</li>
    <li>Manage your bookings and deliverables</li>
</ul>

<h4>🏢 For Brands</h4>
<ul>
    <li>Create your brand profile and company information</li>
    <li>Define your campaign goals and target audience</li>
    <li>Set your budget and campaign parameters</li>
    <li>Discover and connect with suitable influencers</li>
    <li>Manage campaigns and track performance</li>
</ul>',
  'getting-started',
  1,
  true,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'Account Management',
  '<h3>Managing Your Account</h3>
<p>Learn how to effectively manage your Mashaheer account and profile.</p>

<h4>🔧 Profile Settings</h4>
<ul>
    <li><strong>Personal Information:</strong> Update your name, email, and contact details</li>
    <li><strong>Profile Picture:</strong> Upload and manage your profile photo</li>
    <li><strong>Bio and Description:</strong> Write compelling descriptions of yourself or your brand</li>
    <li><strong>Social Media Links:</strong> Connect your social media accounts</li>
    <li><strong>Portfolio:</strong> Upload examples of your work or brand content</li>
</ul>

<h4>🔐 Security Settings</h4>
<ul>
    <li><strong>Password Management:</strong> Change your password regularly</li>
    <li><strong>Two-Factor Authentication:</strong> Enable 2FA for enhanced security</li>
    <li><strong>Login Activity:</strong> Monitor your account access</li>
    <li><strong>Privacy Settings:</strong> Control who can see your information</li>
</ul>',
  'account',
  2,
  true,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'Payment & Billing Guide',
  '<h3>Understanding Payments and Billing</h3>
<p>Everything you need to know about payments, fees, and billing on our platform.</p>

<h4>💰 Payment Methods</h4>
<ul>
    <li><strong>Credit/Debit Cards:</strong> Visa, Mastercard, American Express</li>
    <li><strong>Bank Transfer:</strong> Direct bank-to-bank transfers</li>
    <li><strong>Digital Wallets:</strong> PayPal, Apple Pay, Google Pay</li>
    <li><strong>Cryptocurrency:</strong> Bitcoin, Ethereum (coming soon)</li>
</ul>

<h4>💳 For Brands</h4>
<ul>
    <li><strong>Campaign Payments:</strong> Pay for influencer services</li>
    <li><strong>Escrow System:</strong> Secure payment protection</li>
    <li><strong>Milestone Payments:</strong> Pay based on deliverables</li>
    <li><strong>Refunds:</strong> Request refunds for unsatisfactory work</li>
</ul>

<h4>💸 For Influencers</h4>
<ul>
    <li><strong>Payout Schedule:</strong> Weekly or monthly payouts</li>
    <li><strong>Payment Threshold:</strong> Minimum amount before payout</li>
    <li><strong>Tax Information:</strong> Provide tax details for reporting</li>
    <li><strong>Payment History:</strong> Track all your earnings</li>
</ul>',
  'payments',
  3,
  true,
  NOW(),
  NOW(),
  NULL
);

-- Insert FAQ Items
INSERT INTO faq_items (id, question, answer, category, tags, order_index, is_active, view_count, helpful_count, last_updated, created_at, updated_by) VALUES
(
  uuid_generate_v4(),
  'How do I create my first campaign?',
  'To create your first campaign, go to the "Campaigns" section in your dashboard, click "Create New Campaign", fill out the campaign brief with details about your goals, target audience, and budget, then publish it to start receiving applications from influencers.',
  'campaigns',
  ARRAY['campaign', 'getting-started', 'brand'],
  1,
  true,
  156,
  23,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'What are the platform fees?',
  'Our platform charges a 10% commission on successful campaigns, plus standard payment processing fees (2.9% for credit cards). There are no setup fees or monthly charges for basic accounts.',
  'payments',
  ARRAY['fees', 'billing', 'commission'],
  2,
  true,
  234,
  45,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'How do I verify my influencer account?',
  'To verify your influencer account, complete your profile with accurate information, connect your social media accounts, upload portfolio examples, and submit verification documents. Our team will review your application within 2-3 business days.',
  'account',
  ARRAY['verification', 'influencer', 'account'],
  3,
  true,
  189,
  34,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'How long does payment processing take?',
  'For influencers, payments are processed weekly on Fridays for completed campaigns. For brands, payments are processed immediately upon campaign approval. Bank transfers may take 1-3 business days to appear in your account.',
  'payments',
  ARRAY['payment', 'processing', 'timeline'],
  4,
  true,
  167,
  28,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'How do I reset my password?',
  'Click "Forgot Password" on the login page, enter your email address, and check your inbox for password reset instructions. If you don''t receive the email, check your spam folder or contact support.',
  'technical',
  ARRAY['password', 'reset', 'login'],
  5,
  true,
  298,
  67,
  NOW(),
  NOW(),
  NULL
),
(
  uuid_generate_v4(),
  'What file formats are supported for portfolio uploads?',
  'We support common image formats (JPG, PNG, GIF), video formats (MP4, MOV, AVI), and document formats (PDF). Maximum file size is 100MB for images and 500MB for videos.',
  'technical',
  ARRAY['upload', 'formats', 'portfolio'],
  6,
  true,
  145,
  19,
  NOW(),
  NOW(),
  NULL
);

-- Temporarily make user_id nullable for data insertion
ALTER TABLE support_tickets ALTER COLUMN user_id DROP NOT NULL;

-- Insert Support Tickets with temporary IDs for responses
WITH ticket_inserts AS (
  INSERT INTO support_tickets (id, ticket_number, user_id, subject, message, category, priority, status, assigned_to, response_count, last_response_at, created_at, updated_at) VALUES
  (
    uuid_generate_v4(),
    'TKT-2024-000001',
    NULL::uuid,
    'Unable to upload profile picture',
    'I''m having trouble uploading my profile picture. The upload keeps failing with an error message.',
    'technical',
    'medium',
    'open',
    NULL::uuid,
    0,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    uuid_generate_v4(),
    'TKT-2024-000002',
    NULL::uuid,
    'Payment not processed',
    'My payment for a campaign was not processed. The money was deducted from my account but the campaign shows as unpaid.',
    'payment',
    'high',
    'in_progress',
    NULL::uuid,
    2,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    uuid_generate_v4(),
    'TKT-2024-000003',
    NULL::uuid,
    'Account verification taking too long',
    'I submitted my verification documents 5 days ago but haven''t heard back yet. How long does verification usually take?',
    'account',
    'medium',
    'resolved',
    NULL::uuid,
    3,
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '6 hours'
  )
  RETURNING id, ticket_number
)
-- Insert Support Ticket Responses using the ticket IDs
INSERT INTO support_ticket_responses (id, ticket_id, responder_id, message, is_internal, attachments, created_at)
SELECT 
  uuid_generate_v4(),
  t.id,
  NULL::uuid,
  'Thank you for contacting us. I''ve received your ticket and I''m looking into this payment issue. I''ll get back to you within 24 hours with an update.',
  false,
  ARRAY[]::text[],
  NOW() - INTERVAL '2 days'
FROM ticket_inserts t WHERE t.ticket_number = 'TKT-2024-000002'

UNION ALL

SELECT 
  uuid_generate_v4(),
  t.id,
  NULL::uuid,
  'Thank you for the quick response. I''ve attached my bank statement showing the transaction. Please let me know if you need any additional information.',
  false,
  ARRAY['bank_statement.pdf'],
  NOW() - INTERVAL '1 day'
FROM ticket_inserts t WHERE t.ticket_number = 'TKT-2024-000002'

UNION ALL

SELECT 
  uuid_generate_v4(),
  t.id,
  NULL::uuid,
  'Your account has been successfully verified! You should now have access to all platform features. Thank you for your patience.',
  false,
  ARRAY[]::text[],
  NOW() - INTERVAL '6 hours'
FROM ticket_inserts t WHERE t.ticket_number = 'TKT-2024-000003';

-- Verify the data was inserted
SELECT 'Legal Notices' as table_name, COUNT(*) as record_count FROM legal_notices
UNION ALL
SELECT 'Contact Support Info' as table_name, COUNT(*) as record_count FROM contact_support_info
UNION ALL
SELECT 'Help Sections' as table_name, COUNT(*) as record_count FROM help_sections
UNION ALL
SELECT 'FAQ Items' as table_name, COUNT(*) as record_count FROM faq_items
UNION ALL
SELECT 'Support Tickets' as table_name, COUNT(*) as record_count FROM support_tickets
UNION ALL
SELECT 'Support Ticket Responses' as table_name, COUNT(*) as record_count FROM support_ticket_responses;

-- Show sample data
SELECT 'Sample Legal Notices:' as info;
SELECT id, title, category FROM legal_notices LIMIT 3;

SELECT 'Sample FAQ Items:' as info;
SELECT id, question, category, view_count, helpful_count FROM faq_items LIMIT 3;

SELECT 'Sample Support Tickets:' as info;
SELECT ticket_number, subject, status, priority FROM support_tickets LIMIT 3;

-- Note: user_id column is now nullable for demo data
-- In production, you may want to restore the NOT NULL constraint:
-- ALTER TABLE support_tickets ALTER COLUMN user_id SET NOT NULL;
