"""매일 아침 뉴스를 RSS로 모아 data/news.js 로 저장하는 스크립트.

표준 라이브러리만 사용하므로 별도 설치가 필요 없습니다.
    python fetch_news.py
"""
import html
import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
LOG = DATA / "fetch.log"

DOMESTIC_COUNT = 19      # 국내 기사 수 (첫 기사는 1면 머리기사, 나머지는 넘겨보는 작은 기사)
INTERNATIONAL_COUNT = 19  # 해외 기사 수 (첫 기사는 해외 머리기사)

# 국내 '대표' 기사 순위: 구글 뉴스 한국판 주요 뉴스
GOOGLE_KR = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko"

# 국내 언론사 피드: 구글 순위 기사에 요약·사진을 붙이는 데 쓰고, 구글 수집 실패 시 대체용
DOMESTIC = [
    ("연합뉴스", "https://www.yna.co.kr/rss/news.xml"),
    ("조선일보", "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml"),
    ("동아일보", "https://rss.donga.com/total.xml"),
    ("한겨레", "https://www.hani.co.kr/rss/"),
    ("경향신문", "https://www.khan.co.kr/rss/rssdata/total_news.xml"),
]
# 편집자가 고른 헤드라인 (사진 포함) — 사진 보강 및 부족분 채우기용
HEADLINE = ("SBS 뉴스", "https://news.sbs.co.kr/news/headlineRssFeed.do?plink=RSSREADER")

INTERNATIONAL = [
    ("BBC", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("New York Times", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"),
    ("The Guardian", "https://www.theguardian.com/world/rss"),
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
]

NS = {
    "media": "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "atom": "http://www.w3.org/2005/Atom",
}


def log(msg):
    DATA.mkdir(exist_ok=True)
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def clean(text, limit=None):
    if not text:
        return ""
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0] + "…"
    return text


def find_image(item, raw_desc):
    for tag in ("media:content", "media:thumbnail"):
        for el in item.findall(tag, NS):
            url = el.get("url")
            if url and (el.get("medium") in (None, "image") or tag == "media:thumbnail"):
                return url
    enc = item.find("enclosure")
    if enc is not None and (enc.get("type") or "").startswith("image"):
        return enc.get("url")
    m = re.search(r'<img[^>]+src=["\']([^"\']+)', raw_desc or "")
    return m.group(1) if m else ""


def bigger(url):
    """작은 썸네일 주소를 큰 사진 주소로 바꾼다 (BBC)."""
    return re.sub(r"/standard/\d+/", "/standard/800/", url or "")


def parse_date(text):
    if not text:
        return ""
    try:
        return parsedate_to_datetime(text).isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat()
        except Exception:
            return ""


def fetch(source, url, limit=8):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (NewsDigest)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())
    items = root.findall(".//item") or root.findall(".//atom:entry", NS)
    out = []
    for it in items[:limit]:
        title = clean(it.findtext("title") or it.findtext("atom:title", namespaces=NS))
        link = it.findtext("link") or ""
        if not link:
            a = it.find("atom:link", NS)
            link = a.get("href") if a is not None else ""
        raw = (it.findtext("description") or it.findtext("content:encoded", namespaces=NS)
               or it.findtext("atom:summary", namespaces=NS) or "")
        date = parse_date(it.findtext("pubDate") or it.findtext("dc:date", namespaces=NS)
                          or it.findtext("atom:updated", namespaces=NS))
        if not title or not link:
            continue
        out.append({
            "title": title,
            "link": link.strip(),
            "summary": clean(raw, 220),
            "image": bigger(find_image(it, raw)),
            "date": date,
            "source": source,
        })
    return out


def og_image(url):
    """기사 원문 페이지의 대표 이미지(og:image)를 찾는다."""
    if not url or "news.google.com" in url:
        return ""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (NewsDigest)"})
        with urllib.request.urlopen(req, timeout=8) as r:
            page = r.read(400_000).decode("utf-8", "ignore")
    except Exception:
        return ""
    for pat in (r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]*content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\'](?:og:image|twitter:image)["\']'):
        m = re.search(pat, page, re.I)
        if m:
            return html.unescape(m.group(1))
    return ""


def with_photos(candidates, count):
    """사진이 없으면 원문에서 찾아보고, 끝내 사진이 없는 기사는 뒤로 미룬다."""
    chosen = []
    for a in candidates:
        if len(chosen) >= count:
            break
        if not a["image"]:
            a["image"] = og_image(a["link"])
        if a["image"]:
            chosen.append(a)
    return chosen


def pick(sources, count):
    """각 언론사의 상위 기사를 번갈아 골라 고르게 섞는다 (사진 있는 기사만)."""
    pools = []
    for name, url in sources:
        try:
            pools.append(fetch(name, url, limit=15))
        except Exception as e:
            log(f"실패: {name} ({e})")
    ordered, seen = [], set()
    depth = max((len(p) for p in pools), default=0)
    for i in range(depth):
        for pool in pools:
            if i < len(pool):
                key = re.sub(r"\W", "", pool[i]["title"])[:30]
                if key not in seen:
                    seen.add(key)
                    ordered.append(pool[i])
    return with_photos(ordered, count)


