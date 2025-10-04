import { 
  LegalNotice, 
  ContactSupportInfo, 
  HelpSection, 
  FAQItem, 
  SupportTicket, 
  SupportTicketResponse, 
  SupportCategory 
} from './legalSupportService';

// Mock data for Legal Notices
export const mockLegalNotices: LegalNotice[] = [
  {
    id: 'copyright',
    title: 'Copyright Notice',
    content: `
      <h3>Copyright Information</h3>
      <p>© ${new Date().getFullYear()} Mashaheer. All rights reserved.</p>
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
    `,
    category: 'copyright',
    is_active: true,
    version: 1,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'disclaimer',
    title: 'Legal Disclaimer',
    content: `
      <h3>General Disclaimer</h3>
      <p>The information provided on this platform is for general informational purposes only. While we strive to keep the information accurate and up-to-date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the platform or the information contained on it.</p>
      
      <h4>No Professional Advice</h4>
      <p>Any content or information provided should not be construed as professional advice. Users should consult with appropriate professionals for specific advice relevant to their circumstances.</p>
      
      <h4>Limitation of Liability</h4>
      <p>In no event shall Mashaheer be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with the use of this platform.</p>
      
      <h4>Third-Party Content</h4>
      <p>This platform may contain links to third-party websites or content. We do not endorse or assume responsibility for the content of such third-party sites.</p>
    `,
    category: 'disclaimer',
    is_active: true,
    version: 1,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    content: `
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
    `,
    category: 'governing-law',
    is_active: true,
    version: 1,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  }
];

// Mock data for Contact Support Info
export const mockContactSupportInfo: ContactSupportInfo[] = [
  {
    id: 'email-support',
    title: 'Email Support',
    content: `
      <h4>📧 Email Support</h4>
      <p><strong>General Support:</strong> support@mashaheer.com</p>
      <p><strong>Technical Issues:</strong> tech@mashaheer.com</p>
      <p><strong>Billing Questions:</strong> billing@mashaheer.com</p>
      <p><strong>Business Inquiries:</strong> business@mashaheer.com</p>
      <p style="margin-top: 10px; font-size: 14px; color: #666;">Response time: Within 24 hours</p>
    `,
    contact_type: 'email',
    priority: 1,
    is_active: true,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'phone-support',
    title: 'Phone Support',
    content: `
      <h4>📞 Phone Support</h4>
      <p><strong>Support Line:</strong> +1 (555) 123-4567</p>
      <p><strong>Business Hours:</strong> Mon-Fri, 9 AM - 6 PM EST</p>
      <p><strong>Emergency Line:</strong> +1 (555) 123-4568</p>
      <p style="margin-top: 10px; font-size: 14px; color: #666;">Available for urgent issues</p>
    `,
    contact_type: 'phone',
    priority: 2,
    is_active: true,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'live-chat',
    title: 'Live Chat',
    content: `
      <h4>💬 Live Chat</h4>
      <p><strong>Platform Chat:</strong> Available in-app</p>
      <p><strong>Website Chat:</strong> Click chat widget</p>
      <p><strong>Response Time:</strong> Usually within 5 minutes</p>
      <p style="margin-top: 10px; font-size: 14px; color: #666;">Best for quick questions</p>
    `,
    contact_type: 'chat',
    priority: 3,
    is_active: true,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'social-media',
    title: 'Social Media',
    content: `
      <h4>📱 Social Media</h4>
      <p><strong>Twitter:</strong> @MashaheerSupport</p>
      <p><strong>Facebook:</strong> Mashaheer Official</p>
      <p><strong>LinkedIn:</strong> Mashaheer Company</p>
      <p style="margin-top: 10px; font-size: 14px; color: #666;">Follow for updates and tips</p>
    `,
    contact_type: 'social',
    priority: 4,
    is_active: true,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  }
];

// Mock data for Help Sections
export const mockHelpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started Guide',
    content: `
      <h3>Welcome to Mashaheer!</h3>
      <p>This comprehensive guide will help you get started on our influencer marketing platform.</p>
      
      <h4>🚀 Quick Start Steps</h4>
      <ol>
        <li><strong>Create Your Account:</strong> Sign up with your email and verify your account</li>
        <li><strong>Complete Your Profile:</strong> Add your bio, profile picture, and social media links</li>
        <li><strong>Choose Your Role:</strong> Select whether you're an influencer or brand</li>
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
    `,
    category: 'getting-started',
    order_index: 1,
    is_active: true,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'account-management',
    title: 'Account Management',
    content: `
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
    `,
    category: 'account',
    order_index: 2,
    is_active: true,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'payment-guide',
    title: 'Payment & Billing Guide',
    content: `
      <h3>Understanding Payments and Billing</h3>
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
      </ul>
    `,
    category: 'payments',
    order_index: 3,
    is_active: true,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  }
];

