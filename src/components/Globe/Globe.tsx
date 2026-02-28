import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// High-quality earth textures (equirectangular projection)
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

interface GlobeProps {
  scenario: string;
  isLoading: boolean;
  isConnected?: boolean;
  isCorrectNetwork?: boolean;
  winner?: string | null;          // AI id of winner (e.g. 'gpt')
  winnerName?: string | null;      // display name (e.g. 'GPT-4o')
  winnerColor?: string | null;     // hex color
  winnerPrediction?: string | null; // the winning prediction text
}

const Globe: React.FC<GlobeProps> = ({ 
  scenario, 
  isLoading, 
  isConnected = false, 
  isCorrectNetwork = false,
  winner = null,
  winnerName = null,
  winnerColor = null,
  winnerPrediction = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const atmosMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const outerGlowMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const autoRotateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // ── Scene ──
    const scene = new THREE.Scene();

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.8;
    cameraRef.current = camera;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Texture Loader ──
    const loader = new THREE.TextureLoader();

    // ── Earth Sphere ──
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0.05,
    });

    // Load earth textures
    loader.load(EARTH_TEXTURE_URL, (texture) => {
      earthMaterial.map = texture;
      earthMaterial.needsUpdate = true;
    });
    loader.load(EARTH_BUMP_URL, (texture) => {
      earthMaterial.bumpMap = texture;
      earthMaterial.bumpScale = 0.05;
      earthMaterial.needsUpdate = true;
    });

    const globe = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(globe);
    globeRef.current = globe;

    // ── Atmosphere Inner Glow ──
    const atmosGeometry = new THREE.SphereGeometry(1.015, 64, 64);
    const atmosMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.77, 0.64, 0.40, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
    });
    const atmosMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
    scene.add(atmosMesh);
    atmosMatRef.current = atmosMaterial;

    // ── Atmosphere Outer Glow ──
    const outerGlowGeometry = new THREE.SphereGeometry(1.2, 64, 64);
    const outerGlowMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.55, 0.37, 0.24, 0.6) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const outerGlowMesh = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    scene.add(outerGlowMesh);
    outerGlowMatRef.current = outerGlowMaterial;

    // ── Lighting (warm vintage tones) ──
    const ambientLight = new THREE.AmbientLight(0xd4c4a8, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffe8cc, 1.2);
    mainLight.position.set(5, 3, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8b5e3c, 0.3);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc4a265, 0.4);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    // ── Animation Loop ──
    const animate = () => {
      if (!isDragging.current) {
        globe.rotation.y += 0.002;
      }
      atmosMesh.rotation.copy(globe.rotation);
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    // ── Resize Handler ──
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Mouse Drag Interaction ──
    const canvas = renderer.domElement;
    canvas.style.cursor = 'grab';

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !globeRef.current) return;
      const dx = e.clientX - previousMouse.current.x;
      const dy = e.clientY - previousMouse.current.y;
      globeRef.current.rotation.y += dx * 0.005;
      globeRef.current.rotation.x += dy * 0.005;
      // Clamp vertical rotation
      globeRef.current.rotation.x = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, globeRef.current.rotation.x)
      );
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
      // Resume auto-rotation after 3s
      autoRotateTimer.current = setTimeout(() => {
        isDragging.current = false;
      }, 3000);
    };

    // ── Touch support (mobile) ──
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true;
        previousMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !globeRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - previousMouse.current.x;
      const dy = e.touches[0].clientY - previousMouse.current.y;
      globeRef.current.rotation.y += dx * 0.005;
      globeRef.current.rotation.x += dy * 0.005;
      globeRef.current.rotation.x = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, globeRef.current.rotation.x)
      );
      previousMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDragging.current = false;
      autoRotateTimer.current = setTimeout(() => {
        isDragging.current = false;
      }, 3000);
    };

    // ── Scroll Zoom ──
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const newZ = camera.position.z + e.deltaY * 0.002;
      camera.position.z = Math.max(1.6, Math.min(5, newZ));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('wheel', onWheel);
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosGeometry.dispose();
      atmosMaterial.dispose();
      outerGlowGeometry.dispose();
      outerGlowMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Winner effect: update glow color when winner is declared ──────────────
  useEffect(() => {
    if (!atmosMatRef.current || !outerGlowMatRef.current) return;

    if (winner && winnerColor) {
      // Parse hex color to RGB components 0..1
      const hex = winnerColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      atmosMatRef.current.fragmentShader = `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 1.0) * intensity * 1.4;
        }
      `;
      atmosMatRef.current.needsUpdate = true;

      outerGlowMatRef.current.fragmentShader = `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 0.8) * intensity;
        }
      `;
      outerGlowMatRef.current.needsUpdate = true;
    } else {
      // Reset to original golden glow
      atmosMatRef.current.fragmentShader = `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.77, 0.64, 0.40, 1.0) * intensity;
        }
      `;
      atmosMatRef.current.needsUpdate = true;

      outerGlowMatRef.current.fragmentShader = `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.55, 0.37, 0.24, 0.6) * intensity;
        }
      `;
      outerGlowMatRef.current.needsUpdate = true;
    }
  }, [winner, winnerColor]);

  return (
    <div className="globe-container h-full relative">
      {/* Three.js 3D Globe Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ filter: 'sepia(0.12) saturate(1.15) brightness(0.92)' }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-void bg-opacity-50 z-10">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-2 border-glow border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-glow text-ui animate-pulse">
              Simulating alternate timeline...
            </p>
          </div>
        </div>
      )}

      {/* Winner announcement overlay */}
      {winner && winnerName && winnerPrediction && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-10 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(13,8,5,0.92) 0%, transparent 50%)' }}
        >
          <div className="text-center max-w-md px-6">
            <div
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 animate-pulse"
              style={{ background: winnerColor ?? '#d4a520', color: '#0d0805' }}
            >
              ⚡ Yeni Dünya Düzeni Belirlendi
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: winnerColor ?? '#d4a520', textShadow: `0 0 20px ${winnerColor ?? '#d4a520'}80` }}>
              {winnerName} Kazandı
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: '#c4a265', maxHeight: '6rem', overflow: 'hidden' }}>
              {winnerPrediction.slice(0, 280)}{winnerPrediction.length > 280 ? '…' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute top-4 left-4 text-left z-10">
        <h3 className="text-title text-lg text-glow mb-2">
          {winner ? '⚡ Alternatif Zaman Çizgisi' : scenario ? 'Alternate World' : 'Current Timeline'}
        </h3>
        {scenario && !winner && (
          <p className="text-dim text-sm max-w-xs mb-3">
            Scenario: {scenario.slice(0, 100)}{scenario.length > 100 ? '…' : ''}
          </p>
        )}
        
        {/* Connection Status in Globe */}
        <div className={`text-xs px-3 py-2 rounded border ${isConnected && isCorrectNetwork 
          ? 'border-green bg-green bg-opacity-20 text-green' 
          : 'border-gold bg-gold bg-opacity-20 text-gold'
        }`}>
          {isConnected && isCorrectNetwork 
            ? '⛓ Network Active' 
            : '⚠️ Connection Required'
          }
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-dim text-xs text-right z-10">
        <p>🌍 Drag to rotate • Scroll to zoom</p>
        <p>⛓ Blockchain Powered</p>
        <div className="mt-2" style={{color: '#8b5e3c'}}>
          <p>Chain ID: 10143</p>
          <p>Ultra-fast EVM</p>
        </div>
      </div>
    </div>
  );
};

export default Globe;