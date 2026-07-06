/**
 * A realistic WordPress WXR export (Tools → Export → All content).
 *
 * Real WXR 1.2 envelope: `xmlns:wp/content/excerpt/dc`, a `<wp:author>`, and a
 * mix of `wp:post_type` values — `post`, `page`, a `book` custom post type
 * (with `wp:postmeta` including the WP-internal `_edit_lock` that must be
 * ignored), and an `attachment`. Post bodies carry Gutenberg block markup the
 * card detector keys on: `wp-block-image` figures, a `wp-block-gallery`, a
 * `wp-block-embed` (YouTube), a `wp-block-button`, and a `wp-block-code`.
 *
 * Coverage: 3 posts (2 published incl. one with comments + categories + tags,
 * 1 draft), 1 page, 1 CPT item, 1 attachment; an image+caption, a gallery, an
 * embed, a button, a code block, a threaded comment, AND one item with an empty
 * body to prove empty-content handling.
 */
export function wordpressWxr(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>The Example Journal</title>
  <link>https://old.example.com</link>
  <description>Notes on building things</description>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>https://old.example.com</wp:base_site_url>
  <wp:base_blog_url>https://old.example.com</wp:base_blog_url>
  <wp:author>
    <wp:author_id>1</wp:author_id>
    <wp:author_login><![CDATA[jane]]></wp:author_login>
    <wp:author_email><![CDATA[jane@example.com]]></wp:author_email>
    <wp:author_display_name><![CDATA[Jane Observer]]></wp:author_display_name>
    <wp:author_first_name><![CDATA[Jane]]></wp:author_first_name>
    <wp:author_last_name><![CDATA[Observer]]></wp:author_last_name>
  </wp:author>
  <wp:author>
    <wp:author_id>2</wp:author_id>
    <wp:author_login><![CDATA[marcus]]></wp:author_login>
    <wp:author_email><![CDATA[marcus@example.com]]></wp:author_email>
    <wp:author_display_name><![CDATA[Marcus Writer]]></wp:author_display_name>
  </wp:author>

  <item>
    <title>Getting Started with the Editor</title>
    <link>https://old.example.com/2024/03/getting-started/</link>
    <pubDate>Sat, 02 Mar 2024 09:00:00 +0000</pubDate>
    <dc:creator><![CDATA[jane]]></dc:creator>
    <guid isPermaLink="false">https://old.example.com/?p=101</guid>
    <content:encoded><![CDATA[
<!-- wp:paragraph --><p>Welcome. This post shows a captioned image and a gallery.</p><!-- /wp:paragraph -->
<!-- wp:image {"id":501,"sizeSlug":"large"} -->
<figure class="wp-block-image size-large"><img src="https://old.example.com/wp-content/uploads/2024/03/hero.jpg" alt="A wide vista" class="wp-image-501"/><figcaption class="wp-element-caption">Sunrise over the ridge.</figcaption></figure>
<!-- /wp:image -->
<!-- wp:gallery {"columns":2} -->
<figure class="wp-block-gallery has-nested-images columns-2">
  <figure class="wp-block-image"><img src="https://old.example.com/wp-content/uploads/2024/03/g1.jpg" alt="Gallery one"/></figure>
  <figure class="wp-block-image"><img src="https://old.example.com/wp-content/uploads/2024/03/g2.jpg" alt="Gallery two"/></figure>
</figure>
<!-- /wp:gallery -->
<!-- wp:paragraph --><p>Thanks for reading.</p><!-- /wp:paragraph -->
]]></content:encoded>
    <excerpt:encoded><![CDATA[An intro post with an image and a gallery.]]></excerpt:encoded>
    <wp:post_id>101</wp:post_id>
    <wp:post_date><![CDATA[2024-03-02 09:00:00]]></wp:post_date>
    <wp:post_name><![CDATA[getting-started]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
    <category domain="category" nicename="tutorials"><![CDATA[Tutorials]]></category>
    <category domain="post_tag" nicename="editor"><![CDATA[Editor]]></category>
    <category domain="post_tag" nicename="getting-started"><![CDATA[Getting Started]]></category>
    <wp:comment>
      <wp:comment_id>9001</wp:comment_id>
      <wp:comment_author><![CDATA[Reader Rita]]></wp:comment_author>
      <wp:comment_author_email><![CDATA[rita@example.com]]></wp:comment_author_email>
      <wp:comment_content><![CDATA[Great intro, thanks!]]></wp:comment_content>
      <wp:comment_approved><![CDATA[1]]></wp:comment_approved>
      <wp:comment_date_gmt><![CDATA[2024-03-02 11:00:00]]></wp:comment_date_gmt>
      <wp:comment_parent>0</wp:comment_parent>
    </wp:comment>
    <wp:comment>
      <wp:comment_id>9002</wp:comment_id>
      <wp:comment_author><![CDATA[Jane observer]]></wp:comment_author>
      <wp:comment_author_email><![CDATA[jane@example.com]]></wp:comment_author_email>
      <wp:comment_content><![CDATA[Glad it helped!]]></wp:comment_content>
      <wp:comment_approved><![CDATA[1]]></wp:comment_approved>
      <wp:comment_date_gmt><![CDATA[2024-03-02 12:00:00]]></wp:comment_date_gmt>
      <wp:comment_parent>9001</wp:comment_parent>
    </wp:comment>
  </item>

  <item>
    <title>Embedding Video and Code</title>
    <link>https://old.example.com/2024/03/embeds-and-code/</link>
    <pubDate>Sat, 09 Mar 2024 09:00:00 +0000</pubDate>
    <dc:creator><![CDATA[marcus]]></dc:creator>
    <guid isPermaLink="false">https://old.example.com/?p=102</guid>
    <content:encoded><![CDATA[
<!-- wp:embed {"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=dQw4w9WgXcQ
</div></figure>
<!-- /wp:embed -->
<!-- wp:code -->
<pre class="wp-block-code"><code>const x = 42;
console.log(x);</code></pre>
<!-- /wp:code -->
<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://example.com/docs">Read the docs</a></div><!-- /wp:button --></div><!-- /wp:buttons -->
]]></content:encoded>
    <wp:post_id>102</wp:post_id>
    <wp:post_date><![CDATA[2024-03-09 09:00:00]]></wp:post_date>
    <wp:post_name><![CDATA[embeds-and-code]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
    <category domain="category" nicename="tutorials"><![CDATA[Tutorials]]></category>
  </item>

  <item>
    <title>A Work in Progress</title>
    <link>https://old.example.com/?p=103</link>
    <dc:creator><![CDATA[jane]]></dc:creator>
    <guid isPermaLink="false">https://old.example.com/?p=103</guid>
    <content:encoded><![CDATA[<!-- wp:paragraph --><p>Draft notes, not published yet.</p><!-- /wp:paragraph -->]]></content:encoded>
    <wp:post_id>103</wp:post_id>
    <wp:post_name><![CDATA[a-work-in-progress]]></wp:post_name>
    <wp:status><![CDATA[draft]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
  </item>

  <item>
    <title>About</title>
    <link>https://old.example.com/about/</link>
    <dc:creator><![CDATA[jane]]></dc:creator>
    <guid isPermaLink="false">https://old.example.com/?page_id=200</guid>
    <content:encoded><![CDATA[<!-- wp:paragraph --><p>The Example Journal is a blog about building software.</p><!-- /wp:paragraph -->]]></content:encoded>
    <wp:post_id>200</wp:post_id>
    <wp:post_name><![CDATA[about]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[page]]></wp:post_type>
  </item>

  <item>
    <title>Dune</title>
    <link>https://old.example.com/books/dune/</link>
    <dc:creator><![CDATA[marcus]]></dc:creator>
    <guid isPermaLink="false">https://old.example.com/?post_type=book&#38;p=300</guid>
    <content:encoded><![CDATA[<!-- wp:paragraph --><p>A review of Dune by Frank Herbert.</p><!-- /wp:paragraph -->]]></content:encoded>
    <wp:post_id>300</wp:post_id>
    <wp:post_name><![CDATA[dune]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[book]]></wp:post_type>
    <wp:postmeta><wp:meta_key><![CDATA[isbn]]></wp:meta_key><wp:meta_value><![CDATA[978-0441013593]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key><![CDATA[rating]]></wp:meta_key><wp:meta_value><![CDATA[5]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key><![CDATA[_edit_lock]]></wp:meta_key><wp:meta_value><![CDATA[1711000000:1]]></wp:meta_value></wp:postmeta>
  </item>

  <item>
    <title>hero.jpg</title>
    <link>https://old.example.com/getting-started/hero/</link>
    <guid isPermaLink="false">https://old.example.com/wp-content/uploads/2024/03/hero.jpg</guid>
    <wp:post_id>501</wp:post_id>
    <wp:post_name><![CDATA[hero-jpg]]></wp:post_name>
    <wp:status><![CDATA[inherit]]></wp:status>
    <wp:post_type><![CDATA[attachment]]></wp:post_type>
    <wp:post_parent>101</wp:post_parent>
    <wp:attachment_url><![CDATA[https://old.example.com/wp-content/uploads/2024/03/hero.jpg]]></wp:attachment_url>
  </item>
</channel>
</rss>`;
}
