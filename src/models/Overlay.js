// models/Overlay.js
import mongoose from 'mongoose';

const OverlaySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['text', 'logo'],
  },
  content: {
    type: String,
    required: true,
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  size: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
}, { timestamps: true });

export default mongoose.model('Overlay', OverlaySchema);