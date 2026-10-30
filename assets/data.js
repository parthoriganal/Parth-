/* Contribution City — deterministic fake contribution calendar.
   Every username + year seeds a stable city, so the same @handle always
   builds the same skyline (no network, no tokens, no API limits). */

(function (global) {
  'use strict';

  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WEEKS = 53;

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function levelOf(count) {
    if (count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
  }

  function isoDate(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function prettyDate(d) {
    return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function generate(username, year) {
    username = (username || 'octocat').replace(/^@+/, '').trim().toLowerCase() || 'octocat';
    year = Number(year) || new Date().getFullYear();

    var rand = mulberry32(hashString(username + '|' + year + '|city'));

    /* Personality dials, drawn once from the seed. */
    var diligence = 0.68 + rand() * 0.28;         // how often they show up
    var intensity = 0.70 + rand() * 0.85;         // commits per active day
    var weekendWarrior = rand() > 0.62;           // weekend habits
    var nightOwl = rand();                        // seeds the seasonal drift
    var vacationCount = 1 + Math.floor(rand() * 4);

    var weekdayFactor = weekendWarrior
      ? [0.78, 0.95, 1.0, 0.97, 0.95, 0.98, 0.86]
      : [0.42, 1.02, 1.06, 1.02, 0.98, 0.86, 0.58];

    /* Vacations: contiguous zero-ish stretches. */
    var OFF = new Uint8Array(WEEKS * 7);
    for (var v = 0; v < vacationCount; v++) {
      var start = Math.floor(rand() * WEEKS * 7);
      var len = 3 + Math.floor(rand() * 13);
      for (var k = 0; k < len; k++) {
        var idx = start + k;
        if (idx < OFF.length) OFF[idx] = 1;
      }
    }

    /* Sprints: 2–3 stretches where the user is on fire. */
    var SPRINT = new Float32Array(WEEKS * 7).fill(1);
    var sprints = 2 + Math.floor(rand() * 2);
    for (var sp = 0; sp < sprints; sp++) {
      var sStart = Math.floor(rand() * WEEKS);
      var sLen = 2 + Math.floor(rand() * 4);
      for (var sw = sStart; sw < Math.min(WEEKS, sStart + sLen); sw++) {
        for (var sd = 0; sd < 7; sd++) {
          SPRINT[sw * 7 + sd] = 1.7;
        }
      }
    }

    /* Calendar: GitHub columns start on a Sunday on or before Jan 1. */
    var jan1 = new Date(year, 0, 1);
    var gridStart = new Date(year, 0, 1);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    var today = new Date();
    today.setHours(23, 59, 59, 999);

    var cells = [];
    var total = 0, activeDays = 0, longest = 0, streak = 0;
    var lastDataWeek = 0;
    var best = null;
    var monthMarks = [];
    var seenMonth = -1;

    for (var w = 0; w < WEEKS; w++) {
      for (var d = 0; d < 7; d++) {
        var date = new Date(gridStart);
        date.setDate(gridStart.getDate() + w * 7 + d);

        var inYear = date.getFullYear() === year && date <= today;
        var month = date.getMonth();
        if (inYear) lastDataWeek = Math.max(lastDataWeek, w);
        var count = 0;

        if (inYear) {
          var season = 0.88 + 0.16 * Math.sin((month / 12) * Math.PI * 2 + nightOwl * 6.2);
          var hype = 0.96 + 0.18 * Math.sin(w * 0.41 + nightOwl * 9.1) + 0.12 * Math.sin(w * 0.13 + 2.7);
          var p = diligence * weekdayFactor[d] * season * hype * SPRINT[w * 7 + d];
          if (OFF[w * 7 + d]) p *= 0.06;
          p = Math.max(0, Math.min(0.985, p));

          if (rand() < p) {
            /* piecewise day shape: mostly small days, a handful of towers */
            var roll = rand();
            var base;
            if (roll < 0.26) base = 1 + Math.floor(rand() * 2);
            else if (roll < 0.62) base = 3 + Math.floor(rand() * 3);
            else if (roll < 0.87) base = 6 + Math.floor(rand() * 4);
            else base = 10 + Math.floor(rand() * rand() * 19);
            count = Math.max(1, Math.round(base * intensity * 0.85));
            if (rand() < 0.012) count += 9 + Math.floor(rand() * 26); // a very big day
          }

          if (count > 0) {
            activeDays++;
            streak++;
            if (streak > longest) longest = streak;
            if (!best || count > best.count) best = { count: count, date: new Date(date) };
          } else {
            streak = 0;
          }
          total += count;
        }

        if (d === 0 && month !== seenMonth) {
          if (w > 0) monthMarks.push({ week: w, label: MONTH_NAMES[month] });
          seenMonth = month;
        }


        cells.push({
          w: w,
          d: d,
          count: count,
          level: levelOf(count),
          inYear: inYear,
          iso: isoDate(date),
          date: date,
          label: prettyDate(date)
        });
      }
    }

    return {
      username: username,
      year: year,
      cells: cells,
      weeks: WEEKS,
      total: total,
      activeDays: activeDays,
      longestStreak: longest,
      best: best,
      monthMarks: monthMarks.filter(function (m) { return m.week <= lastDataWeek; }),
      lastDataWeek: lastDataWeek,
      startedOn: jan1
    };
  }

  global.ContributionData = {
    generate: generate,
    levelOf: levelOf,
    MONTH_NAMES: MONTH_NAMES,
    DAY_NAMES: DAY_NAMES
  };
})(window);
