(function () {
  const PUBLISH_HOUR = 8;
  const NEWS = window.NEWS;
  const $ = (id) => document.getElementById(id);

  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  const MOTTOS = [
    "아는 것이 힘이다", "천 리 길도 한 걸음부터", "배움에는 끝이 없다",
    "티끌 모아 태산", "시작이 반이다", "온고지신", "일신우일신",
    "백문이 불여일견", "낙숫물이 댓돌을 뚫는다", "고진감래",
  ];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

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
      ${caption ? `<figcaption>사진 · ${esc(a.summary_source || a.source)}</figcaption>` : ""}</figure>`;
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

  function renderLead(a, id = "lead", kicker = "1면 머리기사") {
    const el = $(id);
    if (!a) { el.innerHTML = `<div class="empty">오늘 자 기사가 없습니다.</div>`; return; }
    if (!a.image) el.classList.add("no-image");
    el.innerHTML = `
      <div>
        <span class="kicker">${kicker}</span>
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
      <div class="story-text">
        <a href="${esc(a.link)}" target="_blank" rel="noopener"><h3 class="hl">${esc(a.title)}</h3></a>
        <div class="meta"><b>${esc(a.source)}</b> · ${timeAgo(a.date)}</div>
        ${a.summary ? `<p>${esc(a.summary)}</p>` : ""}
      </div>
    </article>`;
  }

  // 한 장에 들어가는 작은 기사 수: PC 6칸(3×2), 중간 화면 4칸(2×2), 휴대폰 3칸
  function perPage() {
    if (matchMedia("(max-width: 860px)").matches) return 3;
    if (matchMedia("(max-width: 1060px)").matches) return 4;
    return 6;
  }

  const lists = {};

  function renderList(id, list) {
    lists[id] = list;
    const el = $(id);
    if (!list.length) {
      el.innerHTML = `<div class="empty">기사를 불러오지 못했습니다.</div>`;
      return;
    }
    const size = perPage();
    const pages = [];
    for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size));
    el.innerHTML = `
      <div class="pages" tabindex="0" aria-label="작은 기사 넘겨보기">
        ${pages.map((p, i) => `<div class="page columns" aria-label="${i + 1}면">${p.map(story).join("")}</div>`).join("")}
      </div>
      ${pages.length > 1 ? `
      <div class="pager-nav">
        <button type="button" class="pg-prev" aria-label="이전 장">◀ 앞 장</button>
        <span class="pg-count"><b>1</b> / ${pages.length}</span>
        <button type="button" class="pg-next" aria-label="다음 장">다음 장 ▶</button>
      </div>` : ""}`;

    const track = el.querySelector(".pages");
    const prev = el.querySelector(".pg-prev");
    const next = el.querySelector(".pg-next");
    if (!prev) return;
    const current = () => Math.round(track.scrollLeft / (track.clientWidth || 1));
    const go = (i) => {
      const n = (i + pages.length) % pages.length; // 끝에서 넘기면 처음으로
      track.scrollTo({ left: n * track.clientWidth, behavior: "smooth" });
      el.querySelector(".pg-count b").textContent = n + 1;
    };
    const update = () => {
      if (!track.isConnected) return; // 화면 크기 변경으로 다시 그려진 옛 목록은 무시
      el.querySelector(".pg-count b").textContent = current() + 1;
    };
    prev.addEventListener("click", () => go(current() - 1));
    next.addEventListener("click", () => go(current() + 1));
    // 넘기는 동안이 아니라 멈춘 뒤에 쪽수를 고친다 (손가락으로 밀어 넘길 때 포함)
    let timer;
    track.addEventListener("scroll", () => {
      clearTimeout(timer);
      timer = setTimeout(update, 150);
    }, { passive: true });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(current() + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current() - 1); }
    });
  }

  // 화면 크기가 바뀌어 한 장의 칸 수가 달라지면 다시 나눈다
  let lastSize = perPage();
  addEventListener("resize", () => {
    const s = perPage();
    if (s !== lastSize) {
      lastSize = s;
      Object.entries(lists).forEach(([id, list]) => renderList(id, list));
    }
  });

  function renderHeader(updated) {
    const now = new Date();
    const d = updated || now;
    const start = new Date(2026, 0, 1);
    const issue = Math.floor((d - start) / 86400000) + 1;
    $("issue").textContent = `제 ${Math.max(issue, 1)}호`;
    $("date").textContent =
      `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`;
    $("updated").textContent = updated ? `${timeAgo(updated.toISOString())} 발행` : "미발행";
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
    renderLead(null, "intl-lead");
    renderList("domestic", []);
    renderList("international", []);
    return;
  }

  const domestic = NEWS.domestic || [];
  renderLead(domestic[0]);
  renderList("domestic", domestic.slice(1));
  const intl = NEWS.international || [];
  renderLead(intl[0], "intl-lead", "해외 머리기사");
  renderList("international", intl.slice(1));

  const sources = [...new Set([...domestic, ...(NEWS.international || [])].map((a) => a.source))];
  $("sources").textContent = "취재원 · " + sources.join(" · ") + " · 국내 순위: Google 뉴스 주요 뉴스";
})();
