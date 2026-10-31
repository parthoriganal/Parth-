/**
 * orbit.js — a small, dependency-free orbit rig.
 *
 * Pointer / touch / wheel input, inertial damping, an intro tween and an
 * idle turntable. The watch is the hero: phi is clamped so you can never
 * end up underneath the floor.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Orbit {
  constructor(camera, element, {
    target = { x: 0, y: 0, z: 0 },
    radius = 118,
    theta = 0.36,
    phi = 1.13,
    minRadius = 78,
    maxRadius = 300,
  } = {}) {
    this.camera = camera;
    this.element = element;
    this.target = { x: target.x, y: target.y, z: target.z };
    this.minRadius = minRadius;
    this.maxRadius = maxRadius;

    this.current = { radius, theta, phi };
    this.desired = { radius, theta, phi };
    this.velocity = { theta: 0, phi: 0 };
    this.autoRotate = true;
    this.autoRotateSpeed = 0.14;
    this.idleTimer = 0;
    this.dragging = false;
    this.pointers = new Map();
    this.pinchDistance = 0;
    this.tween = null;
    this.lastInteraction = -1e9;

    this._bind();
    this.update(0);
  }

  _bind() {
    const el = this.element;

    const onDown = (event) => {
      if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return;
      el.setPointerCapture?.(event.pointerId);
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.dragging = true;
      this.tween = null;
      this.lastInteraction = performance.now();
      el.classList.add('is-grabbing');
      event.preventDefault();
    };

    const onMove = (event) => {
      const pointer = this.pointers.get(event.pointerId);
      if (!pointer) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (this.pointers.size === 1) {
        const sensitivity = 0.0052;
        this.desired.theta -= dx * sensitivity;
        this.desired.phi = clamp(this.desired.phi - dy * sensitivity, 0.16, Math.PI - 0.16);
        this.velocity.theta = -dx * sensitivity;
        this.velocity.phi = -dy * sensitivity;
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDistance) {
          this.desired.radius = clamp(
            this.desired.radius * (this.pinchDistance / Math.max(1, distance)),
            this.minRadius,
            this.maxRadius,
          );
        }
        this.pinchDistance = distance;
        this.velocity.theta = 0;
        this.velocity.phi = 0;
      }
      this.lastInteraction = performance.now();
      event.preventDefault();
    };

    const onUp = (event) => {
      this.pointers.delete(event.pointerId);
      this.pinchDistance = 0;
      if (this.pointers.size === 0) {
        this.dragging = false;
        el.classList.remove('is-grabbing');
        this.lastInteraction = performance.now();
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);

    el.addEventListener('wheel', (event) => {
      this.tween = null;
      this.desired.radius = clamp(
        this.desired.radius * Math.exp(event.deltaY * 0.0013),
        this.minRadius,
        this.maxRadius,
      );
      this.lastInteraction = performance.now();
      event.preventDefault();
    }, { passive: false });

    el.addEventListener('dblclick', () => this.reset());
    el.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  setTarget(x, y, z) {
    this.target.x = x;
    this.target.y = y;
    this.target.z = z;
  }

  setPose(pose = {}, duration = 1400) {
    const from = {
      radius: this.current.radius,
      theta: this.current.theta,
      phi: this.current.phi,
    };
    const to = {
      radius: pose.radius ?? this.current.radius,
      theta: pose.theta ?? this.current.theta,
      phi: pose.phi ?? this.current.phi,
    };
    if (duration <= 0) {
      this.current = { ...to };
      this.desired = { ...to };
      this.tween = null;
      return;
    }
    this.tween = { from, to, startedAt: performance.now(), duration };
  }

  reset(duration = 1200) {
    this.setPose(this.homePose || { theta: 0.36, phi: 1.13, radius: 118 }, duration);
  }

  update(delta) {
    // Intro / view transitions.
    if (this.tween) {
      const elapsed = performance.now() - this.tween.startedAt;
      const t = clamp(elapsed / this.tween.duration, 0, 1);
      const eased = easeInOutCubic(t);
      this.current.radius = this.tween.from.radius + (this.tween.to.radius - this.tween.from.radius) * eased;
      this.current.theta = this.tween.from.theta + (this.tween.to.theta - this.tween.from.theta) * eased;
      this.current.phi = this.tween.from.phi + (this.tween.to.phi - this.tween.from.phi) * eased;
      this.desired.radius = this.current.radius;
      this.desired.theta = this.current.theta;
      this.desired.phi = this.current.phi;
      if (t >= 1) this.tween = null;
    } else {
      // Idle turntable.
      if (this.autoRotate && !this.dragging) {
        const idle = this.dragging ? 0 : 1;
        this.desired.theta += delta * this.autoRotateSpeed * idle;
      }

      // Damping toward the desired pose.
      const smoothing = 1 - Math.exp(-delta * 9);
      this.current.radius += (this.desired.radius - this.current.radius) * smoothing;
      this.current.theta += (this.desired.theta - this.current.theta) * smoothing;
      this.current.phi += (this.desired.phi - this.current.phi) * smoothing;

      // A little inertia after letting go.
      if (!this.dragging) {
        this.desired.theta += this.velocity.theta * delta * 4.5;
        this.desired.phi = clamp(this.desired.phi + this.velocity.phi * delta * 4.5, 0.16, Math.PI - 0.16);
        this.velocity.theta *= Math.exp(-delta * 7);
        this.velocity.phi *= Math.exp(-delta * 7);
        if (Math.abs(this.velocity.theta) < 1e-5) this.velocity.theta = 0;
        if (Math.abs(this.velocity.phi) < 1e-5) this.velocity.phi = 0;
      }
    }

    const { radius, theta, phi } = this.current;
    const sinPhi = Math.sin(phi);
    this.camera.position.set(
      this.target.x + radius * sinPhi * Math.sin(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * sinPhi * Math.cos(theta),
    );
    this.camera.lookAt(this.target.x, this.target.y, this.target.z);
  }

  pose() {
    return { ...this.current };
  }
}
