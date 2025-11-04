import { useEffect, useState } from 'react';
import { handleUpload, handleDownload } from '../api/sync-handler';

export default function SyncApi() {
  const [message, setMessage] = useState('Sync API Ready');

  useEffect(() => {
    // Handle API requests
    const handleRequest = async () => {
      const url = new URL(window.location.href);
      const path = url.pathname;
      const method = 'GET'; // For now, we'll handle GET requests

      if (path === '/api/sync/download') {
        const since = url.searchParams.get('since') || '1970-01-01T00:00:00Z';
        try {
          const result = await handleDownload(since);
          setMessage(JSON.stringify(result, null, 2));
        } catch (error) {
          setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (path === '/api/sync/upload') {
        setMessage('Upload endpoint - POST requests not handled in this demo');
      } else {
        setMessage('Sync API Ready - Available endpoints: /api/sync/download, /api/sync/upload');
      }
    };

    handleRequest();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Sync API</h1>
      <pre>{message}</pre>
    </div>
  );
}

