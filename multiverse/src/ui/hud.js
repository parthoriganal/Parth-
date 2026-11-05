// AETHERBOUND — the interface. A quiet, film-festival HUD over the frame.

import { clamp, formatTime } from '../core/math.js';

export class Hud {
  constructor({ chapters, duration, elements }) {
    this.chapters = chapters;
    this.duration = duration;
    this.el = elements;
    this.currentChapter = -1;
    this.lastSecond = -1;
    this.captionToken = 0;
    this.toastTimer = 0;
    this.endTimer = 0;
    this.started = false;
    this.ended = false;
    this.playing = false;
    this.muted = false;
    this.seeking = false;
    this.onSeek = null;
    this.build();
  }

  build() {
    const { chapterStrip, coverChapters, timelineTicks } = this.el;

    this.chapterButtons = this.chapters.map((ch, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chapter-btn';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', 'false');
      b.innerHTML = `<span class="num">${ch.num}</span>${ch.title}`;
      b.addEventListener('click', () => {
        if (this.onChapter) this.onChapter(i);
      });
      chapterStrip.appendChild(b);
      return b;
    });

    this.coverButtons = this.chapters.map((ch, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cover-chapter';
      b.innerHTML = `<span class="num">${ch.num}</span>${ch.title}`;
      b.title = `Begin at ${ch.title}`;
      b.addEventListener('click', () => {
        if (this.onChapter) this.onChapter(i);
      });
      coverChapters.appendChild(b);
      return b;
    });

    this.ticks = this.chapters.map((ch, i) => {
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.style.left = `${(ch.start / this.duration) * 100}%`;
      timelineTicks.appendChild(tick);
      return tick;
    });