// Mock data for FAQ Items
export const mockFAQItems: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I create my first campaign?',
    answer: 'To create your first campaign, go to the "Campaigns" section in your dashboard, click "Create New Campaign", fill out the campaign brief with details about your goals, target audience, and budget, then publish it to start receiving applications from influencers.',
    category: 'campaigns',
    tags: ['campaign', 'getting-started', 'brand'],
    order_index: 1,
    is_active: true,
    view_count: 156,
    helpful_count: 23,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'faq-2',
    question: 'What are the platform fees?',
    answer: 'Our platform charges a 10% commission on successful campaigns, plus standard payment processing fees (2.9% for credit cards). There are no setup fees or monthly charges for basic accounts.',
    category: 'payments',
    tags: ['fees', 'billing', 'commission'],
    order_index: 2,
    is_active: true,
    view_count: 234,
    helpful_count: 45,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'faq-3',
    question: 'How do I verify my influencer account?',
    answer: 'To verify your influencer account, complete your profile with accurate information, connect your social media accounts, upload portfolio examples, and submit verification documents. Our team will review your application within 2-3 business days.',
    category: 'account',
    tags: ['verification', 'influencer', 'account'],
    order_index: 3,
    is_active: true,
    view_count: 189,
    helpful_count: 34,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'faq-4',
    question: 'How long does payment processing take?',
    answer: 'For influencers, payments are processed weekly on Fridays for completed campaigns. For brands, payments are processed immediately upon campaign approval. Bank transfers may take 1-3 business days to appear in your account.',
    category: 'payments',
    tags: ['payment', 'processing', 'timeline'],
    order_index: 4,
    is_active: true,
    view_count: 167,
    helpful_count: 28,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'faq-5',
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page, enter your email address, and check your inbox for password reset instructions. If you don\'t receive the email, check your spam folder or contact support.',
    category: 'technical',
    tags: ['password', 'reset', 'login'],
    order_index: 5,
    is_active: true,
    view_count: 298,
    helpful_count: 67,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  },
  {
    id: 'faq-6',
    question: 'What file formats are supported for portfolio uploads?',
    answer: 'We support common image formats (JPG, PNG, GIF), video formats (MP4, MOV, AVI), and document formats (PDF). Maximum file size is 100MB for images and 500MB for videos.',
    category: 'technical',
    tags: ['upload', 'formats', 'portfolio'],
    order_index: 6,
    is_active: true,
    view_count: 145,
    helpful_count: 19,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_by: 'admin'
  }
];

// Mock data for Support Categories
export const mockSupportCategories: SupportCategory[] = [
  {
    id: 'technical',
    name: 'technical',
    description: 'Technical Issues',
    icon: 'tool',
    color: '#ff4d4f',
    is_active: true,
    order_index: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'account',
    name: 'account',
    description: 'Account Management',
    icon: 'user',
    color: '#1890ff',
    is_active: true,
    order_index: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'payment',
    name: 'payment',
    description: 'Payment & Billing',
    icon: 'credit-card',
    color: '#52c41a',
    is_active: true,
    order_index: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 'campaign',
    name: 'campaign',
    description: 'Campaign Support',
    icon: 'rocket',
    color: '#722ed1',
    is_active: true,
    order_index: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 'general',
    name: 'general',
    description: 'General Inquiry',
    icon: 'question-circle',
    color: '#13c2c2',
    is_active: true,
    order_index: 5,
    created_at: new Date().toISOString()
  }
];

