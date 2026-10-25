"""Builds the news pages from data/news.json. GitHub runs this on every push (see .github/workflows/static.yml),
so adding a post to news.json is all it takes. It needs only Python 3, nothing to install.

It writes:
  news/index.html            the News page, every post, newest first
  news/<slug>/index.html     one page per post
  index.html                 the latest 5 posts, between <!--news:start--> and <!--news:end-->
  sitemap.xml                the news pages, between <!-- news:start --> and <!-- news:end -->
  data/news-built.json       the posts with their page address, for the shows page

Each post's address comes from its "slug" (for example "stephanos-grapsas-part-ways" makes
tiltguild.com/news/stephanos-grapsas-part-ways/). Keep a slug once a post is published, so links keep working.
The page layout comes from _build/page.html, which the site's design script creates.
"""
import hashlib
import json
import pathlib
import re
from datetime import datetime, timedelta
from html import escape

try:
    from zoneinfo import ZoneInfo
    ATHENS = ZoneInfo("Europe/Athens")
except Exception:  # no time zone data: times go out without an offset
    ATHENS = None

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.tiltguild.com"
SHARE_IMG = "/images/share/tilt-guild.jpg"
HOME_COUNT = 5
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
KINDS = {"release": "Release", "show": "Show", "press": "Press"}
ACTIONS = {"release": "Listen", "show": "Event details", "press": "Read"}
GREEK = re.compile(r"[Ͱ-Ͽἀ-῿]")
TRANSLIT = dict(zip("αβγδεζηθικλμνξοπρσςτυφχψωάέήίόύώϊϋΐΰ",
                    "a b g d e z i th i k l m n x o p r s s t y f ch ps o a e i i o y o i y i y".split()))

ICONS = "/images/icons.svg?v=" + hashlib.sha1((ROOT / "images/icons.svg").read_bytes()).hexdigest()[:8]


def icon(name):
    return f'<svg class="icon" aria-hidden="true"><use href="{ICONS}#{name}"/></svg>'


def lang(text):
    """Greek text gets lang="el", so capitals drop their accents and the Greek font is used."""
    return ' lang="el"' if GREEK.search(text or "") else ""


def slugify(text):
    text = "".join(TRANSLIT.get(c, c) for c in text.lower())
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:60].rstrip("-") or "post"


def when(item):
    return datetime.fromisoformat(item["date"][:19])


def day(item):
    d = when(item)
    return f"{d.day} {MONTHS[d.month - 1]}", str(d.year)


def iso(d):
    """Athens wall-clock time with its UTC offset (+02:00 in winter, +03:00 in summer)."""
    return d.replace(tzinfo=ATHENS).isoformat() if ATHENS else d.isoformat()


def is_external(url):
    return url.startswith("http://") or url.startswith("https://")


def link_attrs(url):
    return ' target="_blank" rel="noopener"' if is_external(url) else ""


def action(item, fallback=True):
    """The post's main button: (label, address), or None. Shows without a link get "All shows" on their own page."""
    url = item.get("url") or item.get("source") or ""
    if url:
        return item.get("action") or ACTIONS.get(item.get("type"), "Read more"), url
    if fallback and item.get("type") == "show":
        return "All shows", "/shows/"
    return None


def paras(lines, cls=""):
    c = f' class="{cls}"' if cls else ""
    return "".join(f"<p{c}{lang(t)}>{escape(t)}</p>" for t in lines or [])


# ---------- posts ----------
news = json.loads((ROOT / "data/news.json").read_text(encoding="utf-8"))
items = sorted(news.get("news", []), key=lambda n: n.get("date", ""), reverse=True)
taken = set()
for n in items:
    s = n.get("slug") or (n.get("date", "")[:10] + "-" + slugify(n.get("title", "")))
    base, k = s, 2
    while s in taken:
        s, k = f"{base}-{k}", k + 1
    taken.add(s)
    n["slug"], n["page"] = s, f"/news/{s}/"


