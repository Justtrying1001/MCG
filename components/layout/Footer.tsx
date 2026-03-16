import Link from "next/link";

export function Footer() {
  return (
    <footer className="mcg-footer-v2">
      <div className="mcg-container mcg-footer-v2-inner">
        {/* Left: Brand */}
        <div className="mcg-footer-brand">
          <div className="mcg-footer-brand-mark">MCG</div>
          <div>
            <div className="mcg-footer-brand-name">Meme Card Game</div>
            <div className="mcg-footer-brand-sub">Set 1 — GENESIS</div>
          </div>
        </div>

        {/* Center: Links */}
        <nav className="mcg-footer-links" aria-label="Footer navigation">
          <a
            href="https://mcg-2.gitbook.io/mcg/"
            target="_blank"
            rel="noopener noreferrer"
            className="mcg-footer-link"
          >
            Docs <span className="mcg-footer-ext">↗</span>
          </a>
          <a
            href="https://x.com/mcgonchain"
            target="_blank"
            rel="noopener noreferrer"
            className="mcg-footer-link"
          >
            Twitter / X <span className="mcg-footer-ext">↗</span>
          </a>
          <Link href="/packs" className="mcg-footer-link">
            Packs
          </Link>
          <Link href="/contests" className="mcg-footer-link">
            Contests
          </Link>
        </nav>

        {/* Right: Legal */}
        <div className="mcg-footer-legal">
          <span>© 2025 MCG. All rights reserved.</span>
          <span className="mcg-footer-mvp">MVP — subject to change</span>
        </div>
      </div>
    </footer>
  );
}
