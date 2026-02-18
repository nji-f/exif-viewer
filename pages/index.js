import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import exifr from 'exifr';

export default function Home() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
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
      const data = await exifr.parse(file, {
        gps: true, device: true, timestamp: true, software: true
      });
      setMetadata(data || { noData: true });
    } catch (err) {
      setMetadata({ error: "No EXIF data found." });
    }
  };

  if (!session) {
    return (
      <div style={styles.loginWrapper}>
        <div style={styles.loginCard}>
          <div style={styles.brandBadge}>v2.0 PRO</div>
          <h1 style={styles.mainTitle}>Photo Forensic <span style={{color: '#3b82f6'}}>Scanner</span></h1>
          <p style={styles.desc}>Analisis metadata mendalam, pelacakan GPS, dan identitas perangkat.</p>
          <button style={styles.primaryBtn} onClick={() => signIn('google')}>
            <img src="https://authjs.dev/img/providers/google.svg" width="20" style={{marginRight: '10px'}} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appBg}>
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.logoText}>FORENSIC.IO</span>
          <span style={styles.ipBadge}>MY IP: {ip}</span>
        </div>
        <div style={styles.userSection}>
          <span style={styles.userName}>{session.user.name}</span>
          <button style={styles.logOut} onClick={() => signOut()}>Logout</button>
        </div>
      </header>

      <main style={styles.mainGrid}>
        {/* Kolom Kiri: Upload & Preview */}
        <div style={styles.sideCol}>
          <div style={styles.card}>
            <label style={styles.uploadArea}>
              <input type="file" accept="image/*" onChange={handleImage} style={{display:'none'}} />
              <div style={styles.uploadIcon}>➕</div>
              <p style={{margin: 0, fontWeight: '500'}}>Upload Image</p>
              <p style={{fontSize: '12px', color: '#64748b'}}>JPG, TIFF, or HEIC</p>
            </label>
            {preview && <img src={preview} style={styles.imgPreview} />}
          </div>
        </div>

        {/* Kolom Kanan: Data & Map */}
        <div style={styles.contentCol}>
          {!metadata ? (
            <div style={styles.emptyPrompt}>Ready to analyze. Please upload a photo.</div>
          ) : (
            <div style={styles.resultsWrapper}>
              <h3 style={styles.cardTitle}>Technical Specifications</h3>
              <div style={styles.infoGrid}>
                <DataCard label="Manufacturer" value={metadata.Make} icon="🏢" />
                <DataCard label="Device Model" value={metadata.Model} icon="📱" />
                <DataCard label="Captured At" value={metadata.DateTimeOriginal?.toLocaleString()} icon="🕒" />
                <DataCard label="Processing Software" value={metadata.Software} icon="⚙️" />
                <DataCard label="Resolution" value={metadata.ExifImageWidth ? `${metadata.ExifImageWidth}x${metadata.ExifImageHeight}` : null} icon="📐" />
                <DataCard label="GPS Coordinates" value={metadata.latitude ? `${metadata.latitude.toFixed(4)}, ${metadata.longitude.toFixed(4)}` : "Not Available"} icon="📍" />
              </div>

              {metadata.latitude && (
                <div style={styles.mapContainer}>
                  <h3 style={styles.cardTitle}>Geolocation Tracking</h3>
                  <iframe 
                    width="100%" 
                    height="250" 
                    style={{borderRadius: '12px', border: 'none', marginTop: '10px'}}
                    src={`https://maps.google.com/maps?q=${metadata.latitude},${metadata.longitude}&z=15&output=embed`}
                  ></iframe>
                </div>
              )}
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
  loginWrapper: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif' },
  loginCard: { width: '400px', padding: '40px', background: '#fff', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', position: 'relative' },
  brandBadge: { position: 'absolute', top: '20px', right: '20px', background: '#eff6ff', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold' },
  mainTitle: { fontSize: '28px', color: '#1e293b', marginBottom: '12px' },
  desc: { color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '30px' },
  primaryBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' },
  
  appBg: { minHeight: '100vh', background: '#f1f5f9', color: '#1e293b', fontFamily: 'sans-serif' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', background: '#fff', borderBottom: '1px solid #e2e8f0' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  logoText: { fontWeight: '800', letterSpacing: '1px', color: '#0f172a' },
  ipBadge: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', color: '#64748b' },
  userSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  userName: { fontWeight: '500', fontSize: '14px' },
  logOut: { background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },

  mainGrid: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px', padding: '30px 40px' },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  uploadArea: { display: 'block', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer', marginBottom: '15px' },
  uploadIcon: { fontSize: '24px', marginBottom: '10px' },
  imgPreview: { width: '100%', borderRadius: '10px', display: 'block' },

  contentCol: { background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  emptyPrompt: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  cardTitle: { fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#334155' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  dataCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' },
  label: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' },
  value: { fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  mapContainer: { marginTop: '30px', paddingTop: '30px', borderTop: '1px solid #f1f5f9' }
};
