const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Import sync handlers
const { handleUpload, handleDownload } = require('./src/api/sync-server.js');

// Sync API routes
app.post('/api/sync/upload', async (req, res) => {
  try {
    const result = await handleUpload(req.body);
    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/sync/download', async (req, res) => {
  try {
    const since = req.query.since || '1970-01-01T00:00:00Z';
    const result = await handleDownload(since);
    res.json(result);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Serve the web app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Sync API available at http://localhost:${PORT}/api/sync/`);
});
