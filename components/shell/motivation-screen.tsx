"use client";

import { useEffect, useState } from "react";

// Sayfaya girildiğinde gösterilen tam ekran motivasyon mesajı.
// 4 saatte bir görünür; kapatınca (✕/Esc) zaman kaydedilir, 4 saat sonra tekrar çıkar.
const KEY = "damga.motivation.lastAt";
const INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 saat

const CSS = `
.mtv { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center;
  background: radial-gradient(120% 120% at 50% 42%, #070707 0%, #000 60%);
  color: #fff; font-family: "Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased; }
.mtv-quote { width: min(1100px, 90vw); padding: 0 clamp(12px, 3vw, 32px); text-align: center; text-wrap: balance; }
.mtv-line { margin: 0; opacity: 0; }
.mtv-l1 { font-size: clamp(1.8rem, 5.2vw, 4.05rem); font-weight: 300; line-height: 1.18; letter-spacing: -0.02em;
  animation: mtvRise 1s 0.2s cubic-bezier(.2,.7,.2,1) forwards; }
.mtv-l2 { margin-top: clamp(20px, 4vh, 40px); font-size: clamp(2.2rem, 7vw, 5.4rem); font-weight: 800; line-height: 1;
  letter-spacing: -0.03em; animation: mtvRise 1s 0.9s cubic-bezier(.2,.7,.2,1) forwards; }
.mtv-sep { width: 0; height: 1px; margin: clamp(24px, 5vh, 46px) auto 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  animation: mtvGrow 1.1s 1.5s cubic-bezier(.2,.7,.2,1) forwards; }
.mtv-l3 { margin-top: clamp(22px, 4.5vh, 44px); font-size: clamp(1.1rem, 3.1vw, 2.05rem); font-weight: 400;
  font-style: italic; line-height: 1.4; color: #cfcfcf;
  animation: mtvRise 1.1s 1.9s cubic-bezier(.2,.7,.2,1) forwards, mtvIgnite 2.6s 3s ease-in-out infinite; }
.mtv-l3 b { color: #fff; font-weight: 600; font-style: normal; }
.mtv-close { position: fixed; top: clamp(16px, 4vh, 34px); right: clamp(16px, 4vw, 40px); z-index: 101;
  width: 46px; height: 46px; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
  border: 1px solid rgba(255,255,255,0.22); background: transparent; color: #cfcfcf; font-size: 20px; line-height: 1;
  opacity: 0; animation: mtvFade .6s 3.4s ease forwards; transition: color .2s, border-color .2s, transform .2s; }
.mtv-close:hover { color: #fff; border-color: rgba(255,255,255,0.6); transform: rotate(90deg); }
.mtv-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@keyframes mtvRise { from { opacity: 0; transform: translateY(24px); filter: blur(10px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); } }
@keyframes mtvGrow { from { opacity: 0; width: 0; } to { opacity: 1; width: min(120px, 30vw); } }
@keyframes mtvIgnite { 0%,100% { text-shadow: 0 0 0 rgba(255,255,255,0); } 50% { text-shadow: 0 0 22px rgba(255,255,255,0.45); } }
@keyframes mtvFade { to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .mtv-line, .mtv-close { opacity: 1 !important; animation: none !important; transform: none !important; filter: none !important; }
  .mtv-sep { width: min(120px, 30vw); opacity: 1; animation: none; }
}
`;

export function MotivationScreen() {
  const [show, setShow] = useState(false);

  // Girişte: son gösterimden 4 saat geçtiyse göster.
  useEffect(() => {
    let last = 0;
    try {
      last = Number(localStorage.getItem(KEY) ?? 0);
    } catch {
      /* yok say */
    }
    if (!last || Date.now() - last >= INTERVAL_MS) {
      setShow(true);
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* yok say */
      }
    }
  }, []);

  // Görünürken sayfa kaydırmayı kilitle + Esc ile kapat.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function close() {
    // Kapatınca zamanı yenile → 4 saat sonra tekrar çıkar.
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* yok say */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mtv" role="dialog" aria-modal="true" aria-label="Motivasyon">
      <style>{CSS}</style>
      <button className="mtv-close" type="button" onClick={close} aria-label="Kapat">
        ✕
      </button>
      <div className="mtv-quote">
        <p className="mtv-line mtv-l1">Bir gün bu günlerden gururla bahsedeceğiz abim.</p>
        <p className="mtv-line mtv-l2">Asla pes etme.</p>
        <div className="mtv-sep" />
        <p className="mtv-line mtv-l3">
          Unutma; <b>roketin götü tutuşmasaydı uçamazdı!</b>
        </p>
      </div>
    </div>
  );
}
