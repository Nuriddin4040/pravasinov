// Библиотека дорожных знаков в виде SVG — простые оригинальные векторные иконки,
// повторяющие стандартную международную (Венскую) цветовую и геометрическую кодировку
// (красный круг = запрет, синий круг = предписание, треугольник = предупреждение,
// жёлтый ромб = главная дорога, восьмиугольник = СТОП). Не копируют конкретную
// стороннюю базу изображений — нарисованы с нуля для этого приложения.
(function (global) {
  const RED = "#e5342b";
  const BLUE = "#1a63c4";
  const YELLOW = "#ffd21f";
  const WHITE = "#ffffff";
  const BLACK = "#1c1c1c";

  function svg(inner, vb = "0 0 100 100") {
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }
  function personIcon(cx, cy, scale = 1, color = BLACK) {
    // простая фигурка идущего человека: голова + туловище + руки/ноги
    return `<g transform="translate(${cx},${cy}) scale(${scale})" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round">
      <circle cx="0" cy="-14" r="5" fill="${color}" stroke="none"/>
      <line x1="0" y1="-8" x2="0" y2="8"/>
      <line x1="0" y1="-3" x2="-9" y2="3"/>
      <line x1="0" y1="-3" x2="9" y2="-2"/>
      <line x1="0" y1="8" x2="-7" y2="18"/>
      <line x1="0" y1="8" x2="6" y2="18"/>
    </g>`;
  }
  function carIcon(cx, cy, color) {
    return `<g transform="translate(${cx},${cy})">
      <rect x="-11" y="-5" width="22" height="9" rx="3" fill="${color}"/>
      <rect x="-7" y="-9" width="12" height="6" rx="2" fill="${color}"/>
      <circle cx="-6" cy="5" r="2.5" fill="${BLACK}"/>
      <circle cx="6" cy="5" r="2.5" fill="${BLACK}"/>
    </g>`;
  }

  function redCircle(inner) {
    return svg(`
      <circle cx="50" cy="50" r="46" fill="${WHITE}" stroke="${RED}" stroke-width="8"/>
      ${inner}
    `);
  }
  function blueCircle(inner) {
    return svg(`
      <circle cx="50" cy="50" r="46" fill="${BLUE}"/>
      ${inner}
    `);
  }
  function warnTriangle(inner) {
    return svg(`
      <polygon points="50,8 94,88 6,88" fill="${WHITE}" stroke="${RED}" stroke-width="7" stroke-linejoin="round"/>
      ${inner}
    `);
  }

  const SIGN_ICONS = {
    stop: svg(`
      <polygon points="32,6 68,6 94,32 94,68 68,94 32,94 6,68 6,32" fill="${RED}" stroke="${WHITE}" stroke-width="4"/>
      <text x="50" y="60" font-family="Arial, sans-serif" font-weight="800" font-size="26" fill="${WHITE}" text-anchor="middle">STOP</text>
    `),

    give_way: svg(`
      <polygon points="8,14 92,14 50,92" fill="${WHITE}" stroke="${RED}" stroke-width="9" stroke-linejoin="round"/>
    `),

    priority_road: svg(`
      <polygon points="50,4 96,50 50,96 4,50" fill="${YELLOW}" stroke="${WHITE}" stroke-width="10"/>
      <polygon points="50,4 96,50 50,96 4,50" fill="none" stroke="${BLACK}" stroke-width="2"/>
    `),

    no_entry: svg(`<circle cx="50" cy="50" r="46" fill="${RED}"/><rect x="20" y="41" width="60" height="18" rx="2" fill="${WHITE}"/>`),

    no_overtaking: redCircle(
      `<g transform="translate(50,54) scale(1.25) translate(-50,-54)">${carIcon(38, 54, RED)}${carIcon(62, 54, BLACK)}</g>`
    ),

    no_u_turn: redCircle(`
      <path d="M62,66 V40 a16,16 0 0 0 -32,0 v10" fill="none" stroke="${BLACK}" stroke-width="7"/>
      <polygon points="20,42 34,42 27,58" fill="${BLACK}"/>
      <line x1="20" y1="76" x2="80" y2="28" stroke="${RED}" stroke-width="6"/>
    `),

    speed_limit: redCircle(`<text x="50" y="63" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="${BLACK}" text-anchor="middle">60</text>`),

    min_speed: blueCircle(`<text x="50" y="63" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="${WHITE}" text-anchor="middle">60</text>`),

    roundabout: blueCircle(`
      <path d="M50,26 a24,24 0 1 1 -16,7" fill="none" stroke="${WHITE}" stroke-width="7"/>
      <polygon points="34,33 34,19 46,26" fill="${WHITE}"/>
      <path d="M50,74 a24,24 0 0 0 20,-12" fill="none" stroke="${WHITE}" stroke-width="7"/>
      <polygon points="70,62 84,62 77,74" fill="${WHITE}"/>
      <path d="M26,50 a24,24 0 0 0 6,17" fill="none" stroke="${WHITE}" stroke-width="7"/>
    `),

    one_way: svg(`
      <rect x="4" y="4" width="92" height="92" rx="6" fill="${BLUE}"/>
      <polygon points="26,50 62,28 62,72" fill="${WHITE}"/>
      <rect x="62" y="43" width="14" height="14" fill="${WHITE}"/>
    `),

    dead_end: svg(`
      <rect x="4" y="4" width="92" height="92" rx="6" fill="${WHITE}" stroke="${BLACK}" stroke-width="2"/>
      <line x1="50" y1="80" x2="50" y2="28" stroke="${BLACK}" stroke-width="7"/>
      <line x1="24" y1="28" x2="76" y2="28" stroke="${BLACK}" stroke-width="7"/>
      <line x1="34" y1="66" x2="66" y2="66" stroke="${RED}" stroke-width="7"/>
    `),

    turn_right_mandatory: blueCircle(`
      <path d="M30,66 V44 a20,20 0 0 1 20,-20 h14" fill="none" stroke="${WHITE}" stroke-width="8"/>
      <polygon points="58,15 58,33 74,24" fill="${WHITE}"/>
    `),

    pedestrian_crossing_warning: warnTriangle(personIcon(50, 66, 1.15)),

    pedestrian_crossing_info: svg(`
      <rect x="4" y="4" width="92" height="92" rx="6" fill="${BLUE}"/>
      <polygon points="50,20 82,78 18,78" fill="${WHITE}"/>
      ${personIcon(50, 68, 0.9)}
    `),

    children: warnTriangle(personIcon(38, 68, 0.8) + personIcon(58, 70, 0.95)),

    slippery_road: warnTriangle(`
      ${carIcon(50, 56, BLACK)}
      <path d="M30,74 q8,-6 16,0 q8,6 16,0 q8,-6 8,0" fill="none" stroke="${BLACK}" stroke-width="3"/>
    `),

    road_works: warnTriangle(`
      <g stroke="${BLACK}" stroke-width="4" fill="none" stroke-linecap="round">
        <circle cx="42" cy="46" r="4" fill="${BLACK}" stroke="none"/>
        <line x1="42" y1="50" x2="42" y2="64"/>
        <line x1="42" y1="55" x2="30" y2="62"/>
        <line x1="42" y1="55" x2="56" y2="46"/>
        <line x1="42" y1="64" x2="34" y2="76"/>
        <line x1="42" y1="64" x2="52" y2="76"/>
        <line x1="56" y1="46" x2="66" y2="52"/>
      </g>
    `),

    railway_crossing: warnTriangle(`
      <line x1="26" y1="78" x2="74" y2="42" stroke="${BLACK}" stroke-width="6"/>
      <line x1="30" y1="48" x2="42" y2="60" stroke="${BLACK}" stroke-width="5"/>
      <line x1="46" y1="64" x2="58" y2="76" stroke="${BLACK}" stroke-width="5"/>
    `),

    no_pedestrians: redCircle(personIcon(50, 58, 1.05) + `<line x1="18" y1="82" x2="82" y2="18" stroke="${RED}" stroke-width="6"/>`),

    hospital: svg(`
      <rect x="4" y="4" width="92" height="92" rx="6" fill="${BLUE}"/>
      <rect x="30" y="30" width="40" height="40" fill="${WHITE}"/>
      <rect x="42" y="36" width="16" height="28" fill="${RED}"/>
      <rect x="36" y="42" width="28" height="16" fill="${RED}"/>
    `),
  };

  global.SIGN_ICONS = SIGN_ICONS;
})(window);
