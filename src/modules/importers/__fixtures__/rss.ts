/**
 * Realistic feed fixtures — one RSS 2.0 and one Atom, the two shapes the parser
 * detects by root element (`rss` vs `feed`).
 *
 * RSS 2.0: `channel.item[]`, body in `content:encoded` (full HTML) with
 * `description` as the excerpt fallback, a `<link>` permalink, and a `<guid>`.
 * Atom: `feed.entry[]`, body in `content`, permalink via `link[rel=alternate]`,
 * id in `<id>`. Bodies carry a top-level `<figure><img>` the feed detector
 * turns into a native image block (everything else → richtext).
 *
 * Coverage: RSS has 3 items (one with a figure + caption, one with only a
 * description/excerpt, one with an empty title+content that must be skipped as a
 * malformed-item issue). Atom has 2 entries incl. a multi-`<link>` entry so the
 * alternate-rel permalink selection is exercised.
 */
export function rss2Feed(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>The Example Feed</title>
  <link>https://feed.example.com</link>
  <description>Latest posts from The Example Feed</description>
  <language>en-us</language>
  <atom:link href="https://feed.example.com/rss.xml" rel="self" type="application/rss+xml"/>
  <item>
    <title>A Post With a Picture</title>
    <link>https://feed.example.com/2024/03/a-post-with-a-picture/</link>
    <dc:creator><![CDATA[Jane Feed]]></dc:creator>
    <pubDate>Wed, 06 Mar 2024 10:00:00 +0000</pubDate>
    <guid isPermaLink="true">https://feed.example.com/2024/03/a-post-with-a-picture/</guid>
    <description><![CDATA[A short excerpt shown in readers.]]></description>
    <content:encoded><![CDATA[<p>Full body text of the first post.</p><figure><img src="https://feed.example.com/img/photo.jpg" alt="A photo"/><figcaption>A caption.</figcaption></figure><p>Closing paragraph.</p>]]></content:encoded>
  </item>
  <item>
    <title>An Excerpt-Only Post</title>
    <link>https://feed.example.com/2024/03/excerpt-only/</link>
    <pubDate>Wed, 13 Mar 2024 10:00:00 +0000</pubDate>
    <guid isPermaLink="true">https://feed.example.com/2024/03/excerpt-only/</guid>
    <description><![CDATA[<p>This feed only publishes summaries, so this is the whole body.</p>]]></description>
  </item>
  <item>
    <!-- Deliberately malformed: no title, no content → must be skipped as an issue. -->
    <link>https://feed.example.com/2024/03/empty/</link>
    <guid isPermaLink="true">https://feed.example.com/2024/03/empty/</guid>
  </item>
</channel>
</rss>`;
}

export function atomFeed(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>The Example Atom Feed</title>
  <link href="https://atom.example.com/" rel="alternate"/>
  <link href="https://atom.example.com/atom.xml" rel="self"/>
  <id>https://atom.example.com/</id>
  <updated>2024-03-20T10:00:00Z</updated>
  <entry>
    <title>Hello Atom</title>
    <link href="https://atom.example.com/feed/self/hello" rel="self"/>
    <link href="https://atom.example.com/posts/hello-atom" rel="alternate" type="text/html"/>
    <id>tag:atom.example.com,2024:/posts/hello-atom</id>
    <published>2024-03-18T10:00:00Z</published>
    <updated>2024-03-18T10:00:00Z</updated>
    <content type="html"><![CDATA[<p>An Atom entry with a figure.</p><figure><img src="https://atom.example.com/img/a.jpg" alt="Atom image"/></figure>]]></content>
  </entry>
  <entry>
    <title>Second Atom Entry</title>
    <link href="https://atom.example.com/posts/second-entry" rel="alternate"/>
    <id>tag:atom.example.com,2024:/posts/second-entry</id>
    <updated>2024-03-20T10:00:00Z</updated>
    <summary type="html"><![CDATA[<p>This entry carries only a summary.</p>]]></summary>
  </entry>
</feed>`;
}
