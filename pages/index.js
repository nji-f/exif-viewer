import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import exifr from "exifr";

/* ================= LOGIN ================= */

const LoginScreen = ({ onLogin }) => (
  <div style={styles.loginPage}>
    <div style={styles.loginCard}>
      <h1 style={{ fontSize: 32, color: "#fff" }}>
        exif<span style={{ color: "#6366f1" }}>-viewer</span> PRO
      </h1>
      <p style={{ color: "#71717a" }}>Tanpa Instalasi Terminal</p>
      <button onClick={onLogin} style={styles.loginBtn}>
        Sign in with Google
      </button>
    </div>
  </div>
);

/* ================= DATA ROW ================= */

const DataRow = ({ label, value }) => (
  <div style={styles.row}>
    <span style={styles.rowLabel}>{label}</span>
    <span style={styles.rowValue}>{value || "—"}</span>
  </div>
);

/* ================= META TREE ================= */

const MetaTree = ({ data, level = 0 }) => {
  if (!data) return null;

  return Object.entries(data).map(([key, value]) => {
    const isObject = typeof value === "object" && value !== null;

    return (
      <div key={key} style={{ marginLeft: level * 12 }}>
        <div style={{ fontSize: 12 }}>
          <strong style={{ color: "#fff" }}>{key}</strong>
          {!isObject && ` : ${String(value)}`}
        </div>
        {isObject && <MetaTree data={value} level={level + 1} />}
      </div>
    );
  });
};

/* ================= MAIN ================= */

