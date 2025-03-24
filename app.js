// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const extractZip = require('extract-zip'); // For extracting ZIP files
const multer = require('multer');
const { exec } = require('child_process');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3999;

// Adjust BASE_DIRECTORY to your file storage location
const BASE_DIRECTORY = __dirname;

// Middleware
app.use(express.json());
app.use(cookieParser());
// For local testing needs, make sure the public directory exists
app.use(express.static(path.join(__dirname, 'public')));

// Add middleware to log cookies (debugging)
app.use((req, res, next) => {
  console.log("Cookies:", req.cookies);
  next();
});

// Simple password for login
const PASSWORD = 'admin';

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.cookies && req.cookies.auth === 'true') {
    return next();
  } else {
    return res.status(401).json({ error: 'Not authenticated' });
  }
}

// Login endpoint
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    // Set cookie with 24h maxAge, httpOnly, sameSite 'lax'
    res.cookie('auth', 'true', { 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax'
      // secure: true, // Enable if using HTTPS
    });
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: 'Invalid password' });
  }
});

// Endpoint to check login status
app.get('/check-login', (req, res) => {
  if (req.cookies && req.cookies.auth === 'true') {
    return res.json({ authenticated: true });
  } else {
    return res.json({ authenticated: false });
  }
});

// Apply authentication middleware for the following endpoints
app.use('/rename', isAuthenticated);
app.use('/delete', isAuthenticated);
app.use('/new-folder', isAuthenticated);
app.use('/new-file', isAuthenticated);
app.use('/save-file', isAuthenticated);
app.use('/move', isAuthenticated);
app.use('/copy', isAuthenticated);
app.use('/extract', isAuthenticated);
app.use('/upload', isAuthenticated);
app.use('/curl', isAuthenticated);

// moveFile function to handle EXDEV (cross-device) errors
function moveFile(source, target, callback) {
  fs.rename(source, target, function(err) {
    if (!err) return callback(null);
    if (err.code !== 'EXDEV') return callback(err);
    // If EXDEV error, perform copy and unlink source
    const readStream = fs.createReadStream(source);
    const writeStream = fs.createWriteStream(target);
    readStream.on('error', callback);
    writeStream.on('error', callback);
    writeStream.on('close', function() {
      fs.unlink(source, callback);
    });
    readStream.pipe(writeStream);
  });
}

// Endpoint to get file/folder list
app.get('/list', (req, res) => {
  const directory = req.query.dir ? path.join(BASE_DIRECTORY, req.query.dir) : BASE_DIRECTORY;
  fs.readdir(directory, { withFileTypes: true }, (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read directory' });
    }
    const fileList = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(req.query.dir || '', item.name)
    }));
    res.json(fileList);
  });
});

// Endpoint to read a file
app.get('/get-file', (req, res) => {
  const relativePath = req.query.path;
  if (!relativePath) return res.status(400).send("Path not provided.");
  const filePath = path.join(BASE_DIRECTORY, relativePath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return res.status(404).send("File not found.");

    // Set Content-Type based on extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    switch(ext) {
      case '.jpg':
      case '.jpeg': contentType = 'image/jpeg'; break;
      case '.png': contentType = 'image/png'; break;
      case '.gif': contentType = 'image/gif'; break;
      case '.bmp': contentType = 'image/bmp'; break;
      case '.webp': contentType = 'image/webp'; break;
      case '.svg': contentType = 'image/svg+xml'; break;
      case '.mp3': contentType = 'audio/mpeg'; break;
      case '.wav': contentType = 'audio/wav'; break;
      case '.ogg': contentType = 'audio/ogg'; break;
      case '.mp4': contentType = 'video/mp4'; break;
      case '.webm': contentType = 'video/webm'; break;
      case '.pdf': contentType = 'application/pdf'; break;
      // Add other extensions as needed
    }

    // Handle Range Requests for video/audio streaming
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
    }
  });
});

// Rename endpoint
app.post('/rename', (req, res) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) return res.status(400).json({ error: "Incomplete parameters." });
  const oldFullPath = path.join(BASE_DIRECTORY, oldPath);
  const newFullPath = path.join(path.dirname(oldFullPath), newName);
  fs.rename(oldFullPath, newFullPath, (err) => {
    if (err) return res.status(500).json({ error: "Failed to rename." });
    res.json({ success: true });
  });
});

// Delete endpoint
app.post('/delete', (req, res) => {
  const { path: relPath } = req.body;
  if (!relPath) return res.status(400).json({ error: "Path not provided." });
  const fullPath = path.join(BASE_DIRECTORY, relPath);
  fs.stat(fullPath, (err, stats) => {
    if (err) return res.status(404).json({ error: "Item not found." });
    if (stats.isDirectory()) {
      fs.rm(fullPath, { recursive: true, force: true }, (err) => {
        if (err) return res.status(500).json({ error: "Failed to delete folder." });
        res.json({ success: true });
      });
    } else {
      fs.unlink(fullPath, (err) => {
        if (err) return res.status(500).json({ error: "Failed to delete file." });
        res.json({ success: true });
      });
    }
  });
});

