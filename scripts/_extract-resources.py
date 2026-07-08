#!/usr/bin/env python3
"""One-off extraction: parse '## Sources' lists across all docs/platform-guides/*.md
files, dedupe citations by URL, and emit a JSON artifact the TS converter reads to
populate `resource` entity records + each guide's `resource_slugs`.
"""
import re, glob, json, os
from urllib.parse import urlparse
from collections import Counter

DIR = "/sessions/fervent-ecstatic-pasteur/mnt/tanho/docs/platform-guides"
OUT = "/sessions/fervent-ecstatic-pasteur/mnt/platform/scripts/data/guide-resources.generated.json"

# host -> display source name. Longest/most-specific host matched first.
SOURCE_NAME_MAP = {
    "support.squarespace.com": "Squarespace Help",
    "developers.squarespace.com": "Squarespace Developers",
    "squarespace.com": "Squarespace",
    "support.substack.com": "Substack Help",
    "substack.com": "Substack",
    "pubstacksuccess.substack.com": "Substack (Pub Stack Success)",
    "developers.beehiiv.com": "beehiiv Developers",
    "security.beehiiv.com": "beehiiv Trust Center",
    "beehiiv.com": "beehiiv",
    "help.webflow.com": "Webflow Help",
    "developers.webflow.com": "Webflow Developers",
    "webflow.com": "Webflow",
    "docs.ghost.org": "Ghost Docs",
    "forum.ghost.org": "Ghost Forum",
    "ghost.org": "Ghost",
    "wordpress.org": "WordPress.org",
    "learn.wordpress.org": "WordPress.org Learn",
    "wordpress.com": "WordPress.com",
    "vercel.com": "Vercel",
    "supabase.com": "Supabase",
    "neon.com": "Neon",
    "render.com": "Render",
    "fly.io": "Fly.io",
    "docs.netlify.com": "Netlify Docs",
    "answers.netlify.com": "Netlify Community",
    "netlify.com": "Netlify",
    "developers.cloudflare.com": "Cloudflare Docs",
    "blog.cloudflare.com": "Cloudflare Blog",
    "cloudflare.com": "Cloudflare",
    "docs.railway.com": "Railway Docs",
    "blog.railway.com": "Railway Blog",
    "docs.digitalocean.com": "DigitalOcean Docs",
    "digitalocean.com": "DigitalOcean",
    "docs.hetzner.com": "Hetzner Docs",
    "hetzner.com": "Hetzner",
    "github.com": "GitHub",
    "npmjs.com": "npm",
    "techcrunch.com": "TechCrunch",
    "wpbeginner.com": "WPBeginner",
    "kinsta.com": "Kinsta",
    "en.wikipedia.org": "Wikipedia",
    "platformer.news": "Platformer",
    "theregister.com": "The Register",
    "nbcnews.com": "NBC News",
    "digiday.com": "Digiday",
    "niemanlab.org": "Nieman Lab",
    "globenewswire.com": "GlobeNewswire",
    "prnewswire.com": "PR Newswire",
    "infoq.com": "InfoQ",
    "pgbouncer.org": "PgBouncer",
    "betterstack.com": "Better Stack",
    "opennext.js.org": "OpenNext",
    "freespeechproject.georgetown.edu": "Georgetown Free Speech Project",
    "getlatka.com": "Latka",
    "permira.com": "Permira",
    "chillybin.co": "Chillybin",
    "hoodline.com": "Hoodline",
    "journeyh.io": "JourneyH",
    "percona.community": "Percona Community",
    "serveropsmasters.com": "ServerOps Masters",
    "cloudtally.eu": "CloudTally",
    "markaicode.com": "MarkAICode",
    "thebuild.com": "The Build",
    "bitdoze.com": "Bitdoze",
    "contabo.com": "Contabo",
    "coolify.io": "Coolify",
    "rivestack.io": "RiveStack",
    "usagebox.com": "UsageBox",
    "deploybase.app": "DeployBase",
    "blog.newsletterglue.com": "Newsletter Glue Blog",
    "instawp.com": "InstaWP",
    "brixtemplates.com": "Brix Templates",
    "blogvault.net": "BlogVault",
    "smartwp.com": "SmartWP",
    "revenuerulebreaker.com": "Revenue Rule Breaker",
    "threads.com": "Threads",
    "payoutmath.com": "Payout Math",
    "101howto.com": "101HowTo",
    "selfhost.dev": "Selfhost.dev",
    "werun.dev": "WeRun.dev",
    "mlq.ai": "MLQ.ai",
}

