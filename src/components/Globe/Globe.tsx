import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AltHistoryMap } from '../../lib/altHistoryTypes';
import { getBorderOpacity, cameraZToZoom } from '../../lib/politicalBorders';

const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP_URL    = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const GEOJSON_URL       = 'https://cdn.jsdelivr.net/gh/holtzy/D3-graph-gallery@master/DATA/world.geojson';

// ─── GeoJSON types ────────────────────────────────────────────────────────────
interface GeoFeature {
  type: 'Feature';
  properties: { name?: string; NAME?: string; [k: string]: unknown };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][][] | number[][][] };
}
interface GeoData { features: GeoFeature[] }

// ─── Lat/Lng → Three.js unit-sphere position ─────────────────────────────────
// Matches the UV mapping of THREE.SphereGeometry + earth-blue-marble texture.
function latLngToVec3(lat: number, lng: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
     Math.cos(phi),
     Math.sin(phi) * Math.sin(theta),
  );
}

interface ScreenPt { x: number; y: number; visible: boolean }

function project(
  lat: number, lng: number,
  globeRot: THREE.Euler,
  camera: THREE.PerspectiveCamera,
  W: number, H: number,
): ScreenPt {
  const vec = latLngToVec3(lat, lng);
  vec.applyEuler(globeRot);
  if (vec.z < 0) return { x: 0, y: 0, visible: false };
  const ndc = vec.clone().project(camera);
  return { x: (ndc.x + 1) / 2 * W, y: (1 - (ndc.y + 1) / 2) * H, visible: true };
}

