import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import exifr from 'exifr';

// --- KOMPONEN PEMBANTU ---
const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginPage}>
    <div style={styles.loginCard}>
      <h1 style={{fontSize:'32px', marginBottom:'10px', color: '#fff'}}>exif<span style={{color:'#6366f1'}}>-viewer</span> PRO</h1>
      <p style={{color:'#71717a', marginBottom:'30px'}}>Tanpa Instalasi Terminal - Ready to Use</p>
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

export default function ExifViewerNoTerminal() {
  const { data: session, status } = useSession();
  const [fileList, setFileList] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const histogramRef = useRef(null);
  const currentData = fileList[selectedIndex] || null;

  // --- LOGIKA ANALISIS ---
  const handleFiles = async (files) => {
    setIsProcessing(true);
    const newEntries = [];
    for (const file of Array.from(files)) {
      try {
        const metadata = await exifr.parse(file, { gps: true, exif: true, tiff: true, xmp: true });
        newEntries.push({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + " KB",
          preview: URL.createObjectURL(file),
          metadata: metadata,
          id: Math.random().toString(36).substr(2, 9),
        });
      } catch (err) { console.error(err); }
    }
    setFileList(prev => [...prev, ...newEntries]);
    setIsProcessing(false);
  };

  useEffect(() => {
    if (currentData) drawHistogram();
  }, [currentData]);

  const drawHistogram = () => {
    const img = new Image();
    img.src = currentData.preview;
    img.onload = () => {
      const canvas = histogramRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = 100; tempCanvas.height = 100;
      tempCtx.drawImage(img, 0, 0, 100, 100);
      const data = tempCtx.getImageData(0, 0, 100, 100).data;
      const brightness = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const avg = Math.floor((data[i] + data[i+1] + data[i+2]) / 3);
        brightness[avg]++;
      }
      const max = Math.max(...brightness);
      ctx.fillStyle = '#6366f1';
      brightness.forEach((v, i) => {
        const h = (v / max) * canvas.height;
        ctx.fillRect(i * (canvas.width / 256), canvas.height - h, 1, h);
      });
    };
  };

  // --- FITUR DOWNLOAD & STRIP (Tanpa library tambahan) ---
  const downloadClean = () => {
    const img = new Image();
    img.src = currentData.preview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(b => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `CLEAN_${currentData.name}`;
        a.click();
      }, 'image/jpeg');
    };
  };

  if (status === "loading") return <div style={styles.empty}>Memuat Sistem...</div>;
  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span></div>
        <label style={styles.uploadBtn}>
          <input type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          {isProcessing ? 'SCANNING...' : 'PILIH FOTO'}
        </label>
        <div style={styles.batchList}>
          {fileList.map((f, i) => (
            <div key={f.id} onClick={() => setSelectedIndex(i)} 
                 style={{...styles.batchItem, borderColor: selectedIndex === i ? '#6366f1' : '#27272a', background: selectedIndex === i ? '#18181b' : 'transparent'}}>
              <img src={f.preview} style={styles.thumb} />
              <div style={styles.batchText}>
                <div style={{fontWeight:'bold', color: '#fff'}}>{f.name.slice(0,12)}..</div>
                <div style={{fontSize:'9px'}}>{f.size}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => signOut()} style={styles.logout}>Keluar ({session.user.name.split(' ')[0]})</button>
      </aside>

      <main style={styles.main}>
        {currentData ? (
          <div style={styles.container}>
            <div style={styles.actionHeader}>
               <button onClick={downloadClean} style={{...styles.actionBtn, background: '#10b981'}}>🛡️ Bersihkan & Simpan</button>
               <button onClick={() => window.print()} style={styles.actionBtn}>🖨️ Cetak Laporan</button>
            </div>

            <div style={styles.grid}>
                <div style={styles.card}>
                  <div style={styles.label}>PREVIEW VISUAL</div>
                  <img src={currentData.preview} style={styles.mainImg} />
                  <div style={{marginTop:'20px'}}>
                    <div style={styles.label}>HISTOGRAM CAHAYA</div>
                    <canvas ref={histogramRef} width="300" height="80" style={styles.histogramCanvas} />
                  </div>
                </div>

                <div style={styles.card}>
                  <div style={styles.label}>METADATA FOTO</div>
                  <DataRow label="Kamera" value={`${currentData.metadata?.Make || ''} ${currentData.metadata?.Model || ''}`} />
                  <DataRow label="ISO" value={currentData.metadata?.ISO} />
                  <DataRow label="Aperture" value={currentData.metadata?.FNumber ? `f/${currentData.metadata.FNumber}` : null} />
                  <DataRow label="Waktu Ambil" value={currentData.metadata?.DateTimeOriginal?.toLocaleString()} />
                  
                  {currentData.metadata?.latitude && (
                    <div style={{marginTop:'20px'}}>
                      <div style={styles.label}>LOKASI TERDETEKSI (GPS)</div>
                      <div style={styles.geoBox}>📍 {currentData.metadata.latitude.toFixed(6)}, {currentData.metadata.longitude.toFixed(6)}</div>
                      <button onClick={() => window.open(`https://www.google.com/maps?q=${currentData.metadata.latitude},${currentData.metadata.longitude}`)} style={styles.mapBtn}>Buka Google Maps</button>
                    </div>
                  )}
                </div>
            </div>
          </div>
        ) : (
          <div style={styles.empty}>Seret foto ke sini atau gunakan tombol Pilih Foto.</div>
        )}
      </main>
    </div>
  );
}

const styles = {
  app: { display: 'flex', height: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'system-ui' },
  sidebar: { width: '260px', borderRight: '1px solid #18181b', padding: '20px', display: 'flex', flexDirection: 'column', background: '#0c0c0e' },
  brand: { fontSize: '20px', fontWeight: 'bold', marginBottom: '25px' },
  uploadBtn: { background: '#6366f1', padding: '12px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  batchList: { flex: 1, overflowY: 'auto', marginTop: '15px' },
  batchItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', border: '1px solid #27272a', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' },
  thumb: { width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover' },
  batchText: { fontSize: '11px' },
  main: { flex: 1, overflowY: 'auto', padding: '30px' },
  container: { maxWidth: '900px', margin: '0 auto' },
  actionHeader: { display: 'flex', gap: '10px', marginBottom: '20px' },
  actionBtn: { background: '#27272a', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  card: { background: '#111113', padding: '20px', borderRadius: '15px', border: '1px solid #1e1e21' },
  mainImg: { width: '100%', borderRadius: '8px' },
  label: { fontSize: '10px', color: '#6366f1', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '1px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e21', fontSize: '13px' },
  rowLabel: { color: '#71717a' },
  rowValue: { fontWeight: 'bold' },
  histogramCanvas: { width: '100%', height: '80px', background: '#000', borderRadius: '4px' },
  geoBox: { background: '#000', padding: '10px', borderRadius: '6px', color: '#10b981', fontSize: '12px', marginBottom: '10px' },
  mapBtn: { width: '100%', padding: '8px', borderRadius: '6px', border: 'none', background: '#6366f1', color:'#fff', cursor: 'pointer', fontWeight: 'bold' },
  logout: { color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', fontSize:'11px', textAlign: 'left' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' },
  loginPage: { height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginCard: { background: '#09090b', padding: '40px', borderRadius: '20px', border: '1px solid #27272a', textAlign: 'center' },
  loginBtn: { background: '#fff', color: '#000', padding: '12px 30px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }
};
