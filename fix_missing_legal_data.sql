-- Seed missing data for Contact Support and Terms of Service

-- 1. Insert Contact Support Info (if missing)
INSERT INTO contact_support_info (title, content, contact_type, priority) 
SELECT 'Email Support', '
<h4>📧 Email Support</h4>
<p><strong>General Support:</strong> support@mashaheer.com</p>
<p><strong>Technical Issues:</strong> tech@mashaheer.com</p>
<p><strong>Billing Questions:</strong> billing@mashaheer.com</p>
<p><strong>Business Inquiries:</strong> business@mashaheer.com</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Response time: Within 24 hours</p>
', 'email', 1
WHERE NOT EXISTS (SELECT 1 FROM contact_support_info WHERE contact_type = 'email');

INSERT INTO contact_support_info (title, content, contact_type, priority) 
SELECT 'Phone Support', '
<h4>📞 Phone Support</h4>
<p><strong>Support Line:</strong> +1 (555) 123-4567</p>
<p><strong>Business Hours:</strong> Mon-Fri, 9 AM - 6 PM EST</p>
<p><strong>Emergency Line:</strong> +1 (555) 123-4568</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Available for urgent issues</p>
', 'phone', 2
WHERE NOT EXISTS (SELECT 1 FROM contact_support_info WHERE contact_type = 'phone');

INSERT INTO contact_support_info (title, content, contact_type, priority) 
SELECT 'Live Chat', '
<h4>💬 Live Chat</h4>
<p><strong>Platform Chat:</strong> Available in-app</p>
<p><strong>Website Chat:</strong> Click chat widget</p>
<p><strong>Response Time:</strong> Usually within 5 minutes</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Best for quick questions</p>
', 'chat', 3
WHERE NOT EXISTS (SELECT 1 FROM contact_support_info WHERE contact_type = 'chat');

INSERT INTO contact_support_info (title, content, contact_type, priority) 
SELECT 'Social Media', '
<h4>📱 Social Media</h4>
<p><strong>Twitter:</strong> @MashaheerSupport</p>
<p><strong>Facebook:</strong> Mashaheer Official</p>
<p><strong>LinkedIn:</strong> Mashaheer Company</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Follow for updates and tips</p>
', 'social', 4
WHERE NOT EXISTS (SELECT 1 FROM contact_support_info WHERE contact_type = 'social');


-- 2. Insert Terms of Service (if missing)
-- Note: 'legal_notices' table holds Terms of Service with category 'terms-of-service'
INSERT INTO legal_notices (title, content, category, order_index)
SELECT 'User Agreement', '
<h3>1. Acceptance of Terms</h3>
<p>By accessing and using the Mashaheer platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

<h3>2. User Accounts</h3>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify Mashaheer of any unauthorized use of your account.</p>

<h3>3. Platform Usage</h3>
<p>You agree to use the platform only for lawful purposes and in accordance with these Terms. You shall not:</p>
<ul>
    <li>Violate any applicable laws or regulations</li>
    <li>Infringe upon the intellectual property rights of others</li>
    <li>Transmit any harmful code or malware</li>
    <li>Engage in any fraudulent activity</li>
</ul>
', 'terms-of-service', 1
WHERE NOT EXISTS (SELECT 1 FROM legal_notices WHERE category = 'terms-of-service' AND title = 'User Agreement');

INSERT INTO legal_notices (title, content, category, order_index)
SELECT 'Payment Terms', '
<h3>4. Payments and Fees</h3>
<p>Influencers are paid for completed campaigns in accordance with the agreed-upon rates. Mashaheer charges a platform fee on all successful transactions.</p>

<h3>5. Cancellations and Refunds</h3>
<p>Cancellation policies vary by campaign status. Please refer to our Refund Policy for detailed information on cancellations and refunds.</p>

<h3>6. Taxes</h3>
<p>Users are solely responsible for determining and paying any applicable taxes resulting from their use of the platform.</p>
', 'terms-of-service', 2
WHERE NOT EXISTS (SELECT 1 FROM legal_notices WHERE category = 'terms-of-service' AND title = 'Payment Terms');

INSERT INTO legal_notices (title, content, category, order_index)
SELECT 'Content Policy', '
<h3>7. Content Guidelines</h3>
<p>All content posted on Mashaheer must comply with our Community Guidelines. We reserve the right to remove any content that violates these guidelines or is deemed inappropriate.</p>

<h3>8. Intellectual Property</h3>
<p>Users retain ownership of the content they create. However, by posting content, users grant Mashaheer a non-exclusive license to use, display, and distribute such content for platform purposes.</p>
', 'terms-of-service', 3
WHERE NOT EXISTS (SELECT 1 FROM legal_notices WHERE category = 'terms-of-service' AND title = 'Content Policy');