function hexAlpha(hex: string, a: number): string {
  if (!hex?.startsWith('#')) return `rgba(200,200,200,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ─── Draw one polygon ring from GeoJSON([lng,lat]) coords ─────────────────────
function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  globeRot: THREE.Euler,
  camera: THREE.PerspectiveCamera,
  W: number,
  H: number,
): boolean {
  ctx.beginPath();
  let pen = false, anyVisible = false;
  for (const [lng, lat] of ring) {
    const pt = project(lat, lng, globeRot, camera, W, H);
    if (!pt.visible) { pen = false; continue; }
    anyVisible = true;
    if (!pen) { ctx.moveTo(pt.x, pt.y); pen = true; }
    else       { ctx.lineTo(pt.x, pt.y); }
  }
  if (anyVisible) ctx.closePath();
  return anyVisible;
}

// ─── Extract all rings from Polygon / MultiPolygon ───────────────────────────
function getRings(geom: GeoFeature['geometry']): number[][][] {
  if (geom.type === 'Polygon')      return geom.coordinates as number[][][];
  if (geom.type === 'MultiPolygon') return (geom.coordinates as number[][][][]).flatMap(p => p);
  return [];
}

// ─── Centroid of a ring ───────────────────────────────────────────────────────
function ringCentroid(ring: number[][]): [number, number] {
  let lat = 0, lng = 0;
  for (const [lo, la] of ring) { lat += la; lng += lo; }
  return [lat / ring.length, lng / ring.length];
}

// ─── Main overlay draw ────────────────────────────────────────────────────────
function drawPoliticalOverlay(
  ctx: CanvasRenderingContext2D,
  geoData: GeoData | null,
  globeRot: THREE.Euler,
  camera: THREE.PerspectiveCamera,
  W: number,
  H: number,
  zoom: number,
  altMap: AltHistoryMap | null,
  showAlt: boolean,
  time: number,
) {
  ctx.clearRect(0, 0, W, H);
  if (!geoData) return;

  const borderAlpha  = getBorderOpacity(zoom, 1.15);
  const labelAlpha   = getBorderOpacity(zoom, 1.7);
  const detailAlpha  = getBorderOpacity(zoom, 2.2);
  if (borderAlpha <= 0) return;

  const activeAlt = showAlt ? altMap : null;

  // border width scales with zoom
  const borderWidth = Math.max(0.4, Math.min(1.8, (zoom - 1) * 0.8));

  for (const feature of geoData.features) {
    if (!feature.geometry) continue;
    const name  = (feature.properties.name ?? feature.properties.NAME ?? '') as string;
    const rings = getRings(feature.geometry);
    if (!rings.length) continue;

    // look up alt-history data for this country
    const iso  = (feature.properties['iso-a3'] ?? feature.properties['ISO_A3'] ?? feature.properties['iso_a3'] ?? name) as string;
    const altR = activeAlt?.changedRegions.find(r =>
      r.isoA3 === iso || r.altName === name || r.isoA3.toLowerCase() === name.toLowerCase()
    );
    const disappeared = activeAlt?.disappearedCountries.some(d =>
      d === iso || d.toLowerCase() === name.toLowerCase()
    ) ?? false;

    if (disappeared) continue;

    // fill colour
    let fillStyle   = 'transparent';
    let strokeStyle = `rgba(255,255,255,${0.62 * borderAlpha})`;
    let lineWidth   = borderWidth;
    let glow        = false;

    if (altR && altR.status !== 'unchanged') {
      fillStyle   = hexAlpha(altR.color, 0.48 * borderAlpha);
      strokeStyle = `rgba(240,192,64,${Math.min(1, borderAlpha * 1.1)})`;
      lineWidth   = Math.max(1.2, borderWidth * 1.4);
      glow        = true;
    }

    for (const ring of rings) {
      const drawn = drawRing(ctx, ring, globeRot, camera, W, H);
      if (!drawn) continue;

      if (fillStyle !== 'transparent') { ctx.fillStyle = fillStyle; ctx.fill(); }

      if (glow) {
        ctx.strokeStyle = `rgba(240,192,64,${borderAlpha * 0.22})`;
        ctx.lineWidth = lineWidth + 5;
        ctx.stroke();
      }
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth   = lineWidth;
      ctx.stroke();
    }
  }

  // ── Alt-history: new countries ───────────────────────────────────────────────
  if (activeAlt) {
    for (const nc of activeAlt.newCountries ?? []) {
      if (!nc.coords?.length) continue;
      const ring = nc.coords.map(([la, lo]: [number,number]) => [lo, la]);
      const drawn = drawRing(ctx, ring, globeRot, camera, W, H);
      if (drawn) {
        ctx.fillStyle = hexAlpha(nc.color, 0.5 * borderAlpha);
        ctx.fill();
        ctx.strokeStyle = `rgba(240,192,64,${borderAlpha})`;
        ctx.lineWidth = Math.max(1.5, borderWidth * 1.6);
        ctx.stroke();
      }
    }
  }

  // ── Country labels ────────────────────────────────────────────────────────────
  if (labelAlpha > 0) {
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';

    for (const feature of geoData.features) {
      if (!feature.geometry) continue;
      const name  = (feature.properties.name ?? feature.properties.NAME ?? '') as string;
      const iso   = (feature.properties['iso-a3'] ?? feature.properties['ISO_A3'] ?? feature.properties['iso_a3'] ?? name) as string;
      const rings = getRings(feature.geometry);
      if (!rings.length) continue;

      const disappeared = activeAlt?.disappearedCountries.some(d =>
        d === iso || d.toLowerCase() === name.toLowerCase()
      ) ?? false;
      if (disappeared) continue;

      // use biggest ring for centroid
      const biggest = rings.reduce((a, b) => a.length > b.length ? a : b, rings[0]);
      const [cLat, cLng] = ringCentroid(biggest);
      const pt = project(cLat, cLng, globeRot, camera, W, H);
      if (!pt.visible) continue;

      const altR = activeAlt?.changedRegions.find(r =>
        r.isoA3 === iso || r.altName === name
      );
      const displayName = altR ? altR.altName : name;
      const isChanged   = !!altR && altR.status !== 'unchanged';

      const baseFontSize = isChanged
        ? Math.max(8, Math.min(13, 7 + zoom * 2.2))
        : Math.max(7, Math.min(11, 5.5 + zoom * 2));

      ctx.font      = isChanged
        ? `bold ${baseFontSize}px Cinzel, serif`
        : `${baseFontSize}px Rajdhani, sans-serif`;

      const textAlpha = isChanged ? Math.min(1, labelAlpha * 1.3) : labelAlpha * 0.85;
      // shadow
      ctx.fillStyle = `rgba(0,0,0,${textAlpha * 0.7})`;
      ctx.fillText(displayName.toUpperCase(), pt.x + 1, pt.y + 1);
      // text
      ctx.fillStyle = isChanged
        ? `rgba(240,192,64,${textAlpha})`
        : `rgba(220,215,200,${textAlpha})`;
      ctx.fillText(displayName.toUpperCase(), pt.x, pt.y);
    }

    // alt-history new country labels
    if (activeAlt) {
      for (const nc of activeAlt.newCountries ?? []) {
        if (!nc.coords?.length) continue;
        const pt = project(nc.capital.lat, nc.capital.lng, globeRot, camera, W, H);
        if (!pt.visible) continue;
        ctx.font = `bold 9px Cinzel, serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(nc.name.toUpperCase(), pt.x + 1, pt.y + 1);
        ctx.fillStyle = `rgba(240,192,64,${labelAlpha})`;
        ctx.fillText(nc.name.toUpperCase(), pt.x, pt.y);
      }
    }
  }

  // ── Alt-history: border-change pulsing markers ────────────────────────────────
  if (activeAlt && detailAlpha > 0) {
    const pulse = 4 + 3 * Math.sin(time * 0.003);
    for (const bc of activeAlt.borderChanges ?? []) {
      const pt = project(bc.lat, bc.lng, globeRot, camera, W, H);
      if (!pt.visible) continue;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pulse + 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(240,192,64,${0.3 * detailAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f0c040';
      ctx.fill();

      ctx.font = `bold 9px Rajdhani, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(240,192,64,${detailAlpha * 0.9})`;
      ctx.fillText('▶ ' + bc.region, pt.x + 8, pt.y + 3);
    }
  }

  // ── Capital change markers ─────────────────────────────────────────────────────
  if (activeAlt && detailAlpha > 0) {
    for (const cc of activeAlt.capitalChanges ?? []) {
      const pt = project(cc.lat, cc.lng, globeRot, camera, W, H);
      if (!pt.visible) continue;
      ctx.textAlign = 'center';
      ctx.font = `bold 9px Cinzel, serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(cc.newCapital + ' ★', pt.x + 1, pt.y + 1);
      ctx.fillStyle = `rgba(240,192,64,${detailAlpha})`;
      ctx.fillText(cc.newCapital + ' ★', pt.x, pt.y);
    }
  }

  // ── Alt narrative banner ───────────────────────────────────────────────────────
  if (activeAlt?.globeNarrative) {
    const cx = W / 2;
    ctx.fillStyle = 'rgba(2,4,8,0.82)';
    ctx.fillRect(cx - 210, 68, 420, 26);
    ctx.strokeStyle = 'rgba(240,192,64,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 210, 68, 420, 26);
    ctx.font = 'bold 11px Cinzel, serif';
    ctx.fillStyle = '#f0c040';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(activeAlt.globeNarrative, cx, 81);
  }

  // ── Zoom level badge ───────────────────────────────────────────────────────────
  const zoomLabel = zoom < 1.5 ? 'Globe' : zoom < 1.9 ? 'Regional' : zoom < 2.5 ? 'Country' : 'Detail';
  ctx.font = '9px Rajdhani, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(130,100,60,0.65)';
  ctx.fillText(`${zoomLabel}  ${zoom.toFixed(1)}×`, W - 10, H - 48);
}

// ─────────────────────────────────────────────────────────────────────────────
// Globe component
// ─────────────────────────────────────────────────────────────────────────────

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
  const geoDataRef      = useRef<GeoData | null>(null);
  const altMapRef       = useRef<AltHistoryMap | null>(null);
  const showAltRef      = useRef(false);

  const [showAlt, setShowAlt] = useState(false);
  const [geoLoaded, setGeoLoaded] = useState(false);

  // sync alt map
  useEffect(() => {
    altMapRef.current = altHistoryMap ?? null;
    if (altHistoryMap) { setShowAlt(true); showAltRef.current = true; }
  }, [altHistoryMap]);

  useEffect(() => { showAltRef.current = showAlt; }, [showAlt]);

  // fetch GeoJSON once
  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then(r => r.json())
      .then((data: GeoData) => {
        if (!cancelled) { geoDataRef.current = data; setGeoLoaded(true); }
      })
      .catch(err => console.error('[Globe] GeoJSON fetch failed:', err));
    return () => { cancelled = true; };
  }, []);

  // THREE.js scene
  useEffect(() => {
    const container = containerRef.current;
    const overlay   = overlayRef.current;
    if (!container || !overlay) return;

    const width  = container.clientWidth;
    const height = container.clientHeight;
    overlay.width  = width;
    overlay.height = height;

    const scene  = new THREE.Scene();
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
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 });
    loader.load(EARTH_TEXTURE_URL, t => { earthMat.map = t; earthMat.needsUpdate = true; });
    loader.load(EARTH_BUMP_URL,    t => { earthMat.bumpMap = t; earthMat.bumpScale = 0.05; earthMat.needsUpdate = true; });
    const globe = new THREE.Mesh(earthGeo, earthMat);
    scene.add(globe);
    globeRef.current = globe;

    const atmosGeo = new THREE.SphereGeometry(1.015, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader:`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vN;void main(){float i=pow(.65-dot(vN,vec3(0,0,1)),2.);gl_FragColor=vec4(.77,.64,.40,1.)*i;}`,
      blending:THREE.AdditiveBlending,side:THREE.FrontSide,transparent:true,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);
    atmosMatRef.current = atmosMat;

    const glowGeo = new THREE.SphereGeometry(1.2, 64, 64);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader:`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vN;void main(){float i=pow(.5-dot(vN,vec3(0,0,1)),2.);gl_FragColor=vec4(.55,.37,.24,.6)*i;}`,
      blending:THREE.AdditiveBlending,side:THREE.BackSide,transparent:true,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));
    outerGlowMatRef.current = glowMat;

    scene.add(new THREE.AmbientLight(0xd4c4a8, 0.5));
    const l1 = new THREE.DirectionalLight(0xffe8cc, 1.2); l1.position.set(5,3,5);   scene.add(l1);
    const l2 = new THREE.DirectionalLight(0x8b5e3c, 0.3); l2.position.set(-5,-2,-3);scene.add(l2);
    const l3 = new THREE.DirectionalLight(0xc4a265, 0.4); l3.position.set(0,5,-5);  scene.add(l3);

    const ctx2d = overlay.getContext('2d')!;

    const animate = () => {
      if (!isDragging.current) globe.rotation.y += 0.002;
      atmosMesh.rotation.copy(globe.rotation);
      renderer.render(scene, camera);

      const zoom = cameraZToZoom(camera.position.z);
      drawPoliticalOverlay(
        ctx2d, geoDataRef.current, globe.rotation, camera,
        overlay.width, overlay.height, zoom,
        altMapRef.current, showAltRef.current, Date.now(),
      );
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w/h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      overlay.width = w; overlay.height = h;
    };
    window.addEventListener('resize', onResize);
    // Also watch the container itself for flex-layout size changes
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    const canvas = renderer.domElement;
    canvas.style.cursor = 'grab';

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMouse.current = {x:e.clientX,y:e.clientY};
      canvas.style.cursor = 'grabbing';
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current||!globeRef.current) return;
      const dx=e.clientX-previousMouse.current.x, dy=e.clientY-previousMouse.current.y;
      globeRef.current.rotation.y+=dx*0.005;
      globeRef.current.rotation.x=Math.max(-Math.PI/3,Math.min(Math.PI/3,globeRef.current.rotation.x+dy*0.005));
      previousMouse.current={x:e.clientX,y:e.clientY};
    };
    const onMouseUp = () => {
      isDragging.current=false; canvas.style.cursor='grab';
      autoRotateTimer.current=setTimeout(()=>{isDragging.current=false;},3000);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length!==1) return;
      isDragging.current=true;
      previousMouse.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current||!globeRef.current||e.touches.length!==1) return;
      const dx=e.touches[0].clientX-previousMouse.current.x, dy=e.touches[0].clientY-previousMouse.current.y;
      globeRef.current.rotation.y+=dx*0.005;
      globeRef.current.rotation.x=Math.max(-Math.PI/3,Math.min(Math.PI/3,globeRef.current.rotation.x+dy*0.005));
      previousMouse.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
    };
    const onTouchEnd = () => {
      isDragging.current=false;
      autoRotateTimer.current=setTimeout(()=>{isDragging.current=false;},3000);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z=Math.max(1.5,Math.min(5,camera.position.z+e.deltaY*0.002));
    };

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart,{passive:true});
    canvas.addEventListener('touchmove',  onTouchMove, {passive:true});
    canvas.addEventListener('touchend',   onTouchEnd);
    canvas.addEventListener('wheel',      onWheel,{passive:false});

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      canvas.removeEventListener('wheel',      onWheel);
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      renderer.dispose();
      [earthGeo,earthMat,atmosGeo,atmosMat,glowGeo,glowMat].forEach(o=>(o as any).dispose?.());
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Winner glow
  useEffect(() => {
    if (!atmosMatRef.current||!outerGlowMatRef.current) return;
    if (winner && winnerColor) {
      const hex=winnerColor.replace('#','');
      const r=(parseInt(hex.slice(0,2),16)/255).toFixed(3);
      const g=(parseInt(hex.slice(2,4),16)/255).toFixed(3);
      const b=(parseInt(hex.slice(4,6),16)/255).toFixed(3);
      atmosMatRef.current.fragmentShader=`varying vec3 vN;void main(){float i=pow(.65-dot(vN,vec3(0,0,1)),2.);gl_FragColor=vec4(${r},${g},${b},1.)*i*1.4;}`;
      atmosMatRef.current.needsUpdate=true;
      outerGlowMatRef.current.fragmentShader=`varying vec3 vN;void main(){float i=pow(.5-dot(vN,vec3(0,0,1)),2.);gl_FragColor=vec4(${r},${g},${b},.8)*i;}`;
      outerGlowMatRef.current.needsUpdate=true;
    } else {
      atmosMatRef.current.fragmentShader=`varying vec3 vN;void main(){float i=pow(.65-dot(vN,vec3(0,0,1)),2.);gl_FragColor=vec4(.77,.64,.40,1.)*i;}`;
      atmosMatRef.current.needsUpdate=true;
      outerGlowMatRef.current.fragmentShader=`varying vec3 vN;void main(){float i=pow(.5-dot(vN,vec3(0,0,1)),2.);gl_FragColor=vec4(.55,.37,.24,.6)*i;}`;
      outerGlowMatRef.current.needsUpdate=true;
    }
  }, [winner, winnerColor]);

  return (
    <div className="globe-container h-full relative">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{filter:'sepia(0.1) saturate(1.1) brightness(0.93)'}}
      />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{zIndex:5}}
      />

      {/* GeoJSON loading indicator */}
      {!geoLoaded && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs z-10"
             style={{color:'rgba(180,155,90,0.5)'}}>
          Loading borders…
        </div>
      )}

      {/* Alt-history toggle */}
      {altHistoryMap && (
        <button
          onClick={() => setShowAlt(v => !v)}
          className="absolute z-20 text-xs font-bold px-3 py-1.5 rounded border transition-all"
          style={{
            top:58, left:'50%', transform:'translateX(-50%)',
            background: showAlt ? 'rgba(240,192,64,0.15)' : 'rgba(5,10,20,0.75)',
            borderColor: showAlt ? '#f0c040' : 'rgba(0,180,255,0.4)',
            color: showAlt ? '#f0c040' : 'rgba(0,180,255,0.8)',
            textShadow: showAlt ? '0 0 8px #f0c04060' : 'none',
          }}
        >
          {showAlt ? '🔀 ALT HISTORY' : '🌍 NORMAL VIEW'}
        </button>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-void bg-opacity-50 z-10">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-2 border-glow border-t-transparent rounded-full mx-auto mb-4"/>
            <p className="text-glow text-ui animate-pulse">Simulating alternate timeline…</p>
          </div>
        </div>
      )}

      {/* Winner announcement */}
      {winner && winnerName && winnerPrediction && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-10 z-20 pointer-events-none"
          style={{background:'linear-gradient(to top,rgba(13,8,5,0.92) 0%,transparent 50%)'}}
        >
          <div className="text-center max-w-md px-6">
            <div
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 animate-pulse"
              style={{background:winnerColor??'#d4a520', color:'#0d0805'}}
            >
              ⚡ Yeni Dünya Düzeni Belirlendi
            </div>
            <h2 className="text-2xl font-bold mb-2"
                style={{color:winnerColor??'#d4a520',textShadow:`0 0 20px ${winnerColor??'#d4a520'}80`}}>
              {winnerName} Kazandı
            </h2>
            <p className="text-xs leading-relaxed"
               style={{color:'#c4a265',maxHeight:'6rem',overflow:'hidden'}}>
              {winnerPrediction.slice(0,280)}{winnerPrediction.length>280?'…':''}
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
            Scenario: {scenario.slice(0,100)}{scenario.length>100?'…':''}
          </p>
        )}
        <div className={`text-xs px-3 py-2 rounded border ${isConnected&&isCorrectNetwork
          ? 'border-green bg-green bg-opacity-20 text-green'
          : 'border-gold bg-gold bg-opacity-20 text-gold'}`}>
          {isConnected&&isCorrectNetwork ? '⛓ Network Active' : '⚠️ Connection Required'}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-dim text-xs text-right z-10">
        <p>🌍 Drag to rotate • Scroll to zoom</p>
        <p>⛓ Blockchain Powered</p>
        <div className="mt-2" style={{color:'#8b5e3c'}}>
          <p>Chain ID: 10143</p>
          <p>Ultra-fast EVM</p>
        </div>
      </div>
    </div>
  );
};

export default Globe;
