/* Contribution City — a tiny software renderer.
   Perspective camera, painter's-algorithm face sorting, flat shading with a
   key light + sky fill + cheap specular, beveled box geometry, fog and
   contact shadows. All on a 2D canvas. No WebGL, no libraries. */

(function (global) {
  'use strict';

  var NEAR = 0.22;
  var HALF = 0.40;                                    // tower half-footprint
  var LEVEL_H = [0.045, 0.36, 0.66, 1.00, 1.42];      // world height per level
  var BG = [24, 29, 34];

  var PALETTES = {
    moss:  { name: 'Moss',  colors: ['#2a3130', '#2f6d4a', '#3f9a5f', '#5cc47a', '#9cf07f'] },
    ember: { name: 'Ember', colors: ['#332e2b', '#77361c', '#b4521e', '#e8873a', '#ffc861'] },
    ice:   { name: 'Ice',   colors: ['#282f36', '#24506c', '#2f80a8', '#4fb3d9', '#a9ecff'] },
    mono:  { name: 'Mono',  colors: ['#2b2e30', '#4a4f52', '#6c7377', '#96a0a6', '#d6dde2'] }
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function createView(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');

    var state = {
      w: 640,
      h: 400,
      dpr: 1,
      cells: [],
      data: null,
      paletteKey: 'moss',
      pal: PALETTES.moss.colors.map(hexToRgb),
      cam: { yaw: 1.75, pitch: 1.02, dist: 150, tx: 0, ty: 0.9, tz: 0, fov: 31 * Math.PI / 180 },
      goal: { yaw: 0.66, pitch: 0.60, dist: 82, tx: 0, ty: 0.9, tz: 0, fov: 31 * Math.PI / 180 },
      params: {
        sunAz: 128,
        sunEl: 52,
        sunStrength: 1,
        heightScale: 1,
        glow: 0.32,
        fog: 0.75,
        wire: false,
        contact: true,
        turntable: false,
        engine: 'eevee',
        city: true,
        floor: true,
        keyLight: true
      },
      mouse: { x: -999, y: -999, inside: false },
      hover: null,
      hoverIndex: -1,
      autoFit: true,
      stats: { verts: 0, faces: 0 },
      fps: 60,
      onHover: null
    };

    var raf = 0;
    var lastTs = 0;
    var shadowSprite = null;
    var glowSprite = null;

    /* ── sprites ─────────────────────────────────────────── */

    function makeShadowSprite() {
      var S = 64;
      var c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext('2d');
      var rad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      rad.addColorStop(0, 'rgba(0,0,0,0.85)');
      rad.addColorStop(0.45, 'rgba(0,0,0,0.45)');
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rad;
      g.fillRect(0, 0, S, S);
      return c;
    }

    function makeGlowSprite() {
      var S = 128;
      var c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext('2d');
      var rad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      rad.addColorStop(0, 'rgba(255,226,180,0.55)');
      rad.addColorStop(0.35, 'rgba(255,196,132,0.18)');
      rad.addColorStop(1, 'rgba(255,180,110,0)');
      g.fillStyle = rad;
      g.fillRect(0, 0, S, S);
      return c;
    }

    /* ── vector helpers ──────────────────────────────────── */

    function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
    function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
    function cross(a, b) {
      return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      };
    }
    function norm(a) {
      var l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1;
      return { x: a.x / l, y: a.y / l, z: a.z / l };
    }

    /* ── camera ──────────────────────────────────────────── */

    function basisFor(yaw, pitch, dist, tx, ty, tz, fov) {
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var pos = {
        x: tx + dist * cp * Math.sin(yaw),
        y: ty + dist * sp,
        z: tz + dist * cp * Math.cos(yaw)
      };
      var fwd = norm({ x: tx - pos.x, y: ty - pos.y, z: tz - pos.z });
      var right = norm(cross(fwd, { x: 0, y: 1, z: 0 }));
      var up = cross(right, fwd);
      var f = (state.h * 0.5) / Math.tan(fov * 0.5);
      return { pos: pos, right: right, up: up, fwd: fwd, f: f, target: { x: tx, y: ty, z: tz } };
    }

    function basis() {
      var c = state.cam;
      return basisFor(c.yaw, c.pitch, c.dist, c.tx, c.ty, c.tz, c.fov);
    }

    function toCam(p, cam) {
      var dx = p.x - cam.pos.x, dy = p.y - cam.pos.y, dz = p.z - cam.pos.z;
      return {
        x: dx * cam.right.x + dy * cam.right.y + dz * cam.right.z,
        y: dx * cam.up.x + dy * cam.up.y + dz * cam.up.z,
        z: dx * cam.fwd.x + dy * cam.fwd.y + dz * cam.fwd.z
      };
    }

    function projectCam(c, cam) {
      if (c.z < NEAR) return null;
      return {
        x: state.w * 0.5 + (c.x / c.z) * cam.f,
        y: state.h * 0.5 - (c.y / c.z) * cam.f,
        z: c.z,
        s: cam.f / c.z
      };
    }

    function project(p, cam) { return projectCam(toCam(p, cam), cam); }

    /* Sutherland–Hodgman against the z = NEAR plane. */
    function clipPoly(pts) {
      var out = [];
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        var ain = a.z >= NEAR, bin = b.z >= NEAR;
        if (ain) out.push(a);
        if (ain !== bin) {
          var t = (NEAR - a.z) / (b.z - a.z);
          out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR });
        }
      }
      return out;
    }

    function clipSeg(a, b) {
      var ain = a.z >= NEAR, bin = b.z >= NEAR;
      if (!ain && !bin) return null;
      if (ain && bin) return [a, b];
      var t = (NEAR - a.z) / (b.z - a.z);
      var p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR };
      return ain ? [a, p] : [p, b];
    }

    function pointInPoly(x, y, pts) {
      var inside = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }

    function lightDir() {
      var az = state.params.sunAz * Math.PI / 180;
      var el = state.params.sunEl * Math.PI / 180;
      return {
        x: Math.cos(el) * Math.sin(az),
        y: Math.sin(el),
        z: Math.cos(el) * Math.cos(az)
      };
    }

    function defaultView() {
      var portrait = state.h > state.w * 1.02;
      return portrait ? { yaw: 1.02, pitch: 0.54 } : { yaw: 0.60, pitch: 0.40 };
    }

    /* Frame the city: project its bounding box, solve for distance so it fills
       the viewport, then nudge the target until the box is centred. */
    function computeFraming() {
      var g = state.goal;
      var B = state.bounds || { minX: -27, maxX: 27, minZ: -3.9, maxZ: 3.9, top: 1.6 };
      var corners = [];
      for (var i = 0; i < 8; i++) {
        corners.push({
          x: (i & 1) ? B.maxX : B.minX,
          y: (i & 4) ? B.top : 0,
          z: (i & 2) ? B.maxZ : B.minZ
        });
      }

      var dist = clamp(g.dist || 70, 24, 300);
      var landed = false;

      for (var pass = 0; pass < 4; pass++) {
        var cam = basisFor(g.yaw, g.pitch, dist, g.tx, g.ty, g.tz, g.fov);
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (var c = 0; c < corners.length; c++) {
          var p = projectCam(toCam(corners[c], cam), cam);
          if (!p) continue;
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        if (!isFinite(minX)) break;

        var portrait = state.h > state.w * 1.02;
        var boxW = maxX - minX, boxH = maxY - minY;
        var sx = boxW / Math.max(180, state.w * (portrait ? 0.86 : 0.97));
        var sy = boxH / Math.max(140, state.h * (portrait ? 0.74 : 0.90));
        dist = clamp(dist * Math.max(sx, sy), 24, 300);

        /* centre the box (converges with the distance solve) */
        var dx = (minX + maxX) / 2 - state.w / 2;
        var dy = (minY + maxY) / 2 - state.h / 2;
        var wpp = dist / cam.f;
        g.tx = clamp(g.tx + cam.right.x * dx * wpp, -34, 34);
        g.tz = clamp(g.tz + cam.right.z * dx * wpp, -20, 20);
        var upY = Math.abs(cam.up.y) < 0.12 ? 0.12 : cam.up.y;
        g.ty = clamp(g.ty - dy * wpp / upY, -4, 8);

        if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(sx - sy) < 0.01) landed = true;
      }

      g.dist = dist;
      return { dist: dist, landed: landed };
    }

    /* ── data ────────────────────────────────────────────── */

    function setData(data) {
      state.data = data;
      var cells = [];
      for (var i = 0; i < data.cells.length; i++) {
        var c = data.cells[i];
        cells.push({
          w: c.w,
          d: c.d,
          x: (c.w - (data.weeks - 1) / 2),
          z: (c.d - 3),
          level: c.level,
          count: c.count,
          inYear: c.inYear,
          future: !c.inYear,
          iso: c.iso,
          label: c.label
        });
      }
      state.cells = cells;
      state.hover = null;
      state.hoverIndex = -1;

      var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, top = 0;
      for (var b = 0; b < cells.length; b++) {
        if (cells[b].future) continue;
        if (cells[b].x < minX) minX = cells[b].x;
        if (cells[b].x > maxX) maxX = cells[b].x;
        if (cells[b].z < minZ) minZ = cells[b].z;
        if (cells[b].z > maxZ) maxZ = cells[b].z;
        var hh = heightOf(cells[b]);
        if (hh > top) top = hh;
      }
      state.bounds = isFinite(minX)
        ? { minX: minX - HALF, maxX: maxX + HALF, minZ: minZ - HALF, maxZ: maxZ + HALF, top: Math.max(top, 0.5) }
        : { minX: -27, maxX: 27, minZ: -3.9, maxZ: 3.9, top: 1.6 };
    }

    function heightOf(cell) {
      if (cell.level === 0) return LEVEL_H[0];
      return LEVEL_H[cell.level] * state.params.heightScale;
    }

    /* ── resize ──────────────────────────────────────────── */

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      if (w === state.w && h === state.h && dpr === state.dpr) return;
      state.w = w;
      state.h = h;
      state.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (state.autoFit) {
        computeFraming();
      }
    }

    /* ── painting: background ────────────────────────────── */

    function paintBackground(cam) {
      var w = state.w, h = state.h;
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2c343b');
      g.addColorStop(0.42, '#212930');
      g.addColorStop(1, '#0e1114');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      var L = lightDir();
      var sun = projectCam(toCam({
        x: cam.pos.x + L.x * 260,
        y: cam.pos.y + L.y * 260,
        z: cam.pos.z + L.z * 260
      }, cam), cam);

      if (sun && state.params.sunStrength > 0.02) {
        var r = Math.max(w, h) * 0.72;
        ctx.globalAlpha = clamp(0.24 * state.params.sunStrength, 0, 0.4);
        ctx.drawImage(glowSprite, sun.x - r, sun.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
    }

    /* ── painting: floor ─────────────────────────────────── */

    function floorPolygon(cam) {
      var gx = 320, gz = 240;
      var corners = [
        { x: -gx, y: 0, z: -gz },
        { x: gx, y: 0, z: -gz },
        { x: gx, y: 0, z: gz },
        { x: -gx, y: 0, z: gz }
      ];
      var camPts = corners.map(function (p) { return toCam(p, cam); });
      var clipped = clipPoly(camPts);
      var out = [];
      for (var i = 0; i < clipped.length; i++) {
        var s = projectCam(clipped[i], cam);
        if (s) out.push(s);
      }
      return out;
    }

    function paintFloor(cam) {
      var poly = floorPolygon(cam);
      if (poly.length < 3) return;

      var g = ctx.createLinearGradient(0, 0, 0, state.h);
      g.addColorStop(0, '#1f262c');
      g.addColorStop(0.34, '#39434b');
      g.addColorStop(0.66, '#262e34');
      g.addColorStop(1, '#14181c');

      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (var i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();

      /* subtle light pool where the sun hits the floor */
      var L = lightDir();
      var spot = project({ x: L.x * 16, y: 0, z: L.z * 16 }, cam);
      if (spot) {
        var r = Math.max(120, state.h * 0.9);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (var q = 1; q < poly.length; q++) ctx.lineTo(poly[q].x, poly[q].y);
        ctx.closePath();
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.12 * state.params.sunStrength;
        ctx.drawImage(glowSprite, spot.x - r, spot.y - r, r * 2, r * 2);
        ctx.restore();
      }

      paintGrid(cam);
    }

    function paintGrid(cam) {
      var xMin = -52, xMax = 52, zMin = -26, zMax = 26;
      ctx.lineWidth = 1;

      function alphaAt(x, z) {
        var r = Math.sqrt(x * x + z * z * 2.6);
        var f = clamp(1 - r / 42, 0, 1);
        return 0.115 * Math.pow(f, 1.35);
      }

      function line(ax, az, bx, bz, alpha) {
        if (alpha < 0.004) return;
        var seg = clipSeg(toCam({ x: ax, y: 0, z: az }, cam), toCam({ x: bx, y: 0, z: bz }, cam));
        if (!seg) return;
        var a = projectCam(seg[0], cam), b = projectCam(seg[1], cam);
        if (!a || !b) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(205,226,234,' + alpha.toFixed(3) + ')';
        ctx.stroke();
      }

      var i;
      for (i = xMin; i <= xMax; i++) line(i, zMin, i, zMax, alphaAt(i, 0));
      for (i = zMin; i <= zMax; i++) line(xMin, i, xMax, i, alphaAt(0, i));
    }

    /* ── painting: shadows ───────────────────────────────── */

    function paintShadows(cam) {
      if (!state.params.contact) return;
      var cells = state.cells;
      var L = lightDir();
      var castRatio = L.y > 0.12 ? Math.min(4.5, 0.9 / L.y) : 0;

      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (cell.level === 0) continue;
        var h = heightOf(cell);

        /* tight contact shadow right under the tower */
        var base = project({ x: cell.x, y: 0, z: cell.z }, cam);
        if (base) {
          var r = Math.max(3, (HALF * 2.05 + cell.level * 0.05) * base.s);
          ctx.globalAlpha = clamp(0.26 + 0.2 * (cell.level / 4), 0, 0.6);
          ctx.drawImage(shadowSprite, base.x - r, base.y - r * 0.46, r * 2, r * 0.92);
        }

        /* cast shadow, thrown away from the key light */
        if (castRatio > 0) {
          var ox = -L.x * h * castRatio;
          var oz = -L.z * h * castRatio;
          var cast = project({ x: cell.x + ox, y: 0, z: cell.z + oz }, cam);
          if (cast) {
            var cr = Math.max(4, (HALF * 2.4 + h * 1.15) * cast.s);
            ctx.globalAlpha = clamp(0.16 + 0.15 * (cell.level / 4), 0, 0.45);
            ctx.drawImage(shadowSprite, cast.x - cr, cast.y - cr * 0.44, cr * 2, cr * 0.88);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    /* ── painting: month labels ──────────────────────────── */

    function paintMonthLabels(cam) {
      if (!state.data) return;
      var marks = state.data.monthMarks || [];
      ctx.font = '500 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = 'rgba(190,205,212,0.42)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (var i = 0; i < marks.length; i++) {
        var x = marks[i].week - (state.data.weeks - 1) / 2;
        var p = project({ x: x, y: 0, z: 4.9 }, cam);
        if (!p) continue;
        ctx.fillText(marks[i].label, p.x, p.y);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    /* ── painting: city ──────────────────────────────────── */

    function paintCity(cam) {
      if (!state.params.city) {
        state.stats.faces = 0;
        return;
      }

      var cells = state.cells;
      var pal = state.pal;
      var L = lightDir();
      var key = state.params.keyLight ? 1 : 0.12;
      var eng = state.params.engine;
      var wire = state.params.wire;
      var cellsCount = cells.length;
      var faces = [];
      var nFaces = 0;

      for (var i = 0; i < cellsCount; i++) {
        var cell = cells[i];
        if (cell.future) continue;
        var h = heightOf(cell);
        var cx = cell.x, cz = cell.z;
        var s = HALF;
        var bevel = Math.min(0.085 * state.params.heightScale, h * 0.32);
        if (cell.level === 0) bevel = h * 0.3;
        var inset = Math.min(0.07, s * 0.3);

        var yMid = h - bevel;
        var sTop = s - inset;

        var bot = [
          { x: cx - s, y: 0, z: cz - s },
          { x: cx + s, y: 0, z: cz - s },
          { x: cx + s, y: 0, z: cz + s },
          { x: cx - s, y: 0, z: cz + s }
        ];
        var mid = [
          { x: cx - s, y: yMid, z: cz - s },
          { x: cx + s, y: yMid, z: cz - s },
          { x: cx + s, y: yMid, z: cz + s },
          { x: cx - s, y: yMid, z: cz + s }
        ];
        var top = [
          { x: cx - sTop, y: h, z: cz - sTop },
          { x: cx + sTop, y: h, z: cz - sTop },
          { x: cx + sTop, y: h, z: cz + sTop },
          { x: cx - sTop, y: h, z: cz + sTop }
        ];

        var center = { x: cx, y: h * 0.5, z: cz };
        var isHover = i === state.hoverIndex;

        for (var f = 0; f < 9; f++) {
          var quad, isTop = false;
          if (f < 4) {
            var j = f;
            quad = [bot[j], bot[(j + 1) % 4], mid[(j + 1) % 4], mid[j]];
          } else if (f < 8) {
            var k = f - 4;
            quad = [mid[k], mid[(k + 1) % 4], top[(k + 1) % 4], top[k]];
          } else {
            quad = [top[0], top[1], top[2], top[3]];
            isTop = true;
          }

          var camQuad = [
            toCam(quad[0], cam), toCam(quad[1], cam),
            toCam(quad[2], cam), toCam(quad[3], cam)
          ];

          /* normal from world-space geometry, flipped outward */
          var nrm = norm(cross(sub(quad[1], quad[0]), sub(quad[2], quad[0])));
          var mid4 = {
            x: (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4,
            y: (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4,
            z: (quad[0].z + quad[1].z + quad[2].z + quad[3].z) / 4
          };
          if (dot(nrm, sub(mid4, center)) < 0) {
            nrm = { x: -nrm.x, y: -nrm.y, z: -nrm.z };
          }

          var centroidCam = toCam(mid4, cam);
          if (centroidCam.z < NEAR - 1) continue;

          var clipped = clipPoly(camQuad);
          if (clipped.length < 3) continue;
          var pts = [];
          var behind = false;
          for (var p = 0; p < clipped.length; p++) {
            var sp = projectCam(clipped[p], cam);
            if (!sp) { behind = true; break; }
            pts.push(sp);
          }
          if (behind || pts.length < 3) continue;

          /* ── shading ─────────────────────────────── */
          var view = norm(sub(cam.pos, mid4));
          var H = norm({ x: L.x + view.x, y: L.y + view.y, z: L.z + view.z });
          var diff = Math.max(0, dot(nrm, L));
          var skyFill = Math.max(0, nrm.y);
          var spec = Math.pow(Math.max(0, dot(nrm, H)), eng === 'cycles' ? 16 : 58);
          var rim = Math.pow(1 - Math.max(0, dot(nrm, view)), 2.5);

          var amb = eng === 'cycles' ? 0.36 : 0.24;
          var k = amb + diff * key * (eng === 'cycles' ? 0.86 : 1.05) +
                  skyFill * (eng === 'cycles' ? 0.20 : 0.11) * state.params.sunStrength;
          k *= 0.82 + 0.18 * clamp(mid4.y / 1.6, 0, 1);
          if (cell.level === 0) k *= 0.56;
          if (isHover) k *= 1.1;

          var base = pal[cell.level] || pal[0];
          var specAmp = (eng === 'cycles' ? 0.26 : 0.38) * state.params.sunStrength;
          if (cell.level === 0) specAmp *= 0.15;
          var rimAmp = eng === 'cycles' ? 0.24 : 0.14;

          var em = state.params.glow * (cell.level / 4);
          var emit = isTop ? em * 0.55 : em * 0.1;

          var r = base[0] * k + 255 * spec * specAmp + 150 * rim * rimAmp + pal[4][0] * emit * 0.5;
          var gg = base[1] * k + 255 * spec * specAmp + 170 * rim * rimAmp + pal[4][1] * emit * 0.5;
          var bb = base[2] * k + 255 * spec * specAmp + 190 * rim * rimAmp + pal[4][2] * emit * 0.5;

          /* fog into the background */
          var fogAmt = clamp((centroidCam.z - 42) / 120, 0, 1) * state.params.fog * 0.85;
          r += (BG[0] - r) * fogAmt;
          gg += (BG[1] - gg) * fogAmt;
          bb += (BG[2] - bb) * fogAmt;

          r = clamp(r, 0, 255) | 0;
          gg = clamp(gg, 0, 255) | 0;
          bb = clamp(bb, 0, 255) | 0;

          var fill = wire ? 'rgba(13,17,20,0.78)' : 'rgb(' + r + ',' + gg + ',' + bb + ')';
          var stroke = wire
            ? 'rgba(124,214,158,0.42)'
            : 'rgba(0,0,0,0.28)';

          faces.push({
            pts: pts,
            z: centroidCam.z,
            fill: fill,
            stroke: stroke,
            hover: isHover
          });
          nFaces++;
        }
      }

      faces.sort(function (a, b) { return b.z - a.z; });

      var accent = state.pal[3];
      for (var n = 0; n < faces.length; n++) {
        var face = faces[n];
        var pts2 = face.pts;
        ctx.beginPath();
        ctx.moveTo(pts2[0].x, pts2[0].y);
        for (var m = 1; m < pts2.length; m++) ctx.lineTo(pts2[m].x, pts2[m].y);
        ctx.closePath();
        ctx.fillStyle = face.fill;
        ctx.fill();
        ctx.lineWidth = face.hover ? 1.2 : 0.75;
        ctx.strokeStyle = face.hover
          ? 'rgba(' + accent[0] + ',' + accent[1] + ',' + accent[2] + ',0.9)'
          : face.stroke;
        ctx.stroke();
      }

      state.stats.faces = nFaces;
      state.stats.verts = cellsCount * 12;
    }

    function paintVignette() {
      var w = state.w, h = state.h;
      var g = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.22,
                                      w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.65, 'rgba(0,0,0,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      /* warm horizon haze so the floor edge reads as atmosphere, not a seam */
      var hz = ctx.createLinearGradient(0, h * 0.20, 0, h * 0.62);
      hz.addColorStop(0, 'rgba(120,150,160,0)');
      hz.addColorStop(0.55, 'rgba(120,150,160,0.05)');
      hz.addColorStop(1, 'rgba(120,150,160,0)');
      ctx.fillStyle = hz;
      ctx.fillRect(0, 0, w, h * 0.7);
    }

    /* ── picking ─────────────────────────────────────────── */

    function pick(cam) {
      if (!state.mouse.inside) return -1;
      var mx = state.mouse.x, my = state.mouse.y;
      var best = -1, bestZ = Infinity;
      var cells = state.cells;

      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (cell.future) continue;
        var h = heightOf(cell);
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        var zSum = 0, ok = true;

        for (var c = 0; c < 8; c++) {
          var x = cell.x + ((c & 1) ? HALF : -HALF);
          var z = cell.z + ((c & 2) ? HALF : -HALF);
          var y = (c & 4) ? h : 0;
          var p = project({ x: x, y: y, z: z }, cam);
          if (!p) { ok = false; break; }
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
          zSum += p.z;
        }
        if (!ok) continue;

        if (mx >= minX - 1 && mx <= maxX + 1 && my >= minY - 1 && my <= maxY + 1) {
          var z = zSum / 8;
          if (z < bestZ) { bestZ = z; best = i; }
        }
      }
      return best;
    }

    /* ── frame ───────────────────────────────────────────── */

    function drawFrame() {
      resize();
      var cam = basis();

      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      paintBackground(cam);
      if (state.params.floor) {
        paintFloor(cam);
        paintShadows(cam);
        paintMonthLabels(cam);
      }

      var hoveredIndex = pick(cam);
      if (hoveredIndex !== state.hoverIndex) {
        state.hoverIndex = hoveredIndex;
        state.hover = hoveredIndex >= 0 ? state.cells[hoveredIndex] : null;
        if (state.onHover) state.onHover(state.hover);
      }

      paintCity(cam);
      paintVignette();

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ── camera control ──────────────────────────────────── */

    function stepCamera(dt) {
      if (state.params.turntable) {
        state.goal.yaw += dt * 0.26;
      }
      var k = Math.min(1, dt * 7.5);
      var c = state.cam, g = state.goal;
      c.yaw += (g.yaw - c.yaw) * k;
      c.pitch += (g.pitch - c.pitch) * k;
      c.dist += (g.dist - c.dist) * k;
      c.tx += (g.tx - c.tx) * k;
      c.ty += (g.ty - c.ty) * k;
      c.tz += (g.tz - c.tz) * k;
      c.fov += (g.fov - c.fov) * k;
    }

    function loop(ts) {
      var dt = lastTs ? Math.min(0.06, (ts - lastTs) / 1000) : 0.016;
      lastTs = ts;
      if (dt > 0) state.fps = state.fps * 0.92 + (1 / dt) * 0.08;
      stepCamera(dt);
      drawFrame();
      raf = global.requestAnimationFrame(loop);
    }

    /* ── public API ──────────────────────────────────────── */

    var api = {
      state: state,

      start: function () {
        shadowSprite = shadowSprite || makeShadowSprite();
        glowSprite = glowSprite || makeGlowSprite();
        resize();
        var dv = defaultView();
        state.goal.yaw = dv.yaw;
        state.goal.pitch = dv.pitch;
        computeFraming();
        state.cam.dist = state.goal.dist * 1.75;
        state.cam.pitch = 1.18;
        state.cam.yaw = state.goal.yaw - 1.1;
        if (!raf) raf = global.requestAnimationFrame(loop);
      },

      stop: function () {
        if (raf) global.cancelAnimationFrame(raf);
        raf = 0;
      },

      resize: resize,
      setData: setData,

      refit: function () {
        if (state.autoFit) computeFraming();
      },

      setParam: function (key, value) {
        if (!(key in state.params)) return;
        state.params[key] = value;
      },

      getParam: function (key) { return state.params[key]; },

      setPalette: function (key) {
        if (!PALETTES[key]) return;
        state.paletteKey = key;
        state.pal = PALETTES[key].colors.map(hexToRgb);
      },

      orbit: function (dyaw, dpitch) {
        state.goal.yaw += dyaw;
        state.goal.pitch = clamp(state.goal.pitch + dpitch, 0.1, 1.44);
      },

      pan: function (dxPx, dyPx) {
        var cam = basis();
        var per = state.goal.dist / cam.f;
        var rx = cam.right.x, rz = cam.right.z;
        var fx = cam.fwd.x, fz = cam.fwd.z;
        var groundLen = Math.sqrt(fx * fx + fz * fz) || 1;
        fx /= groundLen; fz /= groundLen;
        state.goal.tx = clamp(state.goal.tx - rx * dxPx * per + fx * dyPx * per, -26, 26);
        state.goal.tz = clamp(state.goal.tz - rz * dxPx * per + fz * dyPx * per, -16, 16);
      },

      zoom: function (factor) {
        state.autoFit = false;
        state.goal.dist = clamp(state.goal.dist * factor, 24, 250);
      },

      preset: function (name) {
        var g = state.goal;
        if (name === 'iso') { var d = defaultView(); g.yaw = d.yaw; g.pitch = d.pitch; }
        else if (name === 'front') { g.yaw = 0; g.pitch = 0.22; }
        else if (name === 'top') { g.yaw = 0; g.pitch = 1.42; }
        else if (name === 'side') { g.yaw = Math.PI / 2; g.pitch = 0.3; }
        state.autoFit = true;
        g.tx = 0; g.tz = 0; g.ty = 1.0;
        computeFraming();
      },

      setMouse: function (x, y, inside) {
        state.mouse.x = x;
        state.mouse.y = y;
        state.mouse.inside = inside;
      },

      setHoverCallback: function (fn) { state.onHover = fn; },

      snapshot: function () {
        try { return canvas.toDataURL('image/png'); } catch (e) { return null; }
      },

      getStats: function () {
        return {
          verts: state.stats.verts,
          faces: state.stats.faces,
          fps: Math.round(state.fps),
          hover: state.hover
        };
      },

      getData: function () { return state.data; }
    };

    return api;
  }

  global.ContributionView = { create: createView, PALETTES: PALETTES };
})(typeof window !== 'undefined' ? window : this);
