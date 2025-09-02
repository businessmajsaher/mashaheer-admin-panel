import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { resetPassword } from '@/services/authService';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  userEmail = '',
  userName = ''
}) => {
  const [email, setEmail] = useState(userEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Use the password reset callback page as redirect URL
      const redirectUrl = `${window.location.origin}/password-reset-callback.html`;
      
      await resetPassword(email.trim(), redirectUrl);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail(userEmail);
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
        
        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                Password reset email sent successfully to <strong>{email}</strong>
              </p>
            </div>
            <p className="text-sm text-gray-600">
              The user will receive an email with a link to reset their password. 
              When they click the link, they'll be redirected to the Mashaheer app.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter user's email address"
                required
                disabled={loading}
              />
              {userName && (
                <p className="text-sm text-gray-500 mt-1">
                  User: {userName}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
};

