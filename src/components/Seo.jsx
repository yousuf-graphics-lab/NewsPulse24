import { Helmet } from 'react-helmet-async';
import {
  DEFAULT_KEYWORDS,
  SITE,
  SITE_URL,
  absoluteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from '../config/site';

/**
 * Per-route document head. Rendered on the client and also collected at build
 * time by scripts/prerender.mjs, so every route ships static meta tags.
 */
export default function Seo({
  title,
  description,
  path = '/',
  image = SITE.defaultImage,
  imageAlt,
  imageWidth = 1200,
  imageHeight = 630,
  type = 'website',
  keywords = [],
  publishedTime,
  modifiedTime,
  author,
  section,
  noindex = false,
  jsonLd = [],
  preloadImage,
}) {
  const fullTitle = title ? `${title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
  const desc = description || SITE.description;
  const canonical = absoluteUrl(path);
  const imageUrl = image.startsWith('http') ? image : absoluteUrl(image);
  const keywordList = [...new Set([...keywords, ...DEFAULT_KEYWORDS])].join(', ');
  const graph = [
    organizationJsonLd(),
    websiteJsonLd(),
    ...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]),
  ].filter(Boolean);

  return (
    <Helmet prioritizeSeoTags>
      <html lang={SITE.language} />
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={keywordList} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={
          noindex
            ? 'noindex, follow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        }
      />
      <meta name="googlebot" content={noindex ? 'noindex, follow' : 'index, follow'} />

      {/* geo / language targeting */}
      <meta httpEquiv="content-language" content="en" />
      <meta name="author" content={author || SITE.legalName} />
      <meta name="publisher" content={SITE.legalName} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      <meta property="og:image:alt" content={imageAlt || `${SITE.name} — ${title || SITE.tagline}`} />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:creator" content={SITE.twitter} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imageAlt || fullTitle} />

      {/* article metadata */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && <meta property="article:author" content={author} />}
      {type === 'article' && section && <meta property="article:section" content={section} />}

      {preloadImage && (
        <link
          rel="preload"
          as="image"
          href={preloadImage.startsWith('http') ? preloadImage : preloadImage}
          fetchpriority="high"
        />
      )}

      <link rel="alternate" type="application/rss+xml" title={`${SITE.name} — News`} href="/feed.xml" />
      <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
      <meta name="theme-color" content={SITE.themeColor} />
      <meta name="apple-mobile-web-app-title" content={SITE.name} />
      <meta name="application-name" content={SITE.name} />

      {/* structured data — one @graph so entities can reference each other */}
      <script type="application/ld+json" data-seo="graph">
        {JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}
      </script>
      {/* hreflang placeholder keeps canonical origin consistent */}
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${path}`} />
    </Helmet>
  );
}
