(function () {
  const PUBLISH_HOUR = 8;
  const NEWS = window.NEWS;
  const $ = (id) => document.getElementById(id);

  const HANJA_DIGIT = "〇一二三四五六七八九";
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
  const MOTTOS = [
    "아는 것이 힘이다", "천 리 길도 한 걸음부터", "배움에는 끝이 없다",
    "티끌 모아 태산", "시작이 반이다", "온고지신(溫故知新)", "일신우일신(日新又日新)",
    "백문이 불여일견", "낙숫물이 댓돌을 뚫는다", "고진감래(苦盡甘來)",
  ];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

  const hanjaNum = (n) => String(n).split("").map((d) => HANJA_DIGIT[d]).join("");

  function timeAgo(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function figure(a, caption) {
    if (!a.image) return "";
    return `<figure class="figure"><img src="${esc(a.image)}" alt="" loading="lazy"
      referrerpolicy="no-referrer" onerror="this.closest('figure').remove()">
      ${caption ? `<figcaption>寫眞 · ${esc(a.source)}</figcaption>` : ""}</figure>`;
  }

  function related(a) {
    if (!a.related || !a.related.length) return "";
    return `<ul class="related">${a.related.map((r) =>
      `<li><a class="hl" href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` +
      `<span class="src">${esc(r.source)}</span></li>`).join("")}</ul>`;
  }

  function summaryText(a) {
    if (!a.summary) return "";
    const note = a.summary_source && a.summary_source !== a.source
      ? ` <span class="src">(${esc(a.summary_source)} 보도 요약)</span>` : "";
    return esc(a.summary) + note;
  }

  function renderLead(a) {
    const el = $("lead");
    if (!a) { el.innerHTML = `<div class="empty">오늘 자 기사가 없습니다.</div>`; return; }
    if (!a.image) el.classList.add("no-image");
    el.innerHTML = `
      <div>
        <span class="kicker">一面 頭記事</span>
        <a href="${esc(a.link)}" target="_blank" rel="noopener"><h2 class="hl">${esc(a.title)}</h2></a>
        <div class="byline">${esc(a.source)} · ${timeAgo(a.date)}</div>
        ${a.summary ? `<p class="body">${summaryText(a)}</p>` : ""}
        ${related(a)}
      </div>
      ${figure(a, true)}`;
  }

  function story(a) {
    return `<article class="story">
      ${figure(a, false)}
      <a href="${esc(a.link)}" target="_blank" rel="noopener"><h3 class="hl">${esc(a.title)}</h3></a>
      <div class="meta"><b>${esc(a.source)}</b> · ${timeAgo(a.date)}</div>
      ${a.summary ? `<p>${summaryText(a)}</p>` : ""}
      ${a.summary ? "" : related(a)}
    </article>`;
  }

  function renderList(id, list) {
    $(id).innerHTML = list.length ? list.map(story).join("")
      : `<div class="empty">기사를 불러오지 못했습니다.</div>`;
  }

  function renderHeader(updated) {
    const now = new Date();
    const d = updated || now;
    const start = new Date(2026, 0, 1);
    const issue = Math.floor((d - start) / 86400000) + 1;
    $("issue").textContent = `第 ${hanjaNum(Math.max(issue, 1))} 號`;
    $("date").textContent =
      `西紀 ${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日 ${WEEK[d.getDay()]}曜日`;
    $("updated").textContent = updated ? `${timeAgo(updated.toISOString())} 發行` : "未發行";
    const dayIndex = Math.floor(now / 86400000);
    $("motto").textContent = MOTTOS[dayIndex % MOTTOS.length];
  }

  // 오늘 아침 8시 이후인데 신문이 그 전에 발행된 것이면 안내
  function checkStale(updated) {
    const now = new Date();
    const todayEdition = new Date(now);
    todayEdition.setHours(PUBLISH_HOUR, 0, 0, 0);
    const expected = now >= todayEdition ? todayEdition
      : new Date(todayEdition - 86400000);
    if (!updated || updated < expected - 10 * 60000) {
      const n = $("notice");
      n.hidden = false;
      n.textContent = updated
        ? "※ 최신 호가 아직 발행되지 않았습니다. 컴퓨터가 꺼져 있었다면 켜진 뒤 자동으로 발행되며, '지금 발행하기.bat'로 직접 발행할 수도 있습니다."
        : "※ 아직 발행된 신문이 없습니다. '지금 발행하기.bat'를 실행해 주세요.";
    }
  }

  // 페이지를 열어둔 채로 아침 8시가 지나면 새 호를 다시 읽어온다
  function scheduleReload() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(PUBLISH_HOUR, 3, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    setTimeout(() => location.reload(), next - now);
  }

  const updated = NEWS && NEWS.updated ? new Date(NEWS.updated) : null;
  renderHeader(updated);
  checkStale(updated);
  scheduleReload();

  if (!NEWS) {
    renderLead(null);
    renderList("domestic", []);
    renderList("international", []);
    return;
  }

  const domestic = NEWS.domestic || [];
  renderLead(domestic[0]);
  renderList("domestic", domestic.slice(1));
  renderList("international", NEWS.international || []);

  const sources = [...new Set([...domestic, ...(NEWS.international || [])].map((a) => a.source))];
  $("sources").textContent = "取材源 · " + sources.join(" · ") + " · 국내 순위: Google 뉴스 주요 뉴스";
})();
