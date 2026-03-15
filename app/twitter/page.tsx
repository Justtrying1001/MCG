"use client";

import { useEffect } from "react";

const TWITTER_URL = "https://x.com/mcgonchain";

export default function TwitterRedirectPage() {
  useEffect(() => {
    window.location.replace(TWITTER_URL);
  }, []);

  return (
    <html lang="en">
      <head>
        {/* meta refresh fallback */}
        <meta httpEquiv="refresh" content={`0; url=${TWITTER_URL}`} />
        <title>MCG on X</title>
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
          Redirecting to MCG on X…
        </p>
        <p style={{ color: "#263240", fontSize: "0.75rem", margin: 0 }}>
          If you are not redirected,{" "}
          <a
            href={TWITTER_URL}
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
