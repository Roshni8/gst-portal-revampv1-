import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "GST UX Prototype",
  description: "Independent hackathon prototype using synthetic data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="gst-site-header">
          <div className="gst-header-content">
            <Image
              className="gst-emblem"
              src="/brand/india-emblem.png"
              alt="State emblem of India"
              width={76}
              height={68}
              priority
            />
            <div className="gst-brand-copy">
              <p className="gst-brand-title">Goods and Services Tax</p>
              <p className="gst-brand-subtitle">Government of India, States and Union Territories</p>
            </div>
          </div>
        </header>
        {children}
        <footer className="gst-site-footer">
          <div className="gst-footer-content">
            <span>© 2026-27 Goods and Services Tax Network</span>
            <span>Made with <span className="gst-footer-heart" aria-label="love">♥</span> in India <span aria-label="India flag">🇮🇳</span></span>
          </div>
          <p className="gst-footer-notice">Site best viewed at 1024 × 768 resolution in Microsoft Edge, Google Chrome 49+, Firefox 45+ and Safari 6+</p>
        </footer>
      </body>
    </html>
  );
}
