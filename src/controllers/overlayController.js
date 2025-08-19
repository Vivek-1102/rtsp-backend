// controllers/overlayController.js
import Overlay from '../models/Overlay.js';

// CREATE: Create and save a new overlay setting
export const createOverlay = async (req, res) => {
  try {
    const newOverlay = new Overlay(req.body);
    const savedOverlay = await newOverlay.save();
    res.status(201).json(savedOverlay);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// READ: Retrieve all saved overlay settings
export const getOverlays = async (req, res) => {
  try {
    const overlays = await Overlay.find();
    res.status(200).json(overlays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE: Modify an existing overlay setting by its ID
export const updateOverlay = async (req, res) => {
  try {
    const updatedOverlay = await Overlay.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedOverlay) return res.status(404).json({ message: 'Overlay not found' });
    res.status(200).json(updatedOverlay);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE: Delete a saved overlay setting by its ID
export const deleteOverlay = async (req, res) => {
  try {
    const deletedOverlay = await Overlay.findByIdAndDelete(req.params.id);
    if (!deletedOverlay) return res.status(404).json({ message: 'Overlay not found' });
    res.status(200).json({ message: 'Overlay deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};