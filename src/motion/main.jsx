import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './motion.css';

gsap.registerPlugin(ScrollTrigger);

const signals = [
  { title: 'Cozy mystery', genre: 'FICTION / MYSTERY', score: '92', lift: '+38%', readers: '18.4k', tint: '#f6a86b', copy: 'Small-town secrets. Big reader appetite.' },
  { title: 'Botanical field guide', genre: 'NONFICTION / NATURE', score: '87', lift: '+24%', readers: '12.8k', tint: '#a3cfac', copy: 'For the curious, quietly outdoors.' },
  { title: 'Mythic romantasy', genre: 'FICTION / FANTASY', score: '84', lift: '+31%', readers: '26.2k', tint: '#b7a8f9', copy: 'A new mythology is taking shape.' }
];

function Starfield() {
  const points = useMemo(() => {
    const data = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      data[i * 3] = (Math.random() - 0.5) * 16;
      data[i * 3 + 1] = (Math.random() - 0.5) * 13;
      data[i * 3 + 2] = -2 - Math.random() * 13;
    }
    return data;
  }, []);
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.006; });
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><pointsMaterial color="#bec6dd" size={0.022} transparent opacity={0.66} sizeAttenuation /></points>;
}

function OrbitingBook({ position, rotation, color, scale = 1, delay = 0 }) {
  const book = useRef();
  useFrame(({ clock }) => {
    if (!book.current) return;
    const time = clock.elapsedTime + delay;
    book.current.position.y = position[1] + Math.sin(time * 0.8) * 0.11;
    book.current.rotation.y = rotation[1] + Math.sin(time * 0.32) * 0.12;
  });
  return <group ref={book} position={position} rotation={rotation} scale={scale}>
      <mesh castShadow><boxGeometry args={[0.72, 1.02, 0.12]} /><meshStandardMaterial color="#13151d" roughness={0.4} metalness={0.36} /></mesh>
      <mesh position={[0, 0, 0.066]}><planeGeometry args={[0.57, 0.84]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.24} roughness={0.53} /></mesh>
      <mesh position={[0, 0, -0.067]}><boxGeometry args={[0.045, 0.99, 0.012]} /><meshStandardMaterial color="#e5d7c3" roughness={0.85} /></mesh>
      <mesh position={[0, -0.2, 0.075]}><boxGeometry args={[0.3, 0.012, 0.004]} /><meshBasicMaterial color="#fff0de" transparent opacity={0.72} /></mesh>
      <mesh position={[0, -0.26, 0.075]}><boxGeometry args={[0.2, 0.008, 0.004]} /><meshBasicMaterial color="#fff0de" transparent opacity={0.42} /></mesh>
    </group>;
}

function Core({ tint, target }) {
  const group = useRef();
  const inner = useRef();
  const rings = useRef();
  useFrame(({ pointer, clock }, delta) => {
    if (!group.current) return;
    const ease = 1 - Math.exp(-delta * 2.2);
    group.current.rotation.y += (pointer.x * 0.15 - group.current.rotation.y) * ease;
    group.current.rotation.x += (-pointer.y * 0.12 - group.current.rotation.x) * ease;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.75) * 0.1;
    if (inner.current) inner.current.rotation.y += delta * 0.13;
    if (rings.current) rings.current.rotation.z += delta * 0.055;
  });
  return <group ref={group}>
      <mesh castShadow>
        <icosahedronGeometry args={[1.18, 5]} />
        <meshPhysicalMaterial color={tint} roughness={0.24} metalness={0.28} clearcoat={0.86} clearcoatRoughness={0.16} emissive={tint} emissiveIntensity={0.12} />
      </mesh>
      <mesh ref={inner} scale={0.8}>
        <icosahedronGeometry args={[1.15, 2]} />
        <meshBasicMaterial color="#fff0d7" wireframe transparent opacity={0.15} />
      </mesh>
    <group ref={rings}>
      <mesh rotation={[0.38, 0.26, -0.48]}><torusGeometry args={[1.63, 0.012, 8, 180]} /><meshBasicMaterial color={tint} transparent opacity={0.6} /></mesh>
      <mesh rotation={[1.16, -0.45, 0.22]}><torusGeometry args={[1.88, 0.006, 6, 160]} /><meshBasicMaterial color="#ded3c1" transparent opacity={0.34} /></mesh>
    </group>
    <mesh position={[-0.9, 0.9, 0.35]}><octahedronGeometry args={[0.15, 0]} /><meshStandardMaterial color="#f8e4c6" emissive="#f4bc87" emissiveIntensity={0.3} metalness={0.6} roughness={0.18} /></mesh>
    <mesh position={[1.22, -0.58, -0.12]}><dodecahedronGeometry args={[0.105, 0]} /><meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.42} metalness={0.42} roughness={0.24} /></mesh>
  </group>;
}

