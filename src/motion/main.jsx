import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ArtifactScene from './ArtifactScene.jsx';
import { signals } from './signals.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './motion.css';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const signal = signals[active];
  const heroRef = useRef(null);
  const scanTimeout = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => window.clearTimeout(scanTimeout.current);
    }
    const ctx = gsap.context(() => {
      gsap.from('.topbar', { y: -18, opacity: 0, duration: 0.7, ease: 'power3.out' });
      gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 0.9, stagger: 0.085, delay: 0.16, ease: 'power3.out' });
      gsap.from('.hero-stage', { scale: 0.92, opacity: 0, duration: 1.15, delay: 0.2, ease: 'power3.out' });
      gsap.utils.toArray('.reveal').forEach((element) => gsap.from(element, { y: 36, opacity: 0, duration: 0.75, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 87%' } }));
      gsap.to('.orbit-label--one', { y: -9, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.orbit-label--two', { y: 8, duration: 3.3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, heroRef);
    return () => {
      ctx.revert();
      window.clearTimeout(scanTimeout.current);
    };
  }, []);

  const selectSignal = (index) => {
    if (index === active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(index);
      return;
    }
    const enter = () => {
      setActive(index);
      gsap.fromTo('.signal-readout', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.48, ease: 'power3.out', overwrite: 'auto' });
    };
    gsap.to('.signal-readout', { y: -8, opacity: 0, duration: 0.2, ease: 'power2.in', overwrite: 'auto', onComplete: enter });
  };

  const cycleSignal = () => {
    setScanning(true);
    selectSignal((active + 1) % signals.length);
    window.clearTimeout(scanTimeout.current);
    scanTimeout.current = window.setTimeout(() => setScanning(false), 850);
  };

  return <main ref={heroRef} style={{ '--signal': signal.tint }}>
    <header className="topbar">
      <a className="brand" href="#home" aria-label="Orbital home"><span className="brand-symbol"><i /><i /><i /></span><span>ORBITAL<span className="brand-period">.</span></span></a>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
      <nav className={menuOpen ? 'navigation navigation--open' : 'navigation'} aria-label="Main navigation">
        <a href="#atlas" onClick={() => setMenuOpen(false)}>The atlas</a>
        <a href="#method" onClick={() => setMenuOpen(false)}>Our method</a>
        <a className="nav-cta" href="./">Open Scout <span>↗</span></a>
      </nav>
    </header>

    <section className="hero" id="home">
      <div className="hero-copy">
        <p className="eyebrow"><span className="live-pip" /> AN INDEPENDENT AUTHOR'S FIELD GUIDE <span className="eyebrow-index">№ 001 — 2026</span></p>
        <h1>Find the story<br />the world is<br /><em>waiting for.</em></h1>
        <p className="hero-deck">Every great book begins with a hunch. We turn the signals readers leave behind into a map for what to write next.</p>
        <div className="hero-actions">
          <a className="button button--light" href="#atlas">Explore the atlas <span>↓</span></a>
          <button className="text-button" onClick={cycleSignal}><span className={scanning ? 'play-icon play-icon--scanning' : 'play-icon'}>{scanning ? '◌' : '↗'}</span>{scanning ? 'Changing example…' : 'See an example signal'}</button>
        </div>
        <div className="hero-proof"><div className="avatar-stack"><i>A</i><i>M</i><i>R</i><i>+</i></div><span>Made for the <b>independent-minded.</b></span></div>
      </div>

      <div className="hero-stage" aria-label="An interactive 3D sculpture of reader signals and floating books">
        <div className="stage-grid" />
        <div className="stage-glow" />
        <div className="hero-canvas"><ArtifactScene activeIndex={active} /></div>
        <div className="orbit-label orbit-label--one"><span className="label-orbit-dot" /> READER GRAVITY <b>+12.8%</b></div>
        <div className="orbit-label orbit-label--two">VOL. 01 <span>·</span> {signal.genre.split(' / ')[1]}</div>
        <div className="signal-readout">
          <div className="readout-top"><span className="readout-kicker">CURRENT READING</span><span className="readout-live">FIELD NOTE / SAMPLE</span></div>
          <div className="readout-name">{signal.title}<span className="readout-arrow">↗</span></div>
          <div className="readout-stats"><div><span>OPPORTUNITY</span><b>{signal.score}<small>/100</small></b></div><div><span>DEMAND SHIFT</span><b>{signal.lift}</b></div><div><span>READERS / MO</span><b>{signal.readers}</b></div></div>
          <div className="readout-foot"><span>US · KINDLE STORE</span><span>ILLUSTRATIVE METRICS</span></div>
        </div>
        <div className="stage-caption"><span>01 — 03</span><i /><span>THE SHAPE OF A GOOD STORY</span></div>
      </div>
      <div className="hero-footnote"><span>SCROLL TO FIND YOUR ORBIT</span><span className="down-mark">⌄</span><span>BUILT FOR THE NEXT CHAPTER</span></div>
    </section>

    <section className="ticker" aria-label="What we look for"><div className="ticker-track">{['Reader intent', 'Quiet demand', 'Open niches', 'Stories with gravity', 'Reader intent', 'Quiet demand', 'Open niches', 'Stories with gravity'].map((word, i) => <span key={`${word}-${i}`}>{word}<i>✳</i></span>)}</div></section>

    <section className="atlas-section" id="atlas">
      <div className="section-heading reveal"><div><p className="eyebrow">01 / THE ATLAS</p><h2>Worlds are<br />already <em>forming.</em></h2></div><p className="section-intro">A first look at the reader currents shaping what comes next. Choose a signal and let the landscape shift.</p></div>
      <div className="signal-grid">
        {signals.map((item, index) => <button key={item.title} className={active === index ? 'signal-card signal-card--active reveal' : 'signal-card reveal'} onClick={() => selectSignal(index)} style={{ '--card-tint': item.tint }} aria-pressed={active === index}>
          <div className="card-graphic"><div className="card-orbit"/><div className="card-orb"/><span className="card-index">0{index + 1}</span><span className="card-arrow">↗</span></div>
          <div className="card-meta"><span>{item.genre}</span><span>OPP. {item.score}</span></div>
          <h3>{item.title}</h3><p>{item.copy}</p>
          <div className="card-bottom"><span>EXPLORE SIGNAL</span><span>↘</span></div>
        </button>)}
      </div>
    </section>

    <section className="method-section" id="method">
      <div className="method-visual reveal"><div className="method-rings"><i/><i/><i/><b>O</b></div><span className="method-tag">A BETTER KIND OF BOOKMARK</span><span className="method-coordinate">36° 10' N / 115° 08' W</span></div>
      <div className="method-copy reveal"><p className="eyebrow">02 / THE METHOD</p><h2>Less guessing.<br /><em>More gravity.</em></h2><p>We listen for the small signals hiding in plain sight: what readers search, what shelves feel crowded, and where a fresh point of view can still find its orbit.</p>
        <div className="method-list"><div><span>01</span><div><b>Follow the reader</b><small>Real search signals. Not a crystal ball.</small></div><i>↗</i></div><div><span>02</span><div><b>Find the open space</b><small>Demand meets a shelf that can breathe.</small></div><i>↗</i></div><div><span>03</span><div><b>Write with intention</b><small>A clearer next chapter for your idea.</small></div><i>↗</i></div></div>
        <a className="button button--outline" href="./">Open the research studio <span>↗</span></a>
      </div>
    </section>

    <section className="closing reveal"><p className="eyebrow">YOUR NEXT CHAPTER IS OUT THERE</p><h2>Go where the<br /><em>story takes you.</em></h2><a className="button button--light" href="./">Start exploring <span>↗</span></a><div className="closing-decoration" aria-hidden="true">✳</div></section>
    <footer className="footer"><a className="brand" href="#home"><span className="brand-symbol"><i/><i/><i/></span><span>ORBITAL<span className="brand-period">.</span></span></a><span>AN EXPERIMENT IN READER GRAVITY</span><a href="./">KDP SCOUT PRO <span>↗</span></a></footer>
  </main>;
}

createRoot(document.getElementById('motion-root')).render(<App />);
