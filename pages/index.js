import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import exifr from 'exifr';

export default function ExifViewer() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('intelligence');
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState("");
  const [hash, setHash] = useState('');
  const [colors, setColors] = useState([]);
  
  const canvasRef = useRef(null);
  const histRef = useRef(null);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, show: false, bgX: 0, bgY: 0 });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    // 1. SHA-256 Hashing (Real)
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    setHash(Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

    try {
      // 2. Parse EXIF
      const data = await exifr.parse(file, true);
      setMetadata(data);
      
      if (data?.latitude) {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.latitude}&lon=${data.longitude}`);
        const geo = await res.json();
        setLocation(geo.display_name);
      }
      
      // 3. Process Image for Histogram & Colors
      const img = new Image();
      img.onload = () => {
        processForensics(img);
      };
      img.src = objectUrl;

    } catch (err) {
      setMetadata({ error: "Invalid Metadata" });
    } finally {
      setTimeout(() => setIsProcessing(false), 800);
    }
  };

  const processForensics = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // --- REAL LUMINANCE HISTOGRAM CALCULATION ---
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let brightnessData = new Array(256).fill(0);
    let colorCounts = {};

    for (let i = 0; i < imageData.length; i += 4) {
      // Formula Luminance: Y = 0.299R + 0.587G + 0.114B
      const r = imageData[i];
      const g = imageData[i+1];
      const b = imageData[i+2];
      const lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      brightnessData[lum]++;

      // Collect some colors for palette
      if (i % 4000 === 0) {
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }
    }

    // Draw Histogram to Canvas
    const hCtx = histRef.current.getContext('2d');
    hCtx.clearRect(0, 0, 300, 100);
    const maxVal = Math.max(...brightnessData);
    hCtx.fillStyle = '#6366f1';
    brightnessData.forEach((val, i) => {
      const h = (val / maxVal) * 100;
      hCtx.fillRect(i * (300 / 256), 100 - h, 1, h);
    });

    // Set Palette
    setColors(Object.keys(colorCounts).sort((a,b) => colorCounts[b] - colorCounts[a]).slice(0, 6));

    // --- RENDER ELA ---
    const elaCtx = canvasRef.current.getContext('2d');
    canvasRef.current.width = img.width;
    canvasRef.current.height = img.height;
    elaCtx.drawImage(img, 0, 0);
    elaCtx.globalCompositeOperation = 'difference';
    elaCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    elaCtx.fillRect(0, 0, img.width, img.height);
  };

  // --- FIXED ZOOM LOGIC ---
  const handleMouseMove = (e) => {
    const container = e.currentTarget;
    const { left, top, width, height } = container.getBoundingClientRect();
    
    const x = e.clientX - left;
    const y = e.clientY - top;
    
    // Calculate percentage for background position
    const moveX = (x / width) * 100;
    const moveY = (y / height) * 100;

    setZoomPos({
      x: x,
      y: y,
      show: true,
      bgX: moveX,
      bgY: moveY
    });
  };

  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span></div>
        <label style={styles.uploadBtn}>
          <input type="file" hidden onChange={handleUpload} />
          {isProcessing ? 'SCANNING...' : 'OPEN IMAGE'}
        </label>
        <nav style={styles.nav}>
          <button onClick={() => setActiveTab('intelligence')} style={activeTab === 'intelligence' ? styles.tabActive : styles.navTab}>Intelligence</button>
          <button onClick={() => setActiveTab('forensics')} style={activeTab === 'forensics' ? styles.tabActive : styles.navTab}>Forensics Lab</button>
          <button onClick={() => setActiveTab('raw')} style={activeTab === 'raw' ? styles.tabActive : styles.navTab}>System Log</button>
        </nav>
        <div style={styles.sidebarFooter}>
           <div style={styles.user}>{session.user.name}</div>
           <button onClick={() => signOut()} style={styles.logout}>Logout</button>
        </div>
      </aside>

      <main style={styles.main}>
        {!preview ? (
          <div style={styles.empty}>AWAITING IMAGE INPUT...</div>
        ) : (
          <div style={styles.container}>
            <div style={styles.topBar}>
              <div style={styles.statusBox}>
                <div style={styles.dot}></div>
                <span>{metadata?.Make ? 'AUTHENTIC HARDWARE' : 'METADATA STRIPPED'}</span>
              </div>
              <div style={styles.hashText}>SHA-256: {hash.substring(0, 24)}...</div>
            </div>

            <div style={styles.layout}>
              {/* VISUAL PANEL */}
              <div style={styles.visualCol}>
                <div style={styles.card}>
                  <div style={styles.imageContainer} onMouseMove={handleMouseMove} onMouseLeave={() => setZoomPos(p => ({...p, show: false}))}>
                    <img src={preview} style={styles.mainImg} alt="Evidence" />
                    {zoomPos.show && (
                      <div style={{
                        ...styles.loupe,
                        left: `${zoomPos.x}px`,
                        top: `${zoomPos.y}px`,
                        backgroundImage: `url(${preview})`,
                        backgroundPosition: `${zoomPos.bgX}% ${zoomPos.bgY}%`
                      }}></div>
                    )}
                  </div>
                  <div style={styles.palette}>
                    {colors.map(c => <div key={c} style={{...styles.color, background: c}}></div>)}
                  </div>
                </div>
                
                <div style={styles.card}>
                  <div style={styles.cardLabel}>REAL LUMINANCE HISTOGRAM</div>
                  <canvas ref={histRef} width="300" height="100" style={styles.histCanvas}></canvas>
                </div>
              </div>

              {/* DATA PANEL */}
              <div style={styles.dataCol}>
                <div style={styles.card}>
                  {activeTab === 'intelligence' && (
                    <>
                      <div style={styles.cardLabel}>DEVICE DATA</div>
                      <DataRow label="Make" value={metadata?.Make} />
                      <DataRow label="Model" value={metadata?.Model} />
                      <DataRow label="Software" value={metadata?.Software} />
                      <DataRow label="Aperture" value={metadata?.FNumber ? `f/${metadata.FNumber}` : null} />
                      
                      <div style={{marginTop:'25px'}}>
                        <div style={styles.cardLabel}>GEO RESOLUTION</div>
                        <p style={styles.locText}>{location || 'No GPS coordinates found in file header.'}</p>
                        {metadata?.latitude && (
                          <iframe width="100%" height="180" style={styles.map} src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=14&output=embed`}></iframe>
                        )}
                      </div>
                    </>
                  )}

                  {activeTab === 'forensics' && (
                    <>
                      <div style={styles.cardLabel}>ERROR LEVEL ANALYSIS (ELA)</div>
                      <canvas ref={canvasRef} style={styles.elaCanvas}></canvas>
                      <p style={styles.desc}>Area dengan kontras tinggi menunjukkan perbedaan level kompresi (potensi manipulasi pixel).</p>
                    </>
                  )}

                  {activeTab === 'raw' && (
                    <pre style={styles.raw}>{JSON.stringify(metadata, null, 2)}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Reusable
const DataRow = ({ label, value }) => (
  <div style={styles.row}>
    <span style={styles.rowLabel}>{label}</span>
    <span style={styles.rowValue}>{value || '—'}</span>
  </div>
);

const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginPage}>
    <div style={styles.loginCard}>
      <h1 style={{fontSize:'28px', marginBottom:'10px'}}>exif-viewer</h1>
      <p style={{color:'#71717a', marginBottom:'30px'}}>Advanced Image Intelligence Platform</p>
      <button onClick={onLogin} style={styles.loginBtn}>Sign in with Google</button>
    </div>
  </div>
);

