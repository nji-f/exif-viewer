import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import exifr from 'exifr';

export default function Home() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ip, setIp] = useState("Loading...");

  // Ambil IP Address User
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch(() => setIp("Gagal melacak IP"));
  }, []);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      const data = await exifr.parse(file, {
        gps: true,
        device: true,
        timestamp: true,
        xmp: true,
        iptc: true
      });
      setMetadata(data);
    } catch (err) {
      setMetadata({ error: "File tidak memiliki data EXIF." });
    }
  };

  if (!session) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.glassCard}>
          <h1 style={styles.title}>🕵️‍♂️ Photo Forensic</h1>
          <p style={styles.subtitle}>Bongkar rahasia di balik setiap piksel.</p>
          <button style={styles.googleBtn} onClick={() => signIn('google')}>
            Mulai Investigasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      <header style={styles.header}>
        <div>
          <h2 style={{margin: 0}}>Analisis Forensik</h2>
          <p style={{fontSize: '12px', color: '#888'}}>Pelacak IP Anda: <span style={{color: '#00ff88'}}>{ip}</span></p>
        </div>
        <button style={styles.logoutBtn} onClick={() => signOut()}>Logout</button>
      </header>

      <main style={styles.container}>
        <div style={styles.uploadSection}>
          <label style={styles.dropzone}>
            <input type="file" accept="image/*" onChange={handleImage} style={{display:'none'}} />
            <span>📁 Klik untuk Upload Foto</span>
          </label>
          
          {preview && (
            <div style={styles.previewCard}>
              <img src={preview} style={styles.mainImg} alt="Preview" />
            </div>
          )}
        </div>

        <div style={styles.infoSection}>
          <h3 style={styles.sectionTitle}>Hasil Scan Metadata</h3>
          {metadata ? (
            <div style={styles.gridInfo}>
              <InfoItem label="Merek Perangkat" value={metadata.Make || "Tidak Terdeteksi"} icon="📱" />
              <InfoItem label="Model Perangkat" value={metadata.Model || "Tidak Terdeteksi"} icon="📸" />
              <InfoItem label="Waktu Pengambilan" value={metadata.DateTimeOriginal?.toLocaleString() || "N/A"} icon="📅" />
              <InfoItem label="Software / Editor" value={metadata.Software || "Original / Unknown"} icon="💻" />
              <InfoItem label="Lokasi GPS" value={metadata.latitude ? `${metadata.latitude}, ${metadata.longitude}` : "Kosong"} icon="📍" />
              <InfoItem label="Resolusi" value={metadata.ExifImageWidth ? `${metadata.ExifImageWidth} x ${metadata.ExifImageHeight}` : "N/A"} icon="🖼️" />
            </div>
          ) : (
            <div style={styles.emptyState}>Silakan upload foto untuk melihat detail tersembunyi.</div>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value, icon }) {
  return (
    <div style={styles.infoItem}>
      <span style={{fontSize: '20px'}}>{icon}</span>
      <div>
        <div style={styles.infoLabel}>{label}</div>
        <div style={styles.infoValue}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', fontFamily: 'Inter, sans-serif' },
  glassCard: { background: 'rgba(255, 255, 255, 0.05)', padding: '50px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' },
  title: { fontSize: '32px', marginBottom: '10px', letterSpacing: '-1px' },
  subtitle: { color: '#94a3b8', marginBottom: '30px' },
  googleBtn: { background: '#fff', color: '#000', border: 'none', padding: '14px 28px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  dashboard: { minHeight: '100vh', background: '#020617', color: '#f8fafc', fontFamily: 'Inter, sans-serif' },
  header: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' },
  logoutBtn: { background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  container: { padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px' },
  uploadSection: { display: 'flex', flexDirection: 'column', gap: '20px' },
  dropzone: { background: '#1e293b', border: '2px dashed #334155', padding: '40px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: '0.3s' },
  previewCard: { background: '#1e293b', padding: '10px', borderRadius: '16px', overflow: 'hidden' },
  mainImg: { width: '100%', borderRadius: '10px', display: 'block' },
  infoSection: { background: '#0f172a', padding: '30px', borderRadius: '20px', border: '1px solid #1e293b' },
  sectionTitle: { fontSize: '20px', marginBottom: '20px', color: '#38bdf8' },
  gridInfo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  infoItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#1e293b', borderRadius: '12px' },
  infoLabel: { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' },
  infoValue: { fontSize: '14px', fontWeight: '500', marginTop: '2px' },
  emptyState: { textAlign: 'center', color: '#475569', marginTop: '100px' }
};
