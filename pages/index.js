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
  const [hash, setHash] = useState({ md5: '', sha256: '' });
  const canvasRef = useRef(null);

  // Fitur Baru: Menghitung Hash File (Digital Fingerprint)
  const generateHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setHash(prev => ({ ...prev, sha256: hashHex }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setPreview(URL.createObjectURL(file));
    generateHash(file);

    try {
      const data = await exifr.parse(file, { tiff: true, xmp: true, gps: true, jfif: true });
      setMetadata(data);
      
      if (data?.latitude) {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.latitude}&lon=${data.longitude}`);
        const geo = await res.json();
        setLocation(geo.display_name);
      }
      
      renderELA(file);
    } catch (err) {
      setMetadata({ error: "Invalid Metadata" });
    } finally {
      setTimeout(() => setIsProcessing(false), 800);
    }
  };

  const renderELA = (file) => {
    const reader = new FileReader();
    reader.onload = (f) => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, img.width, img.height);
      };
      img.src = f.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  return (
    <div style={styles.app}>
      {/* SIDEBAR NAVIGATION */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span></div>
        
        <div style={styles.uploadSection}>
          <label style={styles.dropzone}>
            <input type="file" hidden onChange={handleUpload} />
            <span style={{fontSize: '20px'}}>{isProcessing ? '⏳' : '⊕'}</span>
            <p style={styles.dropText}>{isProcessing ? 'ANALYZING' : 'UPLOAD IMAGE'}</p>
          </label>
        </div>

        <nav style={styles.nav}>
          <NavTab id="overview" label="Overview" active={activeTab} set={setActiveTab} />
          <NavTab id="geo" label="Geolocation" active={activeTab} set={setActiveTab} />
          <NavTab id="forensics" label="Forensics" active={activeTab} set={setActiveTab} />
          <NavTab id="raw" label="Raw Data" active={activeTab} set={setActiveTab} />
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userBox}>
            <div style={styles.userAvatar}>{session.user.name[0]}</div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{session.user.name}</div>
              <button onClick={() => signOut()} style={styles.logoutBtn}>Logout</button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={styles.main}>
        {!preview ? (
          <div style={styles.emptyState}>
            <h2>Ready for investigation</h2>
            <p>Upload a JPG/TIFF file to extract hidden intelligence.</p>
          </div>
        ) : (
          <div style={styles.workspace}>
            <header style={styles.header}>
              <h1>Analysis Report</h1>
              <div style={styles.headerActions}>
                <button onClick={() => window.print()} style={styles.secondaryBtn}>Export PDF</button>
              </div>
            </header>

            <div style={styles.grid}>
              {/* LEFT: VISUALS */}
              <div style={styles.visualCol}>
                <div style={styles.card}>
                  <img src={preview} style={styles.mainPreview} alt="Target" />
                </div>
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Digital Fingerprint</h3>
                  <div style={styles.hashBox}>
                    <label>SHA-256</label>
                    <code>{hash.sha256 || 'Calculating...'}</code>
                  </div>
                </div>
              </div>

              {/* RIGHT: DATA */}
              <div style={styles.dataCol}>
                <div style={styles.card}>
                  {activeTab === 'overview' && (
                    <div className="fade-in">
                      <h3 style={styles.cardTitle}>Device Information</h3>
                      <StatRow label="Camera" value={metadata?.Make} />
                      <StatRow label="Model" value={metadata?.Model} />
                      <StatRow label="Software" value={metadata?.Software} />
                      <StatRow label="Date Taken" value={metadata?.DateTimeOriginal?.toLocaleString()} />
                    </div>
                  )}

                  {activeTab === 'geo' && (
                    <div className="fade-in">
                      <h3 style={styles.cardTitle}>Location Mapping</h3>
                      <StatRow label="Coordinates" value={metadata?.latitude ? `${metadata.latitude}, ${metadata.longitude}` : "N/A"} />
                      <div style={styles.addressBox}>
                        <p style={styles.label}>Resolved Address:</p>
                        <p style={styles.addressText}>{location || "No GPS data found"}</p>
                      </div>
                      {metadata?.latitude && (
                        <iframe 
                          width="100%" height="250" style={styles.mapFrame}
                          src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=14&output=embed`}>
                        </iframe>
                      )}
                    </div>
                  )}

                  {activeTab === 'forensics' && (
                    <div className="fade-in">
                      <h3 style={styles.cardTitle}>Manipulation Analysis (ELA)</h3>
                      <canvas ref={canvasRef} style={styles.elaCanvas}></canvas>
                      <p style={styles.hint}>High-contrast areas might indicate localized editing.</p>
                    </div>
                  )}

                  {activeTab === 'raw' && (
                    <pre style={styles.rawJson}>{JSON.stringify(metadata, null, 2)}</pre>
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

// Helper Components
const NavTab = ({ id, label, active, set }) => (
  <button 
    onClick={() => set(id)} 
    style={{...styles.navTab, background: active === id ? '#1f1f23' : 'transparent', color: active === id ? '#fff' : '#a1a1aa'}}
  >
    {label}
  </button>
);

const StatRow = ({ label, value }) => (
  <div style={styles.statRow}>
    <span style={styles.label}>{label}</span>
    <span style={styles.value}>{value || "—"}</span>
  </div>
);

const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginContainer}>
    <div style={styles.loginCard}>
      <h1 style={{marginBottom: '10px'}}>exif-viewer</h1>
      <p style={{color: '#a1a1aa', marginBottom: '30px'}}>Advanced Image Metadata Forensics</p>
      <button onClick={onLogin} style={styles.primaryBtn}>Sign in with Google</button>
    </div>
  </div>
);

