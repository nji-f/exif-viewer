import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import exifr from 'exifr';

export default function Home() {
  const { data: session } = useSession();
  const [metadata, setMetadata] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      const data = await exifr.parse(file, { gps: true, device: true, timestamp: true });
      setMetadata(data || { info: "Tidak ada data EXIF tersembunyi." });
    } catch (err) { setMetadata({ error: "Gagal membaca file." }); }
  };

  if (!session) return (
    <div style={{textAlign:'center', marginTop:'15%', fontFamily:'sans-serif'}}>
      <h1>🕵️‍♂️ Photo Inspector</h1>
      <button onClick={() => signIn('google')} style={{padding:'10px 20px', cursor:'pointer', borderRadius:'8px', border:'none', background:'#4285F4', color:'white'}}>Login Google</button>
    </div>
  );

  return (
    <div style={{padding:'40px', fontFamily:'sans-serif', maxWidth:'900px', margin:'0 auto'}}>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <h3>Halo, {session.user.name}</h3>
        <button onClick={() => signOut()}>Logout</button>
      </div>
      <div style={{border:'2px dashed #ccc', padding:'40px', textAlign:'center', margin:'20px 0', borderRadius:'15px'}}>
        <input type="file" accept="image/*" onChange={handleImage} />
      </div>
      <div style={{display:'flex', gap:'20px'}}>
        {preview && <img src={preview} style={{width:'300px', borderRadius:'10px'}} />}
        <div style={{flex:1, background:'#f4f4f4', padding:'15px', borderRadius:'10px', overflow:'auto', maxHeight:'400px'}}>
          <pre>{JSON.stringify(metadata, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
