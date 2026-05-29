export default function ComingSoonPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#1B2A4A",
        color: "#FAF7F2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,168,76,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Decorative compass ring */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "560px",
          height: "560px",
          borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.12)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "720px",
          height: "720px",
          borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.06)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#C9A84C",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
            opacity: 0.9,
          }}
        >
          An Archive of Immigration Stories
        </p>

        <h1
          style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "1.25rem",
          }}
        >
          My Journey{" "}
          <span style={{ color: "#C9A84C" }}>to America</span>
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            lineHeight: 1.75,
            opacity: 0.75,
            marginBottom: "2.5rem",
          }}
        >
          A collection of immigrant stories — coming soon.
        </p>

        <div
          style={{
            width: "48px",
            height: "2px",
            backgroundColor: "#C9A84C",
            margin: "0 auto",
            opacity: 0.6,
          }}
        />

        <p
          style={{
            marginTop: "3rem",
            fontSize: "0.75rem",
            opacity: 0.35,
            letterSpacing: "0.05em",
          }}
        >
          &copy; {new Date().getFullYear()} My Journey to America
        </p>
      </div>
    </div>
  );
}