// New Folder endpoint
app.post('/new-folder', (req, res) => {
  const { directory = "", folderName } = req.body;
  if (!folderName) return res.status(400).json({ error: "Incomplete parameters." });
  const fullPath = path.join(BASE_DIRECTORY, directory, folderName);
  fs.mkdir(fullPath, { recursive: true }, (err) => {
    if (err) return res.status(500).json({ error: "Failed to create folder." });
    res.json({ success: true });
  });
});

// New File endpoint
app.post('/new-file', (req, res) => {
  const { directory = "", fileName } = req.body;
  if (!fileName) return res.status(400).json({ error: "Incomplete parameters." });
  const fullPath = path.join(BASE_DIRECTORY, directory, fileName);
  fs.writeFile(fullPath, '', (err) => {
    if (err) return res.status(500).json({ error: "Failed to create file." });
    res.json({ success: true });
  });
});

// Save File endpoint
app.post('/save-file', (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath) return res.status(400).json({ error: "Path not provided." });
  const filePath = path.join(BASE_DIRECTORY, relPath);
  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) return res.status(500).json({ error: "Failed to save file." });
    res.json({ success: true });
  });
});

// Move endpoint
app.post('/move', (req, res) => {
  const { source, destination } = req.body;
  if (!source || destination === undefined) return res.status(400).json({ error: "Incomplete parameters." });
  const sourcePath = path.join(BASE_DIRECTORY, source);
  const destPath = path.join(BASE_DIRECTORY, destination, path.basename(source));
  moveFile(sourcePath, destPath, (err) => {
    if (err) return res.status(500).json({ error: "Failed to move file/folder: " + err.message });
    res.json({ success: true });
  });
});

// Copy endpoint
app.post('/copy', (req, res) => {
  const { source, destination } = req.body;
  if (!source || destination === undefined) return res.status(400).json({ error: "Incomplete parameters." });
  const sourcePath = path.join(BASE_DIRECTORY, source);
  const destPath = path.join(BASE_DIRECTORY, destination, path.basename(source));
  fs.stat(sourcePath, (err, stats) => {
    if (err) return res.status(404).json({ error: "Source not found." });
    if (stats.isDirectory()) {
      fs.cp(sourcePath, destPath, { recursive: true }, (err) => {
        if (err) return res.status(500).json({ error: "Failed to copy folder." });
        res.json({ success: true });
      });
    } else {
      fs.copyFile(sourcePath, destPath, (err) => {
        if (err) return res.status(500).json({ error: "Failed to copy file." });
        res.json({ success: true });
      });
    }
  });
});

// Extract endpoint (for .zip files; RAR not implemented)
app.post('/extract', (req, res) => {
  const { path: relPath } = req.body;
  if (!relPath) return res.status(400).json({ error: "Path not provided." });
  const filePath = path.join(BASE_DIRECTORY, relPath);
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.zip') {
    const extractTo = filePath.slice(0, -4);
    extractZip(filePath, { dir: extractTo }, (err) => {
      if (err) return res.status(500).json({ error: "Failed to extract zip file." });
      res.json({ success: true });
    });
  } else if (ext === '.rar') {
    return res.status(501).json({ error: "RAR extraction not implemented." });
  } else {
    return res.status(400).json({ error: "Unsupported file type for extraction." });
  }
});

// Upload endpoint
const upload = multer({ dest: path.join(__dirname, 'uploads') });
app.post('/upload', upload.array('files'), (req, res) => {
  const destination = req.body.destination || "";
  console.log("Upload request received. Destination:", destination);
  
  const uploadPromises = req.files.map(file => {
    return new Promise((resolve, reject) => {
      const destDir = path.join(BASE_DIRECTORY, destination);
      const destPath = path.join(destDir, file.originalname);
      console.log(`Processing file "${file.originalname}". Will be saved to: ${destPath}`);
      
      fs.mkdir(destDir, { recursive: true }, (err) => {
        if (err) {
          console.error(`Failed to create folder ${destDir}: ${err.message}`);
          return reject(`Failed to create folder ${destDir}: ${err.message}`);
        }
        moveFile(file.path, destPath, (err) => {
          if (err) {
            console.error(`Failed to move file ${file.originalname}: ${err.message}`);
            return reject(`Failed to move file ${file.originalname}: ${err.message}`);
          }
          console.log(`File "${file.originalname}" successfully moved to: ${destPath}`);
          resolve(destPath);
        });
      });
    });
  });
  
  Promise.allSettled(uploadPromises)
    .then(results => {
      const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
      if (errors.length > 0) {
        res.status(500).json({ error: errors.join("; ") });
      } else {
        res.json({ success: true });
      }
    });
});

// Curl endpoint
app.post('/curl', (req, res) => {
  const { url, destination } = req.body;
  if (!url) return res.status(400).json({ error: "URL not provided." });
  const destFolder = path.join(BASE_DIRECTORY, destination || "");
  fs.mkdir(destFolder, { recursive: true }, (err) => {
    if (err) return res.status(500).json({ error: "Failed to create destination folder." });
    const fileName = path.basename(url.split('?')[0]);
    const destPath = path.join(destFolder, fileName);
    exec(`curl -L "${url}" -o "${destPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`curl error: ${error}`);
        return res.status(500).json({ error: "Failed to download file with curl." });
      }
      console.log(`File from ${url} successfully downloaded to: ${destPath}`);
      res.json({ success: true });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
