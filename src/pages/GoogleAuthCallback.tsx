import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { initializeGoogleCalendarClient } from '@/lib/googleCalendarClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function GoogleAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(error);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        return;
      }

      try {
        const client = initializeGoogleCalendarClient();
        await client.exchangeCodeForToken(code);
        
        setStatus('success');
        toast({
          title: 'Successfully Connected',
          description: 'Your Google Calendar is now synced with Gold POS.',
        });

        // Redirect after a short delay
        setTimeout(() => {
          navigate('/reservations');
        }, 2000);
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to exchange code for tokens');
      }
    };

    handleAuth();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Google Calendar Integration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Authenticating with Google...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-green-700 font-medium">Successfully Connected!</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting you back to Reservations...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-700 font-medium">Authentication Failed</p>
              <p className="text-sm text-red-600 mt-2 text-center">{errorMessage}</p>
              <button 
                onClick={() => navigate('/reservations')}
                className="mt-6 text-blue-600 hover:underline text-sm font-medium"
              >
                Go back to Reservations
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
