-- Legal and Support System Database Schema for Mashaheer Platform
-- This schema supports Legal Notices, Customer Support, and Help & Support features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Legal Notices Table
CREATE TABLE IF NOT EXISTS legal_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Contact Support Information Table
CREATE TABLE IF NOT EXISTS contact_support_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    contact_type VARCHAR(100) NOT NULL, -- 'email', 'phone', 'chat', 'social', 'hours'
    priority INTEGER DEFAULT 1, -- 1=highest, 5=lowest
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Help Sections Table
CREATE TABLE IF NOT EXISTS help_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- FAQ Items Table
CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    assigned_to UUID REFERENCES profiles(id),
    response_count INTEGER DEFAULT 0,
    last_response_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Ticket Responses Table
CREATE TABLE IF NOT EXISTS support_ticket_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES profiles(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal notes vs user-visible responses
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Categories Table
CREATE TABLE IF NOT EXISTS support_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20) DEFAULT '#1890ff',
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default support categories
INSERT INTO support_categories (name, description, icon, color, order_index) VALUES
('technical', 'Technical Issues', 'tool', '#ff4d4f', 1),
('account', 'Account Management', 'user', '#1890ff', 2),
('payment', 'Payment & Billing', 'credit-card', '#52c41a', 3),
('campaign', 'Campaign Support', 'rocket', '#722ed1', 4),
('feature', 'Feature Requests', 'bulb', '#fa8c16', 5),
('general', 'General Inquiry', 'question-circle', '#13c2c2', 6),
('safety', 'Safety & Security', 'shield', '#eb2f96', 7),
('getting-started', 'Getting Started', 'play-circle', '#52c41a', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert default legal notices
INSERT INTO legal_notices (title, content, category) VALUES
('Copyright Notice', '
<h3>Copyright Information</h3>
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
<p>We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA).</p>
', 'copyright'),

('Legal Disclaimer', '
<h3>General Disclaimer</h3>
<p>The information provided on this platform is for general informational purposes only. While we strive to keep the information accurate and up-to-date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the platform or the information contained on it.</p>

<h4>No Professional Advice</h4>
<p>Any content or information provided should not be construed as professional advice. Users should consult with appropriate professionals for specific advice relevant to their circumstances.</p>

<h4>Limitation of Liability</h4>
<p>In no event shall Mashaheer be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with the use of this platform.</p>

<h4>Third-Party Content</h4>
<p>This platform may contain links to third-party websites or content. We do not endorse or assume responsibility for the content of such third-party sites.</p>
', 'disclaimer'),

('Governing Law', '
<h3>Jurisdiction and Governing Law</h3>
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
<p>These legal notices may be updated from time to time. Users are encouraged to review them periodically for any changes.</p>
', 'governing-law')
ON CONFLICT DO NOTHING;

-- Insert default contact support information
INSERT INTO contact_support_info (title, content, contact_type, priority) VALUES
('Email Support', '
<h4>📧 Email Support</h4>
<p><strong>General Support:</strong> support@mashaheer.com</p>
<p><strong>Technical Issues:</strong> tech@mashaheer.com</p>
<p><strong>Billing Questions:</strong> billing@mashaheer.com</p>
<p><strong>Business Inquiries:</strong> business@mashaheer.com</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Response time: Within 24 hours</p>
', 'email', 1),

('Phone Support', '
<h4>📞 Phone Support</h4>
<p><strong>Support Line:</strong> +1 (555) 123-4567</p>
<p><strong>Business Hours:</strong> Mon-Fri, 9 AM - 6 PM EST</p>
<p><strong>Emergency Line:</strong> +1 (555) 123-4568</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Available for urgent issues</p>
', 'phone', 2),

('Live Chat', '
<h4>💬 Live Chat</h4>
<p><strong>Platform Chat:</strong> Available in-app</p>
<p><strong>Website Chat:</strong> Click chat widget</p>
<p><strong>Response Time:</strong> Usually within 5 minutes</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Best for quick questions</p>
', 'chat', 3),

('Social Media', '
<h4>📱 Social Media</h4>
<p><strong>Twitter:</strong> @MashaheerSupport</p>
<p><strong>Facebook:</strong> Mashaheer Official</p>
<p><strong>LinkedIn:</strong> Mashaheer Company</p>
<p style="margin-top: 10px; font-size: 14px; color: #666;">Follow for updates and tips</p>
', 'social', 4)
ON CONFLICT DO NOTHING;

-- Insert default help sections
INSERT INTO help_sections (title, content, category, order_index) VALUES
('Getting Started Guide', '
<h3>Welcome to Mashaheer!</h3>
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
</ul>
', 'getting-started', 1),

('Account Management', '
<h3>Managing Your Account</h3>
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
</ul>
', 'account', 2)
ON CONFLICT DO NOTHING;

-- Insert default FAQ items
INSERT INTO faq_items (question, answer, category, tags, order_index) VALUES
('How do I create my first campaign?', 'To create your first campaign, go to the "Campaigns" section in your dashboard, click "Create New Campaign", fill out the campaign brief with details about your goals, target audience, and budget, then publish it to start receiving applications from influencers.', 'campaigns', ARRAY['campaign', 'getting-started', 'brand'], 1),

('What are the platform fees?', 'Our platform charges a 10% commission on successful campaigns, plus standard payment processing fees (2.9% for credit cards). There are no setup fees or monthly charges for basic accounts.', 'payments', ARRAY['fees', 'billing', 'commission'], 2),

('How do I verify my influencer account?', 'To verify your influencer account, complete your profile with accurate information, connect your social media accounts, upload portfolio examples, and submit verification documents. Our team will review your application within 2-3 business days.', 'account', ARRAY['verification', 'influencer', 'account'], 3),

('How long does payment processing take?', 'For influencers, payments are processed weekly on Fridays for completed campaigns. For brands, payments are processed immediately upon campaign approval. Bank transfers may take 1-3 business days to appear in your account.', 'payments', ARRAY['payment', 'processing', 'timeline'], 4),

('How do I reset my password?', 'Click "Forgot Password" on the login page, enter your email address, and check your inbox for password reset instructions. If you don''t receive the email, check your spam folder or contact support.', 'technical', ARRAY['password', 'reset', 'login'], 5)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_legal_notices_category ON legal_notices(category);
CREATE INDEX IF NOT EXISTS idx_legal_notices_active ON legal_notices(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_support_type ON contact_support_info(contact_type);
CREATE INDEX IF NOT EXISTS idx_contact_support_active ON contact_support_info(is_active);
CREATE INDEX IF NOT EXISTS idx_help_sections_category ON help_sections(category);
CREATE INDEX IF NOT EXISTS idx_help_sections_active ON help_sections(is_active);
CREATE INDEX IF NOT EXISTS idx_help_sections_order ON help_sections(order_index);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_items_active ON faq_items(is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_tags ON faq_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faq_items_order ON faq_items(order_index);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_responses_ticket ON support_ticket_responses(ticket_id);

-- Create RLS policies
ALTER TABLE legal_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_support_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;

-- Legal notices policies (public read, admin write)
CREATE POLICY "Legal notices are viewable by everyone" ON legal_notices
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage legal notices" ON legal_notices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Contact support info policies (public read, admin write)
CREATE POLICY "Contact support info is viewable by everyone" ON contact_support_info
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage contact support info" ON contact_support_info
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Help sections policies (public read, admin write)
CREATE POLICY "Help sections are viewable by everyone" ON help_sections
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage help sections" ON help_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- FAQ items policies (public read, admin write)
CREATE POLICY "FAQ items are viewable by everyone" ON faq_items
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage FAQ items" ON faq_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Support tickets policies (users can manage their own, admins can see all)
CREATE POLICY "Users can view their own support tickets" ON support_tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create support tickets" ON support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own support tickets" ON support_tickets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all support tickets" ON support_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Support ticket responses policies
CREATE POLICY "Users can view responses to their tickets" ON support_ticket_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = support_ticket_responses.ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create responses to their tickets" ON support_ticket_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = support_ticket_responses.ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all ticket responses" ON support_ticket_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Support categories policies (public read, admin write)
CREATE POLICY "Support categories are viewable by everyone" ON support_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage support categories" ON support_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create functions for automatic ticket numbering
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'TKT-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('ticket_sequence')::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_sequence START 1;

-- Create trigger for automatic ticket numbering
CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_legal_notices_updated_at
    BEFORE UPDATE ON legal_notices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_support_info_updated_at
    BEFORE UPDATE ON contact_support_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_sections_updated_at
    BEFORE UPDATE ON help_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at
    BEFORE UPDATE ON faq_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