const styles = {
  app: { display: 'flex', height: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'Inter, system-ui' },
  sidebar: { width: '260px', borderRight: '1px solid #18181b', padding: '30px', display: 'flex', flexDirection: 'column' },
  brand: { fontSize: '22px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '-1px' },
  uploadBtn: { background: '#6366f1', color: '#fff', padding: '12px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  nav: { marginTop: '30px', flex: 1 },
  navTab: { display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '12px 0', color: '#71717a', cursor: 'pointer', fontSize: '14px' },
  tabActive: { display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '12px 0', color: '#6366f1', fontWeight: 'bold', fontSize: '14px' },
  main: { flex: 1, overflowY: 'auto' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '40px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#18181b', padding: '15px 25px', borderRadius: '12px', border: '1px solid #27272a' },
  statusBox: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 'bold' },
  dot: { width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' },
  hashText: { fontSize: '11px', color: '#71717a', fontFamily: 'monospace' },
  layout: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' },
  visualCol: { display: 'flex', flexDirection: 'column', gap: '25px' },
  card: { background: '#18181b', borderRadius: '16px', border: '1px solid #27272a', padding: '24px' },
  imageContainer: { position: 'relative', overflow: 'hidden', borderRadius: '12px', cursor: 'crosshair', background: '#000' },
  mainImg: { width: '100%', display: 'block' },
  loupe: { 
    position: 'absolute', 
    width: '120px', 
    height: '120px', 
    border: '3px solid #6366f1', 
    borderRadius: '50%', 
    pointerEvents: 'none', 
    backgroundSize: '400%', // Zoom level 4x
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 20px rgba(0,0,0,0.8)'
  },
  palette: { display: 'flex', gap: '8px', marginTop: '15px' },
  color: { width: '24px', height: '24px', borderRadius: '6px' },
  histCanvas: { width: '100%', height: '80px', marginTop: '10px' },
  cardLabel: { fontSize: '11px', color: '#6366f1', fontWeight: 'bold', marginBottom: '15px', letterSpacing: '1px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #27272a', fontSize: '14px' },
  rowLabel: { color: '#71717a' },
  locText: { fontSize: '13px', lineHeight: '1.6', color: '#a1a1aa' },
  map: { borderRadius: '12px', border: '1px solid #27272a', marginTop: '15px' },
  elaCanvas: { width: '100%', borderRadius: '12px', background: '#000' },
  raw: { fontSize: '11px', color: '#10b981', background: '#000', padding: '15px', borderRadius: '12px', overflowX: 'auto' },
  desc: { fontSize: '12px', color: '#71717a', marginTop: '10px' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '14px', letterSpacing: '2px' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #18181b' },
  user: { fontSize: '14px', fontWeight: 'bold' },
  logout: { color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' },
  loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginCard: { background: '#09090b', padding: '60px', borderRadius: '24px', border: '1px solid #27272a', textAlign: 'center' },
  loginBtn: { background: '#fff', color: '#000', padding: '12px 35px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }
};
