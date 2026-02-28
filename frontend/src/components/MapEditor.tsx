import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, usePageParams } from './Router';
import { useGame } from '../contexts/GameContext';
import { mapsService } from '../services/api';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import '../styles/Editor.css';

// ---- Built-in item definitions ----
interface PaletteItem {
  id: string;
  name: string;
  category: 'track' | 'structure' | 'marker' | 'uploaded';
  icon: string;
  createMesh: () => THREE.Object3D;
  url?: string; // for uploaded assets
}

const BUILT_IN_ITEMS: PaletteItem[] = [
  {
    id: 'track_straight', name: 'Straight Track', category: 'track', icon: '━',
    createMesh: () => {
      const geo = new THREE.BoxGeometry(10, 0.3, 40);
      const mat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      return mesh;
    }
  },
  {
    id: 'track_curve', name: 'Curved Track', category: 'track', icon: '↪',
    createMesh: () => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 20, 0, Math.PI / 2, false);
      shape.lineTo(0, 15);
      shape.absarc(0, 0, 15, Math.PI / 2, 0, true);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      return mesh;
    }
  },
  {
    id: 'track_ramp', name: 'Ramp', category: 'track', icon: '⟋',
    createMesh: () => {
      const geo = new THREE.BoxGeometry(10, 0.3, 20);
      const mat = new THREE.MeshStandardMaterial({ color: 0x666633, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -0.2;
      mesh.position.y = 2;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      return mesh;
    }
  },
  {
    id: 'track_loop', name: 'Looping', category: 'track', icon: '⟳',
    createMesh: () => {
      const curve = new THREE.TorusGeometry(12, 1.5, 8, 32, Math.PI * 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0x995500, roughness: 0.5, metalness: 0.3 });
      const mesh = new THREE.Mesh(curve, mat);
      mesh.rotation.y = Math.PI / 2;
      mesh.position.y = 12;
      mesh.castShadow = true;
      return mesh;
    }
  },
  {
    id: 'building_box', name: 'Building (Box)', category: 'structure', icon: '▮',
    createMesh: () => {
      const geo = new THREE.BoxGeometry(8, 15, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 7.5;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
  },
  {
    id: 'building_cylinder', name: 'Tower', category: 'structure', icon: '◯',
    createMesh: () => {
      const geo = new THREE.CylinderGeometry(4, 4, 20, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x7788aa, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 10;
      mesh.castShadow = true;
      return mesh;
    }
  },
  {
    id: 'barrier', name: 'Barrier', category: 'structure', icon: '▬',
    createMesh: () => {
      const geo = new THREE.BoxGeometry(1, 2, 10);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1;
      mesh.castShadow = true;
      return mesh;
    }
  },
  {
    id: 'spawn', name: 'Spawn Point', category: 'marker', icon: '⚑',
    createMesh: () => {
      const group = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x44ff44 })
      );
      pole.position.y = 2.5;
      group.add(pole);
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.5, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22aa22, emissiveIntensity: 0.5 })
      );
      flag.position.set(1.25, 4.25, 0);
      group.add(flag);
      return group;
    }
  },
  {
    id: 'checkpoint', name: 'Checkpoint', category: 'marker', icon: '⊙',
    createMesh: () => {
      const geo = new THREE.TorusGeometry(5, 0.4, 8, 24);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = Math.PI / 2;
      mesh.position.y = 5;
      return mesh;
    }
  },
];

// ---- Placed object data ----
interface PlacedObject {
  uid: string;
  itemId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  url?: string;
}