FORUM_HOSTS = {"forum.ghost.org", "answers.netlify.com", "threads.com"}
ARTICLE_HOSTS = {
    "techcrunch.com", "en.wikipedia.org", "platformer.news", "theregister.com",
    "nbcnews.com", "digiday.com", "niemanlab.org", "globenewswire.com",
    "prnewswire.com", "infoq.com", "wpbeginner.com", "kinsta.com", "hoodline.com",
    "getlatka.com", "permira.com", "blog.cloudflare.com", "blog.railway.com",
}
ARTICLE_SUBSTR = ["blog.", "/blog/", "markaicode", "bitdoze", "mlq.ai", "werun.dev",
                  "journeyh.io", "revenuerulebreaker", "payoutmath", "rivestack",
                  "thebuild.com", "serveropsmasters", "percona.community",
                  "101howto", "smartwp", "instawp", "blogvault", "brixtemplates",
                  "coolify.io", "usagebox", "deploybase", "chillybin"]


def source_name_for(host: str) -> str:
    if host in SOURCE_NAME_MAP:
        return SOURCE_NAME_MAP[host]
    # generic fallback: titleize the registrable-ish domain
    parts = host.split(".")
    base = parts[0] if len(parts) <= 2 else parts[-2]
    return base.replace("-", " ").title()


def resource_type_for(url: str, host: str) -> str:
    if host in FORUM_HOSTS or "community" in host or "forum." in host:
        return "forum_thread"
    if host in ARTICLE_HOSTS or any(s in url for s in ARTICLE_SUBSTR):
        return "article"
    return "docs"


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:60].rstrip("-")


def main():
    files = sorted(glob.glob(os.path.join(DIR, "*.md")))
    url_titles = {}   # url -> Counter(title)
    by_file = {}      # filename -> [url,...] in order (deduped within file)

    for path in files:
        fname = os.path.basename(path)
        text = open(path, encoding="utf-8").read()
        m = re.search(r"^## Sources\s*\n(.*)", text, re.DOTALL | re.MULTILINE)
        if not m:
            by_file[fname] = []
            continue
        block = re.split(r"\n## ", m.group(1))[0]
        links = re.findall(r"^-\s*\[([^\]]+)\]\((https?://[^\)]+)\)", block, re.MULTILINE)
        seen = []
        for title, url in links:
            url = url.strip()
            title = title.strip()
            url_titles.setdefault(url, Counter())[title] += 1
            if url not in seen:
                seen.append(url)
        by_file[fname] = seen

    # Build canonical resource records, one per unique URL.
    slug_counts = Counter()
    resources = []
    url_to_slug = {}
    for url, titles in sorted(url_titles.items()):
        title = titles.most_common(1)[0][0]
        host = urlparse(url).netloc.replace("www.", "")
        base_slug = slugify(f"{source_name_for(host)}-{title}")
        slug_counts[base_slug] += 1
        slug = base_slug if slug_counts[base_slug] == 1 else f"{base_slug}-{slug_counts[base_slug]}"
        url_to_slug[url] = slug
        resources.append({
            "slug": slug,
            "title": title,
            "url": url,
            "source_name": source_name_for(host),
            "resource_type": resource_type_for(url, host),
        })

    by_file_slugs = {fname: [url_to_slug[u] for u in urls] for fname, urls in by_file.items()}

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"resources": resources, "byFile": by_file_slugs}, f, indent=2, ensure_ascii=False)

    print(f"Unique resources: {len(resources)}")
    print(f"Files with sources: {sum(1 for v in by_file.values() if v)} / {len(files)}")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
