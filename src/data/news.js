/**
 * Central editorial dataset for NewsPulse 24.
 * Every card, hero slide, ticker item, search result and article page
 * is rendered from this single source of truth.
 *
 * Image attribution: all editorial photography is served from local
 * /public/images assets so the newsroom never renders a broken frame.
 */

export const CATEGORIES = [
  'World',
  'Business',
  'Technology',
  'Sports',
  'Entertainment',
  'Health',
  'Science',
  'Lifestyle',
  'Opinion',
];

const AUTHORS = {
  marcus: {
    name: 'Marcus Vance',
    role: 'Global Affairs Editor',
    initials: 'MV',
    bio: 'Marcus Vance leads international coverage for NewsPulse 24 and has reported from more than forty countries.',
  },
  priya: {
    name: 'Priya Raghunathan',
    role: 'Markets Correspondent',
    initials: 'PR',
    bio: 'Priya Raghunathan covers global markets, central banks and the flows of capital that shape them.',
  },
  elena: {
    name: 'Elena Duarte',
    role: 'Technology Editor',
    initials: 'ED',
    bio: 'Elena Duarte writes about artificial intelligence, computing and the people building the next platform.',
  },
  tariq: {
    name: 'Tariq Osei',
    role: 'Science Correspondent',
    initials: 'TO',
    bio: 'Tariq Osei reports on space, physics and the research labs quietly rewriting what we know.',
  },
  sofia: {
    name: 'Sofía Marchetti',
    role: 'Sports Correspondent',
    initials: 'SM',
    bio: 'Sofía Marchetti has covered four World Cups and every major European final of the past decade.',
  },
  naomi: {
    name: 'Dr. Naomi Feld',
    role: 'Health & Medicine',
    initials: 'NF',
    bio: 'Naomi Feld is a physician and journalist covering clinical research and global public health.',
  },
  james: {
    name: 'James Whitlock',
    role: 'Chief Editorial Writer',
    initials: 'JW',
    bio: 'James Whitlock writes the editorial column and has spent twenty years covering politics and policy.',
  },
  amara: {
    name: 'Amara Diallo',
    role: 'Culture Editor',
    initials: 'AD',
    bio: 'Amara Diallo covers film, television, music and the business of culture.',
  },
};

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

