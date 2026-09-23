import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  ScanLine,
  Fingerprint,
  Orbit,
  Menu,
  X,
  Play,
} from "lucide-react";
import { Brand } from "../components/UI";
export default function Landing({ onAuth, onDemo, busy }) {
  const section = useRef(),
    canvas = useRef(),
    [progress, setProgress] = useState(0),
    [menu, setMenu] = useState(false),
    [lite, setLite] = useState(() => {
      const saved = localStorage.getItem("onona-lite");
      return saved === null
        ? matchMedia("(prefers-reduced-motion: reduce)").matches
        : saved === "true";
    });
  useEffect(() => {
    let active = true,
      raf,
      current = 0,
      target = 0,
      nextLoad = 0;
    let lastTime = 0,
      painted = -1,
      loaded = 0;
    const images = [],
      count = lite ? 1 : 150;

    function draw(force = false) {
      const c = canvas.current,
        img = images[current];
      if (!active || !c || !img || (!force && painted === current)) return;
      const dpr = Math.min(devicePixelRatio, 1.3);
      const w = Math.round(c.clientWidth * dpr),
        h = Math.round(c.clientHeight * dpr);
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
      const scale = Math.max(w / img.width, h / img.height);
      c.getContext("2d").drawImage(
        img,
        (w - img.width * scale) / 2,
        (h - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      );
      painted = current;
      c.dataset.frame = String(current + 1);
    }

    // Decode ahead of scrolling. Keep frames available for instant reverse scrubbing.
    async function preload() {
      while (active && nextLoad < count) {
        const index = nextLoad++,
          img = new Image();
        img.src = `/frames/ezgif-frame-${String(index + 1).padStart(3, "0")}.webp`;
        try {
          await img.decode();
          if (!active) return;
          images[index] = img;
          loaded++;
          canvas.current.dataset.loaded = String(loaded);
          draw();
        } catch {
          // A missing asset must not prevent the rest of the sequence from loading.
          if (active) images[index] = images[index - 1] || images[0];
        }
      }
    }

    function update() {
      const el = section.current;
      const travel = Math.max(
        1,
        el.offsetHeight - el.firstElementChild.offsetHeight,
      );
      const p = Math.max(
        0,
        Math.min(1, -el.getBoundingClientRect().top / travel),
      );
      // Finish before the sticky section releases, leaving a short final-frame hold.
      target = Math.round(Math.min(1, p / 0.9) * (count - 1));
      setProgress(p);
    }
    function tick(time) {
      if (!active) return;
      if (time - lastTime >= 1000 / 60 - 1) {
        const next = current + Math.sign(target - current);
        // Advance one frame at a time instead of jumping between wheel events.
        if (images[next]) current = next;
        draw();
        lastTime = time;
      }
      raf = requestAnimationFrame(tick);
    }
    function resize() {
      update();
      draw(true);
    }
    update();
    for (let worker = 0; worker < Math.min(6, count); worker++) preload();
    raf = requestAnimationFrame(tick);
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", resize);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      removeEventListener("scroll", update);
      removeEventListener("resize", resize);
      images.length = 0;
    };
  }, [lite]);

  return (
    <div className="landing">
      <a className="skip" href="#vision">
        Skip to content
      </a>
      <header className="landing-nav">
        <Brand light onClick={() => scrollTo({ top: 0, behavior: "smooth" })} />
        <nav className={menu ? "open" : ""}>
          <a href="#vision" onClick={() => setMenu(false)}>
            The vision
          </a>
          <a href="#ecosystem" onClick={() => setMenu(false)}>
            The ecosystem
          </a>
          <a href="#access" onClick={() => setMenu(false)}>
            Built for everyone ↗
          </a>
        </nav>
        <div className="nav-actions">
          <button onClick={() => onAuth("login")}>Log in</button>
          <button
            className="button ivory small"
            onClick={() => onAuth("register")}
          >
            Find your potential
            <ArrowUpRight size={16} />
          </button>
          <button
            className="menu-button"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <section className="film-sequence" ref={section}>
        <div className="film-sticky">
          <canvas
            ref={canvas}
            role="img"
            aria-label="Athlete at the starting blocks; the video moves with your scroll"
          />
          <div className="film-shade" />
          <div className="hero-meta">
            <span>
              <i /> A NEW PLAYING FIELD FOR INDIA
            </span>
            <span>EST. 2026 / 01—18</span>
          </div>
          <div
            className="hero-copy"
            style={{
              opacity: Math.max(0, 1 - progress * 2.2),
              visibility: progress > 0.46 ? "hidden" : "visible",
              transform: `translateY(${-progress * 80}px)`,
            }}
          >
            <h1>
              A BILLION
              <br />
              DREAMS.
              <br />
              <span>NO SIDELINES.</span>
            </h1>
            <div className="hero-bottom">
              <p>
                Talent is everywhere.
                <br />
                Opportunity should be, too.
              </p>
              <button
                className="button orange"
                onClick={() => onAuth("register")}
              >
                Your journey starts here
                <ArrowUpRight size={19} />
              </button>
            </div>
          </div>
          <div
            className="sequence-copy"
            style={{
              opacity: Math.max(0, (progress - 0.48) * 3),
              visibility: progress < 0.5 ? "hidden" : "visible",
            }}
          >
            <span className="eyebrow">YOUR STARTING LINE. REIMAGINED.</span>
            <h2>
              WHERE YOU START
              <br />
              SHOULDN’T DECIDE
              <br />
              <em>HOW FAR YOU GO.</em>
            </h2>
            <button className="button orange" onClick={onDemo} disabled={busy}>
              Explore the athlete experience
              <ArrowUpRight size={19} />
            </button>
          </div>
          <div className="film-footer">
            <span>
              <ArrowDown size={14} />
              SCROLL TO MOVE THE STORY
            </span>
            <div className="sequence-progress">
              <i style={{ width: Math.max(2, progress * 100) + "%" }} />
            </div>
            <button
              onClick={() => {
                localStorage.setItem("onona-lite", String(!lite));
                setLite(!lite);
              }}
            >
              {lite ? "Enable motion" : "Low-data mode"} ◉
            </button>
          </div>
          <span className="side-label">28 STATES. ONE STARTING LINE.</span>
        </div>
      </section>
      <div className="ticker">
        <span>NOT JUST THE FASTEST.</span>
        <i>✳</i>
        <span>THE FURTHEST FROM OPPORTUNITY.</span>
        <i>✳</i>
        <span>EVERY ATHLETE COUNTS.</span>
      </div>
      <section className="landing-section mission" id="vision">
        <div className="section-kicker">
          <span>01 / THE BIGGER PICTURE</span>
          <span>BUILT IN INDIA. FOR INDIA.</span>
        </div>
        <div className="mission-grid">
          <h2>
            GREATNESS
            <br />
            HAS NO
            <br />
            <em>PIN CODE.</em>
          </h2>
          <div className="mission-text">
            <span className="asterisk">✳</span>
            <p>
              A dusty ground. A borrowed pair of shoes. A phone camera.
              Sometimes, that’s where the next great story begins.
            </p>
            <p className="muted">
              One Nation, One Athlete connects your performance, wellbeing, and
              next opportunity. One sporting identity. A whole country of
              possibility.
            </p>
            <button className="text-link" onClick={onDemo} disabled={busy}>
              {busy ? "Preparing your workspace…" : "Step inside the platform"}
              <ArrowUpRight size={19} />
            </button>
          </div>
        </div>
        <div className="mission-stats">
          <div>
            <b>01</b>
            <span>IDENTITY. EVERY MILESTONE.</span>
          </div>
          <div>
            <b>∞</b>
            <span>POTENTIAL. ZERO BOUNDARIES.</span>
          </div>
          <div>
            <b>18</b>
            <span>CONNECTED POSSIBILITIES.</span>
          </div>
        </div>
      </section>
      <section className="landing-section ecosystem" id="ecosystem">
        <div className="section-kicker">
          <span>02 / YOUR UNFAIR ADVANTAGE</span>
          <span>AN ECOSYSTEM, NOT ANOTHER APP</span>
        </div>
        <div className="section-heading">
          <h2>
            EVERY PART OF
            <br />
            <em>YOUR GAME.</em>
          </h2>
          <p>
            From your first upload to your next breakthrough.
            <br />
            Everything moves forward with you.
          </p>
        </div>
        <div className="feature-grid">
          <button
            className="feature feature-video"
            onClick={onDemo}
            disabled={busy}
          >
            <img
              src="/frames/ezgif-frame-150.webp"
              alt="Sprinter launching from the starting blocks"
              loading="lazy"
            />
            <span className="feature-number">01 / DISCOVER</span>
            <ScanLine className="feature-icon" />
            <div>
              <span className="eyebrow">COMPUTER VISION</span>
              <h3>
                LET YOUR
                <br />
                MOVEMENT TALK.
              </h3>
              <p>
                A phone video. Observable movement.
                <br />A fresh perspective on your potential.
              </p>
            </div>
            <ArrowUpRight className="feature-arrow" />
          </button>
          <button
            className="feature feature-passport"
            onClick={onDemo}
            disabled={busy}
          >
            <span className="feature-number">02 / BELONG</span>
            <Fingerprint size={80} strokeWidth={1} />
            <div className="passport-mini">
              <span>ATHLETE PASSPORT</span>
              <b>IND / 001</b>
              <div className="barcode" />
            </div>
            <div>
              <h3>
                YOUR STORY.
                <br />
                ONE IDENTITY.
              </h3>
              <p>
                Every record. Every milestone.
                <br />
                Yours to carry. Yours to control.
              </p>
            </div>
            <ArrowUpRight className="feature-arrow" />
          </button>
          <button
            className="feature feature-opportunity"
            onClick={onDemo}
            disabled={busy}
          >
            <span className="feature-number">03 / GO FURTHER</span>
            <Orbit size={95} strokeWidth={0.8} />
            <div>
              <h3>
                THE RIGHT DOOR.
                <br />
                OPEN FOR YOU.
              </h3>
              <p>
                Trials, support, and pathways
                <br />
                matched to your journey.
              </p>
            </div>
            <ArrowUpRight className="feature-arrow" />
          </button>
        </div>
        <div className="capability-strip">
          <span>PERFORMANCE INTELLIGENCE</span>
          <span>RECOVERY & WELLBEING</span>
          <span>RESOURCE-AWARE TRAINING</span>
          <span>CAREER & FINANCE</span>
        </div>
      </section>
      <section className="landing-section access" id="access">
        <div className="section-kicker">
          <span>03 / NO ONE ON THE SIDELINES</span>
          <span>ACCESS IS A RIGHT.</span>
        </div>
        <div className="access-layout">
          <div>
            <h2>
              DIFFERENT
              <br />
              JOURNEYS.
              <br />
              <em>EQUAL SHOT.</em>
            </h2>
            <p>
              For the village ground and the city stadium.
              <br />
              For every body. For every kind of ambition.
            </p>
            <button className="button dark" onClick={() => onAuth("register")}>
              Make your next move
              <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="access-lines">
            {[
              [
                "01",
                "Ground-level access",
                "Log training offline. Sync when you reconnect. Keep moving with the resources you have.",
              ],
              [
                "02",
                "Ability, without assumptions",
                "Accessible controls, adaptive planning, and classification-aware opportunities.",
              ],
              [
                "03",
                "Your data. Your decision.",
                "Share performance with a coach. Keep health records private until you choose otherwise.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
                <ArrowUpRight size={19} />
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="final-cta">
        <span className="eyebrow">THE NEXT CHAPTER OF INDIAN SPORT</span>
        <h2>
          HAS YOUR
          <br />
          <em>NAME ON IT.</em>
          <span>↗</span>
        </h2>
        <button className="button ivory" onClick={() => onAuth("register")}>
          Claim your starting line
          <ArrowRight size={19} />
        </button>
      </section>
      <footer className="landing-footer">
        <Brand light onClick={() => scrollTo({ top: 0, behavior: "smooth" })} />
        <span>
          ONE NATION. EVERY ATHLETE.
          <br />
          <small>A final-year project with a bigger purpose.</small>
        </span>
        <button onClick={onDemo} disabled={busy}>
          <Play size={14} />
          Explore demo
        </button>
        <span>© {new Date().getFullYear()} ONOA</span>
      </footer>
    </div>
  );
}
