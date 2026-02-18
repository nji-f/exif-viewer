import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import exifr from 'exifr';

export default function Home() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ip, setIp] = useState("Scanning...");
  const [activeTab, setActiveTab] = useState('analysis');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp("Offline"));
  }, []);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setPreview(URL.createObjectURL(file));
    setFileInfo({
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
      type: file.type
    });

    try {
      const data = await exifr.parse(file, {
        tiff: true, xmp: true, icc: true, jfif: true, gps: true
      });
      setMetadata(data || { error: "No EXIF data detected." });
    } catch (err) {
      setMetadata({ error: "Failed to parse metadata." });
    } finally {
      setLoading(false);
    }
  };

  const getRiskScore = () => {
    if (!metadata || metadata.error) return { label: "HIGH RISK", color: "#ef4444", text: "Metadata stripped / possible manipulation." };
    if (!metadata.Make && !metadata.Software) return { label: "MEDIUM", color: "#f59e0b", text: "Limited hardware data found." };
    return { label: "LOW RISK", color: "#22c55e", text: "Authentic hardware signature detected." };
  };

  if (!session) return (
    <div style={styles.loginPage}>
      <div style={styles.loginCard}>
        <div style={styles.glitchBox}>
          <h1 style={styles.heroTitle}>IMAGER<span style={{color: '#3b82f6'}}>X</span></h1>
        </div>
        <p style={styles.heroSub}>Digital Intelligence & Forensic Image Analysis</p>
        <button style={styles.primaryBtn} onClick={() => signIn('google')}>
          AUTHENTICATE SYSTEM
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.appContainer}>
      {/* HEADER */}
      <nav style={styles.nav}>
        <div style={styles.logoGroup}>
          <span style={styles.logo}>IMAGERX</span>
          <span style={styles.badge}>v2.0 PRO</span>
        </div>
        <div style={styles.navActions}>
          <div style={styles.ipBadge}>
            <span style={styles.dot}></span> TERMINAL: {ip}
          </div>
          <button style={styles.logOut} onClick={() => signOut()}>DISCONNECT</button>
        </div>
      </nav>

      <div style={styles.layout}>
        {/* SIDEBAR: INPUT & PREVIEW */}
        <aside style={styles.sidebar}>
          <div style={styles.glassCard}>
            <h4 style={styles.cardTitle}>DATA INJECTION</h4>
            <label style={styles.uploadBox}>
              <input type="file" style={{display:'none'}} onChange={handleImage} accept="image/*" />
              <span style={{fontSize: '24px'}}>📂</span>
              <p style={{fontSize: '11px', marginTop: '10px'}}>DRAG OR CLICK TO UPLOAD</p>
            </label>

            {preview && (
              <div style={styles.previewContainer}>
                <img src={preview} style={styles.previewImg} alt="Evidence" />
                <div style={styles.fileBrief}>
                  <p><strong>FILE:</strong> {fileInfo?.name}</p>
                  <p><strong>SIZE:</strong> {fileInfo?.size}</p>
                </div>
              </div>
            )}
          </div>

          {metadata && !metadata.error && (
            <div style={styles.glassCard}>
              <h4 style={styles.cardTitle}>EXPORT EVIDENCE</h4>
              <button onClick={() => window.print()} style={styles.actionBtn}>Print Full Report</button>
              <a 
                href={`https://www.google.com/searchbyimage?image_url=${preview}`} 
                target="_blank" 
                style={{...styles.actionBtn, textDecoration: 'none', display: 'block', textAlign: 'center'}}
              >
                Reverse Image Search
              </a>
            </div>
          )}
        </aside>

        {/* MAIN PANEL */}
        <main style={styles.mainContent}>
          <div style={styles.tabContainer}>
            <button onClick={() => setActiveTab('analysis')} style={activeTab === 'analysis' ? styles.tabActive : styles.tab}>Forensic Analysis</button>
            <button onClick={() => setActiveTab('camera')} style={activeTab === 'camera' ? styles.tabActive : styles.tab}>Optics</button>
            <button onClick={() => setActiveTab('raw')} style={activeTab === 'raw' ? styles.tabActive : styles.tab}>Metadata Log</button>
          </div>

          <div style={styles.displayArea}>
            {!metadata ? (
              <div style={styles.emptyState}>
                <div style={styles.pulse}></div>
                AWAITING ENCRYPTED DATA INPUT...
              </div>
            ) : (
              <div className="fade-in">
                {activeTab === 'analysis' && (
                  <div style={styles.analysisGrid}>
                    {/* Security Score */}
                    <div style={{...styles.riskCard, borderColor: getRiskScore().color}}>
                      <p style={{fontSize: '10px', color: '#94a3b8'}}>INTEGRITY SCORE</p>
                      <h2 style={{color: getRiskScore().color, margin: '5px 0'}}>{getRiskScore().label}</h2>
                      <p style={{fontSize: '12px'}}>{getRiskScore().text}</p>
                    </div>

                    <div style={styles.infoGrid}>
                      <StatCard label="DEVICE MAKE" value={metadata.Make} />
                      <StatCard label="DEVICE MODEL" value={metadata.Model} />
                      <StatCard label="SOFTWARE" value={metadata.Software} />
                      <StatCard label="TIMESTAMP" value={metadata.DateTimeOriginal?.toLocaleString()} />
                    </div>

                    {metadata.latitude && (
                      <div style={styles.mapContainer}>
                        <p style={styles.cardTitle}>GPS COORDINATES DETECTED</p>
                        <p style={{fontSize: '12px', color: '#22c55e', marginBottom: '10px'}}>
                          LOC: {metadata.latitude.toFixed(4)}, {metadata.longitude.toFixed(4)}
                        </p>
                        <iframe 
                          width="100%" height="200" style={{borderRadius: '8px', border: 'none'}}
                          src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=14&output=embed`}>
                        </iframe>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'camera' && (
                  <div style={styles.infoGrid}>
                    <StatCard label="EXPOSURE" value={metadata.ExposureTime ? `1/${Math.round(1/metadata.ExposureTime)}s` : null} />
                    <StatCard label="ISO SPEED" value={metadata.ISO} />
                    <StatCard label="APERTURE" value={metadata.FNumber ? `f/${metadata.FNumber}` : null} />
                    <StatCard label="FOCAL LENGTH" value={metadata.FocalLength ? `${metadata.FocalLength}mm` : null} />
                    <StatCard label="LENS MODEL" value={metadata.LensModel} />
                    <StatCard label="WHITE BALANCE" value={metadata.WhiteBalance} />
                  </div>
                )}

                {activeTab === 'raw' && (
                  <pre style={styles.rawOutput}>{JSON.stringify(metadata, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value || "NOT DETECTED"}</div>
    </div>
  );
}

const styles = {
  // --- Layout & Global ---
  appContainer: { minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: '"JetBrains Mono", monospace' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100 },
  layout: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px', padding: '25px', maxWidth: '1600px', margin: '0 auto' },
  
  // --- Components ---
  glassCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  cardTitle: { fontSize: '11px', color: '#64748b', letterSpacing: '2px', marginBottom: '15px', fontWeight: 'bold' },
  
  logoGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: { fontWeight: '900', fontSize: '1.4rem', letterSpacing: '1px' },
  badge: { background: '#3b82f6', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' },
  
  ipBadge: { background: '#020617', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', border: '1px solid #334155', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px' },
  dot: { width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e' },
  
  uploadBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #1e293b', borderRadius: '12px', height: '120px', cursor: 'pointer', transition: 'all 0.3s ease', ':hover': { borderColor: '#3b82f6'} },
  
  previewContainer: { marginTop: '20px' },
  previewImg: { width: '100%', borderRadius: '8px', border: '1px solid #334155', objectFit: 'cover', height: '180px' },
  fileBrief: { marginTop: '10px', fontSize: '10px', color: '#94a3b8', lineHeight: '1.6' },

  mainContent: { display: 'flex', flexDirection: 'column', gap: '20px' },
  tabContainer: { display: 'flex', gap: '10px' },
  tab: { background: 'transparent', color: '#64748b', border: '1px solid #1e293b', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' },
  tabActive: { background: '#3b82f6', color: '#fff', border: '1px solid #3b82f6', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  
  displayArea: { minHeight: '600px' },
  analysisGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' },
  
  statCard: { background: '#0f172a', padding: '15px', borderRadius: '10px', border: '1px solid #1e293b' },
  statLabel: { fontSize: '10px', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase' },
  statValue: { fontSize: '13px', fontWeight: 'bold', color: '#f1f5f9' },

  riskCard: { padding: '20px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.5)', borderLeft: '6px solid' },
  
  rawOutput: { background: '#020617', padding: '20px', borderRadius: '12px', color: '#22c55e', overflowX: 'auto', fontSize: '12px', border: '1px solid #1e293b' },
  
  emptyState: { height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', letterSpacing: '3px', fontSize: '12px' },
  pulse: { width: '15px', height: '15px', background: '#3b82f6', borderRadius: '50%', marginBottom: '20px', animation: 'pulse 2s infinite' },

  actionBtn: { width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginTop: '10px' },

  // --- Login Page ---
  loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' },
  loginCard: { textAlign: 'center', padding: '40px', background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
  heroTitle: { fontSize: '3.5rem', fontWeight: '900', margin: 0, letterSpacing: '-2px' },
  heroSub: { color: '#64748b', marginBottom: '30px', fontSize: '14px' },
  primaryBtn: { background: '#3b82f6', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px' },
  logOut: { background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }
};