// ---- Main Editor Component ----
export const MapEditor: React.FC = () => {
  const navigate = useNavigate();
  const params = usePageParams();
  const { state } = useGame();

  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const objectMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const animIdRef = useRef(0);

  const [mapName, setMapName] = useState('');
  const [mapDesc, setMapDesc] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [uploadedItems, setUploadedItems] = useState<PaletteItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [existingAssets, setExistingAssets] = useState<any[]>([]);

  const isAdmin = state.user?.username === 'Luckmuc';

  // ---- Initialize Three.js scene ----
  useEffect(() => {
    if (!canvasRef.current) return;

    const container = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.5, 5000);
    camera.position.set(50, 40, 50);
    cameraRef.current = camera;

    // Orbit controls (creative mode)
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.1;
    orbit.maxPolarAngle = Math.PI * 0.48;
    orbitRef.current = orbit;

    // Transform controls
    const transform = new TransformControls(camera, renderer.domElement);
    transform.addEventListener('dragging-changed', (e: any) => {
      orbit.enabled = !e.value;
    });
    transform.addEventListener('objectChange', () => {
      // Sync state when object is transformed
      const obj = transform.object;
      if (!obj) return;
      const uid = (obj.userData as any).uid as string;
      if (!uid) return;
      setPlacedObjects(prev => prev.map(o => {
        if (o.uid !== uid) return o;
        return {
          ...o,
          position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
          scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
        };
      }));
    });
    scene.add(transform);
    transformRef.current = transform;

    // Lighting
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.6);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(200, 300, 150);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    scene.add(sun);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x556b2f,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);

    // Grid helper
    const grid = new THREE.GridHelper(500, 50, 0x888888, 0x444444);
    grid.position.y = 0.05;
    scene.add(grid);

    // Click raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const allObjects = Array.from(objectMapRef.current.values());
      const intersects = raycaster.intersectObjects(allObjects, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.uid) obj = obj.parent as THREE.Object3D;
        if (obj.userData.uid) {
          setSelectedUid(obj.userData.uid);
          transform.attach(obj);
          return;
        }
      }

      // Deselect
      setSelectedUid(null);
      transform.detach();
    };

    renderer.domElement.addEventListener('click', onClick);

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Update transform mode
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  // Load existing map data if editing
  useEffect(() => {
    if (params.mapId) {
      setIsEditing(true);
      mapsService.getMap(params.mapId).then(r => {
        const map = r.data;
        setMapName(map.name || '');
        setMapDesc(map.description || '');
        setDifficulty(map.difficulty || 3);
        setExistingAssets(map.assets || []);

        // Rebuild placed objects from sceneData
        if (map.sceneData && Array.isArray(map.sceneData)) {
          map.sceneData.forEach((obj: PlacedObject) => {
            addObjectToScene(obj.itemId, obj.position, obj.rotation, obj.scale, obj.uid, obj.url);
          });
        }
      }).catch(err => {
        console.error('Failed to load map:', err);
        setMessage('Failed to load map data');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.mapId]);

  // ---- Add an object to the 3D scene ----
  const addObjectToScene = useCallback((
    itemId: string,
    pos?: { x: number; y: number; z: number },
    rot?: { x: number; y: number; z: number },
    scl?: { x: number; y: number; z: number },
    existingUid?: string,
    assetUrl?: string,
  ) => {
    const uid = existingUid || `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const position = pos || { x: 0, y: 0, z: 0 };
    const rotation = rot || { x: 0, y: 0, z: 0 };
    const scale = scl || { x: 1, y: 1, z: 1 };

    // Check built-in items
    const builtIn = BUILT_IN_ITEMS.find(i => i.id === itemId);

    if (builtIn) {
      const obj = builtIn.createMesh();
      obj.position.set(position.x, position.y, position.z);
      obj.rotation.set(rotation.x, rotation.y, rotation.z);
      obj.scale.set(scale.x, scale.y, scale.z);
      obj.userData.uid = uid;
      obj.userData.itemId = itemId;
      sceneRef.current?.add(obj);
      objectMapRef.current.set(uid, obj);

      setPlacedObjects(prev => [...prev, { uid, itemId, position, rotation, scale }]);
    } else if (assetUrl || (itemId.startsWith('uploaded_'))) {
      // Load GLB asset
      const url = assetUrl || '';
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);

      loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0 && maxDim > 20) {
          model.scale.setScalar(10 / maxDim);
        }

        model.position.set(position.x, position.y, position.z);
        model.rotation.set(rotation.x, rotation.y, rotation.z);
        model.scale.set(scale.x, scale.y, scale.z);
        model.userData.uid = uid;
        model.userData.itemId = itemId;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).castShadow = true;
            (child as THREE.Mesh).receiveShadow = true;
          }
        });

        sceneRef.current?.add(model);
        objectMapRef.current.set(uid, model);
      }, undefined, (err) => {
        console.error('Failed to load asset:', err);
      });

      setPlacedObjects(prev => [...prev, { uid, itemId, position, rotation, scale, url: assetUrl }]);
    }
  }, []);

  // ---- Place item from palette ----
  const handlePlaceItem = useCallback((item: PaletteItem) => {
    const camera = cameraRef.current;
    if (!camera) return;

    // Place in front of camera
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pos = camera.position.clone().add(dir.multiplyScalar(30));
    pos.y = 0;

    addObjectToScene(item.id, { x: pos.x, y: pos.y, z: pos.z }, undefined, undefined, undefined, item.url);
  }, [addObjectToScene]);

  // ---- Delete selected object ----
  const handleDelete = useCallback(() => {
    if (!selectedUid) return;
    const obj = objectMapRef.current.get(selectedUid);
    if (obj) {
      transformRef.current?.detach();
      sceneRef.current?.remove(obj);
      objectMapRef.current.delete(selectedUid);
    }
    setPlacedObjects(prev => prev.filter(o => o.uid !== selectedUid));
    setSelectedUid(null);
  }, [selectedUid]);

  // ---- Upload asset file ----
  const handleUploadAsset = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setMessage('Uploading...');
      const res = await mapsService.uploadAsset(file);
      const asset = res.data;
      setMessage(`Uploaded: ${asset.name}`);

      // Add as palette item
      const ext = asset.type;
      if (['glb', 'gltf', 'obj', 'fbx'].includes(ext)) {
        const newItem: PaletteItem = {
          id: `uploaded_${Date.now()}`,
          name: asset.name,
          category: 'uploaded',
          icon: '📦',
          url: asset.url,
          createMesh: () => new THREE.Group(), // placeholder, GLB loads async
        };
        setUploadedItems(prev => [...prev, newItem]);
        setExistingAssets(prev => [...prev, asset]);
      } else {
        // Texture — just save reference
        setExistingAssets(prev => [...prev, asset]);
        setMessage(`Texture uploaded: ${asset.name}. Apply it to objects via the inspector.`);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Upload failed');
    }
  }, []);

  // ---- Save map ----
  const handleSave = useCallback(async () => {
    if (!mapName) {
      setMessage('Map name required');
      return;
    }

    setSaving(true);
    try {
      // Extract checkpoints from spawn/checkpoint markers
      const checkpoints: any[] = [];
      let spawnPos = { x: 0, y: 0, z: 0 };

      placedObjects.forEach(obj => {
        if (obj.itemId === 'checkpoint') {
          checkpoints.push({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
        }
        if (obj.itemId === 'spawn') {
          spawnPos = { ...obj.position };
        }
      });

      // Insert spawn as first checkpoint
      checkpoints.unshift(spawnPos);

      const mapData = {
        name: mapName,
        description: mapDesc || 'Custom map',
        checkpoints,
        trackPath: checkpoints,
        obstacles: [],
        sceneData: placedObjects,
        assets: existingAssets,
        difficulty,
        isPublic: isAdmin ? true : false,
      };

      if (isEditing && params.mapId) {
        await mapsService.updateMap(params.mapId, mapData);
        setMessage('Map updated!');
      } else {
        await mapsService.createMap(mapData);
        setMessage('Map saved!');
      }
      setTimeout(() => navigate('maps'), 1500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to save map');
    } finally {
      setSaving(false);
    }
  }, [mapName, mapDesc, difficulty, placedObjects, existingAssets, isAdmin, isEditing, params.mapId, navigate]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedUid && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          handleDelete();
        }
      }
      if (e.key === 'w') setTransformMode('translate');
      if (e.key === 'e') setTransformMode('rotate');
      if (e.key === 'r') setTransformMode('scale');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedUid, handleDelete]);

  const allItems = [...BUILT_IN_ITEMS, ...uploadedItems];
  const categories = [
    { key: 'track', label: 'Track Pieces' },
    { key: 'structure', label: 'Structures' },
    { key: 'marker', label: 'Markers' },
    { key: 'uploaded', label: 'Uploaded Assets' },
  ];

  return (
    <div className="editor-fullscreen">
      {/* 3D Viewport */}
      <div ref={canvasRef} className="editor-viewport" />

      {/* Top toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={() => navigate('maps')}>← Back</button>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="Map Name..."
            className="toolbar-input"
          />
        </div>
        <div className="toolbar-center">
          <button
            className={`toolbar-btn ${transformMode === 'translate' ? 'active' : ''}`}
            onClick={() => setTransformMode('translate')}
            title="Move (W)"
          >Move</button>
          <button
            className={`toolbar-btn ${transformMode === 'rotate' ? 'active' : ''}`}
            onClick={() => setTransformMode('rotate')}
            title="Rotate (E)"
          >Rotate</button>
          <button
            className={`toolbar-btn ${transformMode === 'scale' ? 'active' : ''}`}
            onClick={() => setTransformMode('scale')}
            title="Scale (R)"
          >Scale</button>
          {selectedUid && (
            <button className="toolbar-btn danger" onClick={handleDelete}>Delete</button>
          )}
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Map'}
          </button>
        </div>
      </div>

      {/* Item Palette Sidebar */}
      <div className={`editor-palette ${paletteOpen ? 'open' : 'closed'}`}>
        <button className="palette-toggle" onClick={() => setPaletteOpen(!paletteOpen)}>
          {paletteOpen ? '◀' : '▶'}
        </button>
        {paletteOpen && (
          <div className="palette-content">
            <h3 className="palette-title">Items</h3>

            {categories.map(cat => {
              const items = allItems.filter(i => i.category === cat.key);
              if (items.length === 0 && cat.key !== 'uploaded') return null;
              return (
                <div key={cat.key} className="palette-category">
                  <h4 className="category-label">{cat.label}</h4>
                  <div className="palette-items">
                    {items.map(item => (
                      <button
                        key={item.id}
                        className="palette-item-btn"
                        onClick={() => handlePlaceItem(item)}
                        title={item.name}
                      >
                        <span className="palette-icon">{item.icon}</span>
                        <span className="palette-name">{item.name}</span>
                      </button>
                    ))}
                  </div>
                  {cat.key === 'uploaded' && (
                    <label className="upload-btn">
                      + Upload Asset
                      <input
                        type="file"
                        accept=".glb,.gltf,.obj,.fbx,.png,.jpg,.jpeg,.webp"
                        onChange={handleUploadAsset}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              );
            })}

            {/* Map settings */}
            <div className="palette-category">
              <h4 className="category-label">Map Settings</h4>
              <div className="palette-settings">
                <textarea
                  value={mapDesc}
                  onChange={e => setMapDesc(e.target.value)}
                  placeholder="Description..."
                  className="settings-textarea"
                  rows={2}
                />
                <label className="settings-label">
                  Difficulty
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={difficulty}
                    onChange={e => setDifficulty(parseInt(e.target.value))}
                  />
                  <span>{difficulty}/5</span>
                </label>
              </div>
            </div>

            {/* Placed objects list */}
            <div className="palette-category">
              <h4 className="category-label">Scene ({placedObjects.length})</h4>
              <div className="scene-list">
                {placedObjects.map(obj => (
                  <div
                    key={obj.uid}
                    className={`scene-item ${selectedUid === obj.uid ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedUid(obj.uid);
                      const mesh = objectMapRef.current.get(obj.uid);
                      if (mesh) transformRef.current?.attach(mesh);
                    }}
                  >
                    <span>{BUILT_IN_ITEMS.find(i => i.id === obj.itemId)?.name || obj.itemId}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message toast */}
      {message && <div className="editor-toast">{message}</div>}

      {/* Help hint */}
      <div className="editor-hint">
        W = Move &nbsp; E = Rotate &nbsp; R = Scale &nbsp; Del = Delete &nbsp; Click = Select
      </div>
    </div>
  );
};

export default MapEditor;