// Mock data for Support Tickets
export const mockSupportTickets: SupportTicket[] = [
  {
    id: 'ticket-1',
    ticket_number: 'TKT-2024-000001',
    user_id: 'user-1',
    subject: 'Unable to upload profile picture',
    message: 'I\'m having trouble uploading my profile picture. The upload keeps failing with an error message.',
    category: 'technical',
    priority: 'medium',
    status: 'open',
    response_count: 0,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ticket-2',
    ticket_number: 'TKT-2024-000002',
    user_id: 'user-2',
    subject: 'Payment not processed',
    message: 'My payment for a campaign was not processed. The money was deducted from my account but the campaign shows as unpaid.',
    category: 'payment',
    priority: 'high',
    status: 'in_progress',
    assigned_to: 'admin-1',
    response_count: 2,
    last_response_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ticket-3',
    ticket_number: 'TKT-2024-000003',
    user_id: 'user-3',
    subject: 'Account verification taking too long',
    message: 'I submitted my verification documents 5 days ago but haven\'t heard back yet. How long does verification usually take?',
    category: 'account',
    priority: 'medium',
    status: 'resolved',
    assigned_to: 'admin-2',
    response_count: 3,
    last_response_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// Mock data for Support Ticket Responses
export const mockSupportTicketResponses: SupportTicketResponse[] = [
  {
    id: 'response-1',
    ticket_id: 'ticket-2',
    responder_id: 'admin-1',
    message: 'Thank you for contacting us. I\'ve received your ticket and I\'m looking into this payment issue. I\'ll get back to you within 24 hours with an update.',
    is_internal: false,
    attachments: [],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'response-2',
    ticket_id: 'ticket-2',
    responder_id: 'user-2',
    message: 'Thank you for the quick response. I\'ve attached my bank statement showing the transaction. Please let me know if you need any additional information.',
    is_internal: false,
    attachments: ['bank_statement.pdf'],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'response-3',
    ticket_id: 'ticket-3',
    responder_id: 'admin-2',
    message: 'Your account has been successfully verified! You should now have access to all platform features. Thank you for your patience.',
    is_internal: false,
    attachments: [],
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// Mock service functions that simulate API calls
export const mockLegalNoticesService = {
  async getActiveNotices(): Promise<LegalNotice[]> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    return mockLegalNotices.filter(notice => notice.is_active);
  },

  async getAllNotices(): Promise<LegalNotice[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockLegalNotices;
  },

  async getNoticeById(id: string): Promise<LegalNotice | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockLegalNotices.find(notice => notice.id === id) || null;
  },

  async createNotice(notice: Omit<LegalNotice, 'id' | 'created_at' | 'last_updated'>): Promise<LegalNotice> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newNotice: LegalNotice = {
      ...notice,
      id: `notice-${Date.now()}`,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    mockLegalNotices.push(newNotice);
    return newNotice;
  },

  async updateNotice(id: string, updates: Partial<LegalNotice>): Promise<LegalNotice> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockLegalNotices.findIndex(notice => notice.id === id);
    if (index === -1) throw new Error('Notice not found');
    
    mockLegalNotices[index] = {
      ...mockLegalNotices[index],
      ...updates,
      last_updated: new Date().toISOString()
    };
    return mockLegalNotices[index];
  },

  async deleteNotice(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockLegalNotices.findIndex(notice => notice.id === id);
    if (index === -1) throw new Error('Notice not found');
    mockLegalNotices.splice(index, 1);
  }
};

export const mockContactSupportService = {
  async getActiveContactInfo(): Promise<ContactSupportInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockContactSupportInfo.filter(info => info.is_active);
  },

  async getAllContactInfo(): Promise<ContactSupportInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockContactSupportInfo;
  },

  async getContactInfoByType(type: string): Promise<ContactSupportInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockContactSupportInfo.filter(info => info.contact_type === type && info.is_active);
  },

  async createContactInfo(info: Omit<ContactSupportInfo, 'id' | 'created_at' | 'last_updated'>): Promise<ContactSupportInfo> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newInfo: ContactSupportInfo = {
      ...info,
      id: `contact-${Date.now()}`,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    mockContactSupportInfo.push(newInfo);
    return newInfo;
  },

  async updateContactInfo(id: string, updates: Partial<ContactSupportInfo>): Promise<ContactSupportInfo> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockContactSupportInfo.findIndex(info => info.id === id);
    if (index === -1) throw new Error('Contact info not found');
    
    mockContactSupportInfo[index] = {
      ...mockContactSupportInfo[index],
      ...updates,
      last_updated: new Date().toISOString()
    };
    return mockContactSupportInfo[index];
  },

  async deleteContactInfo(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockContactSupportInfo.findIndex(info => info.id === id);
    if (index === -1) throw new Error('Contact info not found');
    mockContactSupportInfo.splice(index, 1);
  }
};

export const mockHelpSupportService = {
  async getActiveHelpSections(): Promise<HelpSection[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockHelpSections.filter(section => section.is_active);
  },

  async getAllHelpSections(): Promise<HelpSection[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockHelpSections;
  },

  async getHelpSectionsByCategory(category: string): Promise<HelpSection[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockHelpSections.filter(section => section.category === category && section.is_active);
  },

  async createHelpSection(section: Omit<HelpSection, 'id' | 'created_at' | 'last_updated'>): Promise<HelpSection> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newSection: HelpSection = {
      ...section,
      id: `section-${Date.now()}`,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    mockHelpSections.push(newSection);
    return newSection;
  },

  async updateHelpSection(id: string, updates: Partial<HelpSection>): Promise<HelpSection> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockHelpSections.findIndex(section => section.id === id);
    if (index === -1) throw new Error('Help section not found');
    
    mockHelpSections[index] = {
      ...mockHelpSections[index],
      ...updates,
      last_updated: new Date().toISOString()
    };
    return mockHelpSections[index];
  },

  async deleteHelpSection(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockHelpSections.findIndex(section => section.id === id);
    if (index === -1) throw new Error('Help section not found');
    mockHelpSections.splice(index, 1);
  }
};