def feed_item(n, heading="h3"):
    d, y = day(n)
    act = action(n, fallback=False)
    kind = KINDS.get(n.get("type"), "News")
    return (f'<li data-type="{escape(n.get("type", ""))}" data-date="{escape(n.get("date", ""))}">'
            f'<p class="feed-date">{d}<small>{y}</small></p>'
            f'<div><p class="feed-kind">{kind}</p>'
            f'<{heading}{lang(n["title"])}><a href="{n["page"]}">{escape(n["title"])}</a></{heading}>'
            f'<p class="feed-desc"{lang(n.get("description"))}>{escape(n.get("description", ""))}</p></div>'
            + (f'<a class="btn" href="{escape(act[1])}"{link_attrs(act[1])}>{escape(act[0])}</a>' if act else "")
            + "</li>")


def structured(n):
    img = SITE + (n.get("image") or SHARE_IMG).replace(" ", "%20")
    band = {"@type": "MusicGroup", "@id": SITE + "/#band", "name": "Tilt Guild", "url": SITE + "/"}
    if n.get("type") == "show" and n.get("venue") and n.get("city"):
        start = when(n)
        end = datetime.fromisoformat(n["end"][:19]) if n.get("end") else start + timedelta(hours=3)
        url = n.get("tickets") or n.get("url") or ""
        offer = {"@type": "Offer", "url": url if is_external(url) else SITE + (url or n["page"]),
                 "availability": "https://schema.org/" + ("SoldOut" if n.get("sold_out") else "InStock")}
        if n.get("price") not in (None, ""):
            offer.update(price=str(n["price"]), priceCurrency=n.get("currency", "EUR"))
        return {"@context": "https://schema.org", "@type": "MusicEvent", "name": n["title"],
                "description": n.get("description") or None, "startDate": iso(start), "endDate": iso(end),
                "eventStatus": "https://schema.org/EventScheduled",
                "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
                "url": SITE + n["page"], "image": img,
                "location": {"@type": "Place", "name": n["venue"],
                             "address": {"@type": "PostalAddress", "addressLocality": n["city"],
                                         "addressCountry": n.get("country", "GR")}},
                "organizer": {"@type": "Organization", "name": n.get("organizer") or n["venue"]},
                "offers": offer, "performer": band}
    return {"@context": "https://schema.org", "@type": "NewsArticle", "headline": n["title"][:110],
            "description": n.get("summary") or n.get("description") or None,
            "datePublished": iso(when(n)), "image": [img], "url": SITE + n["page"],
            "mainEntityOfPage": SITE + n["page"], "inLanguage": "en",
            "author": band, "publisher": {"@type": "Organization", "name": "Tilt Guild", "url": SITE + "/",
                                          "logo": {"@type": "ImageObject", "url": SITE + "/images/logos/apple-touch-icon.png"}}}


TEMPLATE = (ROOT / "_build/page.html").read_text(encoding="utf-8")


def page(title, desc, path, content, ld=None, og_type="website", img=SHARE_IMG):
    full = f"{title} | Tilt Guild"
    jsonld = ""
    if ld:
        ld = {k: v for k, v in ld.items() if v is not None}
        jsonld = '\n  <script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace("</", "<\\/") + "</script>"
    out = TEMPLATE
    for key, val in (("%%TITLE%%", escape(full)), ("%%DESC%%", escape(desc)), ("%%PATH%%", path),
                     ("%%OGTYPE%%", og_type), ("%%OGIMG%%", img.replace(" ", "%20")), ("%%LD%%", jsonld),
                     ("%%MAIN%%", content)):
        out = out.replace(key, val)
    return out


def write(rel, html):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(html, encoding="utf-8")
    print("wrote", rel)


