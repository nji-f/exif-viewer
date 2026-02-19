import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import exifr from 'exifr';

export default function ExifViewerV10() {
  const { data: session } = useSession();
  const [fileList, setFileList] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [osintData, setOsintData] = useState({ phonePotential: "Not Found", ownerName: "Unknown" });

  const currentData = fileList[selectedIndex] || null;

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newEntries = [];

    for (const file of files) {
      const metadata = await exifr.parse(file, true);
      
      // LOGIKA OSINT: Mencari String yang mirip nomor telepon di data biner
      const buffer = await file.arrayBuffer();
      const view = new Uint8Array(buffer);
      let content = "";
      for(let i=0; i<Math.min(view.length, 5000); i++) { // Scan 5KB pertama
        content += String.fromCharCode(view[i]);
      }
      
      // Regex untuk mencari pola angka telepon internasional (e.g. +62 atau 0812)
      const phoneMatch = content.match(/(\+62|08)[0-9]{8,11}/g);
      
      newEntries.push({
        name: file.name,
        preview: URL.createObjectURL(file),
        metadata: metadata,
        id: Math.random().toString(36).substr(2, 9),
        foundPhone: phoneMatch ? phoneMatch[0] : null,
        owner: metadata.Artist || metadata.Copyright || metadata.OwnerName || "Unknown"
      });
    }
    setFileList(prev => [...prev, ...newEntries]);
  };

  const openSearch = (type) => {
    const name = currentData?.owner !== "Unknown" ? currentData.owner : "";
    if (type === 'google') window.open(`https://www.google.com/search?q="${name}"+phone+number`, '_blank');
    if (type === 'truecaller' && currentData?.foundPhone) window.open(`https://www.truecaller.com/search/id/${currentData.foundPhone}`, '_blank');
  };

  if (!session) return <LoginScreen onLogin={() => signIn('google')} />;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif<span style={{color:'#6366f1'}}>-viewer</span> <small>v10.0</small></div>
        <label style={styles.uploadBtn}>
          <input type="file" multiple hidden onChange={handleUpload} />
          INJECT EVIDENCE
        </label>
        
        <div style={styles.batchList}>
          {fileList.map((f, i) => (
            <div key={f.id} onClick={() => setSelectedIndex(i)} style={{...styles.batchItem, borderColor: selectedIndex === i ? '#6366f1' : '#27272a'}}>
              <img src={f.preview} style={styles.thumb} />
              <div style={styles.batchText}>{f.name.slice(0,10)}...</div>
            </div>
          ))}
        </div>
      </aside>

      <main style={styles.main}>
        {currentData ? (
          <div style={styles.container}>
            {/* OSINT INTELLIGENCE PANEL */}
            <div style={styles.osintPanel}>
              <div style={styles.osintCard}>
                <div style={styles.label}>DETECTED PHONE/ID</div>
                <div style={{...styles.value, color: currentData.foundPhone ? '#10b981' : '#ef4444'}}>
                  {currentData.foundPhone || "No direct phone string in binary"}
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
                 <img src={currentData.preview} style={styles.mainImg} />
                 <div style={{marginTop:'15px'}}>
                   <div style={styles.label}>DIGITAL FINGERPRINT</div>
                   <code style={{fontSize:'10px', color:'#71717a'}}>SCANNED_OK_SECURE_LOCAL</code>
                 </div>
               </div>

               <div style={styles.card}>
                 <div style={styles.label}>TECHNICAL METADATA</div>
                 <div style={styles.dataRow}><span>Camera</span> <strong>{currentData.metadata?.Make}</strong></div>
                 <div style={styles.dataRow}><span>Model</span> <strong>{currentData.metadata?.Model}</strong></div>
                 <div style={styles.dataRow}><span>Software</span> <strong>{currentData.metadata?.Software || "Native Camera"}</strong></div>
                 
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
          <div style={styles.empty}>Select an image to start Deep-OSINT analysis.</div>
        )}
      </main>
    </div>
  );
}

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
  osintPanel: { display: 'flex', gap: '20px', marginBottom: '30px', background: '#18181b', padding: '20px', borderRadius: '12px', border: '1px solid #27272a', alignItems: 'center' },
  osintCard: { flex: 1 },
  label: { fontSize: '10px', color: '#6366f1', fontWeight: 'bold', marginBottom: '5px', letterSpacing: '1px' },
  value: { fontSize: '16px', fontWeight: 'bold' },
  osintActions: { display: 'flex', gap: '10px' },
  osintBtn: { background: '#27272a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' },
  card: { background: '#18181b', padding: '24px', borderRadius: '16px', border: '1px solid #27272a' },
  mainImg: { width: '100%', borderRadius: '10px' },
  dataRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #27272a', fontSize: '13px' },
  geoBox: { background: '#09090b', padding: '10px', borderRadius: '6px', marginTop: '5px', fontSize: '13px', fontFamily: 'monospace', color: '#10b981' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' },
  loginPage: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  loginBtn: { background: '#fff', color: '#000', padding: '12px 30px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }
};