export const mockFaqService = {
  async getActiveFAQs(): Promise<FAQItem[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockFAQItems.filter(faq => faq.is_active);
  },

  async getAllFAQs(): Promise<FAQItem[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockFAQItems;
  },

  async getFAQsByCategory(category: string): Promise<FAQItem[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockFAQItems.filter(faq => faq.category === category && faq.is_active);
  },

  async searchFAQs(searchTerm: string): Promise<FAQItem[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const term = searchTerm.toLowerCase();
    return mockFAQItems.filter(faq => 
      faq.is_active && (
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term) ||
        faq.tags.some(tag => tag.toLowerCase().includes(term))
      )
    );
  },

  async incrementFAQView(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const faq = mockFAQItems.find(item => item.id === id);
    if (faq) {
      faq.view_count += 1;
    }
  },

  async incrementFAQHelpful(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const faq = mockFAQItems.find(item => item.id === id);
    if (faq) {
      faq.helpful_count += 1;
    }
  },

  async createFAQ(faq: Omit<FAQItem, 'id' | 'created_at' | 'last_updated' | 'view_count' | 'helpful_count'>): Promise<FAQItem> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newFAQ: FAQItem = {
      ...faq,
      id: `faq-${Date.now()}`,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      view_count: 0,
      helpful_count: 0
    };
    mockFAQItems.push(newFAQ);
    return newFAQ;
  },

  async updateFAQ(id: string, updates: Partial<FAQItem>): Promise<FAQItem> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockFAQItems.findIndex(faq => faq.id === id);
    if (index === -1) throw new Error('FAQ not found');
    
    mockFAQItems[index] = {
      ...mockFAQItems[index],
      ...updates,
      last_updated: new Date().toISOString()
    };
    return mockFAQItems[index];
  },

  async deleteFAQ(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockFAQItems.findIndex(faq => faq.id === id);
    if (index === -1) throw new Error('FAQ not found');
    mockFAQItems.splice(index, 1);
  }
};

export const mockSupportTicketsService = {
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSupportTickets.filter(ticket => ticket.user_id === userId);
  },

  async getAllTickets(): Promise<SupportTicket[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSupportTickets;
  },

  async getTicketById(id: string): Promise<SupportTicket | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockSupportTickets.find(ticket => ticket.id === id) || null;
  },

  async createTicket(ticket: Omit<SupportTicket, 'id' | 'ticket_number' | 'response_count' | 'created_at' | 'updated_at'>): Promise<SupportTicket> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(mockSupportTickets.length + 1).padStart(6, '0')}`;
    const newTicket: SupportTicket = {
      ...ticket,
      id: `ticket-${Date.now()}`,
      ticket_number: ticketNumber,
      response_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockSupportTickets.push(newTicket);
    return newTicket;
  },

  async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockSupportTickets.findIndex(ticket => ticket.id === id);
    if (index === -1) throw new Error('Ticket not found');
    
    mockSupportTickets[index] = {
      ...mockSupportTickets[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return mockSupportTickets[index];
  },

  async getTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockSupportTicketResponses.filter(response => response.ticket_id === ticketId && !response.is_internal);
  },

  async addTicketResponse(response: Omit<SupportTicketResponse, 'id' | 'created_at'>): Promise<SupportTicketResponse> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newResponse: SupportTicketResponse = {
      ...response,
      id: `response-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    mockSupportTicketResponses.push(newResponse);

    // Update ticket response count
    const ticket = mockSupportTickets.find(t => t.id === response.ticket_id);
    if (ticket) {
      ticket.response_count += 1;
      ticket.last_response_at = new Date().toISOString();
      ticket.updated_at = new Date().toISOString();
    }

    return newResponse;
  }
};

export const mockSupportCategoriesService = {
  async getActiveCategories(): Promise<SupportCategory[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockSupportCategories.filter(category => category.is_active);
  },

  async getAllCategories(): Promise<SupportCategory[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockSupportCategories;
  },

  async createCategory(category: Omit<SupportCategory, 'id' | 'created_at'>): Promise<SupportCategory> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newCategory: SupportCategory = {
      ...category,
      id: `category-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    mockSupportCategories.push(newCategory);
    return newCategory;
  },

  async updateCategory(id: string, updates: Partial<SupportCategory>): Promise<SupportCategory> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockSupportCategories.findIndex(category => category.id === id);
    if (index === -1) throw new Error('Category not found');
    
    mockSupportCategories[index] = {
      ...mockSupportCategories[index],
      ...updates
    };
    return mockSupportCategories[index];
  },

  async deleteCategory(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockSupportCategories.findIndex(category => category.id === id);
    if (index === -1) throw new Error('Category not found');
    mockSupportCategories.splice(index, 1);
  }
};
