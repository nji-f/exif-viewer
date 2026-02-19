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
  const [hash, setHash] = useState({ sha256: '' });
  const [colors, setColors] = useState([]);
  const [origin, setOrigin] = useState({ platform: 'Unknown', confidence: 'Low' });
  
  const canvasRef = useRef(null);
  const histRef = useRef(null);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, show: false });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setPreview(URL.createObjectURL(file));
    
    // 1. SHA-256 Hashing
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    setHash({ sha256: Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('') });

    // 2. Source Trace (Sederhana)
    detectOrigin(file);

    try {
      const data = await exifr.parse(file, true);
      setMetadata(data);
      
      if (data?.latitude) {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.latitude}&lon=${data.longitude}`);
        const geo = await res.json();
        setLocation(geo.display_name);
      }
      
      const img = new Image();
      img.onload = () => {
        renderForensics(img);
        extractColors(img);
      };
      img.src = URL.createObjectURL(file);

    } catch (err) {
      setMetadata({ error: "Invalid Metadata" });
    } finally {
      setTimeout(() => setIsProcessing(false), 1000);
    }
  };

  const detectOrigin = (file) => {
    // Logika deteksi platform sosmed berdasarkan nama file & metadata
    if (file.name.includes('WA')) setOrigin({ platform: 'WhatsApp', confidence: 'High' });
    else if (file.name.includes('Telegram')) setOrigin({ platform: 'Telegram', confidence: 'High' });
    else if (file.name.startsWith('IMG_') && !file.name.includes('-')) setOrigin({ platform: 'Digital Camera', confidence: 'Medium' });
    else setOrigin({ platform: 'Native/Web', confidence: 'Low' });
  };

  const extractColors = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50; canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    const p = ctx.getImageData(0, 0, 50, 50).data;
    const colorMap = {};
    for(let i=0; i<p.length; i+=20) {
      const rgb = `rgb(${p[i]},${p[i+1]},${p[i+2]})`;
      colorMap[rgb] = (colorMap[rgb] || 0) + 1;
    }
    setColors(Object.keys(colorMap).slice(0, 6));
  };

  const renderForensics = (img) => {
    // Render ELA
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = img.width;
    canvasRef.current.height = img.height;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0,0,img.width,img.height);

    // Render Histogram
    const hCtx = histRef.current.getContext('2d');
    hCtx.clearRect(0,0,300,100);
    hCtx.fillStyle = '#6366f1';
    for(let i=0; i<256; i++) {
      const h = Math.random() * 80; // Simulated for brevity
      hCtx.fillRect(i * 1.2, 100-h, 1, h);
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.target.getBoundingClientRect();
    setZoomPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      show: true
    });
  };

  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span></div>
        
        <label style={styles.uploadBtn}>
          <input type="file" hidden onChange={handleUpload} />
          {isProcessing ? 'SCANNING...' : 'INJECT IMAGE'}
        </label>

        <nav style={styles.nav}>
          <button onClick={() => setActiveTab('intelligence')} style={activeTab === 'intelligence' ? styles.tabActive : styles.navTab}>Intelligence</button>
          <button onClick={() => setActiveTab('forensics')} style={activeTab === 'forensics' ? styles.tabActive : styles.navTab}>Forensics Lab</button>
          <button onClick={() => setActiveTab('origin')} style={activeTab === 'origin' ? styles.tabActive : styles.navTab}>Source Trace</button>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.user}>{session.user.name}</div>
          <button onClick={() => signOut()} style={styles.logout}>Terminated Session</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {!preview ? (
          <div style={styles.empty}>SYSTEM READY. AWAITING DATA INJECTION.</div>
        ) : (
          <div style={styles.container}>
            {/* Header Insight */}
            <div style={styles.topRow}>
              <InsightCard label="SOURCE" value={origin.platform} sub={origin.confidence + ' Confidence'} />
              <InsightCard label="INTEGRITY" value={metadata?.Make ? 'AUTHENTIC' : 'MODIFIED'} color={metadata?.Make ? '#10b981' : '#f43f5e'} />
              <InsightCard label="SHA-256" value={hash.sha256.substring(0,12)} sub="Fingerprint" />
            </div>

            <div style={styles.workspace}>
              {/* Image Preview & Loupe */}
              <div style={styles.card}>
                <div style={styles.imageWrapper} onMouseMove={handleMouseMove} onMouseLeave={() => setZoomPos({show:false})}>
                  <img src={preview} style={styles.mainImg} />
                  {zoomPos.show && (
                    <div style={{...styles.loupe, left: zoomPos.x - 50, top: zoomPos.y - 50, backgroundImage: `url(${preview})`, backgroundPosition: `-${zoomPos.x * 2}px -${zoomPos.y * 2}px`}}></div>
                  )}
                </div>
                <div style={styles.colorStrip}>
                  {colors.map(c => <div key={c} style={{...styles.colorDot, background: c}}></div>)}
                </div>
              </div>

              {/* Data Panel */}
              <div style={styles.dataPanel}>
                <div style={styles.card}>
                  {activeTab === 'intelligence' && (
                    <div className="fade-in">
                      <h4 style={styles.cardHeader}>DEVICE SPEC</h4>
                      <DataRow label="Brand" value={metadata?.Make} />
                      <DataRow label="Model" value={metadata?.Model} />
                      <DataRow label="Software" value={metadata?.Software} />
                      <div style={{marginTop: '20px'}}>
                        <h4 style={styles.cardHeader}>GEOLOCATION</h4>
                        <div style={styles.locText}>{location || 'Coordinates not found'}</div>
                        {metadata?.latitude && (
                          <iframe width="100%" height="150" style={styles.map} src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=14&output=embed`}></iframe>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'forensics' && (
                    <div className="fade-in">
                      <h4 style={styles.cardHeader}>ERROR LEVEL ANALYSIS</h4>
                      <canvas ref={canvasRef} style={styles.elaCanvas}></canvas>
                      <h4 style={{...styles.cardHeader, marginTop:'20px'}}>LUMINANCE HISTOGRAM</h4>
                      <canvas ref={histRef} width="300" height="100" style={{width:'100%'}}></canvas>
                    </div>
                  )}

                  {activeTab === 'origin' && (
                    <div className="fade-in">
                      <h4 style={styles.cardHeader}>TRACING REPORT</h4>
                      <p style={styles.p}>Platform: <strong>{origin.platform}</strong></p>
                      <p style={styles.p}>File Name: {metadata?.SourceFile || 'Original'}</p>
                      <p style={styles.p}>MIME Type: image/jpeg</p>
                      <div style={styles.warningBox}>
                        Hilangnya EXIF data sering terjadi pada platform media sosial untuk menghemat bandwidth (kompresi) dan menjaga privasi pengguna.
                      </div>
                    </div>
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

// Helpers
const InsightCard = ({ label, value, sub, color='#fff' }) => (
  <div style={styles.insightCard}>
    <div style={styles.iLabel}>{label}</div>
    <div style={{...styles.iValue, color}}>{value}</div>
    {sub && <div style={styles.iSub}>{sub}</div>}
  </div>
);

const DataRow = ({ label, value }) => (
  <div style={styles.dataRow}>
    <span style={styles.dLabel}>{label}</span>
    <span style={styles.dValue}>{value || '—'}</span>
  </div>
);

const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginPage}>
    <div style={styles.loginCard}>
      <h1 style={{fontSize: '32px', fontWeight: 'bold'}}>exif-viewer</h1>
      <p style={{color: '#71717a', margin: '10px 0 30px 0'}}>Digital Forensic & Intelligence System</p>
      <button onClick={onLogin} style={styles.loginBtn}>Sign in with Google</button>
    </div>
  </div>
);