export default function ExifViewerPro() {
  const { data: session, status } = useSession();

  const [fileList, setFileList] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const histogramRef = useRef(null);
  const currentData = fileList[selectedIndex] || null;

  /* ===== LOAD FILE ===== */

  const handleFiles = async (files) => {
    setIsProcessing(true);

    const newEntries = [];

    for (const file of Array.from(files)) {
      try {
        const metadata = await exifr.parse(file, {
          gps: true,
          exif: true,
          tiff: true,
          xmp: true,
          icc: true,
          iptc: true,
        });

        newEntries.push({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + " KB",
          preview: URL.createObjectURL(file),
          metadata,
          id: Math.random().toString(36),
        });
      } catch {}
    }

    setFileList((p) => [...p, ...newEntries]);
    setIsProcessing(false);
  };

  /* ===== HISTOGRAM ===== */

  useEffect(() => {
    if (!currentData) return;

    const img = new Image();
    img.src = currentData.preview;

    img.onload = () => {
      const canvas = histogramRef.current;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = document.createElement("canvas");
      const tc = t.getContext("2d");

      t.width = 100;
      t.height = 100;

      tc.drawImage(img, 0, 0, 100, 100);
      const data = tc.getImageData(0, 0, 100, 100).data;

      const b = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 4) {
        const avg = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
        b[avg]++;
      }

      const max = Math.max(...b);
      ctx.fillStyle = "#6366f1";

      b.forEach((v, i) => {
        const h = (v / max) * canvas.height;
        ctx.fillRect(i, canvas.height - h, 1, h);
      });
    };
  }, [currentData]);

  /* ===== DOWNLOAD CLEAN ===== */

  const downloadClean = () => {
    const img = new Image();
    img.src = currentData.preview;

    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);

      c.toBlob((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = "clean.jpg";
        a.click();
      }, "image/jpeg");
    };
  };

  /* ===== COPY RAW ===== */

  const copyMetadata = () => {
    navigator.clipboard.writeText(
      JSON.stringify(currentData.metadata, null, 2)
    );
  };

  /* ================= RENDER ================= */

  if (status === "loading")
    return <div style={styles.empty}>Memuat...</div>;

  if (!session)
    return <LoginScreen onLogin={() => signIn("google")} />;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>exif-viewer</div>

        <label style={styles.uploadBtn}>
          <input
            type="file"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          {isProcessing ? "SCANNING..." : "PILIH FOTO"}
        </label>

        <div style={styles.batchList}>
          {fileList.map((f, i) => (
            <div
              key={f.id}
              onClick={() => setSelectedIndex(i)}
              style={{
                ...styles.batchItem,
                borderColor: selectedIndex === i ? "#6366f1" : "#27272a",
              }}
            >
              <img src={f.preview} style={styles.thumb} />
              <div>{f.name}</div>
            </div>
          ))}
        </div>

        <button onClick={() => signOut()} style={styles.logout}>
          Keluar
        </button>
      </aside>

      <main style={styles.main}>
        {!currentData ? (
          <div style={styles.empty}>Upload foto</div>
        ) : (
          <>
            <button onClick={downloadClean} style={styles.actionBtn}>
              Bersihkan Metadata
            </button>

            <div style={styles.grid}>
              <div style={styles.card}>
                <img src={currentData.preview} style={styles.mainImg} />
                <canvas
                  ref={histogramRef}
                  width="256"
                  height="80"
                  style={styles.histogram}
                />
              </div>

              <div style={styles.card}>
                <div style={styles.tabs}>
                  {["overview", "camera", "gps", "raw"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      style={{
                        ...styles.tabBtn,
                        background:
                          activeTab === t ? "#6366f1" : "#27272a",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {activeTab === "overview" && (
                  <>
                    <DataRow label="File" value={currentData.name} />
                    <DataRow
                      label="Resolution"
                      value={`${currentData.metadata?.ExifImageWidth} x ${currentData.metadata?.ExifImageHeight}`}
                    />
                    <DataRow
                      label="Software"
                      value={currentData.metadata?.Software}
                    />
                  </>
                )}

                {activeTab === "camera" && (
                  <>
                    <DataRow
                      label="Camera"
                      value={`${currentData.metadata?.Make} ${currentData.metadata?.Model}`}
                    />
                    <DataRow
                      label="Lens"
                      value={currentData.metadata?.LensModel}
                    />
                    <DataRow label="ISO" value={currentData.metadata?.ISO} />
                    <DataRow
                      label="Aperture"
                      value={currentData.metadata?.FNumber}
                    />
                    <DataRow
                      label="Shutter"
                      value={currentData.metadata?.ExposureTime}
                    />
                  </>
                )}

                {activeTab === "gps" &&
                  currentData.metadata?.latitude && (
                    <iframe
                      width="100%"
                      height="200"
                      src={`https://maps.google.com/maps?q=${currentData.metadata.latitude},${currentData.metadata.longitude}&z=15&output=embed`}
                    />
                  )}

                {activeTab === "raw" && (
                  <>
                    <button
                      onClick={copyMetadata}
                      style={styles.copyBtn}
                    >
                      Copy JSON
                    </button>
                    <div style={styles.rawBox}>
                      <MetaTree data={currentData.metadata} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  app: { display: "flex", height: "100vh", background: "#09090b", color: "#fff" },
  sidebar: { width: 240, padding: 20, borderRight: "1px solid #222" },
  brand: { fontSize: 20, marginBottom: 20 },
  uploadBtn: { background: "#6366f1", padding: 10, display: "block", textAlign: "center", cursor: "pointer" },
  batchList: { marginTop: 10 },
  batchItem: { display: "flex", gap: 10, padding: 6, border: "1px solid", marginBottom: 6, cursor: "pointer" },
  thumb: { width: 40, height: 40, objectFit: "cover" },
  main: { flex: 1, padding: 30 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: { background: "#111", padding: 20, borderRadius: 10 },
  mainImg: { width: "100%" },
  histogram: { width: "100%", background: "#000", marginTop: 10 },
  tabs: { display: "flex", gap: 6, marginBottom: 10 },
  tabBtn: { border: "none", color: "#fff", padding: "6px 10px", cursor: "pointer" },
  rawBox: { maxHeight: 300, overflow: "auto", background: "#000", padding: 10 },
  copyBtn: { marginBottom: 10 },
  row: { display: "flex", justifyContent: "space-between", padding: 6, borderBottom: "1px solid #222" },
  rowLabel: { color: "#888" },
  rowValue: { fontWeight: "bold" },
  actionBtn: { marginBottom: 10, padding: 10, background: "#10b981", border: "none", cursor: "pointer" },
  logout: { marginTop: 20, background: "none", border: "none", color: "red", cursor: "pointer" },
  empty: { display: "flex", height: "100%", alignItems: "center", justifyContent: "center" },
  loginPage: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  loginCard: { background: "#111", padding: 40 },
  loginBtn: { marginTop: 20, padding: 10 },
};