const styles = {
  app: { display: 'flex', height: '100vh', background: '#09090b', color: '#fafafa', fontFamily: '"Inter", system-ui, sans-serif' },
  sidebar: { width: '280px', borderRight: '1px solid #27272a', padding: '24px', display: 'flex', flexDirection: 'column' },
  brand: { fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '40px' },
  uploadSection: { marginBottom: '32px' },
  dropzone: { display: 'flex', alignItems: 'center', gap: '12px', background: '#18181b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #27272a', cursor: 'pointer' },
  dropText: { fontSize: '13px', fontWeight: '500' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navTab: { textAlign: 'left', padding: '10px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', transition: '0.2s' },
  main: { flex: 1, overflowY: 'auto', background: '#09090b' },
  workspace: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px' },
  card: { background: '#09090b', border: '1px solid #27272a', borderRadius: '12px', padding: '24px', marginBottom: '24px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '20px' },
  mainPreview: { width: '100%', borderRadius: '8px', border: '1px solid #27272a' },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #18181b', fontSize: '14px' },
  label: { color: '#a1a1aa' },
  hashBox: { marginTop: '10px', background: '#18181b', padding: '12px', borderRadius: '6px', overflowX: 'auto' },
  addressBox: { margin: '20px 0', padding: '16px', background: '#18181b', borderRadius: '8px' },
  addressText: { fontSize: '14px', lineHeight: '1.5', marginTop: '8px', color: '#6366f1' },
  elaCanvas: { width: '100%', borderRadius: '8px', background: '#000' },
  rawJson: { background: '#000', padding: '20px', borderRadius: '8px', fontSize: '12px', color: '#10b981', overflowX: 'auto' },
  emptyState: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #27272a' },
  userBox: { display: 'flex', gap: '12px', alignItems: 'center' },
  userAvatar: { width: '32px', height: '32px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  logoutBtn: { background: 'none', border: 'none', color: '#ef4444', padding: 0, fontSize: '12px', cursor: 'pointer' },
  primaryBtn: { background: '#fafafa', color: '#09090b', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  secondaryBtn: { background: '#18181b', color: '#fafafa', border: '1px solid #27272a', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  loginContainer: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginCard: { textAlign: 'center', padding: '48px', border: '1px solid #27272a', borderRadius: '16px', background: '#09090b' },
  hint: { fontSize: '12px', color: '#71717a', marginTop: '12px' },
  mapFrame: { borderRadius: '8px', border: '1px solid #27272a', marginTop: '16px' }
};
