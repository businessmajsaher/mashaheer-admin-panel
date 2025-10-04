import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface PrivacySection {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
}

export default function PrivacyPolicy() {
  const [sections, setSections] = useState<PrivacySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize default privacy policy sections if none exist
  useEffect(() => {
    const defaultSections: PrivacySection[] = [
      {
        id: 'introduction',
        title: 'Introduction',
        content: `
          <h3>Privacy Policy Introduction</h3>
          <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p>Mashaheer ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our influencer marketing platform.</p>
          
          <h4>Scope of This Policy</h4>
          <p>This Privacy Policy applies to all users of our platform, including:</p>
          <ul>
            <li>Influencers and content creators</li>
            <li>Brands and businesses</li>
            <li>Administrators and staff</li>
            <li>General website visitors</li>
          </ul>
          
          <h4>Consent</h4>
          <p>By using our platform, you consent to the collection and use of information in accordance with this Privacy Policy.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'data-collection',
        title: 'Information We Collect',
        content: `
          <h3>Types of Information Collected</h3>
          
          <h4>Personal Information</h4>
          <p>We collect personal information that you voluntarily provide to us, including:</p>
          <ul>
            <li>Name, email address, and contact information</li>
            <li>Profile information and biography</li>
            <li>Social media handles and platform information</li>
            <li>Payment and billing information</li>
            <li>Communication preferences</li>
          </ul>
          
          <h4>Automatically Collected Information</h4>
          <p>We automatically collect certain information when you use our platform:</p>
          <ul>
            <li>Device information (IP address, browser type, operating system)</li>
            <li>Usage data (pages visited, time spent, features used)</li>
            <li>Cookies and similar tracking technologies</li>
            <li>Location data (if permitted)</li>
          </ul>
          
          <h4>Third-Party Information</h4>
          <p>We may receive information from third parties, including:</p>
          <ul>
            <li>Social media platforms (with your permission)</li>
            <li>Payment processors</li>
            <li>Analytics providers</li>
            <li>Marketing partners</li>
          </ul>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'data-usage',
        title: 'How We Use Your Information',
        content: `
          <h3>Purposes of Data Processing</h3>
          <p>We use the collected information for various purposes, including:</p>
          
          <h4>Service Provision</h4>
          <ul>
            <li>Creating and managing user accounts</li>
            <li>Facilitating connections between influencers and brands</li>
            <li>Processing payments and transactions</li>
            <li>Providing customer support</li>
          </ul>
          
          <h4>Communication</h4>
          <ul>
            <li>Sending important updates and notifications</li>
            <li>Responding to inquiries and support requests</li>
            <li>Marketing communications (with consent)</li>
            <li>Platform announcements</li>
          </ul>
          
          <h4>Improvement and Analytics</h4>
          <ul>
            <li>Analyzing platform usage and performance</li>
            <li>Improving user experience</li>
            <li>Developing new features</li>
            <li>Conducting research and analytics</li>
          </ul>
          
          <h4>Legal and Security</h4>
          <ul>
            <li>Complying with legal obligations</li>
            <li>Protecting against fraud and abuse</li>
            <li>Enforcing terms of service</li>
            <li>Maintaining platform security</li>
          </ul>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'data-sharing',
        title: 'Information Sharing and Disclosure',
        content: `
          <h3>When We Share Your Information</h3>
          <p>We may share your information in the following circumstances:</p>
          
          <h4>With Your Consent</h4>
          <p>We share information when you explicitly consent to such sharing, such as:</p>
          <ul>
            <li>Connecting with other users on the platform</li>
            <li>Participating in marketing campaigns</li>
            <li>Sharing profile information publicly</li>
          </ul>
          
          <h4>Service Providers</h4>
          <p>We share information with trusted third-party service providers who assist us in:</p>
          <ul>
            <li>Payment processing</li>
            <li>Email delivery</li>
            <li>Analytics and data analysis</li>
            <li>Customer support</li>
            <li>Cloud hosting and storage</li>
          </ul>
          
          <h4>Legal Requirements</h4>
          <p>We may disclose information when required by law or to:</p>
          <ul>
            <li>Comply with legal processes</li>
            <li>Respond to government requests</li>
            <li>Protect our rights and property</li>
            <li>Ensure user safety</li>
          </ul>
          
          <h4>Business Transfers</h4>
          <p>In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the transaction.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'data-security',
        title: 'Data Security and Protection',
        content: `
          <h3>Security Measures</h3>
          <p>We implement appropriate technical and organizational measures to protect your personal information:</p>
          
          <h4>Technical Safeguards</h4>
          <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and access controls</li>
            <li>Regular security assessments and updates</li>
            <li>Secure data centers and infrastructure</li>
          </ul>
          
          <h4>Organizational Measures</h4>
          <ul>
            <li>Employee training on data protection</li>
            <li>Access controls and authorization procedures</li>
            <li>Incident response procedures</li>
            <li>Regular audits and compliance reviews</li>
          </ul>
          
          <h4>Data Retention</h4>
          <p>We retain your information only as long as necessary for the purposes outlined in this Privacy Policy or as required by law. When information is no longer needed, we securely delete or anonymize it.</p>
          
          <h4>International Transfers</h4>
          <p>If we transfer your information internationally, we ensure appropriate safeguards are in place to protect your data in accordance with applicable privacy laws.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'user-rights',
        title: 'Your Rights and Choices',
        content: `
          <h3>Your Privacy Rights</h3>
          <p>Depending on your location, you may have certain rights regarding your personal information:</p>
          
          <h4>Access and Portability</h4>
          <ul>
            <li>Request access to your personal information</li>
            <li>Receive a copy of your data in a portable format</li>
            <li>Understand how we use your information</li>
          </ul>
          
          <h4>Correction and Updates</h4>
          <ul>
            <li>Correct inaccurate or incomplete information</li>
            <li>Update your profile and preferences</li>
            <li>Modify your communication settings</li>
          </ul>
          
          <h4>Deletion and Restriction</h4>
          <ul>
            <li>Request deletion of your personal information</li>
            <li>Restrict certain processing activities</li>
            <li>Withdraw consent for data processing</li>
          </ul>
          
          <h4>Objection and Opt-out</h4>
          <ul>
            <li>Object to certain types of data processing</li>
            <li>Opt-out of marketing communications</li>
            <li>Control cookie preferences</li>
          </ul>
          
          <h4>How to Exercise Your Rights</h4>
          <p>To exercise any of these rights, please contact us using the information provided in the "Contact Us" section below.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'cookies',
        title: 'Cookies and Tracking Technologies',
        content: `
          <h3>Use of Cookies and Similar Technologies</h3>
          <p>We use cookies and similar tracking technologies to enhance your experience on our platform:</p>
          
          <h4>Types of Cookies</h4>
          <ul>
            <li><strong>Essential Cookies:</strong> Necessary for platform functionality</li>
            <li><strong>Performance Cookies:</strong> Help us understand how you use our platform</li>
            <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
            <li><strong>Marketing Cookies:</strong> Used for targeted advertising (with consent)</li>
          </ul>
          
          <h4>Cookie Management</h4>
          <p>You can control cookies through your browser settings. However, disabling certain cookies may affect platform functionality.</p>
          
          <h4>Third-Party Tracking</h4>
          <p>We may use third-party analytics and advertising services that place their own cookies and tracking technologies on our platform.</p>
          
          <h4>Do Not Track</h4>
          <p>We respect "Do Not Track" signals and honor user preferences for tracking where technically feasible.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'children-privacy',
        title: 'Children\'s Privacy',
        content: `
          <h3>Protection of Children's Information</h3>
          <p>Our platform is not intended for children under the age of 13 (or 16 in some jurisdictions). We do not knowingly collect personal information from children under these age limits.</p>
          
          <h4>Age Verification</h4>
          <p>If we become aware that we have collected personal information from a child without parental consent, we will take steps to delete such information promptly.</p>
          
          <h4>Parental Rights</h4>
          <p>Parents or guardians who believe their child has provided personal information to us may contact us to request deletion of such information.</p>
          
          <h4>Age-Appropriate Content</h4>
          <p>We strive to maintain age-appropriate content and features on our platform and encourage parental supervision of children's internet usage.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'updates',
        title: 'Privacy Policy Updates',
        content: `
          <h3>Changes to This Privacy Policy</h3>
          <p>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. When we make significant changes, we will:</p>
          
          <h4>Notification Methods</h4>
          <ul>
            <li>Post the updated policy on our platform</li>
            <li>Send email notifications to registered users</li>
            <li>Display prominent notices on our platform</li>
            <li>Update the "Effective Date" at the top of this policy</li>
          </ul>
          
          <h4>Continued Use</h4>
          <p>Your continued use of our platform after any changes to this Privacy Policy constitutes acceptance of the updated terms.</p>
          
          <h4>Review Recommendations</h4>
          <p>We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.</p>
          
          <h4>Contact for Questions</h4>
          <p>If you have questions about any changes to this Privacy Policy, please contact us using the information provided below.</p>
        `,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'contact',
        title: 'Contact Information',
        content: `
          <h3>Privacy Questions and Concerns</h3>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
          
          <h4>Contact Details</h4>
          <ul>
            <li><strong>Email:</strong> privacy@mashaheer.com</li>
            <li><strong>Address:</strong> [Your Company Address]</li>
            <li><strong>Phone:</strong> [Your Contact Phone]</li>
            <li><strong>Data Protection Officer:</strong> dpo@mashaheer.com</li>
          </ul>
          
          <h4>Response Time</h4>
          <p>We aim to respond to all privacy-related inquiries within 30 days of receipt.</p>
          
          <h4>Complaints</h4>
          <p>If you are not satisfied with our response to your privacy concerns, you may have the right to lodge a complaint with your local data protection authority.</p>
          
          <h4>Updates to Contact Information</h4>
          <p>We will update this contact information if it changes and will notify users of any significant updates.</p>
        `,
        lastUpdated: new Date().toISOString()
      }
    ];

    // Load from localStorage or use defaults
    const savedSections = localStorage.getItem('privacy-policy');
    if (savedSections) {
      setSections(JSON.parse(savedSections));
    } else {
      setSections(defaultSections);
      localStorage.setItem('privacy-policy', JSON.stringify(defaultSections));
    }
    setLoading(false);
  }, []);

  const handleEdit = (section: PrivacySection) => {
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
      localStorage.setItem('privacy-policy', JSON.stringify(updatedSections));
      setEditingId(null);
      setEditContent('');
      message.success('Privacy policy section updated successfully!');
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
      <Title level={2}>Privacy Policy Management</Title>
      <Paragraph>
        Manage your privacy policy content. This comprehensive privacy policy covers all aspects of data collection, usage, and user rights on your platform.
      </Paragraph>

      <Alert
        message="Privacy Policy Management"
        description="Edit individual sections of your privacy policy. Each section can be customized with HTML content. Changes are saved to local storage for this demo."
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


