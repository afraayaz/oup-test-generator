'use client';

import { useState } from 'react';

export default function TeacherLoginHelperPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email) {
      setMessage('Please enter an email address');
      return;
    }

    setLoading(true);
    setMessage('');
    setEmailSent(false);
    
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          newPassword: '' // Not used for email-based reset
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }

      setEmailSent(true);
      setMessage('✅ Password reset email sent successfully!');
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      setEmailSent(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Teacher Account Recovery</h1>
        <p className="text-gray-600 mb-6">Send password reset email to teacher account</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Teacher Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="testschool@teacher.com"
              disabled={emailSent}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <button
            onClick={handleSendResetEmail}
            disabled={loading || emailSent}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : emailSent ? 'Email Sent' : 'Send Reset Email'}
          </button>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {emailSent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">What's Next?</h3>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Check the email inbox for <code className="bg-gray-100 px-1 rounded">{email}</code></li>
                <li>Look for an email from Firebase with subject "Reset your password"</li>
                <li>Click the password reset link in the email</li>
                <li>Set a new password</li>
                <li>Use the new password to log in to the teacher dashboard</li>
              </ol>
              <p className="text-xs text-gray-600 mt-3">
                💡 The reset link usually expires after 1 hour. If it expires, you can send another reset email.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}