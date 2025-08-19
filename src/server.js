import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import NodeMediaServer from 'node-media-server';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import connectDB from './config/db.js';
import overlayRoutes from './routes/overlayRoutes.js';

// =================================================================
// Configuration
// =================================================================
// IMPORTANT: VERIFY THIS PATH IS 100% CORRECT FOR YOUR MACHINE
const ffmpegPath = 'C:/ffmpeg/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe';

let ffmpegProcess = null;

// Ensure the upload directory exists
const uploadDir = 'src/public/uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

async function startFFmpegStream(inputStreamUrl) {
  if (ffmpegProcess) {
    console.log('[FFMPEG] Process is already running. Killing old process...');
    ffmpegProcess.kill();
  }

  let overlays = [];
  try {
    const response = await fetch('http://localhost:5000/api/overlays');
    if (response.ok) overlays = await response.json();
  } catch (error) {
    console.error('[FFMPEG] Could not fetch overlays:', error.message);
  }

  // --- Dynamic FFmpeg Argument Building ---
  const args = ['-loglevel', 'verbose', '-i', inputStreamUrl];
  
  const logoOverlays = overlays.filter(o => o.type === 'logo' && o.content);
  const textOverlays = overlays.filter(o => o.type === 'text');
  
  const filterableOverlays = [...logoOverlays, ...textOverlays];
  let lastVideoStreamTag = '[0:v]';
  
  if (filterableOverlays.length > 0) {
    const filterComplexParts = [];
    
    // Add inputs for all logos first
    logoOverlays.forEach(overlay => {
      // Use process.cwd() to get an absolute path, which is more reliable
      const logoPath = path.join(process.cwd(), 'src/public', overlay.content);
      if (fs.existsSync(logoPath)) {
        args.push('-i', logoPath);
      } else {
        console.warn(`[FFMPEG] Logo file not found at: ${logoPath}`);
      }
    });

    let logoInputCounter = 1;
    filterableOverlays.forEach((overlay, index) => {
      const isLastFilter = index === filterableOverlays.length - 1;
      const nextVideoStreamTag = `[v${index}]`;

      if (overlay.type === 'logo' && overlay.content) {
        const logoPath = path.join(process.cwd(), 'src/public', overlay.content);
        if (fs.existsSync(logoPath)) {
            const currentLogoInputTag = `[${logoInputCounter}:v]`;
            logoInputCounter++;
            filterComplexParts.push(`${lastVideoStreamTag}${currentLogoInputTag}overlay=${overlay.position.x}:${overlay.position.y}${isLastFilter ? '' : nextVideoStreamTag}`);
            if (!isLastFilter) lastVideoStreamTag = nextVideoStreamTag;
        }
      }
      
      if (overlay.type === 'text') {
        const sanitizedText = overlay.content.replace(/'/g, "'\\''").replace(/:/g, "\\:");
        filterComplexParts.push(`${lastVideoStreamTag}drawtext=text='${sanitizedText}':x=${overlay.position.x}:y=${overlay.position.y}:fontsize=${overlay.size.height}:fontcolor=white:box=1:boxcolor=black@0.5${isLastFilter ? '' : nextVideoStreamTag}`);
        if (!isLastFilter) lastVideoStreamTag = nextVideoStreamTag;
      }
    });
    
    if (filterComplexParts.length > 0) {
      args.push('-filter_complex', filterComplexParts.join(';'));
    }
  }

   args.push(
    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    
    // --- ADD THIS LINE TO FORCE KEYFRAMES ---
    '-g', '60',
    
    '-c:a', 'aac', '-ar', '44100',
    '-f', 'flv',
    'rtmp://localhost:1935/live/stream'
  );

  console.log('🚀 [FFMPEG] Starting process with command:', `${ffmpegPath} ${args.join(' ')}`);
  
  try {
    ffmpegProcess = spawn(ffmpegPath, args);
    ffmpegProcess.stderr.on('data', (data) => console.log(`[FFMPEG]: ${data.toString()}`));
    ffmpegProcess.on('close', (code) => {
      console.log(`🛑 [FFMPEG] Process exited with code ${code}`);
      ffmpegProcess = null;
    });
    ffmpegProcess.on('error', (err) => {
      console.error('❌ [FFMPEG] Failed to start process:', err);
      ffmpegProcess = null;
    });
  } catch (error) {
     console.error('❌ [FFMPEG] CRITICAL: Error spawning FFmpeg:', error);
  }
}

// =================================================================
// 1. Node Media Server
// =================================================================
const nmsConfig = {
  logType: 1,
  rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 30, ping_timeout: 60 },
  http: { port: 8000, allow_origin: '*' },
  auth: { api: true, api_user: 'admin', api_pass: 'admin' }
};

const nms = new NodeMediaServer(nmsConfig);
nms.run();

// =================================================================
// 2. Express API Server
// =================================================================
connectDB();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(express.static('src/public'));

// --- Multer Config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// --- API Routes ---
app.use('/api/overlays', overlayRoutes);

app.post('/api/upload', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
});

app.post('/api/stream/start', (req, res) => {
    const { rtspUrl } = req.body;
    if (!rtspUrl) {
      return res.status(400).json({ message: 'rtspUrl is required' });
    }
    startFFmpegStream(rtspUrl);
    res.status(200).json({ message: 'Stream start initiated.' });
});

app.post('/api/stream/stop', (req, res) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill();
    res.status(200).json({ message: 'Stream stopped successfully.' });
  } else {
    res.status(400).json({ message: 'No stream is currently running.' });
  }
});

// Restart is just an alias for start, which already handles killing the old process
app.post('/api/stream/restart', (req, res) => {
    const { rtspUrl } = req.body;
     if (!rtspUrl) {
      // In a real app, you might want to fetch the last used URL from a DB
      return res.status(400).json({ message: 'rtspUrl is required to restart.' });
    }
    console.log('[API] Restarting stream...');
    startFFmpegStream(rtspUrl);
    res.status(200).json({ message: 'Stream restart initiated.' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API Server is running' });
});

app.listen(PORT, () => console.log(`✅ [API] Express server running on port ${PORT}`));

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  if (ffmpegProcess) {
    ffmpegProcess.kill();
  }
  nms.stop();
  process.exit(0);
});