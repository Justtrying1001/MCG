"use client";

import { useEffect } from "react";

const DOCS_URL = "https://mcg-2.gitbook.io/untitled/";

export default function DocsRedirectPage() {
  useEffect(() => {
    window.location.replace(DOCS_URL);
  }, []);

  return (
    <html lang="en">
      <head>
        {/* meta refresh as a fallback if JS is slow */}
        <meta httpEquiv="refresh" content={`0; url=${DOCS_URL}`} />
        <title>MCG Docs</title>
      </head>
      <body
        style={{
          margin: 0,
          background: "#0F1419",
          color: "#e9f2ff",
          fontFamily: "'DM Mono', monospace",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
        }}
      >
        <div
          style={{
            fontFamily: "'Rajdhani', 'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "2rem",
            letterSpacing: "0.08em",
            color: "#C4715A",
          }}
        >
          MCG
        </div>
        <p style={{ color: "#8fa1b3", fontSize: "0.9rem", margin: 0 }}>
          Loading docs…
        </p>
        <p style={{ color: "#263240", fontSize: "0.75rem", margin: 0 }}>
          If you are not redirected,{" "}
          <a
            href={DOCS_URL}
            style={{ color: "#C4715A" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            click here
          </a>
          .
        </p>
      </body>
    </html>
  );
}
