import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Map } from '../models/Map';
import { User } from '../models/User';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const mapRepository = AppDataSource.getRepository(Map);
const userRepository = AppDataSource.getRepository(User);

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/assets');
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch { }

// Multer config for asset uploads (GLB, GLTF, OBJ, FBX, PNG, JPG, etc.)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.glb', '.gltf', '.obj', '.fbx', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type: ' + ext));
    }
  },
});

// Helper: check if the requesting user is admin (Luckmuc)
async function isAdmin(userId: string): Promise<boolean> {
  const user = await userRepository.findOne({ where: { id: userId } });
  return user?.username === 'Luckmuc';
}

// ---- GET all public maps ----
router.get('/', async (req, res: Response) => {
  try {
    const maps = await mapRepository.find({ where: { isPublic: true } });
    res.json(maps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
});

// ---- GET user's own maps ----
router.get('/user/maps', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const maps = await mapRepository.find({ where: { creatorId: userId } });
    res.json(maps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
});

// ---- GET single map ----
router.get('/:mapId', async (req: any, res: Response) => {
  try {
    const map = await mapRepository.findOne({ where: { id: req.params.mapId } });
    if (!map) return res.status(404).json({ error: 'Map not found' });
    res.json(map);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch map' });
  }
});

// ---- POST create map ----
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, checkpoints, trackPath, obstacles, sceneData, assets, difficulty, isPublic } = req.body;
    const userId = req.user!.userId;

    if (!name) {
      return res.status(400).json({ error: 'Map name is required' });
    }

    // Only admin (Luckmuc) can create public maps
    const adminUser = await isAdmin(userId);
    const mapIsPublic = adminUser ? (isPublic || false) : false;

    const map = mapRepository.create({
      name,
      description: description || '',
      checkpoints: checkpoints || [],
      trackPath: trackPath || [],
      obstacles: obstacles || [],
      sceneData: sceneData || [],
      assets: assets || [],
      difficulty: difficulty || 3,
      isPublic: mapIsPublic,
      creatorId: userId,
    });

    await mapRepository.save(map);
    res.json(map);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save map' });
  }
});

// ---- PUT update map ----
router.put('/:mapId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const map = await mapRepository.findOne({ where: { id: req.params.mapId } });
    if (!map) return res.status(404).json({ error: 'Map not found' });
    if (map.creatorId !== req.user!.userId) return res.status(403).json({ error: 'Not authorized' });

    const { name, description, checkpoints, trackPath, obstacles, sceneData, assets, difficulty, isPublic } = req.body;
    const adminUser = await isAdmin(req.user!.userId);

    Object.assign(map, {
      name: name ?? map.name,
      description: description ?? map.description,
      checkpoints: checkpoints ?? map.checkpoints,
      trackPath: trackPath ?? map.trackPath,
      obstacles: obstacles ?? map.obstacles,
      sceneData: sceneData ?? map.sceneData,
      assets: assets ?? map.assets,
      difficulty: difficulty ?? map.difficulty,
      isPublic: adminUser ? (isPublic ?? map.isPublic) : false,
    });

    await mapRepository.save(map);
    res.json(map);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update map' });
  }
});

// ---- DELETE map ----
router.delete('/:mapId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const map = await mapRepository.findOne({ where: { id: req.params.mapId } });
    if (!map) return res.status(404).json({ error: 'Map not found' });
    if (map.creatorId !== req.user!.userId) {
      const adminUser = await isAdmin(req.user!.userId);
      if (!adminUser) return res.status(403).json({ error: 'Not authorized' });
    }
    await mapRepository.remove(map);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete map' });
  }
});

// ---- DELETE admin clear all maps ----
router.delete('/admin/clear-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const adminUser = await isAdmin(req.user!.userId);
    if (!adminUser) return res.status(403).json({ error: 'Admin only' });
    await mapRepository.clear();
    res.json({ success: true, message: 'All maps deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to clear maps' });
  }
});

// ---- POST upload asset file ----
router.post('/upload-asset', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/assets/${req.file.filename}`;
    res.json({
      name: req.file.originalname,
      url,
      type: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
      size: req.file.size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
