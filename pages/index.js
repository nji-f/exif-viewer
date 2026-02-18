import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import exifr from 'exifr';

export default function Home() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ip, setIp] = useState("Detecting...");
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json').then(res => res.json()).then(data => setIp(data.ip));
  }, []);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      const data = await exifr.parse(file, true);
      setMetadata(data);
    } catch (err) {
      setMetadata({ error: "No EXIF data found." });
    }
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(metadata, null, 2)], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "forensic_report.txt";
    document.body.appendChild(element);
    element.click();
  };

  if (!session) return (
    <div style={styles.loginPage}>
      <h1 style={{fontSize: '3rem', fontWeight: '900'}}>IMAGER<span style={{color: '#3b82f6'}}>X</span></h1>
      <p style={{marginBottom: '20px', color: '#94a3b8'}}>Advanced Digital Image Forensics Platform</p>
      <button style={styles.primaryBtn} onClick={() => signIn('google')}>Start Investigation</button>
    </div>
  );

  return (
    <div style={styles.appContainer}>
      <nav style={styles.nav}>
        <div style={{fontWeight: '900', fontSize: '1.2rem'}}>IMAGERX <span style={styles.badge}>OSINT</span></div>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <span style={styles.ipText}>NODE: {ip}</span>
          <button style={styles.logOut} onClick={() => signOut()}>Disconnect</button>
        </div>
      </nav>

      <div style={styles.layout}>
        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          <div style={styles.card}>
            <label style={styles.uploadBox}>
              <input type="file" style={{display:'none'}} onChange={handleImage} />
              <div style={{fontSize: '2rem'}}>🛰️</div>
              <p style={{fontSize: '12px', fontWeight: 'bold'}}>INJECT IMAGE</p>
            </label>
            {preview && <img src={preview} style={styles.previewImg} />}
            {metadata && (
              <button onClick={downloadReport} style={styles.downloadBtn}>📥 Download Report (.txt)</button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={styles.mainContent}>
          <div style={styles.tabs}>
            <button onClick={() => setActiveTab('basic')} style={activeTab === 'basic' ? styles.tabActive : styles.tab}>Core Info</button>
            <button onClick={() => setActiveTab('camera')} style={activeTab === 'camera' ? styles.tabActive : styles.tab}>Optics/Lens</button>
            <button onClick={() => setActiveTab('raw')} style={activeTab === 'raw' ? styles.tabActive : styles.tab}>System Log (Raw)</button>
          </div>

          <div style={styles.displayArea}>
            {!metadata ? (
              <div style={styles.empty}>SYSTEM READY: AWAITING INPUT...</div>
            ) : (
              <>
                {activeTab === 'basic' && (
                  <div style={styles.grid}>
                    <StatCard label="MANUFACTURER" value={metadata.Make} />
                    <StatCard label="MODEL" value={metadata.Model} />
                    <StatCard label="OWNER/ARTIST" value={metadata.Artist || metadata.XPAuthor || "Unknown"} />
                    <StatCard label="IP/SOURCE" value={metadata.SourceFile || "N/A"} />
                    <StatCard label="TIMESTAMP" value={metadata.DateTimeOriginal?.toString()} />
                    <StatCard label="LOCATION" value={metadata.latitude ? `${metadata.latitude}, ${metadata.longitude}` : "No GPS"} />
                    {metadata.latitude && (
                      <div style={{gridColumn: '1 / span 2'}}>
                        <iframe width="100%" height="250" style={{borderRadius: '12px', border: '1px solid #334155'}}
                          src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=16&output=embed`}>
                        </iframe>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'camera' && (
                  <div style={styles.grid}>
                    <StatCard label="EXPOSURE" value={metadata.ExposureTime ? `1/${1/metadata.ExposureTime}s` : "N/A"} />
                    <StatCard label="ISO" value={metadata.ISO} />
                    <StatCard label="F-NUMBER" value={metadata.FNumber ? `f/${metadata.FNumber}` : "N/A"} />
                    <StatCard label="FOCAL LENGTH" value={metadata.FocalLength ? `${metadata.FocalLength}mm` : "N/A"} />
                    <StatCard label="LENS" value={metadata.LensModel} />
                    <StatCard label="FLASH" value={metadata.Flash} />
                  </div>
                )}

                {activeTab === 'raw' && (
                  <pre style={styles.rawOutput}>{JSON.stringify(metadata, null, 2)}</pre>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value || "UNDEFINED"}</div>
    </div>
  );
}

const styles = {
  loginPage: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#fff', fontFamily: 'monospace' },
  primaryBtn: { background: '#3b82f6', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '1rem' },
  appContainer: { minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'monospace' },
  nav: { display: 'flex', justifyContent: 'space-between', padding: '20px 40px', background: '#0f172a', borderBottom: '1px solid #1e293b' },
  ipText: { color: '#22c55e', fontSize: '12px' },
  logOut: { background: '#ef4444', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' },
  badge: { background: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', verticalAlign: 'middle' },
  layout: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px', padding: '20px' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' },
  uploadBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #334155', borderRadius: '12px', height: '150px', cursor: 'pointer', marginBottom: '20px' },
  previewImg: { width: '100%', borderRadius: '8px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' },
  downloadBtn: { width: '100%', marginTop: '20px', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
  mainContent: { display: 'flex', flexDirection: 'column', gap: '20px' },
  tabs: { display: 'flex', gap: '10px' },
  tab: { background: '#0f172a', color: '#94a3b8', border: '1px solid #1e293b', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  tabActive: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  displayArea: { background: '#0f172a', padding: '30px', borderRadius: '16px', border: '1px solid #1e293b', minHeight: '500px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  statCard: { background: '#1e293b', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' },
  statLabel: { fontSize: '10px', color: '#94a3b8', marginBottom: '5px' },
  statValue: { fontSize: '14px', fontWeight: 'bold', color: '#fff' },
  rawOutput: { background: '#020617', padding: '20px', borderRadius: '12px', color: '#22c55e', overflowX: 'auto', fontSize: '12px' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#334155', letterSpacing: '4px' }
};