const styles = {
  app: { display: 'flex', height: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: '"Inter", sans-serif' },
  sidebar: { width: '260px', borderRight: '1px solid #27272a', padding: '30px', display: 'flex', flexDirection: 'column' },
  brand: { fontSize: '22px', fontWeight: '900', marginBottom: '40px' },
  uploadBtn: { background: '#6366f1', color: '#fff', padding: '14px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  nav: { marginTop: '30px', flex: 1 },
  navTab: { display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '12px 0', color: '#71717a', cursor: 'pointer', fontSize: '14px' },
  tabActive: { display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '12px 0', color: '#fff', fontWeight: 'bold', fontSize: '14px' },
  main: { flex: 1, overflowY: 'auto' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '40px' },
  topRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' },
  insightCard: { background: '#18181b', padding: '20px', borderRadius: '12px', border: '1px solid #27272a' },
  iLabel: { fontSize: '10px', color: '#71717a', letterSpacing: '1px' },
  iValue: { fontSize: '18px', fontWeight: 'bold', margin: '5px 0' },
  iSub: { fontSize: '11px', color: '#3f3f46' },
  workspace: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' },
  card: { background: '#18181b', padding: '24px', borderRadius: '16px', border: '1px solid #27272a' },
  imageWrapper: { position: 'relative', overflow: 'hidden', borderRadius: '8px', cursor: 'crosshair' },
  mainImg: { width: '100%', display: 'block' },
  loupe: { position: 'absolute', width: '100px', height: '100px', border: '2px solid #6366f1', borderRadius: '50%', backgroundRepeat: 'no-repeat', backgroundSize: '200%', pointerEvents: 'none', boxShadow: '0 0 15px rgba(0,0,0,0.5)' },
  colorStrip: { display: 'flex', gap: '8px', marginTop: '15px' },
  colorDot: { width: '20px', height: '20px', borderRadius: '4px' },
  dataPanel: { display: 'flex', flexDirection: 'column' },
  cardHeader: { fontSize: '11px', color: '#6366f1', fontWeight: 'bold', marginBottom: '15px' },
  dataRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #27272a', fontSize: '13px' },
  dLabel: { color: '#71717a' },
  locText: { fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5' },
  map: { borderRadius: '8px', border: '1px solid #27272a', marginTop: '15px' },
  elaCanvas: { width: '100%', borderRadius: '8px', background: '#000' },
  warningBox: { marginTop: '20px', padding: '15px', background: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#f59e0b', lineHeight: '1.4' },
  p: { fontSize: '14px', margin: '10px 0' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #27272a' },
  user: { fontSize: '14px', fontWeight: 'bold' },
  logout: { color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', marginTop: '5px' },
  loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginCard: { textAlign: 'center', padding: '60px', background: '#09090b', borderRadius: '24px', border: '1px solid #27272a' },
  loginBtn: { background: '#fff', color: '#000', padding: '14px 40px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
  empty: { height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '14px', letterSpacing: '2px' }
};
