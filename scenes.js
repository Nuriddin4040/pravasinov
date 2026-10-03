// Иллюстрации-схемы к вопросам без дорожного знака (перекрёстки, светофор, регулировщик,
// обгон, первая помощь и т.д.). Нарисованы с нуля для этого приложения, в стиле схем
// из экзаменационных билетов: вид сверху, синяя машина — «вы», жёлтая — другой участник.
// Схема иллюстрирует ситуацию из вопроса и не подсказывает ответ.
// Добавляются в общий словарь window.SIGN_ICONS с ключами "scene_*".
(function (global) {
  const C = {
    grass: "#1d3528", card: "#1b2a36", road: "#3d4955", walk: "#5c6874", line: "#e9eef2",
    me: "#3aa1ff", oth: "#f5b83d", oth2: "#f66271", red: "#e5342b", yel: "#ffd21f",
    grn: "#34d399", white: "#ffffff", ink: "#0d1620", amber: "#ffae1a", off: "#2b3742",
    uniform: "#2d4a7a", night: "#0e1822", skin: "#f1c9a5",
  };
  const W = 240, H = 140;
  let uid = 0;
  function wrap(inner, bg = C.grass) {
    const id = "scl" + (++uid);
    return `<svg class="scene" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><clipPath id="${id}"><rect width="${W}" height="${H}" rx="14"/></clipPath></defs>` +
      `<g clip-path="url(#${id})"><rect width="${W}" height="${H}" fill="${bg}"/>${inner}</g></svg>`;
  }

  // ---------- детали ----------
  const dash = (x1, y1, x2, y2, c = C.line) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2" stroke-dasharray="9 7"/>`;
  const solid = (x1, y1, x2, y2, c = C.line, w = 2.4) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"/>`;
  const blink = (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${C.amber}" opacity=".35"/><circle cx="${x}" cy="${y}" r="2.6" fill="${C.amber}"/>`;

  // Машина сверху: (x,y) — центр, rot — поворот в градусах (0 = едет вверх, 90 = вправо)
  function car(x, y, rot = 0, color = C.me, o = {}) {
    let s = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
    if (o.beam === "low") s += `<polygon points="-7,-14 7,-14 17,-44 -17,-44" fill="${C.yel}" opacity=".28"/>`;
    if (o.beam === "high") s += `<polygon points="-7,-14 7,-14 26,-96 -26,-96" fill="${C.yel}" opacity=".3"/>`;
    s += `<rect x="-8.5" y="-14" width="17" height="28" rx="5" fill="${color}"/>`;
    s += `<rect x="-6.5" y="-8.5" width="13" height="6" rx="2" fill="${C.ink}" opacity=".7"/>`;
    s += `<rect x="-6.5" y="6" width="13" height="4" rx="1.5" fill="${C.ink}" opacity=".5"/>`;
    if (o.left || o.hazard) s += blink(-7.5, -13);
    if (o.right || o.hazard) s += blink(7.5, -13);
    if (o.hazard) s += blink(-7.5, 13) + blink(7.5, 13);
    if (o.ambulance) s += `<rect x="-2" y="-1" width="4" height="12" fill="${C.red}"/><rect x="-6" y="3" width="12" height="4" fill="${C.red}"/>` +
      `<circle cx="-4" cy="-4" r="6" fill="#2f7bff" opacity=".45"/><circle cx="4" cy="-4" r="6" fill="#2f7bff" opacity=".45"/>` +
      `<rect x="-6" y="-6" width="5" height="3" fill="#5aa2ff"/><rect x="1" y="-6" width="5" height="3" fill="#5aa2ff"/>`;
    return s + `</g>`;
  }
  function truck(x, y, rot = 0, color = "#9aa6b2", o = {}) {
    let s = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
    s += `<rect x="-10" y="-28" width="20" height="14" rx="4" fill="${color}"/>`;
    s += `<rect x="-8" y="-25" width="16" height="5" rx="1.5" fill="${C.ink}" opacity=".7"/>`;
    if (o.bed) {
      s += `<rect x="-10" y="-12" width="20" height="38" rx="2" fill="none" stroke="${color}" stroke-width="3"/><rect x="-8.5" y="-10.5" width="17" height="35" fill="#26313b"/>`;
    } else {
      s += `<rect x="-11" y="-12" width="22" height="40" rx="2" fill="#c3ccd4"/>`;
    }
    return s + `</g>`;
  }
  function bus(x, y, rot = 0, o = {}) {
    let s = `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-10" y="-30" width="20" height="60" rx="5" fill="#e3e8ec"/>`;
    s += `<rect x="-8" y="-26" width="16" height="6" rx="2" fill="${C.ink}" opacity=".7"/>`;
    for (let i = 0; i < 4; i++) s += `<rect x="-8" y="${-15 + i * 11}" width="16" height="6" rx="1.5" fill="#9fb3c4"/>`;
    if (o.hazard) s += blink(-8.5, -29) + blink(8.5, -29) + blink(-8.5, 29) + blink(8.5, 29);
    return s + `</g>`;
  }
  // Стрелка траектории: путь d, наконечник в (ex,ey) под углом ang (0 = вправо, 90 = вниз)
  function arrow(d, ex, ey, ang, c = C.white) {
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.4" stroke-dasharray="6 4" stroke-linecap="round"/>` +
      `<polygon points="2,0 -8,-5 -8,5" fill="${c}" transform="translate(${ex} ${ey}) rotate(${ang})"/>`;
  }
  // Размерная линия со стрелками на концах
  function dim(x1, y1, x2, y2, c = C.yel) {
    const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2"/>` +
      `<polygon points="0,0 -7,-4 -7,4" fill="${c}" transform="translate(${x2} ${y2}) rotate(${ang})"/>` +
      `<polygon points="0,0 -7,-4 -7,4" fill="${c}" transform="translate(${x1} ${y1}) rotate(${ang + 180})"/>`;
  }
  // Пешеход сбоку (s — масштаб)
  function person(x, y, s = 0.7, c = "#f4f6f8", cane = false) {
    const body = (col, w, r) => `<g fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round">` +
      `<circle cx="0" cy="-14" r="${r}" fill="${col}" stroke="none"/>` +
      `<line x1="0" y1="-8" x2="0" y2="8"/><line x1="0" y1="-3" x2="-9" y2="3"/><line x1="0" y1="-3" x2="9" y2="-2"/>` +
      `<line x1="0" y1="8" x2="-7" y2="18"/><line x1="0" y1="8" x2="6" y2="18"/></g>`;
    return `<g transform="translate(${x} ${y}) scale(${s})">` + body(C.ink, 7.5, 6.8) + body(c, 4, 5) +
      (cane ? `<line x1="9" y1="-2" x2="19" y2="19" stroke="#ffffff" stroke-width="2.5"/><line x1="15" y1="11" x2="19" y2="19" stroke="${C.red}" stroke-width="2.5"/>` : "") +
      `</g>`;
  }
  function warnTri(x, y, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><polygon points="0,-11 10,7 -10,7" fill="none" stroke="${C.red}" stroke-width="3.2" stroke-linejoin="round"/></g>`;
  }
  function zebraV(x1, x2, y1, y2) { // переход через вертикальную дорогу (полосы вдоль движения)
    let s = "";
    for (let x = x1 + 3; x + 6 <= x2; x += 12) s += `<rect x="${x}" y="${y1}" width="6" height="${y2 - y1}" fill="${C.line}"/>`;
    return s;
  }
  function zebraH(x1, x2, y1, y2) { // переход через горизонтальную дорогу
    let s = "";
    for (let y = y1 + 3; y + 6 <= y2; y += 12) s += `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="6" fill="${C.line}"/>`;
    return s;
  }
  // Перекрёсток: горизонтальная дорога y 48–92, вертикальная x 98–142
  function crossroads() {
    return `<rect x="0" y="48" width="${W}" height="44" fill="${C.road}"/><rect x="98" y="0" width="44" height="${H}" fill="${C.road}"/>` +
      dash(0, 70, 92, 70) + dash(148, 70, W, 70) + dash(120, 0, 120, 42) + dash(120, 98, 120, H);
  }
  // Горизонтальная дорога y1–y2; lanes — разделители полос: [y, "dash"|"solid"]
  function roadH(y1, y2, lanes = []) {
    let s = `<rect x="0" y="${y1}" width="${W}" height="${y2 - y1}" fill="${C.road}"/>`;
    lanes.forEach(([y, kind]) => { s += kind === "solid" ? solid(0, y, W, y) : dash(0, y, W, y); });
    return s;
  }
  // Светофор: (x,y) — левый верхний угол, s — масштаб; on: "red"|"yellow"|"green", flash — мигает
  function tlight(x, y, on, flash = false, s = 1) {
    const col = { red: C.red, yellow: C.yel, green: C.grn };
    let g = `<g transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="0" width="32" height="88" rx="8" fill="#141c23" stroke="#3a4651" stroke-width="2"/>`;
    ["red", "yellow", "green"].forEach((k, i) => {
      const cy = 16 + i * 28;
      if (k === on) {
        g += `<circle cx="16" cy="${cy}" r="12" fill="${col[k]}" opacity=".3"/><circle cx="16" cy="${cy}" r="9.5" fill="${col[k]}"/>`;
        if (flash) [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1.4, 0], [1.4, 0]].forEach(([dx, dy]) => {
          g += `<line x1="${16 + dx * 15}" y1="${cy + dy * 12}" x2="${16 + dx * 21}" y2="${cy + dy * 16}" stroke="${col[k]}" stroke-width="2.5" stroke-linecap="round"/>`;
        });
      } else g += `<circle cx="16" cy="${cy}" r="9.5" fill="${C.off}"/>`;
    });
    return g + `</g>`;
  }
  // Регулировщик сверху: плечи развёрнуты под углом ang (0 = руки влево-вправо)
  function officerTop(x, y, ang) {
    return `<g transform="translate(${x} ${y}) rotate(${ang}) scale(1.55)">` +
      `<line x1="-22" y1="0" x2="22" y2="0" stroke="${C.uniform}" stroke-width="5.5" stroke-linecap="round"/>` +
      `<circle cx="-22" cy="0" r="3" fill="${C.skin}"/><circle cx="22" cy="0" r="3" fill="${C.skin}"/>` +
      `<line x1="22" y1="0" x2="34" y2="0" stroke="#fff" stroke-width="3"/><line x1="26" y1="0" x2="30" y2="0" stroke="${C.ink}" stroke-width="3"/>` +
      `<ellipse cx="0" cy="0" rx="10" ry="7" fill="${C.uniform}"/><circle cx="0" cy="0" r="6" fill="#f2f4f6"/><circle cx="0" cy="0" r="2.4" fill="${C.red}"/></g>`;
  }
  // Регулировщик спереди; armUp — правая рука с жезлом поднята вверх
  function officerFront(x, y, armUp) {
    let s = `<g transform="translate(${x} ${y})">`;
    s += `<rect x="-11" y="-6" width="22" height="34" rx="6" fill="${C.uniform}"/>`;
    s += `<rect x="-11" y="12" width="22" height="4" fill="#f2f4f6"/>`;
    s += `<rect x="-9" y="27" width="7" height="26" rx="3" fill="#22385c"/><rect x="2" y="27" width="7" height="26" rx="3" fill="#22385c"/>`;
    s += `<circle cx="0" cy="-15" r="8" fill="${C.skin}"/><rect x="-10" y="-26" width="20" height="7" rx="3" fill="#f2f4f6"/><rect x="-12" y="-20" width="24" height="3" rx="1.5" fill="${C.ink}"/>`;
    if (armUp) {
      s += `<line x1="9" y1="-2" x2="13" y2="-36" stroke="${C.uniform}" stroke-width="6" stroke-linecap="round"/><circle cx="13" cy="-38" r="3.4" fill="${C.skin}"/>`;
      s += `<line x1="13" y1="-40" x2="13" y2="-58" stroke="#fff" stroke-width="4"/><line x1="13" y1="-46" x2="13" y2="-51" stroke="${C.ink}" stroke-width="4"/>`;
      s += `<line x1="-9" y1="-2" x2="-13" y2="24" stroke="${C.uniform}" stroke-width="6" stroke-linecap="round"/>`;
    } else {
      s += `<line x1="-9" y1="-2" x2="-44" y2="-2" stroke="${C.uniform}" stroke-width="6" stroke-linecap="round"/><line x1="9" y1="-2" x2="44" y2="-2" stroke="${C.uniform}" stroke-width="6" stroke-linecap="round"/>`;
      s += `<line x1="46" y1="-2" x2="64" y2="-2" stroke="#fff" stroke-width="4"/><line x1="52" y1="-2" x2="57" y2="-2" stroke="${C.ink}" stroke-width="4"/>`;
    }
    return s + `</g>`;
  }
  // Кольцо: центр (120,64), полоса 24 px вокруг радиуса 34, 4 въезда шириной 24
  function ring() {
    return `<rect x="108" y="0" width="24" height="${H}" fill="${C.road}"/><rect x="0" y="52" width="${W}" height="24" fill="${C.road}"/>` +
      `<circle cx="120" cy="64" r="34" fill="none" stroke="${C.road}" stroke-width="24"/>` +
      `<circle cx="120" cy="64" r="22" fill="#24442f" stroke="${C.line}" stroke-width="1.5"/>` +
      `<circle cx="120" cy="64" r="34" fill="none" stroke="${C.line}" stroke-width="1.6" stroke-dasharray="6 6"/>`;
  }
  const onRing = (theta, r) => [120 + r * Math.cos(theta * Math.PI / 180), 64 + r * Math.sin(theta * Math.PI / 180)];

  // ---------- сцены ----------
  const S = {};

  S.cross_equal = wrap(crossroads() +
    arrow("M131 100 L131 22", 131, 22, -90) + arrow("M186 59 L62 59", 62, 59, 180) +
    car(131, 116, 0) + car(206, 59, -90, C.oth));

  S.left_turn = wrap(crossroads() +
    arrow("M131 100 Q131 59 70 59", 70, 59, 180) + arrow("M109 38 L109 124", 109, 124, 90) +
    car(131, 116, 0, C.me, { left: true }) + car(109, 22, 180, C.oth));

  S.roundabout_enter = (() => {
    const [ox, oy] = onRing(150, 40);
    return wrap(ring() + arrow("M127 108 Q127 92 142 92", 145, 91, -25) +
      car(ox, oy, 150, C.oth) + car(127, 124, 0, C.me));
  })();

  S.roundabout_exit = (() => {
    const [x, y] = onRing(55, 40);
    return wrap(ring() + arrow("M150 86 Q166 70 206 70", 210, 70, 0) +
      car(x, y, 55, C.me, { right: true }) + car(...onRing(200, 28), 200, C.oth));
  })();

  // Нерегулируемый переход: дорога x 80–160, тротуары по краям
  const zebraBase = () => `<rect x="0" y="0" width="80" height="${H}" fill="${C.walk}"/><rect x="160" y="0" width="80" height="${H}" fill="${C.walk}"/>` +
    `<rect x="80" y="0" width="80" height="${H}" fill="${C.road}"/>` + dash(120, 0, 120, 34) + dash(120, 66, 120, H) + zebraV(80, 160, 38, 62);
  S.zebra_wait = wrap(zebraBase() + person(176, 46, 0.75) + car(140, 108, 0));
  S.zebra_walk = wrap(zebraBase() + person(146, 46, 0.75) + arrow("M156 50 L100 50", 98, 50, 180, C.yel) + car(140, 108, 0));
  S.zebra_blocked = wrap(`<rect x="0" y="0" width="80" height="${H}" fill="${C.walk}"/><rect x="160" y="0" width="80" height="${H}" fill="${C.walk}"/>` +
    `<rect x="80" y="0" width="80" height="${H}" fill="${C.road}"/>` + dash(120, 0, 120, 34) + dash(120, 66, 120, H) + zebraV(80, 160, 38, 62) +
    person(104, 46, 0.7) + car(100, 82, 0, C.oth) + car(140, 116, 0));

  S.narrow = wrap(`<rect x="0" y="54" width="${W}" height="32" fill="${C.road}"/>` +
    [20, 64, 150, 196].map((x) => `<circle cx="${x}" cy="44" r="9" fill="#2c5a3d"/><circle cx="${x + 18}" cy="98" r="9" fill="#2c5a3d"/>`).join("") +
    car(70, 70, 90) + truck(168, 70, -90));

  const twoWay = () => roadH(38, 102, [[70, "dash"]]);
  S.overtake = wrap(twoWay() + arrow("M84 86 C108 86 108 54 132 54 L164 54 C188 54 188 86 212 86", 214, 86, 0) +
    car(66, 86, 90) + car(150, 86, 90, C.oth));
  S.overtake_signal = wrap(twoWay() + car(66, 86, 90) + car(150, 86, 90, C.oth, { left: true }) +
    arrow("M164 86 Q190 86 196 62", 197, 58, -78, C.oth));
  S.solid_line = wrap(roadH(38, 102, [[70, "solid"]]) + car(70, 86, 90) + car(170, 54, -90, C.oth) +
    arrow("M84 86 L130 86", 132, 86, 0) + arrow("M156 54 L110 54", 108, 54, 180, C.oth));

  S.tunnel = wrap(`<rect width="${W}" height="${H}" fill="#2a3540"/>` +
    `<polygon points="30,140 210,140 138,62 102,62" fill="${C.road}"/>` +
    `<path d="M42 140 L42 66 A78 62 0 0 1 198 66 L198 140 Z" fill="#0b1117"/>` +
    `<polygon points="44,140 196,140 134,70 106,70" fill="#2f3943"/>` + dash(120, 136, 120, 74) +
    [0, 1, 2, 3, 4].map((i) => `<circle cx="${70 + i * 25}" cy="${30 + Math.abs(2 - i) * 8}" r="3" fill="${C.yel}" opacity=".9"/>`).join("") +
    `<rect x="102" y="96" width="36" height="22" rx="5" fill="${C.oth}"/><rect x="106" y="111" width="7" height="4" fill="${C.red}"/><rect x="127" y="111" width="7" height="4" fill="${C.red}"/>`, "#2a3540");

  S.fog = wrap(`<rect width="${W}" height="${H}" fill="#7f8d99"/><polygon points="20,140 220,140 132,50 108,50" fill="#58646f"/>` +
    dash(120, 138, 120, 56, "#d5dce2") +
    `<rect x="111" y="60" width="18" height="10" rx="3" fill="#3c4650" opacity=".5"/>` +
    [18, 34, 50].map((y, i) => `<rect x="0" y="${y}" width="${W}" height="${22 + i * 4}" fill="#e8edf1" opacity="${0.42 - i * 0.08}"/>`).join("") +
    `<rect x="84" y="96" width="72" height="38" rx="9" fill="${C.me}"/><rect x="94" y="100" width="52" height="14" rx="4" fill="${C.ink}" opacity=".6"/>` +
    `<circle cx="94" cy="124" r="9" fill="${C.red}" opacity=".35"/><rect x="88" y="120" width="12" height="7" rx="2" fill="${C.red}"/>` +
    `<circle cx="146" cy="124" r="9" fill="${C.red}" opacity=".35"/><rect x="140" y="120" width="12" height="7" rx="2" fill="${C.red}"/>`, "#7f8d99");

  S.distance = wrap(roadH(48, 92) + car(64, 70, 90) + car(178, 70, 90, C.oth) + dim(80, 34, 162, 34) +
    solid(79, 30, 79, 56, C.yel, 1.2) + solid(163, 30, 163, 56, C.yel, 1.2));
  S.lateral = wrap(roadH(28, 112, [[70, "dash"]]) + car(110, 92, 90) + car(118, 48, 90, C.oth) +
    dim(176, 57, 176, 83) + solid(126, 56.5, 182, 56.5, C.yel, 1.2) + solid(118, 83.5, 182, 83.5, C.yel, 1.2));
  S.braking = wrap(roadH(48, 100) +
    `<line x1="60" y1="69" x2="168" y2="69" stroke="#1a1f24" stroke-width="4" stroke-linecap="round" opacity=".8"/>` +
    `<line x1="60" y1="81" x2="168" y2="81" stroke="#1a1f24" stroke-width="4" stroke-linecap="round" opacity=".8"/>` +
    car(182, 75, 90) + dim(60, 32, 196, 32) + solid(60, 28, 60, 60, C.yel, 1.2) + solid(196, 28, 196, 60, C.yel, 1.2));

  const lightPole = (on, flash) => wrap(`<rect x="117" y="104" width="6" height="40" fill="#4a5661"/>` + tlight(104, 16, on, flash), C.card);
  S.light_green_blink = lightPole("green", true);
  S.light_yellow = lightPole("yellow", false);
  S.light_yellow_blink = lightPole("yellow", true);

  S.jam = wrap(crossroads() + car(131, 30, 0, C.oth) + car(131, -4, 0, C.oth2) + car(131, 118, 0) +
    `<rect x="149" y="96" width="5" height="44" fill="#4a5661"/>` + tlight(144, 98, "green", false, 0.42));

  S.controller_side = wrap(crossroads() + officerTop(120, 70, 90) + car(131, 120, 0));
  S.controller_front = wrap(crossroads() + officerTop(120, 70, 0) + car(131, 118, 0));
  S.controller_up = wrap(officerFront(120, 82, true), C.card);
  S.controller_vs_light = wrap(`<rect x="183" y="100" width="5" height="40" fill="#4a5661"/>` + tlight(170, 22, "green", false, 0.9) +
    officerFront(92, 82, true), C.card);

  S.low_beam = wrap(roadH(46, 98, [[72, "dash"]]) + car(90, 85, 90, C.me, { beam: "low" }) +
    `<circle cx="206" cy="24" r="11" fill="${C.yel}"/>` +
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = a * Math.PI / 180; return `<line x1="${206 + 15 * Math.cos(r)}" y1="${24 + 15 * Math.sin(r)}" x2="${206 + 20 * Math.cos(r)}" y2="${24 + 20 * Math.sin(r)}" stroke="${C.yel}" stroke-width="2.4" stroke-linecap="round"/>`; }).join(""));
  S.high_beam = wrap(`<rect x="0" y="38" width="${W}" height="64" fill="#2a333c"/>` + dash(0, 70, W, 70) +
    car(52, 86, 90, C.me, { beam: "high" }) + car(196, 54, -90, C.oth, { beam: "high" }) +
    [[30, 18], [90, 12], [160, 22], [214, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join(""), C.night);

  S.seatbelt = wrap(`<rect x="60" y="24" width="120" height="100" rx="18" fill="#3b4652"/><rect x="52" y="96" width="136" height="34" rx="10" fill="#46525e"/>` +
    `<circle cx="120" cy="40" r="14" fill="${C.skin}"/><path d="M92 128 L92 74 Q92 58 108 58 L132 58 Q148 58 148 74 L148 128 Z" fill="#6b8fb3"/>` +
    `<path d="M140 60 L100 118" stroke="#1c232a" stroke-width="7" stroke-linecap="round"/><path d="M92 112 L148 112" stroke="#1c232a" stroke-width="7"/>` +
    `<rect x="96" y="106" width="12" height="11" rx="2" fill="#b9c3cc"/>`, C.card);

  S.phone = wrap(`<circle cx="98" cy="80" r="42" fill="none" stroke="#56626e" stroke-width="11"/><circle cx="98" cy="80" r="11" fill="#56626e"/>` +
    `<line x1="58" y1="80" x2="87" y2="80" stroke="#56626e" stroke-width="9"/><line x1="109" y1="80" x2="138" y2="80" stroke="#56626e" stroke-width="9"/><line x1="98" y1="91" x2="98" y2="120" stroke="#56626e" stroke-width="9"/>` +
    `<rect x="160" y="26" width="38" height="70" rx="8" fill="#141c23" stroke="#8a98a6" stroke-width="2"/><rect x="165" y="34" width="28" height="52" rx="3" fill="#2c6fb8"/>` +
    `<path d="M172 50 q3 -4 6 0 l-2 4 q4 7 8 8 l3 -2 q4 3 0 6 q-10 2 -17 -10 z" fill="#fff"/>` +
    `<path d="M152 96 q12 -12 26 -6 l14 10 q4 8 -4 10 l-30 0 z" fill="${C.skin}"/>`, C.card);

  S.curb_start = wrap(roadH(38, 110, [[74, "dash"]]) + `<rect x="0" y="110" width="${W}" height="30" fill="${C.walk}"/>` +
    car(52, 92, 90, C.oth) + car(132, 100, 90, C.me, { left: true }) + arrow("M148 100 Q170 100 178 92 Q186 92 214 92", 216, 92, 0));

  S.documents = wrap(`<g transform="rotate(-8 88 76)"><rect x="34" y="42" width="108" height="68" rx="8" fill="#d9e4ee"/><rect x="34" y="42" width="108" height="14" rx="6" fill="#8ab4dd"/>` +
    `<rect x="42" y="64" width="26" height="34" rx="3" fill="#a9b7c4"/><circle cx="55" cy="74" r="6" fill="#7c8a97"/><path d="M45 96 q10 -14 20 0 z" fill="#7c8a97"/>` +
    [66, 76, 86].map((y, i) => `<rect x="76" y="${y}" width="${54 - i * 10}" height="5" rx="2" fill="#93a2b0"/>`).join("") + `</g>` +
    `<g transform="rotate(6 166 66)"><rect x="126" y="28" width="84" height="62" rx="6" fill="#e9d9b8"/>` +
    [40, 52, 64, 76].map((y) => `<rect x="136" y="${y}" width="64" height="5" rx="2" fill="#b7a27c"/>`).join("") + `</g>` +
    car(186, 108, 90, C.me), C.card);

  S.hazard = wrap(roadH(40, 104, [[72, "dash"]]) + car(156, 90, 90, C.me, { hazard: true }) + warnTri(76, 92, 1.1) + car(26, 90, 90, C.oth));
  S.accident = wrap(crossroads() + car(126, 76, 35, C.me, { hazard: true }) + car(148, 62, -70, C.oth) +
    `<polygon points="136,58 140,66 148,64 142,70 147,77 139,74 135,82 133,73 125,72 132,67" fill="${C.yel}"/>` + warnTri(131, 122, 1));
  S.first_aid = wrap(`<rect x="66" y="32" width="108" height="80" rx="12" fill="#f2f4f6"/><path d="M100 32 L100 22 Q100 16 106 16 L134 16 Q140 16 140 22 L140 32" fill="none" stroke="#f2f4f6" stroke-width="6"/>` +
    `<rect x="111" y="46" width="18" height="52" rx="2" fill="${C.red}"/><rect x="94" y="63" width="52" height="18" rx="2" fill="${C.red}"/>` +
    `<rect x="66" y="96" width="108" height="16" rx="0" fill="#d7dce1"/><rect x="66" y="104" width="108" height="8" rx="6" fill="#d7dce1"/>`, C.card);
  S.child_seat = wrap(`<path d="M86 30 Q86 18 98 18 L142 18 Q154 18 154 30 L154 96 L86 96 Z" fill="#44505c"/>` +
    `<path d="M74 92 L166 92 Q172 92 170 100 L164 120 L76 120 L70 100 Q68 92 74 92 Z" fill="#56626e"/>` +
    `<circle cx="120" cy="44" r="13" fill="${C.skin}"/><path d="M100 98 L100 70 Q100 60 110 60 L130 60 Q140 60 140 70 L140 98 Z" fill="#f0a35e"/>` +
    `<path d="M106 60 L114 98 M134 60 L126 98" stroke="#1c232a" stroke-width="5"/><rect x="113" y="80" width="14" height="8" rx="2" fill="${C.red}"/>`, C.card);
  S.cargo = wrap(roadH(44, 100, [[72, "dash"]]) + car(130, 86, 90) +
    `<rect x="72" y="82" width="64" height="8" rx="1.5" fill="#b98a54"/><line x1="72" y1="86" x2="136" y2="86" stroke="#8a6238" stroke-width="1.2"/>`);
  S.towing = wrap(roadH(44, 100, [[72, "dash"]]) + car(78, 86, 90) + car(176, 86, 90, C.oth) +
    `<line x1="92" y1="86" x2="162" y2="86" stroke="#d9dee3" stroke-width="2"/>` +
    `<rect x="112" y="78" width="8" height="8" fill="${C.red}"/><rect x="134" y="78" width="8" height="8" fill="${C.red}"/>`);
  S.pickup = wrap(roadH(44, 100, [[72, "dash"]]) + truck(120, 86, 90, "#9aa6b2", { bed: true }) +
    [[102, 80], [102, 92], [116, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${C.skin}"/>`).join(""));
  S.turn_signal = wrap(crossroads() + arrow("M131 100 Q131 81 176 81", 180, 81, 0) + car(131, 116, 0, C.me, { right: true }));
  S.ambulance = wrap(roadH(28, 112, [[70, "dash"]]) + car(150, 49, 90, C.me) + car(56, 49, 90, "#f2f4f6", { ambulance: true }) +
    car(110, 91, 90, C.oth));
  S.lane_change = wrap(roadH(32, 108, [[70, "dash"]]) + car(122, 51, 90, C.oth) + car(96, 89, 90, C.me, { left: true }) +
    arrow("M112 89 C138 89 150 51 182 51", 186, 51, 0));
  S.lane_merge = wrap(roadH(22, 118, [[54, "dash"], [86, "dash"]]) + car(96, 38, 90, C.me, { right: true }) + car(96, 102, 90, C.oth, { left: true }) +
    arrow("M112 38 C140 38 150 66 182 66", 185, 66, 0) + arrow("M112 102 C140 102 150 74 182 74", 185, 74, 0, C.oth));

  const drivewayBase = () => roadH(14, 64, [[39, "dash"]]) + `<rect x="0" y="64" width="${W}" height="22" fill="${C.walk}"/>` +
    `<rect x="100" y="64" width="40" height="76" fill="#4a5560"/>`;
  S.driveway_out = wrap(drivewayBase() + person(160, 66, 0.55) + car(120, 112, 0) + car(36, 52, 90, C.oth) +
    arrow("M120 96 Q120 52 168 52", 172, 52, 0));
  S.driveway_in = wrap(drivewayBase() + person(126, 66, 0.55) + person(150, 66, 0.55) + car(60, 52, 90, C.me, { right: true }) +
    arrow("M76 52 Q112 52 112 104", 112, 108, 90));

  S.tram = wrap(crossroads() + `<line x1="0" y1="66" x2="${W}" y2="66" stroke="#9aa6b2" stroke-width="1.6"/><line x1="0" y1="74" x2="${W}" y2="74" stroke="#9aa6b2" stroke-width="1.6"/>` +
    `<g transform="translate(46 70)"><rect x="-34" y="-10" width="68" height="20" rx="6" fill="${C.oth2}"/>` +
    [-26, -12, 2, 16].map((x) => `<rect x="${x}" y="-6" width="9" height="12" rx="1.5" fill="#f6c7cb"/>`).join("") + `</g>` + car(131, 116, 0));
  S.right_turn_peds = wrap(crossroads() + zebraH(152, 176, 48, 92) + person(164, 58, 0.5) + person(164, 80, 0.5) +
    arrow("M131 100 Q131 81 200 81", 204, 81, 0) + car(131, 116, 0, C.me, { right: true }));
  S.main_road_plate = wrap(`<polygon points="120,10 154,44 120,78 86,44" fill="${C.yel}" stroke="#fff" stroke-width="5"/>` +
    `<polygon points="120,10 154,44 120,78 86,44" fill="none" stroke="${C.ink}" stroke-width="1.5"/>` +
    `<rect x="92" y="88" width="56" height="44" rx="3" fill="#fff" stroke="${C.ink}" stroke-width="2"/>` +
    `<path d="M120 126 L120 108 L102 108" fill="none" stroke="${C.ink}" stroke-width="5"/><path d="M120 108 L120 94 M120 108 L140 108" fill="none" stroke="${C.ink}" stroke-width="2"/>`, C.card);
  S.bus_stop = wrap(roadH(40, 104, [[72, "dash"]]) + `<rect x="0" y="104" width="${W}" height="36" fill="${C.walk}"/>` +
    bus(136, 90, 90, { hazard: true }) + person(178, 96, 0.55) + car(40, 88, 90, C.me));
  S.ped_road = wrap(roadH(36, 100, [[68, "dash"]]) + `<rect x="0" y="100" width="${W}" height="40" fill="${C.walk}"/>` +
    person(120, 112, 0.65) + car(36, 84, 90, C.me) + car(206, 52, -90, C.oth));
  S.blind = wrap(roadH(36, 104, [[70, "dash"]]) + person(134, 74, 0.8, "#f4f6f8", true) + car(44, 88, 90));
  const railBase = () => `<rect x="98" y="0" width="44" height="${H}" fill="${C.road}"/>` + dash(120, 0, 120, 36) + dash(120, 84, 120, H) +
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<rect x="${i * 21}" y="44" width="6" height="32" fill="#6b5a46"/>`).join("") +
    `<line x1="0" y1="50" x2="${W}" y2="50" stroke="#b8c1c9" stroke-width="3"/><line x1="0" y1="70" x2="${W}" y2="70" stroke="#b8c1c9" stroke-width="3"/>`;
  S.railway_flash = wrap(railBase() + `<rect x="150" y="80" width="5" height="50" fill="#4a5661"/><line x1="152" y1="84" x2="158" y2="18" stroke="#fff" stroke-width="4"/>` +
    `<line x1="152" y1="84" x2="158" y2="18" stroke="${C.red}" stroke-width="4" stroke-dasharray="7 7"/>` +
    `<rect x="160" y="88" width="40" height="18" rx="9" fill="#141c23"/><circle cx="171" cy="97" r="6" fill="${C.red}"/><circle cx="171" cy="97" r="10" fill="${C.red}" opacity=".3"/><circle cx="189" cy="97" r="6" fill="${C.off}"/>` +
    car(131, 118, 0));
  S.railway_stalled = wrap(railBase() + car(131, 60, 0, C.me, { hazard: true }) + person(170, 104, 0.6));

  S.tired = wrap(`<circle cx="104" cy="86" r="40" fill="none" stroke="#56626e" stroke-width="11"/><circle cx="104" cy="86" r="10" fill="#56626e"/>` +
    `<line x1="66" y1="86" x2="94" y2="86" stroke="#56626e" stroke-width="9"/><line x1="114" y1="86" x2="142" y2="86" stroke="#56626e" stroke-width="9"/>` +
    `<text x="150" y="58" font-family="Arial, sans-serif" font-weight="800" font-size="30" fill="#9fb3c4">Z</text>` +
    `<text x="176" y="38" font-family="Arial, sans-serif" font-weight="800" font-size="22" fill="#9fb3c4" opacity=".8">Z</text>` +
    `<text x="196" y="24" font-family="Arial, sans-serif" font-weight="800" font-size="15" fill="#9fb3c4" opacity=".6">Z</text>`, C.card);

  const out = global.SIGN_ICONS || (global.SIGN_ICONS = {});
  Object.keys(S).forEach((k) => { out["scene_" + k] = S[k]; });
})(window);
