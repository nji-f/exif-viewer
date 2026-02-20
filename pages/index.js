import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef } from "react";
import exifr from 'exifr';

// --- KOMPONEN PEMBANTU ---

const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginPage}>
    <div style={styles.loginCard}>
      <h1 style={{fontSize:'32px', marginBottom:'10px', color: '#fff'}}>exif<span style={{color:'#6366f1'}}>-viewer</span></h1>
      <p style={{color:'#71717a', marginBottom:'30px'}}>Professional Image Metadata Forensic</p>
      <button onClick={onLogin} style={styles.loginBtn}>Sign in with Google</button>
    </div>
  </div>
);

const DataRow = ({ label, value }) => (
  <div style={styles.row}>
    <span style={styles.rowLabel}>{label}</span>
    <span style={styles.rowValue}>{value || '—'}</span>
  </div>
);

// --- KOMPONEN UTAMA ---

export default function ExifViewerV10() {
  const { data: session, status } = useSession();
  const [fileList, setFileList] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);

  const currentData = fileList[selectedIndex] || null;

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setIsProcessing(true);
    const newEntries = [];

    for (const file of files) {
      try {
        const metadata = await exifr.parse(file, {
          gps: true,
          exif: true,
          tiff: true,
          xmp: true,
        });

        newEntries.push({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + " KB",
          preview: URL.createObjectURL(file),
          originalFile: file, // Simpan file asli untuk proses stripping
          metadata: metadata,
          id: Math.random().toString(36).substr(2, 9),
        });
      } catch (err) {
        console.error("Error processing file:", err);
      }
    }
    setFileList(prev => [...prev, ...newEntries]);
    setIsProcessing(false);
  };

  const openInMaps = () => {
    if (currentData?.metadata?.latitude) {
      const { latitude, longitude } = currentData.metadata;
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    }
  };

  // FUNGSI UNTUK MENGHAPUS EXIF (STRIPPING)
  const downloadCleanImage = () => {
    const img = new Image();
    img.src = currentData.preview;
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Convert ke Blob (tanpa metadata)
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `CLEAN_${currentData.name}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.95);
    };
  };

  if (status === "loading") return <div style={styles.empty}>Initializing System...</div>;
  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  return (
    <div style={styles.app}>
      {/* Hidden Canvas untuk proses stripping */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span></div>
        
        <label style={styles.uploadBtn}>
          <input type="file" multiple hidden onChange={handleUpload} accept="image/*" />
          {isProcessing ? 'PROCESSING...' : 'UPLOAD IMAGES'}
        </label>
        
        <div style={styles.batchList}>
          {fileList.map((f, i) => (
            <div key={f.id} onClick={() => setSelectedIndex(i)} 
                 style={{...styles.batchItem, borderColor: selectedIndex === i ? '#6366f1' : '#27272a', background: selectedIndex === i ? '#18181b' : 'transparent'}}>
              <img src={f.preview} style={styles.thumb} alt="thumb" />
              <div style={styles.batchText}>
                <div style={{fontWeight:'bold', color: '#fff'}}>{f.name.slice(0,15)}...</div>
                <div style={{fontSize:'9px', color: '#71717a'}}>{f.size}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.sidebarFooter}>
           <div style={{fontSize:'12px', color:'#a1a1aa'}}>User: {session.user.name}</div>
           <button onClick={() => signOut()} style={styles.logout}>Logout Session</button>
        </div>
      </aside>

      <main style={styles.main}>
        {currentData ? (
          <div style={styles.container}>
            <div style={styles.grid}>
                <div style={styles.card}>
                  <div style={styles.label}>IMAGE PREVIEW</div>
                  <img src={currentData.preview} style={styles.mainImg} alt="Preview" />
                  
                  <div style={{marginTop:'20px'}}>
                    <div style={styles.label}>PRIVACY TOOLS</div>
                    <button onClick={downloadCleanImage} style={styles.stripBtn}>
                      🛡️ Download Without Metadata (Safe Share)
                    </button>
                    <p style={{fontSize:'10px', color:'#71717a', marginTop:'8px'}}>
                      Menghapus lokasi, data kamera, dan identitas file sebelum di-upload ke internet.
                    </p>
                  </div>

                  {currentData.metadata?.latitude && (
                    <div style={{marginTop:'20px'}}>
                      <div style={styles.label}>LOCATION DETECTED</div>
                      <div style={styles.geoBox}>
                         📍 {currentData.metadata.latitude.toFixed(6)}, {currentData.metadata.longitude.toFixed(6)}
                      </div>
                      <button onClick={openInMaps} style={styles.mapBtn}>View on Google Maps</button>
                    </div>
                  )}
                </div>

                <div style={styles.card}>
                  <div style={styles.label}>CAMERA & DEVICE</div>
                  <DataRow label="Make" value={currentData.metadata?.Make} />
                  <DataRow label="Model" value={currentData.metadata?.Model} />
                  <DataRow label="Software" value={currentData.metadata?.Software} />
                  
                  <div style={{marginTop:'30px'}} />
                  <div style={styles.label}>EXPOSURE SETTINGS</div>
                  <DataRow label="ISO" value={currentData.metadata?.ISO} />
                  <DataRow label="Aperture" value={currentData.metadata?.FNumber ? `f/${currentData.metadata.FNumber}` : null} />
                  <DataRow label="Exposure Time" value={currentData.metadata?.ExposureTime ? `1/${Math.round(1/currentData.metadata.ExposureTime)}s` : null} />
                  
                  <div style={{marginTop:'30px'}} />
                  <div style={styles.label}>FILE INFORMATION</div>
                  <DataRow label="Date Taken" value={currentData.metadata?.DateTimeOriginal?.toLocaleString()} />
                  <DataRow label="Lens" value={currentData.metadata?.LensModel} />
                </div>
            </div>
          </div>
        ) : (
          <div style={styles.empty}>System Ready. Waiting for evidence...</div>
        )}
      </main>
    </div>
  );
}

// --- STYLES (Update dengan Strip Button) ---
const styles = {
  // ... (style sebelumnya tetap sama) ...
  app: { display: 'flex', height: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '280px', borderRight: '1px solid #18181b', padding: '24px', display: 'flex', flexDirection: 'column', background: '#0c0c0e' },
  brand: { fontSize: '22px', fontWeight: 'bold', marginBottom: '30px' },
  uploadBtn: { background: '#6366f1', padding: '14px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  batchList: { marginTop: '25px', flex: 1, overflowY: 'auto' },
  batchItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '1px solid #27272a', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer' },
  thumb: { width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' },
  batchText: { fontSize: '11px' },
  main: { flex: 1, overflowY: 'auto', padding: '40px' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  label: { fontSize: '11px', color: '#6366f1', fontWeight: '800', marginBottom: '15px', letterSpacing: '1.5px', textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' },
  card: { background: '#111113', padding: '30px', borderRadius: '20px', border: '1px solid #1e1e21' },
  mainImg: { width: '100%', borderRadius: '12px', border: '1px solid #27272a' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1e1e21', fontSize: '14px' },
  rowLabel: { color: '#71717a' },
  rowValue: { fontWeight: '600', color: '#e4e4e7' },
  geoBox: { background: '#000', padding: '12px', borderRadius: '8px', marginTop: '5px', fontSize: '14px', fontFamily: 'monospace', color: '#10b981', border: '1px solid #064e3b' },
  mapBtn: { width: '100%', marginTop: '12px', padding: '10px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  stripBtn: { width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #1e1e21' },
  logout: { color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' },
  loginPage: { height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginCard: { background: '#09090b', padding: '60px', borderRadius: '32px', border: '1px solid #1e1e21', textAlign: 'center' },
  loginBtn: { background: '#fff', color: '#000', padding: '14px 40px', borderRadius: '14px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }
};
