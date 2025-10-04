import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface TermsSection {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
}

export default function TermsOfService() {
  const [sections, setSections] = useState<TermsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize default terms of service sections if none exist
  useEffect(() => {
    const defaultSections: TermsSection[] = [
      {
        id: 'acceptance',
        title: 'Acceptance of Terms',
        content: `
          <h3>Agreement to Terms</h3>
          <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p>Welcome to Mashaheer! These Terms of Service ("Terms") govern your use of our influencer marketing platform and services (collectively, the "Service"). By accessing or using our Service, you agree to be bound by these Terms.</p>
          
          <h4>Binding Agreement</h4>
          <p>These Terms constitute a legally binding agreement between you and Mashaheer. If you do not agree to these Terms, you may not access or use our Service.</p>
          
          <h4>Updates to Terms</h4>
          <p>We reserve the right to modify these Terms at any time. We will notify users of significant changes through email or platform notifications. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          
          <h4>Eligibility</h4>
          <p>You must be at least 18 years old (or the age of majority in your jurisdiction) to use our Service. By using the Service, you represent and warrant that you meet this age requirement.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'definitions',
        title: 'Definitions',
        content: `
          <h3>Key Terms and Definitions</h3>
          <p>For the purposes of these Terms, the following definitions apply:</p>
          
          <h4>Platform Terms</h4>
          <ul>
            <li><strong>"Service" or "Platform":</strong> The Mashaheer influencer marketing platform and all related services</li>
            <li><strong>"User":</strong> Any individual or entity that accesses or uses our Service</li>
            <li><strong>"Influencer":</strong> Content creators who offer marketing services through our platform</li>
            <li><strong>"Brand":</strong> Businesses or individuals seeking influencer marketing services</li>
            <li><strong>"Content":</strong> Any text, images, videos, or other materials shared on the platform</li>
          </ul>
          
          <h4>Service Terms</h4>
          <ul>
            <li><strong>"Campaign":</strong> A marketing project involving influencers and brands</li>
            <li><strong>"Booking":</strong> An agreement for specific influencer services</li>
            <li><strong>"Payment":</strong> Compensation for services rendered through the platform</li>
            <li><strong>"Account":</strong> A user profile and associated data on our platform</li>
          </ul>
          
          <h4>Legal Terms</h4>
          <ul>
            <li><strong>"Intellectual Property":</strong> Copyrights, trademarks, and other proprietary rights</li>
            <li><strong>"Personal Data":</strong> Information that can identify an individual</li>
            <li><strong>"Third Party":</strong> External services or platforms not owned by Mashaheer</li>
          </ul>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'user-accounts',
        title: 'User Accounts and Registration',
        content: `
          <h3>Account Creation and Management</h3>
          
          <h4>Account Registration</h4>
          <p>To use certain features of our Service, you must create an account by providing accurate and complete information. You are responsible for:</p>
          <ul>
            <li>Providing accurate and up-to-date information</li>
            <li>Maintaining the security of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>
          
          <h4>Account Types</h4>
          <p>We offer different types of accounts:</p>
          <ul>
            <li><strong>Influencer Accounts:</strong> For content creators offering marketing services</li>
            <li><strong>Brand Accounts:</strong> For businesses seeking influencer partnerships</li>
            <li><strong>Admin Accounts:</strong> For platform administrators and staff</li>
          </ul>
          
          <h4>Account Verification</h4>
          <p>We may require verification of your identity, credentials, or business information. This may include:</p>
          <ul>
            <li>Identity document verification</li>
            <li>Social media account verification</li>
            <li>Business registration verification</li>
            <li>Payment method verification</li>
          </ul>
          
          <h4>Account Suspension and Termination</h4>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or harmful activities.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'acceptable-use',
        title: 'Acceptable Use Policy',
        content: `
          <h3>Permitted and Prohibited Uses</h3>
          
          <h4>Permitted Uses</h4>
          <p>You may use our Service for lawful purposes, including:</p>
          <ul>
            <li>Connecting with other users for legitimate business purposes</li>
            <li>Creating and sharing appropriate content</li>
            <li>Participating in campaigns and collaborations</li>
            <li>Communicating professionally with other users</li>
            <li>Accessing platform features as intended</li>
          </ul>
          
          <h4>Prohibited Activities</h4>
          <p>You agree NOT to use our Service for:</p>
          <ul>
            <li>Illegal activities or violation of any laws</li>
            <li>Fraud, deception, or misrepresentation</li>
            <li>Harassment, abuse, or threatening behavior</li>
            <li>Spam, unsolicited communications, or marketing</li>
            <li>Impersonation of other individuals or entities</li>
            <li>Distribution of malicious software or harmful content</li>
            <li>Violation of intellectual property rights</li>
            <li>Circumvention of platform security measures</li>
            <li>Commercial activities outside the platform's intended purpose</li>
          </ul>
          
          <h4>Content Standards</h4>
          <p>All content shared on our platform must:</p>
          <ul>
            <li>Be accurate and truthful</li>
            <li>Respect others' rights and dignity</li>
            <li>Comply with applicable laws and regulations</li>
            <li>Not contain offensive or inappropriate material</li>
            <li>Not infringe on intellectual property rights</li>
          </ul>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'intellectual-property',
        title: 'Intellectual Property Rights',
        content: `
          <h3>Ownership and Usage Rights</h3>
          
          <h4>Platform Intellectual Property</h4>
          <p>Mashaheer owns all rights, title, and interest in and to the Service, including:</p>
          <ul>
            <li>The platform software and technology</li>
            <li>Brand names, logos, and trademarks</li>
            <li>Platform design and user interface</li>
            <li>Proprietary algorithms and systems</li>
            <li>Documentation and materials</li>
          </ul>
          
          <h4>User-Generated Content</h4>
          <p>You retain ownership of content you create and share on our platform. However, by using our Service, you grant us:</p>
          <ul>
            <li>A non-exclusive, worldwide license to use your content on the platform</li>
            <li>Rights to display, distribute, and modify content as necessary for platform operation</li>
            <li>Permission to use content for marketing and promotional purposes (with attribution)</li>
            <li>Rights to remove or modify content that violates these Terms</li>
          </ul>
          
          <h4>Campaign Content</h4>
          <p>Content created as part of campaigns may be subject to additional agreements between influencers and brands, including:</p>
          <ul>
            <li>Usage rights and licensing terms</li>
            <li>Attribution requirements</li>
            <li>Duration of usage rights</li>
            <li>Exclusivity arrangements</li>
          </ul>
          
          <h4>Copyright Protection</h4>
          <p>We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA). Users must respect others' copyright and trademark rights.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'payments',
        title: 'Payments and Financial Terms',
        content: `
          <h3>Payment Processing and Fees</h3>
          
          <h4>Payment Methods</h4>
          <p>We accept various payment methods, including:</p>
          <ul>
            <li>Credit and debit cards</li>
            <li>Bank transfers</li>
            <li>Digital wallets</li>
            <li>Cryptocurrency (where available)</li>
          </ul>
          
          <h4>Platform Fees</h4>
          <p>Our fee structure includes:</p>
          <ul>
            <li><strong>Service Fees:</strong> Commission on successful transactions</li>
            <li><strong>Processing Fees:</strong> Payment processing costs</li>
            <li><strong>Premium Features:</strong> Additional charges for advanced features</li>
            <li><strong>Subscription Plans:</strong> Monthly or annual subscription fees</li>
          </ul>
          
          <h4>Payment Terms</h4>
          <ul>
            <li>Payments are processed securely through third-party providers</li>
            <li>Fees are clearly disclosed before transaction completion</li>
            <li>Refunds are subject to our refund policy</li>
            <li>Chargebacks may result in account suspension</li>
          </ul>
          
          <h4>Influencer Payments</h4>
          <p>Influencers receive payments according to:</p>
          <ul>
            <li>Campaign completion and approval</li>
            <li>Platform payment schedule</li>
            <li>Minimum payment thresholds</li>
            <li>Tax reporting requirements</li>
          </ul>
          
          <h4>Disputes and Refunds</h4>
          <p>Payment disputes are handled through our dispute resolution process. Refunds are provided in accordance with our refund policy and applicable laws.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'disclaimers',
        title: 'Disclaimers and Limitations',
        content: `
          <h3>Service Disclaimers</h3>
          
          <h4>Service Availability</h4>
          <p>While we strive to maintain continuous service availability, we cannot guarantee:</p>
          <ul>
            <li>Uninterrupted access to the platform</li>
            <li>Error-free operation</li>
            <li>Compatibility with all devices and browsers</li>
            <li>Third-party service reliability</li>
          </ul>
          
          <h4>User Interactions</h4>
          <p>We are not responsible for:</p>
          <ul>
            <li>User-generated content or communications</li>
            <li>Disputes between users</li>
            <li>Third-party actions or content</li>
            <li>External website links or services</li>
          </ul>
          
          <h4>Limitation of Liability</h4>
          <p>To the maximum extent permitted by law, Mashaheer shall not be liable for:</p>
          <ul>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Damages exceeding the amount paid for the Service</li>
            <li>Third-party actions or content</li>
          </ul>
          
          <h4>No Warranties</h4>
          <p>The Service is provided "as is" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
          
          <h4>Force Majeure</h4>
          <p>We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including natural disasters, government actions, or technical failures.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'privacy',
        title: 'Privacy and Data Protection',
        content: `
          <h3>Data Handling and Privacy</h3>
          
          <h4>Privacy Policy</h4>
          <p>Your privacy is important to us. Our Privacy Policy, which is incorporated into these Terms by reference, explains how we collect, use, and protect your information.</p>
          
          <h4>Data Collection</h4>
          <p>We collect information necessary to provide and improve our Service, including:</p>
          <ul>
            <li>Account and profile information</li>
            <li>Usage data and analytics</li>
            <li>Communication records</li>
            <li>Payment and transaction data</li>
          </ul>
          
          <h4>Data Security</h4>
          <p>We implement appropriate security measures to protect your information, including:</p>
          <ul>
            <li>Encryption of sensitive data</li>
            <li>Secure data storage and transmission</li>
            <li>Access controls and monitoring</li>
            <li>Regular security assessments</li>
          </ul>
          
          <h4>Data Sharing</h4>
          <p>We may share your information with:</p>
          <ul>
            <li>Service providers and partners</li>
            <li>Other users (as necessary for platform functionality)</li>
            <li>Legal authorities (when required by law)</li>
            <li>Business partners (with your consent)</li>
          </ul>
          
          <h4>Your Rights</h4>
          <p>You have rights regarding your personal data, including access, correction, deletion, and portability. Contact us to exercise these rights.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'termination',
        title: 'Termination and Suspension',
        content: `
          <h3>Account Termination and Suspension</h3>
          
          <h4>Termination by User</h4>
          <p>You may terminate your account at any time by:</p>
          <ul>
            <li>Contacting our support team</li>
            <li>Using account deletion features in settings</li>
            <li>Following the termination process outlined in our policies</li>
          </ul>
          
          <h4>Termination by Mashaheer</h4>
          <p>We may terminate or suspend your account for:</p>
          <ul>
            <li>Violation of these Terms of Service</li>
            <li>Fraudulent or illegal activities</li>
            <li>Abuse of the platform or other users</li>
            <li>Non-payment of fees</li>
            <li>Extended periods of inactivity</li>
          </ul>
          
          <h4>Effect of Termination</h4>
          <p>Upon termination:</p>
          <ul>
            <li>Your access to the platform will cease</li>
            <li>Your profile and public content may be removed</li>
            <li>Outstanding payments will be processed according to our policies</li>
            <li>Certain data may be retained for legal and business purposes</li>
          </ul>
          
          <h4>Appeal Process</h4>
          <p>If your account is suspended or terminated, you may appeal the decision by contacting our support team and providing relevant information.</p>
          
          <h4>Survival of Terms</h4>
          <p>Certain provisions of these Terms will survive termination, including intellectual property rights, disclaimers, and limitation of liability.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'dispute-resolution',
        title: 'Dispute Resolution',
        content: `
          <h3>Resolving Disputes</h3>
          
          <h4>Dispute Resolution Process</h4>
          <p>We encourage users to resolve disputes through our internal resolution process:</p>
          <ul>
            <li><strong>Direct Communication:</strong> Attempt to resolve issues directly with other users</li>
            <li><strong>Platform Mediation:</strong> Use our built-in dispute resolution tools</li>
            <li><strong>Support Assistance:</strong> Contact our support team for assistance</li>
            <li><strong>Formal Mediation:</strong> Engage in formal mediation if needed</li>
          </ul>
          
          <h4>Arbitration Agreement</h4>
          <p>For disputes that cannot be resolved through our internal process, you agree to binding arbitration:</p>
          <ul>
            <li>Disputes will be resolved through individual arbitration</li>
            <li>Class action lawsuits are waived</li>
            <li>Arbitration will be conducted by a neutral third party</li>
            <li>Arbitration decisions are final and binding</li>
          </ul>
          
          <h4>Governing Law</h4>
          <p>These Terms are governed by the laws of [Jurisdiction], without regard to conflict of law principles.</p>
          
          <h4>Jurisdiction</h4>
          <p>Any legal proceedings must be brought in the courts of [Jurisdiction].</p>
          
          <h4>Time Limits</h4>
          <p>You must initiate dispute resolution within one year of the event giving rise to the dispute.</p>
          
          <h4>Exceptions</h4>
          <p>Certain disputes may be exempt from arbitration, including intellectual property disputes and small claims court matters.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'miscellaneous',
        title: 'Miscellaneous Provisions',
        content: `
          <h3>Additional Terms and Conditions</h3>
          
          <h4>Entire Agreement</h4>
          <p>These Terms, together with our Privacy Policy and other referenced documents, constitute the entire agreement between you and Mashaheer regarding the use of our Service.</p>
          
          <h4>Severability</h4>
          <p>If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will continue to be valid and enforceable.</p>
          
          <h4>Waiver</h4>
          <p>Our failure to enforce any provision of these Terms does not constitute a waiver of our right to enforce that provision in the future.</p>
          
          <h4>Assignment</h4>
          <p>You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.</p>
          
          <h4>Notices</h4>
          <p>All notices and communications will be sent to the email address associated with your account or posted on our platform.</p>
          
          <h4>Language</h4>
          <p>These Terms are provided in English. If translated into other languages, the English version will prevail in case of conflicts.</p>
          
          <h4>Contact Information</h4>
          <p>For questions about these Terms, please contact us at:</p>
          <ul>
            <li><strong>Email:</strong> legal@mashaheer.com</li>
            <li><strong>Address:</strong> [Your Company Address]</li>
            <li><strong>Phone:</strong> [Your Contact Phone]</li>
          </ul>
        `,
        lastUpdated: new Date().toISOString()
      }
    ];

    // Load from localStorage or use defaults
    const savedSections = localStorage.getItem('terms-of-service');
    if (savedSections) {
      setSections(JSON.parse(savedSections));
    } else {
      setSections(defaultSections);
      localStorage.setItem('terms-of-service', JSON.stringify(defaultSections));
    }
    setLoading(false);
  }, []);

  const handleEdit = (section: TermsSection) => {
    setEditingId(section.id);
    setEditContent(section.content);
  };

  const handleSave = () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const updatedSections = sections.map(section => 
        section.id === editingId 
          ? { ...section, content: editContent, lastUpdated: new Date().toISOString() }
          : section
      );
      
      setSections(updatedSections);
      localStorage.setItem('terms-of-service', JSON.stringify(updatedSections));
      setEditingId(null);
      setEditContent('');
      message.success('Terms of service section updated successfully!');
    } catch (error) {
      message.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Terms of Service Management</Title>
      <Paragraph>
        Manage your terms of service content. These comprehensive terms cover all aspects of platform usage, user rights, and legal obligations.
      </Paragraph>

      <Alert
        message="Terms of Service Management"
        description="Edit individual sections of your terms of service. Each section can be customized with HTML content. Changes are saved to local storage for this demo."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {sections.map((section) => (
          <Card
            key={section.id}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{section.title}</span>
                <Space>
                  <small style={{ color: '#666' }}>
                    Last updated: {new Date(section.lastUpdated).toLocaleDateString()}
                  </small>
                  {editingId !== section.id && (
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleEdit(section)}
                    >
                      Edit
                    </Button>
                  )}
                </Space>
              </div>
            }
            style={{ width: '100%' }}
          >
            {editingId === section.id ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                    HTML Content:
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%',
                      height: '300px',
                      padding: '12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="Enter HTML content here..."
                  />
                </div>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSave}
                  >
                    Save Changes
                  </Button>
                  <Button
                    icon={<UndoOutlined />}
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </Space>
              </div>
            ) : (
              <div
                dangerouslySetInnerHTML={{ __html: section.content }}
                style={{
                  lineHeight: '1.6',
                  color: '#333'
                }}
              />
            )}
          </Card>
        ))}
      </Space>
    </div>
  );
}