    this.el.timeTotal.textContent = formatTime(this.duration);
    this.el.playBtn.addEventListener('click', () => {
      if (this.onToggle) this.onToggle();
    });
    this.el.restartBtn.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
    this.el.soundBtn.addEventListener('click', () => {
      if (this.onSound) this.onSound();
    });
    this.el.coverSoundBtn.addEventListener('click', () => {
      if (this.onSound) this.onSound();
    });
    this.el.fullBtn.addEventListener('click', () => {
      if (this.onFullscreen) this.onFullscreen();
    });
    this.el.startBtn.addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
    this.el.replayBtn.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });

    this.bindTimeline();
  }

  bindTimeline() {
    const el = this.el.timeline;
    const seekFromEvent = (clientX) => {
      const rect = el.getBoundingClientRect();
      const p = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      if (this.onSeek) this.onSeek(p * this.duration, false);
    };
    el.addEventListener('pointerdown', (e) => {
      this.seeking = true;
      el.setPointerCapture?.(e.pointerId);
      seekFromEvent(e.clientX);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.seeking) seekFromEvent(e.clientX);
    });
    const end = (e) => {
      if (!this.seeking) return;
      this.seeking = false;
      try { el.releasePointerCapture?.(e.pointerId); } catch (err) { /* no-op */ }
      if (this.onSeek) this.onSeek(this.lastSeekTime ?? 0, true);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (this.onSeek) this.onSeek(clamp(this.lastSeekTime + step, 0, this.duration), true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (this.onSeek) this.onSeek(clamp(this.lastSeekTime - step, 0, this.duration), true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (this.onSeek) this.onSeek(0, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (this.onSeek) this.onSeek(this.duration, true);
      }
    });
  }

  setCallbacks(cb) {
    Object.assign(this, cb);
  }

  setLoadProgress(p, label) {
    const pct = Math.round(clamp(p, 0, 1) * 100);
    this.el.coverLoaderFill.style.width = `${pct}%`;
    if (label) this.el.coverLoadingText.textContent = label;
  }

  setReady() {
    this.el.app.classList.add('is-ready');
    this.el.startBtn.disabled = false;
    this.setLoadProgress(1, 'Ready');
  }

  setStarted(started) {
    this.started = started;
    this.el.app.dataset.started = String(started);
  }

  beginFilm() {
    this.setStarted(true);
    this.el.cover.classList.add('is-hidden');
    this.setChapter(0, true);
    this.setPlaying(true);
    window.setTimeout(() => {
      this.el.cover.style.display = 'none';
    }, 1250);
  }

  setPlaying(playing) {
    this.playing = playing;
    this.el.app.classList.toggle('is-paused', !playing);
    this.el.playBtn.setAttribute('aria-label', playing ? 'Pause sequence' : 'Play sequence');
    this.el.playBtn.title = playing ? 'Pause (Space)' : 'Play (Space)';
  }

  setChapter(index, immediate = false) {
    const ch = this.chapters[index];
    if (!ch) return;
    this.currentChapter = index;
    this.el.app.style.setProperty('--accent', ch.accent);
    this.el.app.style.setProperty('--accent-rgb', ch.accentRgb);

    this.chapterButtons.forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      b.setAttribute('aria-selected', String(i === index));
    });

    const apply = () => {
      this.el.captionNum.textContent = ch.num;
      this.el.captionTitle.textContent = ch.title;
      this.el.captionDesc.textContent = ch.desc;
      this.el.caption.classList.add('is-visible');
    };

    this.captionToken++;
    const token = this.captionToken;
    if (immediate) {
      apply();
      return;
    }
    this.el.caption.classList.remove('is-visible');
    window.setTimeout(() => {
      if (token !== this.captionToken) return;
      apply();
    }, 320);
  }

  setProgress(time, chapterIndex) {
    const p = clamp(time / this.duration, 0, 1);
    this.el.timelineFill.style.width = `${p * 100}%`;
    this.el.timelineHead.style.left = `${p * 100}%`;
    this.lastSeekTime = time;

    const sec = Math.floor(time);
    if (sec !== this.lastSecond) {
      this.lastSecond = sec;
      this.el.timeNow.textContent = formatTime(time);
      this.el.timeline.setAttribute('aria-valuenow', String(Math.round(time)));
      this.el.timeline.setAttribute('aria-valuetext', `${formatTime(time)} of ${formatTime(this.duration)}`);
    }

    this.ticks.forEach((tick, i) => {
      tick.classList.toggle('is-past', time >= this.chapters[i].start);
    });

    if (chapterIndex !== this.currentChapter) this.setChapter(chapterIndex, false);
  }

  update(state) {
    this.setProgress(state.time, state.chapterIndex);
  }

  setMuted(muted) {
    this.muted = muted;
    const on = !muted;
    this.el.soundBtn.setAttribute('aria-pressed', String(on));
    this.el.soundBtn.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
    this.el.soundBtn.title = on ? 'Sound on (M)' : 'Sound off (M)';
    this.el.coverSoundBtn.setAttribute('aria-pressed', String(on));
    this.el.coverSoundLabel.textContent = on ? 'Sound on' : 'Sound off';
  }

  showEndCard() {
    if (this.ended) return;
    this.ended = true;
    this.el.app.dataset.ended = 'true';
    this.el.endcard.hidden = false;
    // force a frame so the CSS transition runs
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.el.endcard.classList.add('is-visible'));
    });
  }

  hideEndCard() {
    this.ended = false;
    this.el.app.dataset.ended = 'false';
    this.el.endcard.classList.remove('is-visible');
    window.clearTimeout(this.endTimer);
    this.endTimer = window.setTimeout(() => {
      if (!this.ended) this.el.endcard.hidden = true;
    }, 1400);
  }

  toast(message) {
    this.el.toast.textContent = message;
    this.el.toast.classList.add('is-visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.el.toast.classList.remove('is-visible');
    }, 2600);
  }

  setIdle(idle) {
    this.el.app.classList.toggle('is-idle', idle);
  }

  showFallback() {
    this.el.cover.style.display = 'none';
    this.el.fallback.hidden = false;
    this.el.app.dataset.started = 'false';
  }

  setQualityLabel(label) {
    if (this.el.qualityLabel) this.el.qualityLabel.textContent = label;
  }
}
