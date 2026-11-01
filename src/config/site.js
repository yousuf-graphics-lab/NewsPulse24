/**
 * Central SEO configuration. Override the canonical origin at build time with
 * VITE_SITE_URL (no trailing slash), e.g. VITE_SITE_URL=https://news.example.com
 */
export const SITE_URL = (import.meta.env?.VITE_SITE_URL || 'https://newspulse24.com').replace(
  /\/$/,
  '',
);

export const SITE = {
  name: 'NewsPulse 24',
  legalName: 'NewsPulse 24 Media Group',
  shortName: 'NewsPulse 24',
  tagline: 'Real News. Global Impact.',
  description:
    'NewsPulse 24 delivers breaking world news, business and markets, technology, science, health, sport and culture — with live broadcast coverage and in-depth analysis from six bureaux across four continents.',
  locale: 'en_GB',
  language: 'en',
  themeColor: '#050608',
  twitter: '@newspulse24',
  defaultImage: '/og-image.jpg',
  founded: '2016',
  addressCountry: 'GB',
  newsrooms: ['London', 'New York', 'São Paulo', 'Lagos', 'Dubai', 'Singapore'],
  sections: [
    'World',
    'Business',
    'Technology',
    'Sports',
    'Entertainment',
    'Health',
    'Science',
    'Lifestyle',
    'Opinion',
  ],
};

export const absoluteUrl = (path = '/') =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Keyword set blended from section names and editorial topics. */
export const DEFAULT_KEYWORDS = [
  'breaking news',
  'world news',
  'international news',
  'news today',
  'business news',
  'markets',
  'technology news',
  'artificial intelligence',
  'science news',
  'space exploration',
  'health news',
  'sports news',
  'live news',
  'NewsPulse 24',
];

export const organizationJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE.name,
  legalName: SITE.legalName,
  alternateName: SITE.shortName,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: absoluteUrl('/logo-512.png'),
    width: 512,
    height: 512,
  },
  image: absoluteUrl(SITE.defaultImage),
  description: SITE.description,
  slogan: SITE.tagline,
  foundingDate: SITE.founded,
  sameAs: [
    `https://twitter.com/${SITE.twitter.replace('@', '')}`,
    'https://www.facebook.com/newspulse24',
    'https://www.linkedin.com/company/newspulse24',
    'https://www.youtube.com/@newspulse24',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'newsroom',
      email: 'desk@newspulse24.com',
      availableLanguage: ['English'],
    },
  ],
  publishingPrinciples: absoluteUrl('/about'),
  masthead: absoluteUrl('/about'),
  ethicsPolicy: absoluteUrl('/about'),
  diversityPolicy: absoluteUrl('/about'),
  actionableFeedbackPolicy: absoluteUrl('/about'),
});

export const websiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE.name,
  alternateName: SITE.shortName,
  url: SITE_URL,
  description: SITE.description,
  inLanguage: SITE.language,
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbJsonLd = (trail) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: absoluteUrl(item.href),
  })),
});

export const articleJsonLd = (story, { section, body } = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'NewsArticle',
  '@id': `${absoluteUrl(`/article/${story.slug}`)}#article`,
  headline: story.title,
  alternativeHeadline: story.excerpt,
  description: story.excerpt,
  image: [absoluteUrl(story.image), absoluteUrl(SITE.defaultImage)],
  datePublished: story.publishedAt,
  dateModified: story.publishedAt,
  articleSection: section || story.category,
  keywords: story.tags?.join(', '),
  wordCount: body ? body.replace(/\s+/g, ' ').trim().split(' ').length : undefined,
  inLanguage: SITE.language,
  isAccessibleForFree: true,
  url: absoluteUrl(`/article/${story.slug}`),
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': absoluteUrl(`/article/${story.slug}`),
  },
  author: {
    '@type': 'Person',
    name: story.author.name,
    jobTitle: story.author.role,
    url: absoluteUrl(`/search?q=${encodeURIComponent(story.author.name)}`),
  },
  publisher: { '@id': `${SITE_URL}/#organization` },
});
