// Vite plugin for sync API
// Note: This runs in Node.js environment, not browser, so we can't use IndexedDB directly
// Instead, we'll just acknowledge requests and return empty data

export function syncApiPlugin() {
  return {
    name: 'sync-api',
    configureServer(server) {
      server.middlewares.use('/api/sync/upload', async (req, res, next) => {
        if (req.method === 'POST') {
          try {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const result = await handleUpload(data);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify(result));
              } catch (error) {
                console.error('Upload error:', error);
                res.statusCode = 500;
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({
                  success: false,
                  message: 'Internal server error',
                }));
              }
            });
          } catch (error) {
            console.error('Upload error:', error);
            res.statusCode = 500;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              success: false,
              message: 'Internal server error',
            }));
          }
        } else {
          next();
        }
      });

      server.middlewares.use('/api/sync/download', async (req, res, next) => {
        if (req.method === 'GET') {
          try {
            const since = req.url.split('since=')[1] || '1970-01-01T00:00:00Z';
            const result = await handleDownload(decodeURIComponent(since));
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(result));
          } catch (error) {
            console.error('Download error:', error);
            res.statusCode = 500;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              success: false,
              message: 'Internal server error',
            }));
          }
        } else {
          next();
        }
      });
    }
  };
}

// Sync handlers (Server-side, no IndexedDB available)
async function handleUpload(request) {
  try {
    console.log(`[Sync API] Received ${request.changes?.length || 0} changes from mobile`);
    
    // Acknowledge the upload
    // In production, you would save these to a database
    
    return {
      success: true,
      message: `Successfully acknowledged ${request.changes?.length || 0} changes`,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function handleDownload(since) {
  try {
    console.log(`[Sync API] Download requested since: ${since}`);
    
    // Return empty changes since this is server-side
    // In production, you would fetch from a database
    
    return {
      success: true,
      message: `Found 0 changes since ${since}`,
      changes: [],
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      success: false,
      message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
