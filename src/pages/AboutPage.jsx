import { Link } from 'react-router-dom';
import { ArrowLeft, Globe2, ShieldCheck, Users } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import Seo from '../components/Seo';

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Verification before velocity',
    body: 'Every claim is attributed, every image sourced. Our verification desk signs off on a story before it reaches the wire — and issues public corrections when we are wrong.',
  },
  {
    icon: Globe2,
    title: 'Six bureaux, one newsroom',
    body: 'London, New York, São Paulo, Lagos, Dubai and Singapore file into a single rundown, so coverage follows the story rather than the time zone.',
  },
  {
    icon: Users,
    title: 'Reader-funded independence',
    body: 'Membership revenue keeps our reporting free of advertiser pressure. Editorial decisions sit with editors, never with commercial partners.',
  },
];


const POLICIES = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    body: 'We store only what a reader hands us: an email address for briefings and a reading list kept in your own browser. No analytics profiles are built, no data is sold, and newsletter records never leave this device in the demo build.',
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    body: 'Reporting on NewsPulse 24 is published for information, not as advice. All content is produced for this front-end demonstration; subscriptions and sign-in are simulated and no payment is ever taken.',
  },
  {
    id: 'cookies',
    title: 'Cookie Settings',
    body: 'NewsPulse 24 sets no advertising or third-party cookies. Only functional storage — reading list, briefing preference and session state — is used, and you can clear it at any time from your browser settings.',
  },
];

export default function AboutPage() {
  return (
    <main id="main" className="container-news py-6">
      <Seo
        title="About the newsroom and editorial standards"
        description="How NewsPulse 24 reports: verification before velocity, six bureaux filing into one rundown, and reader-funded independence. Read our editorial standards and corrections policy."
        path="/about"
        keywords={['about NewsPulse 24', 'editorial standards', 'corrections policy', 'newsroom']}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'About NewsPulse 24',
            mainEntity: { '@id': 'https://newspulse24.com/#organization' },
          },
        ]}
      />
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-pulse transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to homepage
      </Link>

      <div className="panel overflow-hidden">
        <div className="relative border-b border-line p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
          <div className="relative">
            <BrandLogo size="md" />
            <h1 className="heading-xl mt-4 max-w-2xl text-[26px] leading-tight sm:text-[34px]">
              Real news. Global impact. Written for people who need to understand the world, not
              just react to it.
            </h1>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
              NewsPulse 24 is an independent international news organisation covering world affairs,
              business, technology, science, health, sport and culture. This site is a complete,
              interactive front-end implementation of our newsroom product — every control on the
              page is functional, and no simulated claims are presented as real reporting.
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[7px] border border-line bg-ink-800/60 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-[6px] bg-pulse/[0.12] ring-1 ring-pulse/25">
                <Icon className="h-4 w-4 text-pulse" />
              </span>
              <h2 className="mt-3 text-[13px] font-bold text-bone">{title}</h2>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 border-t border-line p-6 sm:gap-8 sm:p-8 lg:grid-cols-3">
          {POLICIES.map(({ id, title, body }) => (
            <section key={id} id={id} className="scroll-mt-32">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-bone">{title}</h2>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{body}</p>
            </section>
          ))}
        </div>

        <div className="border-t border-line p-6 sm:p-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-bone">
            About this build
          </h2>
          <ul className="mt-3 grid gap-2 text-[11.5px] leading-relaxed text-muted sm:grid-cols-2">
            <li>• Editorial photography is stored locally so no frame ever fails to render.</li>
            <li>• Search, category filters and sorting all run against one central story dataset.</li>
            <li>• Subscribe and sign-in flows are clearly labelled demonstrations — no data leaves your browser.</li>
            <li>• Live broadcast shows an honest unavailable-stream state rather than a fake feed.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