def norm(title):
    return re.sub(r"[\W_]", "", title)[:40]


def similarity(a, b):
    """두 제목의 글자 2-gram 겹침 정도 (0~1)."""
    def grams(s):
        s = re.sub(r"[\W_]", "", s)
        return {s[i:i + 2] for i in range(len(s) - 1)}
    ga, gb = grams(a), grams(b)
    return len(ga & gb) / len(ga | gb) if ga and gb else 0.0


def fetch_google_top(count):
    """구글 뉴스 주요 뉴스(대표 기사 순위)에 국내 언론사 RSS의 요약·사진을 붙인다."""
    req = urllib.request.Request(GOOGLE_KR, headers={"User-Agent": "Mozilla/5.0 (NewsDigest)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())

    lookup = {}
    for name, url in DOMESTIC + [HEADLINE]:
        try:
            for a in fetch(name, url, limit=60):
                lookup.setdefault(norm(a["title"]), a)
        except Exception as e:
            log(f"실패: {name} ({e})")

    out, seen = [], set()
    for it in root.findall(".//item"):
        if len(out) >= count:
            break
        source = clean(it.findtext("source")) or ""
        title = clean(it.findtext("title"))
        if source and title.endswith(" - " + source):
            title = title[: -len(source) - 3]
        key = norm(title)
        if not title or key in seen:
            continue
        seen.add(key)
        raw = it.findtext("description") or ""
        related = []
        for href, t, src in re.findall(
                r'<a href="([^"]+)"[^>]*>(.*?)</a>(?:&nbsp;|\s)*<font[^>]*>(.*?)</font>', raw):
            t = clean(t)
            if norm(t) != key:
                related.append({"title": t, "source": clean(src), "link": html.unescape(href)})
        art = {
            "title": title,
            "link": (it.findtext("link") or "").strip(),
            "summary": "",
            "image": "",
            "date": parse_date(it.findtext("pubDate")),
            "source": source,
            "related": related[:3],
        }
        # 같은 기사(또는 같은 사건의 관련 보도)를 국내 언론사 RSS에서 찾아 요약·사진 보강
        match = lookup.get(key)
        if match:
            art.update(link=match["link"], summary=match["summary"], image=match["image"])
        else:
            match = next((lookup[norm(r["title"])] for r in related
                          if norm(r["title"]) in lookup), None)
            if not match:
                best, score = None, 0.0
                for a in lookup.values():
                    s = similarity(title, a["title"])
                    if s > score:
                        best, score = a, s
                match = best if score >= 0.35 else None
            if match:
                art.update(summary=match["summary"], image=match["image"],
                           summary_source=match["source"])
        if not art["image"]:
            art["image"] = og_image(art["link"])
        if art["image"]:  # 모든 기사에 사진이 붙도록 사진 있는 기사만 싣는다
            out.append(art)

    # 모자라면 SBS 헤드라인(편집자가 고른 주요 뉴스)으로 채운다
    if len(out) < count:
        try:
            for a in with_photos(fetch(*HEADLINE, limit=20), count):
                k = norm(a["title"])
                if len(out) < count and k not in seen and all(
                        similarity(a["title"], o["title"]) < 0.2 for o in out):
                    seen.add(k)
                    out.append(a)
        except Exception as e:
            log(f"실패: SBS 헤드라인 ({e})")

    # 1면 머리기사는 요약이 있는 기사를 우선
    for idx, a in enumerate(out[:4]):
        if a["summary"]:
            out.insert(0, out.pop(idx))
            break
    return out


def main():
    # 부팅 직후처럼 인터넷이 아직 안 붙었을 때를 대비해 몇 번 재시도
    for attempt in range(6):
        if publish() == 0:
            return 0
        if attempt < 5:
            log("1분 후 다시 시도합니다.")
            time.sleep(60)
    return 1


def publish():
    DATA.mkdir(exist_ok=True)
    try:
        domestic = fetch_google_top(DOMESTIC_COUNT)
    except Exception as e:
        log(f"구글 뉴스 실패, 언론사 최신 기사로 대체 ({e})")
        domestic = []
    if len(domestic) < 3:
        domestic = pick(DOMESTIC, DOMESTIC_COUNT)
    international = pick(INTERNATIONAL, INTERNATIONAL_COUNT)
    if not domestic and not international:
        log("모든 언론사 수집 실패 — 기존 신문을 유지합니다.")
        return 1
    payload = {
        "updated": datetime.now().astimezone().isoformat(timespec="seconds"),
        "domestic": domestic,
        "international": international,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    (DATA / "news.json").write_text(text, encoding="utf-8")
    # file:// 로 열어도 읽히도록 JS 파일로도 저장
    (DATA / "news.js").write_text(f"window.NEWS = {text};\n", encoding="utf-8")
    log(f"발행 완료: 국내 {len(domestic)}건, 해외 {len(international)}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
