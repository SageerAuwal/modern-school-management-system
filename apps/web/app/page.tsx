export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-page)",
      }}
    >
      <div className="card" style={{ textAlign: "center", maxWidth: 400 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          School Management System
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          Module 0 — Foundation is running. 🎉
        </p>
      </div>
    </main>
  );
}
