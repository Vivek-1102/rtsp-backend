// src/routes/streamRoutes.js

import express from 'express';
import Stream from 'node-rtsp-stream';

const router = express.Router();
let stream;

router.post('/start', (req, res) => {
  const { rtspUrl } = req.body;
  if (!rtspUrl) {
    return res.status(400).json({ message: 'RTSP URL is required' });
  }

  if (stream) {
    stream.stop();
  }

  try {
    stream = new Stream({
      name: 'livestream',
      streamUrl: rtspUrl,
      wsPort: 9999,
      // -- START OF UPDATED OPTIONS --
      ffmpegOptions: {
        '-stats': '',
        '-r': 30, // frames per second
        '-f': 'mpegts', // output format
        '-codec:v': 'mpeg1video', // video codec
        '-b:v': '1000k', // video bitrate
        '-bf': '0', // no B-frames
        '-an': '', // no audio
      },
      // -- END OF UPDATED OPTIONS --
    });
    console.log(`Stream started from ${rtspUrl} on ws://localhost:9999`);
    res.status(200).json({ message: 'Stream started successfully on WebSocket port 9999' });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ message: 'Failed to start stream' });
  }
});

export default router;