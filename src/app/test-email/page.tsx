'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestEmailPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const testConfiguration = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing email configuration...');
      const response = await fetch('/api/test-email');
      const result = await response.json();
      console.log('🧪 Test result:', result);
      setTestResult(result);
    } catch (error: any) {
      console.error('🧪 Test error:', error);
      setTestResult({ success: false, error: `Failed to test configuration: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    setSendingTest(true);
    try {
      console.log('📧 Sending test email to:', testEmail);
      const response = await fetch('/api/send-workout-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail.trim(),
          workoutName: 'Test Workout',
          programName: 'Test Program',
          completedAt: new Date().toISOString(),
          userName: 'Test User',
          note: 'This is a test email from the email configuration test page.',
          workoutType: 'gym',
        }),
      });

      const result = await response.json();
      console.log('📧 Test email result:', result);
      
      if (response.ok) {
        alert('Test email sent successfully! Check your inbox.');
      } else {
        alert(`Failed to send test email: ${result.error || result.details || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('📧 Test email error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Configuration Test</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Test your SMTP email configuration before using the workout email feature.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Test SMTP Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testConfiguration} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Testing Configuration...' : 'Test Email Configuration'}
            </Button>
          </CardContent>
        </Card>

        {/* Configuration Results */}
        {testResult && (
          <Card className={`border-2 ${testResult.success ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-red-500 bg-red-50 dark:bg-red-900/10'}`}>
            <CardHeader>
              <CardTitle className={testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                {testResult.success ? '✅ Configuration Test Result' : '❌ Configuration Test Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResult.success ? (
                  <div className="text-green-700 dark:text-green-300">
                    <p className="font-medium">✅ SMTP Configuration is valid!</p>
                    <p className="text-sm mt-2">Connection to email server successful.</p>
                  </div>
                ) : (
                  <div className="text-red-700 dark:text-red-300">
                    <p className="font-medium">❌ Configuration Error:</p>
                    <p className="text-sm mt-1">{testResult.error}</p>
                    {testResult.details && (
                      <p className="text-xs mt-1 opacity-75">Details: {testResult.details}</p>
                    )}
                  </div>
                )}
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                    View Full Response
                  </summary>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded mt-2 overflow-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send Test Email */}
        {testResult?.success && (
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900/10">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400">Step 2: Send Test Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testEmail">Send Test Email To:</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="Enter email address to test"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={sendTestEmail} disabled={sendingTest} className="w-full sm:w-auto">
                {sendingTest ? 'Sending Test Email...' : 'Send Test Email'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Environment Variables Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">Add these to your <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">.env.local</code> file:</p>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto">
{`SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
SMTP_FROM=your-email@domain.com
SMTP_FROM_NAME=FitTracker Pro`}
              </pre>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">Gmail Settings:</p>
                <pre className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-gmail@gmail.com`}
                </pre>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  ⚠️ Use App Password, not regular password!
                </p>
              </div>
              
              <div>
                <p className="font-medium text-purple-600 dark:text-purple-400 mb-2">Outlook Settings:</p>
                <pre className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded text-xs">
{`SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com`}
                </pre>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">📝 Important Notes:</h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• For Gmail: Enable 2FA and create an App Password</li>
                <li>• Restart your Next.js server after adding environment variables</li>
                <li>• Check your spam folder for test emails</li>
                <li>• Some hosting providers block SMTP ports (25, 587, 465)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
