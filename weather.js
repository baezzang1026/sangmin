// 날씨 박스: Open-Meteo(무료, 키 불필요)에서 현재 날씨를 받아 기상캐스터가 알려준다.
(function () {
  const CITY = { name: "서울", lat: 37.5665, lon: 126.978 }; // 다른 도시로 바꾸려면 여기 수정
  const REFRESH_MIN = 30;

  const $ = (id) => document.getElementById(id);

  // 흑백 판화풍 날씨 아이콘
  const S = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"';
  const sun = `<circle cx="16" cy="16" r="5.5" ${S}/><g ${S}>` +
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
      `<path d="M16 5v-3" transform="rotate(${a} 16 16)"/>`).join("") + "</g>";
  const cloud = (y = 0) =>
    `<path d="M9 ${23 + y}h14a5 5 0 0 0 0-10 7 7 0 0 0-13-1 5 5 0 0 0-1 11z" fill="var(--paper)" ${S}/>`;
  const ICONS = {
    clear: `<svg viewBox="0 0 32 32">${sun}</svg>`,
    partly: `<svg viewBox="0 0 32 32"><g transform="translate(-4 -5) scale(.8)">${sun}</g>${cloud(3)}</svg>`,
    cloudy: `<svg viewBox="0 0 32 32">${cloud(-2)}<path d="M5 27h22" ${S} stroke-dasharray="2 3"/></svg>`,
    fog: `<svg viewBox="0 0 32 32"><g ${S}><path d="M5 11h22M3 16h26M5 21h22M8 26h16"/></g></svg>`,
    rain: `<svg viewBox="0 0 32 32">${cloud(-4)}<g ${S}><path d="M11 23l-2 5M17 23l-2 5M23 23l-2 5"/></g></svg>`,
    snow: `<svg viewBox="0 0 32 32">${cloud(-4)}<g fill="currentColor"><circle cx="10" cy="25" r="1.4"/><circle cx="16" cy="28" r="1.4"/><circle cx="22" cy="25" r="1.4"/></g></svg>`,
    storm: `<svg viewBox="0 0 32 32">${cloud(-4)}<path d="M17 20l-4 6h4l-3 5" ${S}/></svg>`,
  };

  function describe(code) {
    if (code === 0) return ["clear", "맑음"];
    if (code <= 2) return ["partly", "구름 조금"];
    if (code === 3) return ["cloudy", "흐림"];
    if (code === 45 || code === 48) return ["fog", "안개"];
    if (code >= 51 && code <= 57) return ["rain", "이슬비"];
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ["rain", "비"];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["snow", "눈"];
    if (code >= 95) return ["storm", "뇌우"];
    return ["cloudy", "흐림"];
  }

  function advice(kind, max, min, pop) {
    if (kind === "rain" || kind === "storm" || pop >= 60) return "우산 꼭 챙기세요!";
    if (kind === "snow") return "눈길 조심하세요!";
    if (min <= 0) return "많이 추워요, 단단히 입으세요!";
    if (max - min >= 10) return "일교차가 커요, 겉옷 챙기세요!";
    if (max >= 30) return "더위 조심하세요!";
    return "나들이하기 좋은 날이에요!";
  }

  async function load() {
    $("wx-city").textContent = CITY.name;
    const url = "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${CITY.lat}&longitude=${CITY.lon}` +
      "&current=temperature_2m,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&timezone=Asia%2FSeoul&forecast_days=1";
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const d = await res.json();
      const temp = Math.round(d.current.temperature_2m);
      const max = Math.round(d.daily.temperature_2m_max[0]);
      const min = Math.round(d.daily.temperature_2m_min[0]);
      const pop = d.daily.precipitation_probability_max[0] ?? 0;
      const [kind, label] = describe(d.current.weather_code);
      $("wx-icon").innerHTML = ICONS[kind];
      $("wx-temp").textContent = `${temp}°`;
      $("wx-say").textContent =
        `지금 ${CITY.name}은 ${label}, 최고 ${max}° 최저 ${min}° · 강수 ${pop}%. ${advice(kind, max, min, pop)}`;
    } catch (e) {
      $("wx-icon").innerHTML = ICONS.cloudy;
      $("wx-say").textContent = "날씨를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.";
    }
  }

  load();
  setInterval(load, REFRESH_MIN * 60000);
})();
