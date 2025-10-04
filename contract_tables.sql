-- Contract Templates Table
-- This table stores reusable contract templates with variables
CREATE TABLE contract_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  template_type VARCHAR(100) NOT NULL CHECK (template_type IN ('collaboration', 'content_creation', 'ambassador', 'sponsorship', 'partnership')),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names used in the template
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Instances Table
-- This table stores specific contract instances generated from templates
CREATE TABLE contract_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES contract_templates(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'completed', 'cancelled', 'expired')),
  variables JSONB DEFAULT '{}'::jsonb, -- Key-value pairs for template variables
  generated_content TEXT, -- The final contract content with variables replaced
  signed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Signatures Table (Optional - for digital signatures)
CREATE TABLE contract_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_instance_id UUID REFERENCES contract_instances(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  signer_type VARCHAR(20) CHECK (signer_type IN ('customer', 'influencer', 'admin')),
  signature_data TEXT, -- Base64 encoded signature or signature hash
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Contract Amendments Table (Optional - for contract modifications)
CREATE TABLE contract_amendments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_instance_id UUID REFERENCES contract_instances(id) ON DELETE CASCADE,
  amendment_type VARCHAR(50) CHECK (amendment_type IN ('extension', 'modification', 'termination', 'addendum')),
  description TEXT NOT NULL,
  changes JSONB DEFAULT '{}'::jsonb, -- Details of what was changed
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_contract_templates_type ON contract_templates(template_type);
CREATE INDEX idx_contract_templates_active ON contract_templates(is_active);
CREATE INDEX idx_contract_instances_template ON contract_instances(template_id);
CREATE INDEX idx_contract_instances_customer ON contract_instances(customer_id);
CREATE INDEX idx_contract_instances_influencer ON contract_instances(influencer_id);
CREATE INDEX idx_contract_instances_status ON contract_instances(status);
CREATE INDEX idx_contract_instances_created ON contract_instances(created_at);
CREATE INDEX idx_contract_signatures_contract ON contract_signatures(contract_instance_id);
CREATE INDEX idx_contract_signatures_signer ON contract_signatures(signer_id);

-- Row Level Security (RLS) Policies
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_templates (admin only)
CREATE POLICY "Admins can manage contract templates" ON contract_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for contract_instances
CREATE POLICY "Users can view their own contracts" ON contract_instances
  FOR SELECT USING (
    customer_id = auth.uid() OR 
    influencer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all contracts" ON contract_instances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for contract_signatures
CREATE POLICY "Users can view signatures for their contracts" ON contract_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contract_instances 
      WHERE contract_instances.id = contract_signatures.contract_instance_id
      AND (contract_instances.customer_id = auth.uid() OR contract_instances.influencer_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Insert some sample contract templates
INSERT INTO contract_templates (title, template_type, content, variables) VALUES
(
  'Influencer Collaboration Agreement',
  'collaboration',
  'This agreement is between {{brand_name}} and {{influencer_name}} for a collaboration on {{platform}} starting on {{start_date}} and ending on {{end_date}}. The compensation will be {{amount}} USD. The influencer agrees to create {{content_count}} pieces of content and maintain {{engagement_rate}}% engagement rate.',
  '["brand_name", "influencer_name", "platform", "start_date", "end_date", "amount", "content_count", "engagement_rate"]'::jsonb
),
(
  'Content Creation Contract',
  'content_creation',
  '{{influencer_name}} agrees to create {{content_type}} content for {{brand_name}} on {{platform}}. The content must be delivered by {{delivery_date}} and will be compensated with {{amount}} USD. The content should include {{requirements}} and follow {{guidelines}}.',
  '["influencer_name", "content_type", "brand_name", "platform", "delivery_date", "amount", "requirements", "guidelines"]'::jsonb
),
(
  'Brand Ambassador Agreement',
  'ambassador',
  '{{influencer_name}} will serve as a brand ambassador for {{brand_name}} for a period of {{duration}} months. This includes {{requirements}} and compensation of {{amount}} USD per month. The ambassador must maintain a positive brand image and participate in {{events_count}} brand events.',
  '["influencer_name", "brand_name", "duration", "requirements", "amount", "events_count"]'::jsonb
),
(
  'Sponsored Post Agreement',
  'sponsorship',
  '{{influencer_name}} agrees to create a sponsored post for {{brand_name}} on {{platform}} with {{follower_count}} followers. The post must include {{hashtags}} and be published by {{publish_date}}. Compensation: {{amount}} USD.',
  '["influencer_name", "brand_name", "platform", "follower_count", "hashtags", "publish_date", "amount"]'::jsonb
);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_contract_templates_updated_at 
  BEFORE UPDATE ON contract_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_instances_updated_at 
  BEFORE UPDATE ON contract_instances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
