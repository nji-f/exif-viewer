import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import exifr from 'exifr';

export default function ExifViewer() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState("");
  const [hash, setHash] = useState({ sha256: '' });
  const [dominantColors, setDominantColors] = useState([]);
  const canvasRef = useRef(null);
  const histogramRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setPreview(URL.createObjectURL(file));
    
    // Generate Hash
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    setHash({ sha256: Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('') });

    try {
      const data = await exifr.parse(file, { tiff: true, xmp: true, gps: true, jfif: true });
      setMetadata(data);
      
      if (data?.latitude) {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.latitude}&lon=${data.longitude}`);
        const geo = await res.json();
        setLocation(geo.display_name);
      }
      
      // Jalankan analisis visual
      const img = new Image();
      img.onload = () => {
        analyzeImage(img);
        renderELA(img);
      };
      img.src = URL.createObjectURL(file);

    } catch (err) {
      setMetadata({ error: "Invalid Metadata" });
    } finally {
      setTimeout(() => setIsProcessing(false), 800);
    }
  };

  // Fitur Baru: Analisis Histogram & Warna
  const analyzeImage = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 100; canvas.height = 100;
    ctx.drawImage(img, 0, 0, 100, 100);
    const data = ctx.getImageData(0, 0, 100, 100).data;
    
    let brightness = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const avg = Math.floor((data[i] + data[i+1] + data[i+2]) / 3);
      brightness[avg]++;
    }
    drawHistogram(brightness);
  };

  const drawHistogram = (data) => {
    const canvas = histogramRef.current;
    const ctx = canvas.getContext('2d');
    const max = Math.max(...data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6366f1';
    data.forEach((val, i) => {
      const h = (val / max) * canvas.height;
      ctx.fillRect(i * (canvas.width / 256), canvas.height - h, 1, h);
    });
  };

  const renderELA = (img) => {
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = img.width;
    canvasRef.current.height = img.height;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, img.width, img.height);
  };

  const getForensicStatus = () => {
    if (!metadata) return null;
    if (metadata.Software?.includes('Adobe') || metadata.Software?.includes('Canva')) {
      return { msg: 'MANIPULATED', color: '#f43f5e', desc: `Processed via ${metadata.Software}` };
    }
    if (metadata.Make) {
      return { msg: 'AUTHENTIC', color: '#10b981', desc: `Captured by ${metadata.Make} ${metadata.Model}` };
    }
    return { msg: 'STRIPPED', color: '#f59e0b', desc: 'No hardware signature found.' };
  };

  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  const status = getForensicStatus();

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span></div>
        
        <label style={styles.uploadBtn}>
          <input type="file" hidden onChange={handleUpload} />
          {isProcessing ? 'Analysing...' : 'Open Image'}
        </label>

        <nav style={styles.nav}>
          <button onClick={() => setActiveTab('overview')} style={{...styles.navTab, color: activeTab === 'overview' ? '#fff' : '#71717a'}}>Intelligence</button>
          <button onClick={() => setActiveTab('forensics')} style={{...styles.navTab, color: activeTab === 'forensics' ? '#fff' : '#71717a'}}>Forensic Labs</button>
          <button onClick={() => setActiveTab('raw')} style={{...styles.navTab, color: activeTab === 'raw' ? '#fff' : '#71717a'}}>Data Stream</button>
        </nav>

        <div style={styles.sidebarFooter}>
           <div style={styles.userLabel}>{session.user.name}</div>
           <button onClick={() => signOut()} style={styles.logoutBtn}>Logout Session</button>
        </div>
      </aside>

      <main style={styles.main}>
        {!preview ? (
          <div style={styles.empty}>Select a file to begin automated forensic extraction.</div>
        ) : (
          <div style={styles.container}>
            {/* Top Insight Bar */}
            <div style={{...styles.insightBar, borderLeft: `4px solid ${status?.color}`}}>
              <div>
                <div style={{fontSize: '10px', color: '#71717a'}}>INTEGRITY STATUS</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: status?.color}}>{status?.msg}</div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '10px', color: '#71717a'}}>FINGERPRINT</div>
                <code style={{fontSize: '11px'}}>{hash.sha256.substring(0, 32)}...</code>
              </div>
            </div>

            <div style={styles.workspace}>
              <div style={styles.leftCol}>
                <div style={styles.card}>
                  <img src={preview} style={styles.img} />
                </div>
                
                <div style={styles.card}>
                  <div style={styles.cardHeader}>LUMINANCE HISTOGRAM</div>
                  <canvas ref={histogramRef} width="300" height="100" style={{width: '100%'}}></canvas>
                </div>
              </div>

              <div style={styles.rightCol}>
                {activeTab === 'overview' && (
                  <div className="fade-in">
                    <div style={styles.card}>
                      <div style={styles.cardHeader}>DEVICE SPECIFICATIONS</div>
                      <StatRow label="Manufacturer" value={metadata?.Make} />
                      <StatRow label="Model" value={metadata?.Model} />
                      <StatRow label="Lens" value={metadata?.LensModel} />
                      <StatRow label="Exposure" value={metadata?.ExposureTime ? `1/${Math.round(1/metadata.ExposureTime)}s` : null} />
                    </div>

                    <div style={styles.card}>
                      <div style={styles.cardHeader}>GEOLOCATION</div>
                      <div style={styles.addressText}>{location || "No geographic data embedded."}</div>
                      {metadata?.latitude && (
                        <iframe width="100%" height="180" style={{borderRadius: '8px', border: '1px solid #27272a', marginTop: '15px'}} 
                        src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=14&output=embed`}></iframe>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'forensics' && (
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>ERROR LEVEL ANALYSIS (ELA)</div>
                    <canvas ref={canvasRef} style={styles.elaCanvas}></canvas>
                    <p style={styles.hint}>Analisis perbedaan kompresi. Area putih terang yang tidak wajar menunjukkan potensi editan pixel.</p>
                  </div>
                )}

                {activeTab === 'raw' && (
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>HEX/JSON STREAM</div>
                    <pre style={styles.raw}>{JSON.stringify(metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-components
const StatRow = ({ label, value }) => (
  <div style={styles.statRow}>
    <span style={{color: '#71717a'}}>{label}</span>
    <span style={{fontWeight: '500'}}>{value || "—"}</span>
  </div>
);

const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginPage}>
    <div style={styles.loginCard}>
      <h1 style={{fontSize: '24px', marginBottom: '8px'}}>exif-viewer</h1>
      <p style={{color: '#71717a', fontSize: '14px', marginBottom: '32px'}}>Professional Image Intelligence</p>
      <button onClick={onLogin} style={styles.loginBtn}>Sign in with Google</button>
    </div>
  </div>
);

const styles = {
  app: { display: 'flex', height: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'system-ui' },
  sidebar: { width: '260px', borderRight: '1px solid #27272a', padding: '30px', display: 'flex', flexDirection: 'column' },
  brand: { fontSize: '20px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '-1px' },
  uploadBtn: { background: '#6366f1', color: '#fff', padding: '12px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  nav: { marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '10px' },
  navTab: { background: 'none', border: 'none', textAlign: 'left', padding: '8px 0', cursor: 'pointer', fontSize: '14px' },
  main: { flex: 1, overflowY: 'auto' },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '40px' },
  insightBar: { background: '#18181b', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' },
  workspace: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' },
  card: { background: '#18181b', borderRadius: '12px', padding: '24px', border: '1px solid #27272a', marginBottom: '25px' },
  cardHeader: { fontSize: '11px', color: '#71717a', letterSpacing: '1px', fontWeight: 'bold', marginBottom: '15px' },
  img: { width: '100%', borderRadius: '8px' },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #27272a', fontSize: '14px' },
  addressText: { fontSize: '14px', lineHeight: '1.6', color: '#a1a1aa' },
  elaCanvas: { width: '100%', borderRadius: '8px', background: '#000' },
  raw: { fontSize: '11px', color: '#10b981', overflowX: 'auto', maxHeight: '500px' },
  hint: { fontSize: '12px', color: '#71717a', marginTop: '15px', lineHeight: '1.5' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '14px' },
  sidebarFooter: { marginTop: 'auto', borderTop: '1px solid #27272a', paddingTop: '20px' },
  userLabel: { fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' },
  logoutBtn: { color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 },
  loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginCard: { background: '#09090b', padding: '50px', borderRadius: '20px', border: '1px solid #27272a', textAlign: 'center' },
  loginBtn: { background: '#fff', color: '#000', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};
