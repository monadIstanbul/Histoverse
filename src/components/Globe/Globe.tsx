import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AltHistoryMap } from '../../lib/altHistoryTypes';
import {
  POLITICAL_BORDERS,
  CONTINENT_LABELS,
  getBorderOpacity,
  cameraZToZoom,
} from '../../lib/politicalBorders';

// High-quality earth textures (equirectangular projection)
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP_URL    = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

// -- Projection helpers -------------------------------------------------------

interface ScreenPt { x: number; y: number; visible: boolean }

function project(
  lat: number, lng: number,
  globe: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  W: number, H: number
): ScreenPt {
  const latR = lat * Math.PI / 180;
  const lngR = lng * Math.PI / 180;

  const vec = new THREE.Vector3(
    Math.cos(latR) * Math.cos(lngR),
    Math.sin(latR),
   -Math.cos(latR) * Math.sin(lngR)
  );

  vec.applyEuler(globe.rotation);

  if (vec.z < 0.02) return { x: 0, y: 0, visible: false };

  const ndc = vec.clone().project(camera);
  return {
    x: (ndc.x + 1) / 2 * W,
    y: (1 - (ndc.y + 1) / 2) * H,
    visible: true,
  };
}

function hexAlpha(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(0,0,0,${alpha})`;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  coords: [number, number][],
  globe: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  W: number, H: number,
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number,
  glowColor?: string
) {
  ctx.beginPath();
  let pen = false;
  for (const [lat, lng] of coords) {
    const pt = project(lat, lng, globe, camera, W, H);
    if (!pt.visible) { pen = false; continue; }
    if (!pen) { ctx.moveTo(pt.x, pt.y); pen = true; }
    else       { ctx.lineTo(pt.x, pt.y); }
  }
  ctx.closePath();
  if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
  if (glowColor) { ctx.strokeStyle = glowColor; ctx.lineWidth = lineWidth + 4; ctx.stroke(); }
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  alpha: number, isChanged: boolean
) {
  const color = isChanged ? `rgba(240,192,64,${alpha})` : `rgba(180,160,100,${alpha * 0.8})`;
  ctx.textAlign = 'center';
  ctx.font = isChanged ? `bold 9px Cinzel, serif` : `8px Rajdhani, sans-serif`;
  ctx.fillStyle = `rgba(5,10,20,${alpha * 0.6})`;
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawPulseMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  pulse: number,
  color: string,
  label: string,
  labelAlpha: number
) {
  ctx.beginPath();
  ctx.arc(x, y, pulse + 4, 0, Math.PI * 2);
  ctx.strokeStyle = hexAlpha(color, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (labelAlpha > 0) {
    ctx.font = 'bold 8px Rajdhani, sans-serif';
    ctx.fillStyle = hexAlpha(color, labelAlpha * 0.9);
    ctx.textAlign = 'left';
    ctx.fillText('▶ ' + label, x + 7, y + 3);
  }
}

function drawNarrative(ctx: CanvasRenderingContext2D, text: string, W: number) {
  const cx = W / 2;
  ctx.fillStyle = 'rgba(2,4,8,0.82)';
  ctx.fillRect(cx - 200, 68, 400, 26);
  ctx.strokeStyle = 'rgba(240,192,64,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 200, 68, 400, 26);
  ctx.font = 'bold 11px Cinzel, serif';
  ctx.fillStyle = '#f0c040';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, 85);
}

function drawPoliticalOverlay(
  ctx: CanvasRenderingContext2D,
  globe: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  W: number, H: number,
  zoom: number,
  altMap: AltHistoryMap | null,
  showAlt: boolean,
  time: number
) {
  ctx.clearRect(0, 0, W, H);

  const activeMap = showAlt ? altMap : null;

  const regionOpacity  = getBorderOpacity(zoom, 1.2);
  const countryOpacity = getBorderOpacity(zoom, 1.8);
  const labelOpacity   = getBorderOpacity(zoom, 2.1);

  if (regionOpacity <= 0) return;

  for (const country of POLITICAL_BORDERS) {
    const disappeared = activeMap?.disappearedCountries.includes(country.isoA3) ?? false;
    if (disappeared) continue;

    const changed = activeMap?.changedRegions.find(r => r.isoA3 === country.isoA3);
    const fillColor   = changed ? changed.color : country.color;
    const strokeColor = changed ? '#f0c040' : 'rgba(0,180,255,0.45)';
    const lw = changed ? 1.5 : 0.6;
    const alpha = Math.max(regionOpacity, countryOpacity) * (countryOpacity > 0 ? 1 : 0.5);

    drawPolygon(
      ctx, country.coords as [number,number][],
      globe, camera, W, H,
      hexAlpha(fillColor, alpha * 0.5),
      hexAlpha(strokeColor, alpha),
      lw,
      changed && changed.status !== 'unchanged' ? hexAlpha('#f0c040', alpha * 0.2) : undefined
    );

    if (labelOpacity > 0) {
      const capPt = project(country.capital.lat, country.capital.lng, globe, camera, W, H);
      if (capPt.visible) {
        const displayName = changed ? changed.altName : country.name;
        drawLabel(ctx, displayName, capPt.x, capPt.y, labelOpacity, !!changed);
        ctx.beginPath();
        ctx.arc(capPt.x, capPt.y - 12, 2, 0, Math.PI * 2);
        ctx.fillStyle = hexAlpha(changed ? '#f0c040' : 'rgba(180,160,100,0.7)', labelOpacity);
        ctx.fill();
      }
    }
  }

  if (activeMap) {
    for (const nc of activeMap.newCountries ?? []) {
      if (!nc.coords?.length) continue;
      drawPolygon(
        ctx, nc.coords as [number,number][],
        globe, camera, W, H,
        hexAlpha(nc.color, countryOpacity * 0.58),
        hexAlpha('#f0c040', countryOpacity),
        2,
        hexAlpha('#f0c040', countryOpacity * 0.25)
      );
      if (labelOpacity > 0) {
        const p = project(nc.capital.lat, nc.capital.lng, globe, camera, W, H);
        if (p.visible) drawLabel(ctx, nc.name, p.x, p.y, labelOpacity, true);
      }
    }

    const pulse = 4 + 3 * Math.sin(time * 0.003);
    for (const bc of activeMap.borderChanges ?? []) {
      const pt = project(bc.lat, bc.lng, globe, camera, W, H);
      if (!pt.visible) continue;
      drawPulseMarker(ctx, pt.x, pt.y, pulse, '#f0c040', bc.region, labelOpacity);
    }

    if (labelOpacity > 0) {
      for (const cc of activeMap.capitalChanges ?? []) {
        const pt = project(cc.lat, cc.lng, globe, camera, W, H);
        if (!pt.visible) continue;
        ctx.font = 'bold 9px Cinzel, serif';
        ctx.fillStyle = hexAlpha('#f0c040', labelOpacity);
        ctx.textAlign = 'center';
        ctx.fillText(cc.newCapital + ' ★', pt.x, pt.y);
      }
    }

    if (activeMap.globeNarrative) {
      drawNarrative(ctx, activeMap.globeNarrative, W);
    }
  }

  const continentAlpha = regionOpacity * Math.max(0, 1 - countryOpacity * 2);
  if (continentAlpha > 0) {
    ctx.font = `bold ${Math.round(9 + zoom * 1.5)}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    for (const cl of CONTINENT_LABELS) {
      const pt = project(cl.lat, cl.lng, globe, camera, W, H);
      if (!pt.visible) continue;
      ctx.fillStyle = `rgba(5,10,20,${continentAlpha * 0.6})`;
      ctx.fillText(cl.name, pt.x + 1, pt.y + 1);
      ctx.fillStyle = `rgba(180,155,90,${continentAlpha * 0.75})`;
      ctx.fillText(cl.name, pt.x, pt.y);
    }
  }

  const zoomLabel = zoom < 1.5 ? 'Globe View'
    : zoom < 1.9 ? 'Regional View'
    : zoom < 2.5 ? 'Country View'
    : 'Detail View';
  ctx.font = '9px Rajdhani, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(130,100,60,0.7)';
  ctx.fillText(`${zoomLabel}  ${zoom.toFixed(1)}×`, W - 10, H - 46);
}

