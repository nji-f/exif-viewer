import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import exifr from 'exifr';

export default function Home() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
  const [rawJson, setRawJson] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ip, setIp] = useState("Detecting...");

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp("Unknown"));
  }, []);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      // Mengambil SEMUA data yang mungkin ada
      const data = await exifr.parse(file, true);
      setMetadata(data);
      setRawJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setMetadata({ error: "Data tidak terbaca." });
    }
  };

  if (!session) return (
    <div style={styles.loginWrapper}>
      <div style={styles.loginCard}>
        <h1 style={styles.mainTitle}>🔍 Cyber <span style={{color: '#3b82f6'}}>Forensic</span></h1>
        <button style={styles.primaryBtn} onClick={() => signIn('google')}>Login with Google</button>
      </div>
    </div>
  );

  return (
    <div style={styles.appBg}>
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.logoText}>FORENSIC PRO</span>
          <span style={styles.ipBadge}>YOUR CURRENT IP: {ip}</span>
        </div>
        <button style={styles.logOut} onClick={() => signOut()}>Logout</button>
      </header>

      <main style={styles.mainGrid}>
        <div style={styles.sideCol}>
          <div style={styles.card}>
            <label style={styles.uploadArea}>
              <input type="file" accept="image/*" onChange={handleImage} style={{display:'none'}} />
              <p>📁 Drop Image Here</p>
            </label>
            {preview && <img src={preview} style={styles.imgPreview} />}
          </div>
        </div>

        <div style={styles.contentCol}>
          {!metadata ? (
            <div style={styles.emptyPrompt}>Upload a photo to start deep scanning.</div>
          ) : (
            <div style={styles.resultsWrapper}>
              <h3 style={styles.cardTitle}>Core Intelligence</h3>
              <div style={styles.infoGrid}>
                <DataCard label="Creator IP / Source" value={metadata.SourceFile || metadata.IPAddress || "Not in Metadata"} icon="🌐" />
                <DataCard label="Camera Brand" value={metadata.Make} icon="🏢" />
                <DataCard label="Device Model" value={metadata.Model} icon="📱" />
                <DataCard label="Software Used" value={metadata.Software} icon="⚙️" />
                <DataCard label="Owner Name" value={metadata.Artist || metadata.Copyright || "Anonymous"} icon="👤" />
                <DataCard label="Location" value={metadata.latitude ? `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}` : "No GPS Tag"} icon="📍" />
              </div>

              {metadata.latitude && (
                <div style={styles.mapContainer}>
                  <iframe width="100%" height="200" style={{borderRadius: '12px', border: 'none'}}
                    src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=16&output=embed`}>
                  </iframe>
                </div>
              )}

              <div style={styles.rawSection}>
                <h3 style={styles.cardTitle}>Full Raw Metadata (All Hidden Tags)</h3>
                <div style={styles.rawBox}>
                  <pre style={{fontSize: '12px', color: '#4ade80'}}>{rawJson}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DataCard({ label, value, icon }) {
  return (
    <div style={styles.dataCard}>
      <span style={{fontSize: '20px'}}>{icon}</span>
      <div>
        <p style={styles.label}>{label}</p>
        <p style={styles.value}>{value || "---"}</p>
      </div>
    </div>
  );
}

const styles = {
  loginWrapper: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' },
  loginCard: { padding: '40px', background: '#1e293b', borderRadius: '24px', textAlign: 'center', color: '#fff' },
  mainTitle: { fontSize: '28px', marginBottom: '20px' },
  primaryBtn: { background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },
  appBg: { minHeight: '100vh', background: '#f1f5f9', fontFamily: 'monospace' },
  navbar: { display: 'flex', justifyContent: 'space-between', padding: '15px 40px', background: '#0f172a', color: '#fff' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  logoText: { fontWeight: 'bold', color: '#3b82f6' },
  ipBadge: { background: '#1e293b', padding: '4px 12px', borderRadius: '4px', fontSize: '11px' },
  logOut: { background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' },
  mainGrid: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px', padding: '20px' },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  uploadArea: { display: 'block', border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer' },
  imgPreview: { width: '100%', borderRadius: '8px', marginTop: '15px' },
  contentCol: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  emptyPrompt: { height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
  dataCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
  label: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase' },
  value: { fontSize: '13px', fontWeight: 'bold', color: '#0f172a' },
  mapContainer: { marginBottom: '20px' },
  rawSection: { marginTop: '20px', borderTop: '2px solid #f1f5f9', paddingTop: '20px' },
  rawBox: { background: '#0f172a', padding: '15px', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto' },
  cardTitle: { fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', color: '#1e293b' }
};
