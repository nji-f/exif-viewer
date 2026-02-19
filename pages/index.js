import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import exifr from 'exifr';

// --- KOMPONEN PEMBANTU (Didefinisikan di luar agar tidak error) ---

const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginPage}>
    <div style={styles.loginCard}>
      <h1 style={{fontSize:'32px', marginBottom:'10px'}}>exif-viewer</h1>
      <p style={{color:'#71717a', marginBottom:'30px'}}>Advanced OSINT & Forensic Tool</p>
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

  const currentData = fileList[selectedIndex] || null;

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setIsProcessing(true);
    const newEntries = [];

    for (const file of files) {
      try {
        const metadata = await exifr.parse(file, true);
        const buffer = await file.arrayBuffer();
        const view = new Uint8Array(buffer);
        let content = "";
        for(let i=0; i<Math.min(view.length, 5000); i++) {
          content += String.fromCharCode(view[i]);
        }
        
        const phoneMatch = content.match(/(\+62|08)[0-9]{8,11}/g);
        
        newEntries.push({
          name: file.name,
          preview: URL.createObjectURL(file),
          metadata: metadata,
          id: Math.random().toString(36).substr(2, 9),
          foundPhone: phoneMatch ? phoneMatch[0] : null,
          owner: metadata.Artist || metadata.Copyright || metadata.OwnerName || "Unknown"
        });
      } catch (err) {
        console.error("Error processing file:", err);
      }
    }
    setFileList(prev => [...prev, ...newEntries]);
    setIsProcessing(false);
  };

  const openSearch = (type) => {
    const name = currentData?.owner !== "Unknown" ? currentData.owner : "";
    if (type === 'google') window.open(`https://www.google.com/search?q="${name}"+phone+number`, '_blank');
    if (type === 'truecaller' && currentData?.foundPhone) window.open(`https://www.truecaller.com/search/id/${currentData.foundPhone}`, '_blank');
  };

  // Tunggu status session loading
  if (status === "loading") return <div style={styles.empty}>Loading System...</div>;
  
  // Jika belum login, tampilkan LoginScreen
  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span> <small>v10</small></div>
        <label style={styles.uploadBtn}>
          <input type="file" multiple hidden onChange={handleUpload} />
          {isProcessing ? 'SCANNING...' : 'INJECT EVIDENCE'}
        </label>
        
        <div style={styles.batchList}>
          {fileList.map((f, i) => (
            <div key={f.id} onClick={() => setSelectedIndex(i)} 
                 style={{...styles.batchItem, borderColor: selectedIndex === i ? '#6366f1' : '#27272a'}}>
              <img src={f.preview} style={styles.thumb} />
              <div style={styles.batchText}>{f.name.slice(0,15)}...</div>
            </div>
          ))}
        </div>

        <div style={styles.sidebarFooter}>
           <div style={{fontSize:'12px', fontWeight:'bold'}}>{session.user.name}</div>
           <button onClick={() => signOut()} style={styles.logout}>Logout</button>
        </div>
      </aside>

      <main style={styles.main}>
        {currentData ? (
          <div style={styles.container}>
            <div style={styles.osintPanel}>
              <div style={styles.osintCard}>
                <div style={styles.label}>DETECTED PHONE/ID</div>
                <div style={{...styles.value, color: currentData.foundPhone ? '#10b981' : '#ef4444'}}>
                  {currentData.foundPhone || "No direct phone string found"}
                </div>
              </div>
              <div style={styles.osintCard}>
                <div style={styles.label}>REGISTERED OWNER</div>
                <div style={styles.value}>{currentData.owner}</div>
              </div>
              <div style={styles.osintActions}>
                <button onClick={() => openSearch('google')} style={styles.osintBtn}>Search Identity</button>
                {currentData.foundPhone && <button onClick={() => openSearch('truecaller')} style={styles.osintBtn}>Verify Phone</button>}
              </div>
            </div>

            <div style={styles.grid}>
               <div style={styles.card}>
                 <img src={currentData.preview} style={styles.mainImg} alt="Preview" />
               </div>
               <div style={styles.card}>
                 <div style={styles.label}>TECHNICAL METADATA</div>
                 <DataRow label="Manufacturer" value={currentData.metadata?.Make} />
                 <DataRow label="Model" value={currentData.metadata?.Model} />
                 <DataRow label="ISO" value={currentData.metadata?.ISO} />
                 <DataRow label="Aperture" value={currentData.metadata?.FNumber ? `f/${currentData.metadata.FNumber}` : null} />
                 {currentData.metadata?.latitude && (
                   <div style={{marginTop:'20px'}}>
                     <div style={styles.label}>GPS COORDINATES</div>
                     <div style={styles.geoBox}>
                        {currentData.metadata.latitude.toFixed(6)}, {currentData.metadata.longitude.toFixed(6)}
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        ) : (
          <div style={styles.empty}>System Ready. Waiting for data injection.</div>
        )}
      </main>
    </div>
  );
}

// --- STYLES ---

const styles = {
  app: { display: 'flex', height: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '260px', borderRight: '1px solid #18181b', padding: '20px', display: 'flex', flexDirection: 'column' },
  brand: { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
  uploadBtn: { background: '#6366f1', padding: '12px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  batchList: { marginTop: '20px', flex: 1, overflowY: 'auto' },
  batchItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', border: '1px solid #27272a', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' },
  thumb: { width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' },
  batchText: { fontSize: '11px' },
  main: { flex: 1, overflowY: 'auto', padding: '40px' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  osintPanel: { display: 'flex', gap: '20px', marginBottom: '30px', background: '#18181b', padding: '20px', borderRadius: '12px', border: '1px solid #27272a', alignItems: 'center' },
  osintCard: { flex: 1 },
  label: { fontSize: '10px', color: '#6366f1', fontWeight: 'bold', marginBottom: '5px', letterSpacing: '1px' },
  value: { fontSize: '16px', fontWeight: 'bold' },
  osintActions: { display: 'flex', gap: '10px' },
  osintBtn: { background: '#27272a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' },
  card: { background: '#18181b', padding: '24px', borderRadius: '16px', border: '1px solid #27272a' },
  mainImg: { width: '100%', borderRadius: '10px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #27272a', fontSize: '13px' },
  rowLabel: { color: '#71717a' },
  rowValue: { fontWeight: 'bold' },
  geoBox: { background: '#000', padding: '10px', borderRadius: '6px', marginTop: '5px', fontSize: '13px', fontFamily: 'monospace', color: '#10b981' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #18181b' },
  logout: { color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', marginTop: '5px', display:'block' },
  loginPage: { height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginCard: { background: '#09090b', padding: '60px', borderRadius: '24px', border: '1px solid #27272a', textAlign: 'center' },
  loginBtn: { background: '#fff', color: '#000', padding: '12px 40px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }
};