// -- Globe component ----------------------------------------------------------

interface GlobeProps {
  scenario: string;
  isLoading: boolean;
  isConnected?: boolean;
  isCorrectNetwork?: boolean;
  winner?: string | null;
  winnerName?: string | null;
  winnerColor?: string | null;
  winnerPrediction?: string | null;
  altHistoryMap?: AltHistoryMap | null;
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
  altHistoryMap = null,
}) => {
  const containerRef    = useRef<HTMLDivElement>(null);
  const overlayRef      = useRef<HTMLCanvasElement>(null);
  const rendererRef     = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef    = useRef<number>(0);
  const globeRef        = useRef<THREE.Mesh | null>(null);
  const cameraRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const atmosMatRef     = useRef<THREE.ShaderMaterial | null>(null);
  const outerGlowMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const isDragging      = useRef(false);
  const previousMouse   = useRef({ x: 0, y: 0 });
  const autoRotateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const altMapRef  = useRef<AltHistoryMap | null>(null);
  const showAltRef = useRef(false);

  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    altMapRef.current = altHistoryMap ?? null;
    if (altHistoryMap) {
      setShowAlt(true);
      showAltRef.current = true;
    }
  }, [altHistoryMap]);

  useEffect(() => {
    showAltRef.current = showAlt;
  }, [showAlt]);

  // -- THREE.js scene ----------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    const overlay   = overlayRef.current;
    if (!container || !overlay) return;

    const width  = container.clientWidth;
    const height = container.clientHeight;
    overlay.width  = width;
    overlay.height = height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.8;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const loader = new THREE.TextureLoader();
    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 });
    loader.load(EARTH_TEXTURE_URL, (t) => { earthMaterial.map = t; earthMaterial.needsUpdate = true; });
    loader.load(EARTH_BUMP_URL,    (t) => { earthMaterial.bumpMap = t; earthMaterial.bumpScale = 0.05; earthMaterial.needsUpdate = true; });
    const globe = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(globe);
    globeRef.current = globe;

    const atmosGeo = new THREE.SphereGeometry(1.015, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vNormal; void main(){ float i=pow(0.65-dot(vNormal,vec3(0,0,1)),2.0); gl_FragColor=vec4(0.77,0.64,0.40,1.0)*i; }`,
      blending: THREE.AdditiveBlending, side: THREE.FrontSide, transparent: true,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);
    atmosMatRef.current = atmosMat;

    const outerGlowGeo = new THREE.SphereGeometry(1.2, 64, 64);
    const outerGlowMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vNormal; void main(){ float i=pow(0.5-dot(vNormal,vec3(0,0,1)),2.0); gl_FragColor=vec4(0.55,0.37,0.24,0.6)*i; }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
    });
    scene.add(new THREE.Mesh(outerGlowGeo, outerGlowMat));
    outerGlowMatRef.current = outerGlowMat;

    scene.add(new THREE.AmbientLight(0xd4c4a8, 0.5));
    const mainL = new THREE.DirectionalLight(0xffe8cc, 1.2); mainL.position.set(5, 3, 5); scene.add(mainL);
    const fillL = new THREE.DirectionalLight(0x8b5e3c, 0.3); fillL.position.set(-5, -2, -3); scene.add(fillL);
    const rimL  = new THREE.DirectionalLight(0xc4a265, 0.4); rimL.position.set(0, 5, -5);   scene.add(rimL);

    const ctx2d = overlay.getContext('2d')!;

    const animate = () => {
      if (!isDragging.current) globe.rotation.y += 0.002;
      atmosMesh.rotation.copy(globe.rotation);
      renderer.render(scene, camera);

      const zoom = cameraZToZoom(camera.position.z);
      drawPoliticalOverlay(ctx2d, globe, camera, overlay.width, overlay.height, zoom, altMapRef.current, showAltRef.current, Date.now());

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      overlay.width = w; overlay.height = h;
    };
    window.addEventListener('resize', onResize);

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
      globeRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globeRef.current.rotation.x));
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      isDragging.current = false; canvas.style.cursor = 'grab';
      autoRotateTimer.current = setTimeout(() => { isDragging.current = false; }, 3000);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      isDragging.current = true;
      previousMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !globeRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - previousMouse.current.x;
      const dy = e.touches[0].clientY - previousMouse.current.y;
      globeRef.current.rotation.y += dx * 0.005;
      globeRef.current.rotation.x += dy * 0.005;
      globeRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globeRef.current.rotation.x));
      previousMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => {
      isDragging.current = false;
      autoRotateTimer.current = setTimeout(() => { isDragging.current = false; }, 3000);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(1.6, Math.min(5, camera.position.z + e.deltaY * 0.002));
    };

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd);
    canvas.addEventListener('wheel',      onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      canvas.removeEventListener('wheel',      onWheel);
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      renderer.dispose(); earthGeometry.dispose(); earthMaterial.dispose();
      atmosGeo.dispose(); atmosMat.dispose(); outerGlowGeo.dispose(); outerGlowMat.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // -- Winner glow effect ------------------------------------------------------
  useEffect(() => {
    if (!atmosMatRef.current || !outerGlowMatRef.current) return;
    if (winner && winnerColor) {
      const hex = winnerColor.replace('#', '');
      const r = (parseInt(hex.slice(0, 2), 16) / 255).toFixed(3);
      const g = (parseInt(hex.slice(2, 4), 16) / 255).toFixed(3);
      const b = (parseInt(hex.slice(4, 6), 16) / 255).toFixed(3);
      atmosMatRef.current.fragmentShader = `varying vec3 vNormal; void main(){ float i=pow(0.65-dot(vNormal,vec3(0,0,1)),2.0); gl_FragColor=vec4(${r},${g},${b},1.0)*i*1.4; }`;
      atmosMatRef.current.needsUpdate = true;
      outerGlowMatRef.current.fragmentShader = `varying vec3 vNormal; void main(){ float i=pow(0.5-dot(vNormal,vec3(0,0,1)),2.0); gl_FragColor=vec4(${r},${g},${b},0.8)*i; }`;
      outerGlowMatRef.current.needsUpdate = true;
    } else {
      atmosMatRef.current.fragmentShader = `varying vec3 vNormal; void main(){ float i=pow(0.65-dot(vNormal,vec3(0,0,1)),2.0); gl_FragColor=vec4(0.77,0.64,0.40,1.0)*i; }`;
      atmosMatRef.current.needsUpdate = true;
      outerGlowMatRef.current.fragmentShader = `varying vec3 vNormal; void main(){ float i=pow(0.5-dot(vNormal,vec3(0,0,1)),2.0); gl_FragColor=vec4(0.55,0.37,0.24,0.6)*i; }`;
      outerGlowMatRef.current.needsUpdate = true;
    }
  }, [winner, winnerColor]);

  return (
    <div className="globe-container h-full relative">
      <div ref={containerRef} className="w-full h-full" style={{ filter: 'sepia(0.12) saturate(1.15) brightness(0.92)' }} />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} />

      {altHistoryMap && (
        <button
          onClick={() => setShowAlt(v => !v)}
          className="absolute z-20 text-xs font-bold px-3 py-1.5 rounded border transition-all"
          style={{
            top: 60, left: '50%', transform: 'translateX(-50%)',
            background: showAlt ? 'rgba(240,192,64,0.15)' : 'rgba(5,10,20,0.7)',
            borderColor: showAlt ? '#f0c040' : 'rgba(0,180,255,0.4)',
            color: showAlt ? '#f0c040' : 'rgba(0,180,255,0.8)',
          }}
        >
          {showAlt ? '🔀 ALT HISTORY' : '🌍 NORMAL VIEW'}
        </button>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-void bg-opacity-50 z-10">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-2 border-glow border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-glow text-ui animate-pulse">Simulating alternate timeline...</p>
          </div>
        </div>
      )}

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

      <div className="absolute top-4 left-4 text-left z-10">
        <h3 className="text-title text-lg text-glow mb-2">
          {winner ? '⚡ Alternatif Zaman Çizgisi' : scenario ? 'Alternate World' : 'Current Timeline'}
        </h3>
        {scenario && !winner && (
          <p className="text-dim text-sm max-w-xs mb-3">
            Scenario: {scenario.slice(0, 100)}{scenario.length > 100 ? '…' : ''}
          </p>
        )}
        <div className={`text-xs px-3 py-2 rounded border ${isConnected && isCorrectNetwork
          ? 'border-green bg-green bg-opacity-20 text-green'
          : 'border-gold bg-gold bg-opacity-20 text-gold'}`}
        >
          {isConnected && isCorrectNetwork ? '⛓ Network Active' : '⚠️ Connection Required'}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 text-dim text-xs text-right z-10">
        <p>🌍 Drag to rotate • Scroll to zoom</p>
        <p>⛓ Blockchain Powered</p>
        <div className="mt-2" style={{ color: '#8b5e3c' }}>
          <p>Chain ID: 10143</p>
          <p>Ultra-fast EVM</p>
        </div>
      </div>
    </div>
  );
};

export default Globe;
