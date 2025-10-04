import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, message } from 'antd';
import { 
  legalNoticesService, 
  contactSupportService, 
  helpSupportService, 
  faqService 
} from '@/services/legalSupportService';

const { Title, Paragraph, Text } = Typography;

export default function SupabaseConnectionTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  const testConnections = async () => {
    setLoading(true);
    setError(null);
    const testResults: any = {};

    try {
      // Test Legal Notices
      console.log('Testing Legal Notices...');
      const legalNotices = await legalNoticesService.getActiveNotices();
      testResults.legalNotices = {
        success: true,
        count: legalNotices.length,
        data: legalNotices.slice(0, 2) // Show first 2 items
      };
      console.log('Legal Notices:', legalNotices);

      // Test Contact Support
      console.log('Testing Contact Support...');
      const contactInfo = await contactSupportService.getActiveContactInfo();
      testResults.contactSupport = {
        success: true,
        count: contactInfo.length,
        data: contactInfo.slice(0, 2)
      };
      console.log('Contact Support:', contactInfo);

      // Test Help Sections
      console.log('Testing Help Sections...');
      const helpSections = await helpSupportService.getActiveHelpSections();
      testResults.helpSections = {
        success: true,
        count: helpSections.length,
        data: helpSections.slice(0, 2)
      };
      console.log('Help Sections:', helpSections);

      // Test FAQ Items
      console.log('Testing FAQ Items...');
      const faqItems = await faqService.getActiveFAQs();
      testResults.faqItems = {
        success: true,
        count: faqItems.length,
        data: faqItems.slice(0, 2)
      };
      console.log('FAQ Items:', faqItems);

      // Test FAQ Search
      console.log('Testing FAQ Search...');
      const searchResults = await faqService.searchFAQs('campaign');
      testResults.faqSearch = {
        success: true,
        count: searchResults.length,
        searchTerm: 'campaign'
      };
      console.log('FAQ Search Results:', searchResults);

      setResults(testResults);
      message.success('All Supabase connections successful!');

    } catch (err: any) {
      console.error('Connection test failed:', err);
      setError(err.message || 'Connection test failed');
      message.error('Supabase connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testUpdate = async () => {
    try {
      setLoading(true);
      
      // Test updating a legal notice (this will fail if no data exists)
      const notices = await legalNoticesService.getAllNotices();
      if (notices.length > 0) {
        const firstNotice = notices[0];
        await legalNoticesService.updateNotice(firstNotice.id, {
          last_updated: new Date().toISOString()
        });
        message.success('Update test successful!');
      } else {
        message.warning('No legal notices found to update');
      }
    } catch (err: any) {
      console.error('Update test failed:', err);
      message.error('Update test failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>Supabase Connection Test</Title>
      <Paragraph>
        This page tests the connection between your React components and the Supabase database.
        Make sure your environment variables are set correctly.
      </Paragraph>

      {error && (
        <Alert
          message="Connection Error"
          description={error}
          type="error"
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button 
              type="primary" 
              onClick={testConnections}
              loading={loading}
            >
              Test All Connections
            </Button>
            <Button 
              onClick={testUpdate}
              loading={loading}
            >
              Test Update Operations
            </Button>
          </Space>
        </Card>

        {Object.keys(results).length > 0 && (
          <Card title="Test Results">
            {Object.entries(results).map(([key, result]: [string, any]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <Text strong>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}: </Text>
                <Text type={result.success ? 'success' : 'danger'}>
                  {result.success ? '✅ Success' : '❌ Failed'}
                </Text>
                {result.count !== undefined && (
                  <Text type="secondary"> ({result.count} records)</Text>
                )}
                {result.searchTerm && (
                  <Text type="secondary"> - Search: "{result.searchTerm}"</Text>
                )}
              </div>
            ))}
          </Card>
        )}

        <Card title="Environment Check">
          <Space direction="vertical">
            <Text>
              <strong>VITE_SUPABASE_URL:</strong> {
                import.meta.env.VITE_SUPABASE_URL 
                  ? '✅ Set' 
                  : '❌ Missing'
              }
            </Text>
            <Text>
              <strong>VITE_SUPABASE_ANON_KEY:</strong> {
                import.meta.env.VITE_SUPABASE_ANON_KEY 
                  ? '✅ Set' 
                  : '❌ Missing'
              }
            </Text>
          </Space>
        </Card>

        <Card title="Next Steps">
          <Space direction="vertical">
            <Text>1. ✅ Run the SQL script to create tables and insert data</Text>
            <Text>2. ✅ Update components to use real Supabase service</Text>
            <Text>3. 🔄 Test the connection using this page</Text>
            <Text>4. 🚀 Navigate to your Legal & Support pages to see the data</Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