export const STORIES = [
  {
    id: 'np-001',
    slug: 'a-more-connected-world',
    category: 'World',
    title: 'A More Connected World for a Brighter Tomorrow',
    excerpt:
      'Stay informed with the latest global news, in-depth analysis, and real-time updates — only on NewsPulse 24.',
    image: '/images/hero-earth.jpg',
    imageAlt:
      'Planet Earth at night wrapped in glowing red data networks and orbital light trails',
    imagePosition: 'center 45%',
    publishedAt: minutesAgo(12),
    author: AUTHORS.marcus,
    readMinutes: 7,
    views: 1_184_000,
    tags: ['diplomacy', 'connectivity', 'summit', 'future'],
    hero: true,
    heroKicker: 'Breaking News',
    body: [
      {
        type: 'p',
        text: 'From the cables under the Atlantic to the satellites passing overhead, the architecture of global connection has been rebuilt twice in a generation. What happens in the next five years will decide whether those networks distribute opportunity — or concentrate it.',
      },
      {
        type: 'p',
        text: 'This week, delegates from 42 countries gathered in Singapore to sign the first common framework on cross-border data infrastructure, an agreement that has been eighteen months in the making and, until the final hour, uncertain.',
      },
      { type: 'h2', text: 'The new geography of connection' },
      {
        type: 'p',
        text: 'The framework commits signatories to shared technical standards for subsea cable landings, satellite ground stations and cross-border compute corridors. In practice, that means a data packet leaving Lagos for São Paulo should travel the same protected route as one leaving Frankfurt for Tokyo.',
      },
      {
        type: 'quote',
        text: 'We are not building pipes. We are building the assumption that a country on the edge of the network deserves the same latency as one at its centre.',
        cite: 'Dr. Amara Nwosu, chair of the infrastructure working group',
      },
      {
        type: 'p',
        text: 'For emerging markets, the difference is measurable. Engineers in Nairobi can now reach Frankfurt cloud regions in 68 milliseconds, down from 190 a decade ago. That single change moved an entire class of companies — payments, telemedicine, logistics — from impossible to ordinary.',
      },
      { type: 'h2', text: 'Who pays for the next cable' },
      {
        type: 'p',
        text: 'The unresolved question is funding. Private consortia built roughly three-quarters of the world’s subsea capacity, but they build where traffic already exists. The framework creates a modest public co-investment pool of $4.2 billion — small against an estimated $90 billion of need, yet enough to anchor the routes that markets alone will not finance.',
      },
      {
        type: 'list',
        items: [
          'Three new cable corridors announced: West Africa–Brazil, Southeast Asia–East Africa, and the Arctic route to North America.',
          'A shared resilience standard requiring at least two physically separate paths per landing station.',
          'A public register of cable ownership intended to make opaque financing visible.',
        ],
      },
      {
        type: 'p',
        text: 'Not every delegation left satisfied. Civil-liberties groups warned that shared standards could become shared surveillance, and several governments declined to sign pending domestic review. The agreement takes effect in stages from January, with the first corridor scheduled to carry commercial traffic by late 2027.',
      },
      {
        type: 'p',
        text: 'The larger point may be cultural. A connected world is not a world without borders; it is one where distance stops being the first fact of every relationship. That is a smaller claim than the language of summits suggests — and considerably harder to deliver.',
      },
    ],
  },
  {
    id: 'np-002',
    slug: 'ai-breakthrough-promises-a-smarter-future',
    category: 'Technology',
    title: 'AI Breakthrough Promises a Smarter Future',
    excerpt:
      'A new generation of reasoning systems is moving out of the lab and into hospitals, courtrooms and classrooms. The hard part is no longer capability.',
    image: '/images/ai-robot.jpg',
    imageAlt: 'Humanoid artificial intelligence robot with a glowing red eye in a dark studio',
    imagePosition: 'center 40%',
    publishedAt: minutesAgo(38),
    author: AUTHORS.elena,
    readMinutes: 6,
    views: 968_400,
    tags: ['artificial intelligence', 'research', 'policy', 'labour'],
    hero: true,
    heroKicker: 'Technology',
    body: [
      {
        type: 'p',
        text: 'For a decade the promise of artificial intelligence was measured in benchmarks. This year it started being measured in shift handovers, diagnostic turnaround and the number of hours a nurse did not spend typing.',
      },
      {
        type: 'p',
        text: 'Three hospital networks in Europe and Southeast Asia are now running reasoning models in live clinical workflows, with a human clinician required to approve every recommendation. Early figures, presented at a conference in Rotterdam, suggest a 19 percent reduction in time-to-diagnosis for complex imaging cases.',
      },
      { type: 'h2', text: 'From demo to deployment' },
      {
        type: 'p',
        text: 'The systems that work are not the most capable ones. They are the ones that were designed around the institution that uses them — the documentation, the escalation paths, the awkward reality that a radiologist is on call at 3am and does not want to argue with software.',
      },
      {
        type: 'quote',
        text: 'The model was never the bottleneck. The bottleneck was whether a tired clinician could understand in four seconds why the machine said what it said.',
        cite: 'Dr. Ingrid Halvorsen, Oslo University Hospital',
      },
      {
        type: 'h2',
        text: 'The regulatory squeeze',
      },
      {
        type: 'p',
        text: 'Regulators are converging on a model of audited deployment: documented training data, logged decisions and mandatory incident reporting. Industry groups argue this favours incumbents; patient advocates argue the alternative is worse.',
      },
      {
        type: 'p',
        text: 'What everyone agrees on is that the next stage is less about spectacle. It is about procurement, liability insurance and the unglamorous work of teaching organisations to be accountable for a machine.',
      },
    ],
  },
  {
    id: 'np-003',
    slug: 'newspulse-24-goes-global',
    category: 'World',
    title: 'NewsPulse 24 Goes Global: Broadcasting From Six Continents',
    excerpt:
      'A new studio in Singapore completes a 24-hour broadcast ring that lets the network follow the news rather than the clock.',
    image: '/images/live-studio.jpg',
    imageAlt: 'Futuristic news broadcast studio glowing red with a city skyline behind it',
    imagePosition: 'center 50%',
    publishedAt: minutesAgo(64),
    author: AUTHORS.marcus,
    readMinutes: 4,
    views: 542_900,
    tags: ['broadcast', 'media', 'newsroom'],
    hero: true,
    heroKicker: 'Inside NewsPulse',
    body: [
      {
        type: 'p',
        text: 'At 04:12 UTC the Singapore gallery took over the world feed, and for the first time NewsPulse 24 had a desk awake in every time zone from which it broadcasts.',
      },
      {
        type: 'p',
        text: 'The network now operates six production hubs — London, New York, São Paulo, Lagos, Dubai and Singapore — connected by a redundant contribution ring that allows any studio to take air within ninety seconds.',
      },
      { type: 'h2', text: 'Built for the story, not the schedule' },
      {
        type: 'p',
        text: 'The change is editorial as much as technical. A breaking story in East Africa no longer waits for a European desk to open. Correspondents file into a shared rundown; producers in any hub can commission, cut and clear a package.',
      },
      {
        type: 'p',
        text: 'The Singapore studio will anchor the Asia morning block and the network’s rolling business coverage, with a dedicated desk tracking markets from Jakarta to Sydney.',
      },
    ],
  },
  {
    id: 'np-004',
    slug: 'global-leaders-meet-to-strengthen-climate-action',
    category: 'World',
    title: 'Global Leaders Meet to Strengthen Climate Action',
    excerpt:
      'Forty-one heads of state arrive in Geneva with binding pledges on adaptation finance — and a widening gap between promises and delivery.',
    image: '/images/summit.jpg',
    imageAlt: 'International summit hall with diplomats seated among national flags',
    imagePosition: 'center 45%',
    publishedAt: minutesAgo(125),
    author: AUTHORS.marcus,
    readMinutes: 5,
    views: 486_100,
    tags: ['climate', 'diplomacy', 'summit', 'finance'],
    body: [
      {
        type: 'p',
        text: 'The hall was the same; the arithmetic was not. Delegates arriving in Geneva carried national adaptation plans that, for the first time, were costed against a common methodology — and the total, $387 billion a year by 2030, was nearly four times what had been pledged.',
      },
      { type: 'h2', text: 'The funding gap' },
      {
        type: 'p',
        text: 'Adaptation finance has long been the least glamorous line in climate diplomacy. Mitigation attracts ribbon-cuttings; sea walls, early-warning systems and drought-resistant seed attract audit committees.',
      },
      {
        type: 'quote',
        text: 'Every year we delay, the invoice grows and the number of people who can pay it shrinks.',
        cite: 'Amina Toure, African Union climate envoy',
      },
      {
        type: 'p',
        text: 'Three mechanisms emerged from the first day of talks: a pooled insurance facility for small island states, a guarantee fund to de-risk municipal adaptation bonds, and a technical corps of engineers seconded to ministries that have no capacity to spend money well.',
      },
      {
        type: 'p',
        text: 'Whether any of it survives the closing communiqué is another matter. The draft text still contains brackets around the word “binding”, and brackets, in this process, are where ambition goes to wait.',
      },
    ],
  },
  {
    id: 'np-005',
    slug: 'markets-rally-as-tech-stocks-hit-new-highs',
    category: 'Business',
    title: 'Markets Rally as Tech Stocks Hit New Highs',
    excerpt:
      'Semiconductor earnings and a softer inflation print pushed global equities to records, but bond desks are less convinced.',
    image: '/images/markets.jpg',
    imageAlt: 'Financial district skyscrapers glowing at blue hour',
    imagePosition: 'center 55%',
    publishedAt: minutesAgo(245),
    author: AUTHORS.priya,
    readMinutes: 5,
    views: 713_600,
    tags: ['markets', 'stocks', 'inflation', 'semiconductors'],
    body: [
      {
        type: 'p',
        text: 'Equity markets opened the week in the mood for good news and found plenty of it. A cooler-than-expected inflation print and a strong semiconductor earnings season combined to push the benchmark global index to a record close.',
      },
      { type: 'h2', text: 'The narrowness problem' },
      {
        type: 'p',
        text: 'Beneath the headline number, the rally remains unusually concentrated. Nine companies accounted for 61 percent of the index’s advance this quarter — a ratio that makes strategists nervous even as they raise targets.',
      },
      {
        type: 'quote',
        text: 'This is a market paying for a future that has already been priced. The question is not whether AI is real, but whether every company claiming it deserves the multiple.',
        cite: 'Helena Park, chief strategist at Ardent Capital',
      },
      {
        type: 'p',
        text: 'Bond markets tell a quieter story. Ten-year yields barely moved on the inflation data, suggesting fixed-income investors expect the disinflation to be temporary rather than structural.',
      },
      {
        type: 'p',
        text: 'For retail investors, the practical lesson is familiar: breadth matters. When leadership narrows, the index can rise while the average portfolio stalls.',
      },
    ],
  },
  {
    id: 'np-006',
    slug: 'new-space-mission-aims-to-unlock-the-secrets-of-mars',
    category: 'Science',
    title: 'New Space Mission Aims to Unlock the Secrets of Mars',
    excerpt:
      'The Odyssey-2 orbiter carries the most sensitive spectrometer ever flown, hunting for the chemistry that could once have supported life.',
    image: '/images/rocket.jpg',
    imageAlt: 'Heavy launch vehicle lifting off at dusk with a bright exhaust plume',
    imagePosition: 'center 40%',
    publishedAt: minutesAgo(68),
    author: AUTHORS.tariq,
    readMinutes: 6,
    views: 604_800,
    tags: ['space', 'mars', 'nasa', 'exploration'],
    body: [
      {
        type: 'p',
        text: 'The launch window was eleven seconds wide. At 06:41 local time the rocket left the pad, and by the time the second stage separated, the mission had already returned more calibration data than its predecessors managed in a month.',
      },
      { type: 'h2', text: 'Reading the rocks' },
      {
        type: 'p',
        text: 'Odyssey-2 carries a spectrometer sensitive enough to distinguish organic signatures at parts-per-billion concentrations, alongside a ground-penetrating radar that can map subsurface ice to a depth of two kilometres.',
      },
      {
        type: 'quote',
        text: 'We are not looking for a fossil. We are looking for the chemistry that makes a fossil possible.',
        cite: 'Dr. Lena Okafor, principal investigator',
      },
      {
        type: 'p',
        text: 'The target is Jezero’s northern basin, where orbital data suggest a dried delta once met a lake. If the radar confirms layered sediment, a sample-return mission scheduled for the 2030s will have its landing site.',
      },
      {
        type: 'p',
        text: 'The orbiter will spend three months aerobraking before science operations begin. Its first images are expected in February.',
      },
    ],
  },
  {
    id: 'np-007',
    slug: 'global-economy-shows-signs-of-steady-growth',
    category: 'Business',
    title: 'Global Economy Shows Signs of Steady Growth',
    excerpt:
      'Trade volumes, shipping rates and services PMIs are all pointing the same way for the first time in eighteen months.',
    image: '/images/markets.jpg',
    imageAlt: 'International financial district skyline at golden hour',
    imagePosition: 'center 80%',
    publishedAt: minutesAgo(185),
    author: AUTHORS.priya,
    readMinutes: 4,
    views: 388_200,
    tags: ['economy', 'trade', 'growth', 'pmi'],
    body: [
      {
        type: 'p',
        text: 'Three indicators that rarely agree have started to agree. Container throughput, services activity and cross-border credit growth all rose in the same month for the first time since early last year.',
      },
      { type: 'h2', text: 'A broadening, not a boom' },
      {
        type: 'p',
        text: 'Economists caution that the recovery is shallow and uneven. Manufacturing in central Europe remains in contraction, and consumer credit growth in two of the largest emerging economies has slowed.',
      },
      {
        type: 'quote',
        text: 'Steady is the right word. Nothing here looks like a boom, and that is precisely why it may last.',
        cite: 'Dr. Owen Baker, OECD economist',
      },
      {
        type: 'p',
        text: 'For policymakers, the combination of steady growth and cooling inflation is close to ideal. The risk is that it tempts governments to withdraw support before the recovery reaches the households that need it most.',
      },
    ],
  },
  {
    id: 'np-008',
    slug: 'ai-is-transforming-industries-faster-than-expected',
    category: 'Technology',
    title: 'AI Is Transforming Industries Faster Than Expected',
    excerpt:
      'Adoption inside manufacturing and logistics is outpacing consumer-facing AI, and the gains look less like magic, more like maintenance.',
    image: '/images/robot-hand.jpg',
    imageAlt: 'A robotic hand reaching toward a human hand in blue and red light',
    imagePosition: 'center 50%',
    publishedAt: minutesAgo(310),
    author: AUTHORS.elena,
    readMinutes: 5,
    views: 421_700,
    tags: ['artificial intelligence', 'industry', 'automation', 'logistics'],
    body: [
      {
        type: 'p',
        text: 'The most consequential AI deployment of the year is not a chatbot. It is a scheduling engine at a port in Rotterdam that cut average container dwell time by 21 percent without adding a single crane.',
      },
      { type: 'h2', text: 'The boring revolution' },
      {
        type: 'p',
        text: 'Industrial adoption has accelerated because the return on investment is measurable in hours and fuel rather than in engagement. Predictive maintenance, demand forecasting and route optimisation now account for the majority of enterprise AI spending.',
      },
      {
        type: 'p',
        text: 'Workers describe the change in less breathless terms. The system does not replace a shift supervisor; it removes the two hours of spreadsheet work that used to precede the shift.',
      },
      {
        type: 'quote',
        text: 'We did not automate the job. We automated the part of the job nobody wanted.',
        cite: 'A port operations manager, Rotterdam',
      },
      {
        type: 'p',
        text: 'The risk is that the productivity gains accrue to the largest operators, widening the gap with smaller firms that cannot afford integration. That is the shape of the policy debate to come.',
      },
    ],
  },
  {
    id: 'np-009',
    slug: 'new-treatment-offers-hope-for-millions-worldwide',
    category: 'Health',
    title: 'New Treatment Offers Hope for Millions Worldwide',
    excerpt:
      'A targeted therapy cleared a phase-three trial with a 38 percent reduction in progression, and regulators have granted priority review.',
    image: '/images/medical.jpg',
    imageAlt: 'Medical professional in surgical protection working in a modern hospital',
    imagePosition: 'center 45%',
    publishedAt: minutesAgo(430),
    author: AUTHORS.naomi,
    readMinutes: 6,
    views: 655_300,
    tags: ['medicine', 'clinical trial', 'oncology', 'health'],
    body: [
      {
        type: 'p',
        text: 'The trial enrolled 1,842 patients across nineteen countries. The result, presented to a standing ovation in Chicago, was a 38 percent reduction in disease progression versus standard care, with a side-effect profile clinicians described as unusually tolerable.',
      },
      { type: 'h2', text: 'Why this one is different' },
      {
        type: 'p',
        text: 'Unlike earlier generations of targeted therapy, the compound does not require a rare genetic marker. Roughly one in four patients could be eligible — an order of magnitude more than the niche treatments that dominate oncology headlines.',
      },
      {
        type: 'quote',
        text: 'The most important number in this trial is not the hazard ratio. It is the number of hospitals that can administer it safely.',
        cite: 'Professor Daniel Achebe, trial investigator',
      },
      {
        type: 'p',
        text: 'That is the unresolved problem. The therapy requires cold-chain distribution and a diagnostic that many lower-income health systems do not currently run at scale. Manufacturers have committed to tiered pricing, but commitments and clinics are different things.',
      },
      {
        type: 'p',
        text: 'Regulatory decisions in the United States and Europe are expected within nine months.',
      },
    ],
  },
  {
    id: 'np-010',
    slug: 'champions-league-heats-up-with-thrilling-matches',
    category: 'Sports',
    title: 'Champions League Heats Up with Thrilling Matches',
    excerpt:
      'Two stoppage-time winners, a penalty shootout and the tightest group table in a decade: the competition has found its drama again.',
    image: '/images/football.jpg',
    imageAlt: 'Footballer in a red kit sprinting under stadium floodlights',
    imagePosition: 'center 35%',
    publishedAt: minutesAgo(380),
    author: AUTHORS.sofia,
    readMinutes: 4,
    views: 512_400,
    tags: ['football', 'champions league', 'sport'],
    body: [
      {
        type: 'p',
        text: 'Ninety-four minutes had gone at the Estádio do Dragão when the ball broke to the edge of the area and the night changed. It was the second stoppage-time winner of the round — and the fourth in the competition this season.',
      },
      { type: 'h2', text: 'The tactics behind the chaos' },
      {
        type: 'p',
        text: 'Coaches have adapted. Five substitutions, longer added time and a compressed calendar have turned the final twenty minutes of elite matches into a distinct tactical phase, where benches matter as much as starting elevens.',
      },
      {
        type: 'quote',
        text: 'We plan the last quarter-hour separately now. It is almost a different sport.',
        cite: 'A Champions League head coach, speaking after the match',
      },
      {
        type: 'p',
        text: 'With two rounds remaining, five teams in one group can still qualify. The permutations will be projected onto screens across Europe on matchday five, which is exactly the theatre the competition has been missing.',
      },
    ],
  },
  {
    id: 'np-011',
    slug: 'underdog-team-stuns-champions-in-epic-final',
    category: 'Sports',
    title: 'Underdog Team Stuns Champions in Epic Final',
    excerpt:
      'Ranked eleventh at the start of the season, they won on a 118th-minute counter-attack in front of 74,000 people.',
    image: '/images/football.jpg',
    imageAlt: 'Footballer celebrating under bright stadium floodlights',
    imagePosition: 'center 15%',
    publishedAt: minutesAgo(520),
    author: AUTHORS.sofia,
    readMinutes: 4,
    views: 344_900,
    tags: ['football', 'final', 'sport'],
    body: [
      {
        type: 'p',
        text: 'They finished the league in eleventh place and lost their opening fixture by three goals. On Saturday night they lifted the trophy.',
      },
      { type: 'h2', text: 'A counter-attack worth a season' },
      {
        type: 'p',
        text: 'The winning goal came from a turnover in their own half and three passes: the first to the touchline, the second inside, the third through the legs of a defender who had played every minute of the campaign.',
      },
      {
        type: 'quote',
        text: 'Nobody remembers the group table. They remember who lifted it.',
        cite: 'The winning captain',
      },
      {
        type: 'p',
        text: 'The club’s wage bill is a quarter of their opponents’. Their manager, appointed fourteen months ago, has now won more knockout ties than the previous three coaches combined.',
      },
    ],
  },
  {
    id: 'np-012',
    slug: 'global-markets-react-to-new-ai-regulations',
    category: 'World',
    title: 'Global Markets React to New AI Regulations',
    excerpt:
      'The first binding international rules on frontier models take effect in January. Investors are repricing compliance as a competitive moat.',
    image: '/images/capitol.jpg',
    imageAlt: 'Domed government building under a dramatic dark sky',
    imagePosition: 'center 40%',
    publishedAt: minutesAgo(96),
    author: AUTHORS.marcus,
    readMinutes: 5,
    views: 802_500,
    tags: ['regulation', 'artificial intelligence', 'markets', 'policy'],
    body: [
      {
        type: 'p',
        text: 'The rules were published at 09:00 in Brussels and by 09:11 the shares of the three largest model developers had moved by more than two percent. What follows is a year of compliance engineering that will quietly reshape the industry.',
      },
      { type: 'h2', text: 'What the rules actually require' },
      {
        type: 'p',
        text: 'Frontier developers must publish training-data summaries, run pre-deployment evaluations for defined risk categories, and maintain incident logs for a minimum of five years. Smaller open-source projects face lighter obligations, a carve-out that took eleven months to negotiate.',
      },
      {
        type: 'list',
        items: [
          'Mandatory third-party audit for models trained above a compute threshold.',
          'A 72-hour disclosure window for serious incidents.',
          'A right of explanation for individuals subject to automated decisions.',
        ],
      },
      {
        type: 'p',
        text: 'Analysts expect compliance costs to favour incumbents, at least initially. The counterargument, made forcefully by two European venture funds, is that clarity unlocks deployment budgets currently frozen by legal uncertainty.',
      },
      {
        type: 'p',
        text: 'Markets, as ever, have priced both stories at once.',
      },
    ],
  },
  {
    id: 'np-013',
    slug: 'quantum-milestone-puts-error-free-computing-in-reach',
    category: 'Science',
    title: 'Quantum Milestone Puts Error-Free Computing in Reach',
    excerpt:
      'Researchers kept a logical qubit alive for four seconds — long enough to imagine machines that answer questions no classical computer can attempt.',
    image: '/images/ai-robot.jpg',
    imageAlt: 'Advanced humanoid robot head lit by red light',
    imagePosition: 'center 20%',
    publishedAt: minutesAgo(700),
    author: AUTHORS.tariq,
    readMinutes: 6,
    views: 287_100,
    tags: ['quantum', 'physics', 'computing', 'research'],
    body: [
      {
        type: 'p',
        text: 'Quantum computing has spent thirty years being twenty years away. The paper published this week does not change that sentence. It changes the arithmetic behind it.',
      },
      { type: 'h2', text: 'The error-correction milestone' },
      {
        type: 'p',
        text: 'The team encoded a single logical qubit across 49 physical qubits and maintained its coherence for four seconds, three orders of magnitude longer than previous results at comparable fidelity.',
      },
      {
        type: 'quote',
        text: 'For the first time the correction is not theoretical. We can watch it work for longer than it takes to read this sentence.',
        cite: 'Professor Hana Sato, lead author',
      },
      {
        type: 'p',
        text: 'Practical applications remain distant — encryption-breaking machines require millions of physical qubits, not dozens. But chemistry simulations, which tolerate higher error rates, may benefit within a decade.',
      },
    ],
  },
  {
    id: 'np-014',
    slug: 'we-regulated-the-internet-too-late',
    category: 'Opinion',
    title: 'We Regulated the Internet Too Late. AI Is Our Second Chance.',
    excerpt:
      'The argument is not whether to slow down artificial intelligence. It is whether we intend to understand it before it becomes infrastructure.',
    image: '/images/capitol.jpg',
    imageAlt: 'Government building at dusk, symbol of regulation and policy',
    imagePosition: 'center 70%',
    publishedAt: minutesAgo(640),
    author: AUTHORS.james,
    readMinutes: 7,
    views: 198_400,
    tags: ['opinion', 'regulation', 'artificial intelligence', 'democracy'],
    body: [
      {
        type: 'p',
        text: 'There is a version of this column that writes itself: technologies arrive faster than laws, legislators are captured, the public pays. It has been true of railways, radio and the platform internet. It would be comfortable to write it again.',
      },
      { type: 'h2', text: 'The difference this time' },
      {
        type: 'p',
        text: 'But AI is not a distribution network. It is a decision-making technology, and decisions have always been governed by a different logic than pipes. We do not regulate the physics of a courtroom; we regulate who may speak in one, and what counts as a reason.',
      },
      {
        type: 'p',
        text: 'The rules published this week are imperfect in the ordinary way of all first drafts. They favour large firms. They define risk categories with the confident vagueness of committees. They will be gamed.',
      },
      {
        type: 'quote',
        text: 'The choice is not between innovation and regulation. It is between rules written in public and rules written in contracts.',
        cite: 'NewsPulse 24 editorial board',
      },
      {
        type: 'p',
        text: 'And yet they establish the one thing no private effort can: a shared floor. A model deployed in one country can no longer be sold in another without explaining how it was trained. That sentence is modest, and it is the beginning of accountability.',
      },
      {
        type: 'p',
        text: 'The internet taught us that infrastructure becomes invisible, and invisible things are hard to govern. AI is not invisible yet. We have perhaps five years in which the public can still see the machine. It would be a waste to spend them arguing about the word “binding”.',
      },
    ],
  },
  {
    id: 'np-015',
    slug: 'inside-televisions-new-golden-age',
    category: 'Entertainment',
    title: 'Inside Television’s New Golden Age — and Who Pays for It',
    excerpt:
      'Production budgets are up, episode counts are down, and the studio floor is busier than it has been in a decade.',
    image: '/images/live-studio.jpg',
    imageAlt: 'Glowing television studio set with red lighting and screens',
    imagePosition: 'center 20%',
    publishedAt: minutesAgo(560),
    author: AUTHORS.amara,
    readMinutes: 4,
    views: 176_800,
    tags: ['television', 'culture', 'media', 'streaming'],
    body: [
      {
        type: 'p',
        text: 'Walk onto a soundstage in the middle of a Tuesday and the first thing you notice is how few people are standing still. The second is the number of screens.',
      },
      { type: 'h2', text: 'The economics of fewer episodes' },
      {
        type: 'p',
        text: 'Streaming platforms have discovered what broadcasters knew in the 1970s: scarcity creates attention. Orders have shifted toward six- and eight-episode seasons with budgets that would have funded twelve a decade ago.',
      },
      {
        type: 'quote',
        text: 'We stopped making filler. What we make now has to justify the subscription on its own.',
        cite: 'A showrunner, speaking on condition of anonymity',
      },
      {
        type: 'p',
        text: 'The consequence for crews is a boom in short, intense contracts. Studios are booked solid; the people who light, build and dress those studios are working fourteen-week sprints with three weeks of uncertainty between them.',
      },
    ],
  },
  {
    id: 'np-016',
    slug: 'the-24-hour-city',
    category: 'Lifestyle',
    title: 'The 24-Hour City: How Nightlife Is Reshaping Downtown',
    excerpt:
      'Cities are extending transit, licensing late kitchens and redesigning streets for the hours after midnight. The result is a different kind of downtown.',
    image: '/images/markets.jpg',
    imageAlt: 'Downtown skyscrapers glowing after dark',
    imagePosition: 'center 30%',
    publishedAt: minutesAgo(840),
    author: AUTHORS.amara,
    readMinutes: 5,
    views: 154_200,
    tags: ['cities', 'nightlife', 'design', 'lifestyle'],
    body: [
      {
        type: 'p',
        text: 'At one in the morning, the streets around Central Station are busier than they were at lunchtime a decade ago. Not because more people live there, but because more of them work there — and the city has stopped pretending otherwise.',
      },
      { type: 'h2', text: 'Designing for the second shift' },
      {
        type: 'p',
        text: 'Night mayors, extended metro hours and 24-hour licensing are the visible changes. Less visible is the lighting strategy: brighter at crossing points, dimmer at doorways, warmer along restaurant streets.',
      },
      {
        type: 'quote',
        text: 'A good night city is not a city that never sleeps. It is a city where being awake at 3am does not make you a suspect.',
        cite: 'Lena Brandt, urban planner',
      },
      {
        type: 'p',
        text: 'Critics warn gentrification arrives on the same timetable as the night bus. Rents in the newly licensed quarter have risen eleven percent in two years.',
      },
    ],
  },
  {
    id: 'np-017',
    slug: 'the-sleep-economy',
    category: 'Health',
    title: 'The Sleep Economy Is Booming. Your Brain Is Not.',
    excerpt:
      'Sales of trackers, supplements and temperature-controlled mattresses have tripled. Sleep quality has not improved.',
    image: '/images/medical.jpg',
    imageAlt: 'Healthcare worker in a dim, modern clinical environment',
    imagePosition: 'center 75%',
    publishedAt: minutesAgo(920),
    author: AUTHORS.naomi,
    readMinutes: 5,
    views: 141_500,
    tags: ['sleep', 'wellness', 'research', 'health'],
    body: [
      {
        type: 'p',
        text: 'The global market for sleep products is now valued at $112 billion. In the same period, the proportion of adults reporting insufficient sleep has risen in nine of the twelve countries with long-term survey data.',
      },
      { type: 'h2', text: 'Measuring is not treating' },
      {
        type: 'p',
        text: 'Sleep researchers speak of an orthosomnia effect: patients who sleep worse because they are anxious about their wearable’s score. The device is not wrong, exactly. It is simply measuring a phenomenon that responds poorly to measurement.',
      },
      {
        type: 'quote',
        text: 'The most effective sleep intervention we have is a consistent wake time and a dark room. Neither requires an app.',
        cite: 'Dr. Ruth Kaminski, sleep physician',
      },
      {
        type: 'p',
        text: 'None of which means the category is worthless. Cognitive behavioural therapy for insomnia now has a decade of evidence behind it — and is rarely the thing sold to you at 2am.',
      },
    ],
  },
  {
    id: 'np-018',
    slug: 'climate-summit-needed-a-deadline',
    category: 'Opinion',
    title: 'The Climate Summit Needed a Deadline, Not a Declaration',
    excerpt:
      'Another communiqué, another round of applause, another year of emissions. The gap between the language and the physics is now the story.',
    image: '/images/summit.jpg',
    imageAlt: 'International summit table with delegates and flags',
    imagePosition: 'center 70%',
    publishedAt: minutesAgo(1050),
    author: AUTHORS.james,
    readMinutes: 6,
    views: 132_700,
    tags: ['opinion', 'climate', 'policy'],
    body: [
      {
        type: 'p',
        text: 'The final communiqué runs to nineteen pages. It contains the word “urgent” eleven times, the word “commit” four, and no dates on which anything must be finished.',
      },
      { type: 'h2', text: 'Why deadlines matter' },
      {
        type: 'p',
        text: 'Diplomats will tell you that deadlines are inflexible instruments for problems that require consensus. They are right. They are also the only instruments that have ever worked.',
      },
      {
        type: 'quote',
        text: 'A target without a date is a preference.',
        cite: 'NewsPulse 24 editorial board',
      },
      {
        type: 'p',
        text: 'The Montreal Protocol worked because it named a date and a consequence. The Paris Agreement has been remarkably durable precisely because its architecture lets countries choose their own numbers — and remarkably insufficient for the same reason.',
      },
      {
        type: 'p',
        text: 'What Geneva needed was one date everyone would be embarrassed to miss. It produced one sentence too many, and one commitment too few.',
      },
    ],
  },
];

