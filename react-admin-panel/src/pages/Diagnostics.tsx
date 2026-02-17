import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Spin, Descriptions, Badge, Tag } from 'antd';
import { supabase } from '@/services/supabaseClient';

const { Title, Text, Paragraph } = Typography;

export default function DiagnosticsPage() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>({});
    const [envCheck, setEnvCheck] = useState<any>({});

    useEffect(() => {
        checkEnvironment();
    }, []);

    const checkEnvironment = () => {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        setEnvCheck({
            url: url ? 'Calculated (Hidden)' : 'Missing',
            urlLength: url?.length || 0,
            key: key ? 'Calculated (Hidden)' : 'Missing',
            keyLength: key?.length || 0,
            isHttps: url?.startsWith('https://'),
        });
    };

    const runDiagnostics = async () => {
        setLoading(true);
        const diagnosis: any = {};

        try {
            // 1. Connectivity Check (Simple Ping)
            const startTime = Date.now();
            try {
                const { count, error } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .limit(1);

                diagnosis.connectivity = {
                    success: !error,
                    latency: Date.now() - startTime,
                    error: error?.message,
                    details: error
                };
            } catch (err: any) {
                diagnosis.connectivity = {
                    success: false,
                    latency: Date.now() - startTime,
                    error: err.message
                };
            }

            // 2. Auth Session Check
            try {
                const { data, error } = await supabase.auth.getSession();
                diagnosis.auth = {
                    success: !error,
                    hasSession: !!data.session,
                    user: data.session?.user?.email || 'No User',
                    role: data.session?.user?.role,
                    expiresAt: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A',
                    error: error?.message
                };
            } catch (err: any) {
                diagnosis.auth = {
                    success: false,
                    error: err.message
                };
            }

            // 3. Storage Access Check
            try {
                const { data, error } = await supabase.storage.listBuckets();
                diagnosis.storage = {
                    success: !error,
                    bucketCount: data?.length || 0,
                    buckets: data?.map((b: any) => b.name).join(', '),
                    error: error?.message
                };
            } catch (err: any) {
                diagnosis.storage = {
                    success: false,
                    error: err.message
                };
            }

            // 4. LocalStorage Check
            try {
                const storageKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
                diagnosis.localStorage = {
                    available: true,
                    supabaseKeys: storageKeys,
                    tokenFound: storageKeys.some(k => k.includes('token'))
                };
            } catch (err: any) {
                diagnosis.localStorage = {
                    available: false,
                    error: err.message
                };
            }

        } catch (globalErr: any) {
            diagnosis.globalError = globalErr.message;
        } finally {
            setResults(diagnosis);
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <Title level={2}>System Diagnostics</Title>
            <Paragraph>
                Use this page to verify connectivity to Supabase and check local configuration.
                This page is public and does not require authentication to view.
            </Paragraph>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>

                {/* Environment Check */}
                <Card title="1. Environment Configuration" size="small">
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="VITE_SUPABASE_URL">
                            {envCheck.url === 'Missing' ? <Badge status="error" text="Missing" /> : <Badge status="success" text="Present" />}
                            {envCheck.urlLength > 0 && ` (${envCheck.urlLength} chars)`}
                            {!envCheck.isHttps && envCheck.url !== 'Missing' && <Text type="danger" style={{ marginLeft: 8 }}>Warning: Not HTTPS</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="VITE_SUPABASE_ANON_KEY">
                            {envCheck.key === 'Missing' ? <Badge status="error" text="Missing" /> : <Badge status="success" text="Present" />}
                            {envCheck.keyLength > 0 && ` (${envCheck.keyLength} chars)`}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Button type="primary" onClick={runDiagnostics} loading={loading} size="large" block>
                    Run Connectivity Diagnostics
                </Button>

                {Object.keys(results).length > 0 && (
                    <>
                        {/* Database Connectivity */}
                        <Card title="2. Database Connectivity" size="small">
                            {results.connectivity?.success ? (
                                <Alert
                                    message="Connected Successfully"
                                    description={`Latency: ${results.connectivity.latency}ms`}
                                    type="success"
                                    showIcon
                                />
                            ) : (
                                <Alert
                                    message="Connection Failed"
                                    description={results.connectivity?.error || 'Unknown Error'}
                                    type="error"
                                    showIcon
                                />
                            )}
                        </Card>

                        {/* Authentication State */}
                        <Card title="3. Authentication State" size="small">
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="Session Check">
                                    {results.auth?.success ? <Badge status="success" text="OK" /> : <Badge status="error" text="Failed" />}
                                </Descriptions.Item>
                                <Descriptions.Item label="Active Session">
                                    {results.auth?.hasSession ? <Badge status="processing" text="Yes" /> : <Badge status="default" text="No" />}
                                </Descriptions.Item>
                                <Descriptions.Item label="User Email">
                                    {results.auth?.user}
                                </Descriptions.Item>
                                <Descriptions.Item label="Token Expiry">
                                    {results.auth?.expiresAt}
                                </Descriptions.Item>
                                {results.auth?.error && (
                                    <Descriptions.Item label="Auth Error">
                                        <Text type="danger">{results.auth.error}</Text>
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Card>

                        {/* Storage Check */}
                        <Card title="4. Storage Bucket Access" size="small">
                            {results.storage?.success ? (
                                <Space direction="vertical">
                                    <Badge status="success" text={`Listed ${results.storage.bucketCount} buckets`} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>{results.storage.buckets}</Text>
                                </Space>
                            ) : (
                                <Alert message="Storage List Failed" description={results.storage?.error} type="warning" showIcon />
                            )}
                        </Card>

                        {/* Local Storage details */}
                        <Card title="5. Local Browser Storage" size="small">
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="Supabase Keys Found">
                                    {results.localStorage?.supabaseKeys?.length > 0 ? (
                                        results.localStorage.supabaseKeys.map((k: string) => <Tag key={k}>{k}</Tag>)
                                    ) : (
                                        <Text type="secondary">None</Text>
                                    )}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </>
                )}

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
                    <Button style={{ marginLeft: 10 }} onClick={() => { localStorage.clear(); window.location.reload(); }} danger>
                        Clear Local Storage & Reload
                    </Button>
                </div>

            </Space>
        </div>
    );
}
