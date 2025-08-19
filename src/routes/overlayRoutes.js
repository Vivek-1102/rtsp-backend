// routes/overlayRoutes.js
import express from 'express';
import {
  createOverlay,
  getOverlays,
  updateOverlay,
  deleteOverlay
} from '../controllers/overlayController.js';

const router = express.Router();

// Route for POST (create) and GET (read all)
router.route('/').post(createOverlay).get(getOverlays);

// Route for PUT (update) and DELETE
router.route('/:id').put(updateOverlay).delete(deleteOverlay);

export default router;