function ArtifactScene({ signal }) {
  return <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 5.5], fov: 37 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
    <ambientLight intensity={0.8} />
    <directionalLight position={[3, 4, 5]} intensity={2.5} color="#fff0d9" />
    <pointLight position={[-3, 0, 3]} intensity={30} distance={7} color={signal.tint} />
    <pointLight position={[2, -2, -1]} intensity={12} distance={6} color="#a9c5ff" />
    <Core tint={signal.tint} />
    <OrbitingBook position={[-1.95, 0.83, -0.55]} rotation={[0.2, -0.45, -0.3]} color="#b6614e" scale={0.84} delay={1} />
    <OrbitingBook position={[1.95, 0.46, -0.48]} rotation={[-0.12, 0.42, 0.24]} color="#537c68" scale={0.72} delay={2} />
    <OrbitingBook position={[1.25, -1.35, 0.35]} rotation={[0.1, -0.2, -0.45]} color="#7867a7" scale={0.61} delay={3} />
    <Starfield />
  </Canvas>;
}

function App() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const signal = signals[active];
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.topbar', { y: -18, opacity: 0, duration: 0.7, ease: 'power3.out' });
      gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 0.9, stagger: 0.085, delay: 0.16, ease: 'power3.out' });
      gsap.from('.hero-stage', { scale: 0.92, opacity: 0, duration: 1.15, delay: 0.2, ease: 'power3.out' });
      gsap.utils.toArray('.reveal').forEach((element) => gsap.from(element, { y: 36, opacity: 0, duration: 0.75, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 87%' } }));
      gsap.to('.orbit-label--one', { y: -9, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.orbit-label--two', { y: 8, duration: 3.3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const selectSignal = (index) => {
    setActive(index);
    gsap.fromTo('.signal-readout', { y: 8, opacity: 0.35 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' });
  };

  const cycleSignal = () => {
    setScanning(true);
    setActive((current) => (current + 1) % signals.length);
    window.setTimeout(() => setScanning(false), 850);
  };

  return <main ref={heroRef} style={{ '--signal': signal.tint }}>
    <header className="topbar">
      <a className="brand" href="#home" aria-label="Orbital home"><span className="brand-symbol"><i /><i /><i /></span><span>ORBITAL<span className="brand-period">.</span></span></a>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
      <nav className={menuOpen ? 'navigation navigation--open' : 'navigation'} aria-label="Main navigation">
        <a href="#atlas" onClick={() => setMenuOpen(false)}>The atlas</a>
        <a href="#method" onClick={() => setMenuOpen(false)}>Our method</a>
        <a className="nav-cta" href="/">Open Scout <span>↗</span></a>
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
        <div className="hero-canvas"><ArtifactScene signal={signal} /></div>
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
        <a className="button button--outline" href="/">Open the research studio <span>↗</span></a>
      </div>
    </section>

    <section className="closing reveal"><p className="eyebrow">YOUR NEXT CHAPTER IS OUT THERE</p><h2>Go where the<br /><em>story takes you.</em></h2><a className="button button--light" href="/">Start exploring <span>↗</span></a><div className="closing-decoration" aria-hidden="true">✳</div></section>
    <footer className="footer"><a className="brand" href="#home"><span className="brand-symbol"><i/><i/><i/></span><span>ORBITAL<span className="brand-period">.</span></span></a><span>AN EXPERIMENT IN READER GRAVITY</span><a href="/">KDP SCOUT PRO <span>↗</span></a></footer>
  </main>;
}

createRoot(document.getElementById('motion-root')).render(<App />);