# ---------- one page per post ----------
for i, n in enumerate(items):
    d = when(n)
    kind = KINDS.get(n.get("type"), "News")
    act = action(n)
    is_show = n.get("type") == "show"
    where = ""
    if is_show:
        place = ", ".join(x for x in (n.get("venue"), n.get("city")) if x)
        stamp = f'{d.strftime("%A")} {d.day} {MONTHS[d.month - 1]} {d.year}, {d:%H:%M}'
        where = f'<p class="post-where">{icon("pin")}<span{lang(place)}>{escape(place)}</span><span>{stamp}</span></p>'
    buttons = ""
    if act:
        buttons = f'<div class="actions"><a class="btn btn-accent" href="{escape(act[1])}"{link_attrs(act[1])}>{escape(act[0])}</a></div>'
    el = n.get("el") or {}
    greek = ""
    if el:
        el_act = (f'<a class="sec-link label" href="{escape(act[1])}"{link_attrs(act[1])}>{escape(el["action"])}</a>'
                  if act and el.get("action") else "")
        greek = (f'<section class="post-el" lang="el" aria-label="Στα ελληνικά"><p class="label post-el-tag">Ελληνικά</p>'
                 + (f'<h2 class="post-el-title">{escape(el["title"])}</h2>' if el.get("title") else "")
                 + paras(el.get("body")) + el_act + "</section>")
    others = [m for m in items if m is not n][:3]
    more = ""
    if others:
        more = (f'<section class="news post-more" aria-labelledby="more-h"><div class="sec-head">'
                f'<h2 class="h-section" id="more-h">More news</h2><a class="sec-link label" href="/news/">All news</a></div>'
                f'<ol class="feed">{"".join(feed_item(m) for m in others)}</ol></section>')
    day_s, year = day(n)
    content = f"""
  <article class="post">
    <p class="post-back"><a class="sec-link label" href="/news/">All news</a></p>
    <p class="post-kind label">{kind}<span>{day_s} {year}</span></p>
    <h1 class="display post-title"{lang(n["title"])}>{escape(n["title"])}</h1>
    {where}
    <div class="post-body">
      <p class="post-lede"{lang(n.get("description"))}>{escape(n.get("description", ""))}</p>
      {paras(n.get("body"))}
      {buttons}
    </div>
    {greek}
  </article>
  {more}
"""
    desc = n.get("summary") or n.get("description") or n["title"]
    write(f"news/{n['slug']}/index.html",
          page(n["title"], desc, n["page"], content, structured(n), "article", n.get("image") or SHARE_IMG))

# ---------- the News page ----------
index = f"""
  <header class="page-head">
    <h1 class="display page-title">News</h1>
    <p class="lede">New music, shows, press and band news. For dates only, see <a href="/shows/">shows</a>.</p>
  </header>
  <section class="news news-all" aria-label="All news">
    <ol class="feed">{"".join(feed_item(n, "h2") for n in items)}</ol>
  </section>
"""
write("news/index.html", page("News", "Tilt Guild news: new music, shows, press and band announcements from the rap metal band from Athens.",
                              "/news/", index))

# ---------- latest posts on the home page ----------
home_p = ROOT / "index.html"
home = home_p.read_text(encoding="utf-8")
latest = "".join(feed_item(n) for n in items[:HOME_COUNT])
home, hits = re.subn(r"<!--news:start-->.*?<!--news:end-->", lambda m: f"<!--news:start-->{latest}<!--news:end-->", home, flags=re.S)
if hits:
    home_p.write_text(home, encoding="utf-8")
    print("wrote index.html (latest news)")

# ---------- sitemap ----------
sm_p = ROOT / "sitemap.xml"
sm = sm_p.read_text(encoding="utf-8")
newest = items[0]["date"][:10] if items else ""
urls = [("/news/", newest, "weekly", "0.7")] + [(n["page"], n["date"][:10], "yearly", "0.5") for n in items]
block = "".join(f"\n    <url>\n        <loc>{SITE}{u}</loc>\n        <lastmod>{lm}</lastmod>\n"
                f"        <changefreq>{cf}</changefreq>\n        <priority>{pr}</priority>\n    </url>" for u, lm, cf, pr in urls)
sm, hits = re.subn(r"<!-- news:start -->.*?<!-- news:end -->", lambda m: f"<!-- news:start -->{block}\n    <!-- news:end -->", sm, flags=re.S)
if hits:
    sm_p.write_text(sm, encoding="utf-8")
    print("wrote sitemap.xml (news pages)")

# ---------- posts with their page address, for the shows page ----------
built = dict(news, news=items)
write("data/news-built.json", json.dumps(built, ensure_ascii=False, indent=1))