export const getStoryBySlug = (slug) => STORIES.find((s) => s.slug === slug);

export const getStoryById = (id) => STORIES.find((s) => s.id === id);

export const HERO_STORIES = [
  { ...STORIES[0], heroKicker: 'Breaking News' },
  { ...STORIES[1], heroKicker: 'Technology' },
  { ...STORIES[2], heroKicker: 'Inside NewsPulse' },
];

export const TOP_STORIES = [
  STORIES[3],
  STORIES[4],
  STORIES[1],
  STORIES[9],
];

export const TRENDING_IDS = [
  'np-001',
  'np-006',
  'np-005',
  'np-012',
  'np-009',
];
export const TRENDING = TRENDING_IDS.map(getStoryById).filter(Boolean);

export const BREAKING_HEADLINES = [STORIES[11], STORIES[0], STORIES[7], STORIES[4], STORIES[12]];

export const storiesByCategory = (category) =>
  category === 'All' ? STORIES : STORIES.filter((s) => s.category === category);

export const relatedStories = (story, count = 3) => {
  const sameCategory = STORIES.filter(
    (s) => s.id !== story.id && s.category === story.category,
  );
  const rest = STORIES.filter(
    (s) => s.id !== story.id && s.category !== story.category,
  ).sort((a, b) => b.views - a.views);
  return [...sameCategory, ...rest].slice(0, count);
};

export const formatRelativeTime = (iso) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export const formatAbsoluteDate = (iso) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));

export const formatCompactViews = (n) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const searchStories = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return STORIES.map((story) => {
    const haystack = [
      story.title,
      story.category,
      story.excerpt,
      story.author.name,
      ...story.tags,
    ]
      .join(' ')
      .toLowerCase();
    const score = terms.reduce(
      (acc, term) => (haystack.includes(term) ? acc + 1 : acc),
      0,
    );
    return { story, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.story.views - a.story.views)
    .map((r) => r.story);
};

export { AUTHORS };
