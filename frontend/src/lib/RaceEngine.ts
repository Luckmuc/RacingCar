import * as THREE from 'three';
import { Map as GameMap } from '../types';

export class CarPhysics {
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  acceleration: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  rotation: number = 0;
  speed: number = 0;
  
  maxSpeed: number = 200;
  acceleration_power: number = 0.1;
  friction: number = 0.98;
  handling: number = 0.05;
  
  // Damage system
  condition: number = 100;
  damageThreshold: number = 5;

  update(deltaTime: number) {
    // Apply friction
    this.velocity.multiplyScalar(this.friction);
    
    // Apply acceleration
    this.velocity.addScaledVector(this.acceleration, deltaTime);
    
    // Limit speed
    const speed = this.velocity.length();
    if (speed > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }
    
    // Update position
    this.position.addScaledVector(this.velocity, deltaTime);
    
    // Update speed for display
    this.speed = this.velocity.length();
  }

  setInput(forward: number, turn: number) {
    this.acceleration = new THREE.Vector3(
      Math.sin(this.rotation) * forward,
      0,
      Math.cos(this.rotation) * forward
    );
    
    this.rotation += turn * this.handling;
  }

  takeDamage(amount: number = this.damageThreshold) {
    this.condition = Math.max(0, this.condition - amount);
  }

  reset() {
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.rotation = 0;
    this.speed = 0;
  }
}

export class RaceScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  map: GameMap;
  playerCar: CarPhysics;
  opponents: CarPhysics[] = [];
  checkpoints: THREE.Vector3[] = [];
  currentCheckpoint: number = 0;
  raceFinished: boolean = false;
  raceTime: number = 0;
  
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, map: GameMap) {
    this.map = map;
    
    // Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050812);
    this.scene.fog = new THREE.Fog(0x050812, 500, 1500);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    
    // Lighting
    this.setupLighting();
    
    // Player car
    this.playerCar = new CarPhysics();
    this.playerCar.maxSpeed = 200;
    
    // Parse checkpoints from map data
    this.checkpoints = map.checkpoints.map((cp: any) =>
      new THREE.Vector3(cp.x || 0, cp.y || 0, cp.z || 0)
    );
    
    // Build track
    this.buildTrack();
    
    // Resize handler
    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.far = 1000;
    this.scene.add(dirLight);
    
    // Point lights for effect
    const pointLight = new THREE.PointLight(0x00d4ff, 0.5);
    pointLight.position.set(0, 50, 0);
    this.scene.add(pointLight);
  }

  private buildTrack() {
    // Create track from path points
    if (this.map.trackPath && this.map.trackPath.length > 0) {
      const trackPoints = this.map.trackPath.map((point: any) =>
        new THREE.Vector3(point.x || 0, point.y || 0, point.z || 0)
      );
      
      const trackGeometry = new THREE.BufferGeometry();
      trackGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(trackPoints.flatMap(p => [p.x, p.y, p.z])), 3)
      );
      
      const trackMaterial = new THREE.LineBasicMaterial({
        color: 0x00d4ff,
        linewidth: 50,
      });
      
      const trackLine = new THREE.Line(trackGeometry, trackMaterial);
      this.scene.add(trackLine);
    }
    
    // Create checkpoint markers
    this.checkpoints.forEach((cp, i) => {
      const geometry = new THREE.CylinderGeometry(30, 30, 5, 32);
      const material = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x00ff41 : 0x00d4ff,
        metalness: 0.7,
        roughness: 0.2,
      });
      const checkpoint = new THREE.Mesh(geometry, material);
      checkpoint.position.copy(cp);
      checkpoint.castShadow = true;
      checkpoint.receiveShadow = true;
      this.scene.add(checkpoint);
    });
    
    // Create obstacles
    if (this.map.obstacles) {
      this.map.obstacles.forEach((obs: any) => {
        const geometry = new THREE.BoxGeometry(40, 50, 40);
        const material = new THREE.MeshStandardMaterial({
          color: 0xff006e,
          metalness: 0.5,
          roughness: 0.4,
        });
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.set(obs.x || 0, obs.y || 0, obs.z || 0);
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        this.scene.add(obstacle);
      });
    }
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2f4a,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  createCarMesh(color: number = 0x00d4ff): THREE.Group {
    const carGroup = new THREE.Group();
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(20, 30, 50);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.8,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(12, 12, 8, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.3,
    });
    
    const wheelPositions = [
      [-12, 5, 15],
      [12, 5, 15],
      [-12, 5, -15],
      [12, 5, -15],
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...(pos as [number, number, number]));
      wheel.castShadow = true;
      carGroup.add(wheel);
    });
    
    // Headlights effect
    const lightGeometry = new THREE.SphereGeometry(4, 8, 8);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    const lights = [
      [-8, 15, 25],
      [8, 15, 25],
    ];
    
    lights.forEach(pos => {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(...(pos as [number, number, number]));
      carGroup.add(light);
    });
    
    return carGroup;
  }

  addCar(physics: CarPhysics, color: number, isPlayer: boolean = false) {
    const carMesh = this.createCarMesh(color);
    physics.position.copy(this.checkpoints[0]);
    carMesh.position.copy(physics.position);
    carMesh.userData.physics = physics;
    this.scene.add(carMesh);
    
    return carMesh;
  }

  update(deltaTime: number, playerInput: { forward: number; turn: number }) {
    if (!this.raceFinished) {
      this.raceTime += deltaTime;
    }
    
    // Update player car
    this.playerCar.setInput(playerInput.forward, playerInput.turn);
    this.playerCar.update(deltaTime);
    
    // Update opponents (simple AI)
    this.opponents.forEach(opponent => {
      // Simple AI: move towards next checkpoint
      const direction = new THREE.Vector3().subVectors(
        this.checkpoints[this.currentCheckpoint],
        opponent.position
      );
      opponent.setInput(Math.min(direction.length() / 50, 1), 0);
      opponent.update(deltaTime);
    });
    
    // Check checkpoint collision
    const checkpointDistance = this.playerCar.position.distanceTo(
      this.checkpoints[this.currentCheckpoint]
    );
    if (checkpointDistance < 40) {
      this.currentCheckpoint++;
      if (this.currentCheckpoint >= this.checkpoints.length) {
        this.raceFinished = true;
      }
    }
    
    // Update camera (follow player)
    const cameraDistance = 60;
    const cameraHeight = 40;
    this.camera.position.x = this.playerCar.position.x - Math.sin(this.playerCar.rotation) * cameraDistance;
    this.camera.position.y = this.playerCar.position.y + cameraHeight;
    this.camera.position.z = this.playerCar.position.z - Math.cos(this.playerCar.rotation) * cameraDistance;
    this.camera.lookAt(
      this.playerCar.position.x,
      this.playerCar.position.y + 15,
      this.playerCar.position.z
    );
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.dispose();
    this.scene.clear();
  }
}
