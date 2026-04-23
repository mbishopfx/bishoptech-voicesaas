#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_OUTPUT_ROOT = path.join(projectRoot, 'generated', 'vapi-kb');
const DEFAULT_MAX_PAGES = 8;

const COMMON_WORDS = new Set([
  'about',
  'and',
  'area',
  'book',
  'body',
  'call',
  'contact',
  'faq',
  'for',
  'from',
  'hair',
  'home',
  'hours',
  'in',
  'into',
  'laser',
  'med',
  'more',
  'our',
  'page',
  'phone',
  'service',
  'services',
  'skin',
  'spa',
  'the',
  'to',
  'visit',
  'weight',
  'with',
]);

const SERVICE_KEYWORDS = [
  'botox',
  'jeuveau',
  'dysport',
  'filler',
  'lip flip',
  'lip injections',
  'rf microneedling',
  'exion',
  'chemical peel',
  'diamond glow',
  'laser hair removal',
  'prp hair restoration',
  'weight management',
  'weight loss',
  'iv therapy',
];

const GENERIC_SERVICE_NAMES = new Set(['Skin']);

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function normalizeWhitespace(text) {
  return decodeHtmlEntities(text)
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripTags(html) {
  return normalizeWhitespace(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(p|div|h[1-6]|li|tr|td|th|section|article|header|footer|nav|br|ul|ol)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  );
}

function titleCase(input) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getHostname(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function normalizeUrl(url) {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString();
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return '';
}

function extractTitle(html) {
  return decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '');
}

function extractJsonLd(html) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items = [];

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      items.push(parsed);
    } catch {
      continue;
    }
  }

  return items;
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const base = new URL(baseUrl);
  const hrefRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = hrefRegex.exec(html))) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue;
    }

    try {
      const resolved = new URL(href, base);
      if (resolved.hostname !== base.hostname) {
        continue;
      }

      resolved.hash = '';
      resolved.search = '';
      links.add(resolved.toString());
    } catch {
      continue;
    }
  }

  return [...links];
}

function extractContactFacts(html, pageUrl) {
  const title = extractTitle(html);
  const description = extractMeta(html, 'description') || extractMeta(html, 'og:description');
  const text = stripTags(html);
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const phoneMatches = [...new Set([...text.matchAll(/(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/g)].map((match) => `(${match[1]}) ${match[2]}-${match[3]}`))];
  const addressMatch = text.match(/(\d+\s+[^\n]+?\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Hwy|Highway|Dr|Drive|Ct|Court|Way|Ln|Lane)[^\n]*\n?[^\n]*,\s*[A-Z]{2}\s+\d{5})/i);
  const socialLinks = [...new Set([...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => /instagram\.com|facebook\.com|tiktok\.com|youtube\.com|linkedin\.com/i.test(href)))];
  const hoursIndex = lines.findIndex((line) => /hours/i.test(line));
  const hoursParts = [];

  if (hoursIndex >= 0) {
    const firstLine = lines[hoursIndex].replace(/.*hours[:\s-]*/i, '').trim();
    if (firstLine) {
      hoursParts.push(firstLine);
    }

    for (let index = hoursIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^phone$/i.test(line) || /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(line)) {
        break;
      }

      if (hoursParts.length && /^(address|location|visit us)$/i.test(line)) {
        break;
      }

      hoursParts.push(line);

      if (hoursParts.length >= 4) {
        break;
      }
    }
  }

  return {
    title,
    description,
    text,
    phone: phoneMatches[0] ?? '',
    address: addressMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? '',
    hours: hoursParts.join('; '),
    socialLinks,
    pageUrl,
  };
}

function classifyPage(url) {
  const pathname = new URL(url).pathname.toLowerCase();

  if (pathname === '/' || pathname === '/home') {
    return 'home';
  }

  if (pathname.includes('contact')) {
    return 'contact';
  }

  if (pathname.includes('appointment')) {
    return 'appointments';
  }

  if (pathname.includes('all-services')) {
    return 'services-index';
  }

  if (pathname.includes('/services/body')) {
    return 'body';
  }

  if (pathname.includes('/face')) {
    return 'face';
  }

  if (pathname.includes('/blog/')) {
    return 'blog';
  }

  return 'other';
}

function summarizeServiceSections(text) {
  const matches = [];
  const servicePattern = new RegExp(`\\b(${SERVICE_KEYWORDS.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  let match;

  while ((match = servicePattern.exec(text))) {
    const snippet = text.slice(Math.max(0, match.index - 140), Math.min(text.length, match.index + 220));
    matches.push({ name: titleCase(match[1]), snippet: normalizeWhitespace(snippet) });
  }

  const deduped = [];
  const seen = new Set();
  for (const item of matches) {
    const key = item.name.toLowerCase();
    if (GENERIC_SERVICE_NAMES.has(item.name)) {
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function makeParagraphs(items) {
  return items.filter(Boolean).map((item) => `- ${item}`);
}

function buildPageMarkdown(page) {
  const pageType = classifyPage(page.url);
  const title = page.title || page.url;
  const intro = page.description ? page.description : `Source page: ${page.url}`;
  const lines = [
    `# ${title}`,
    '',
    `Source: ${page.url}`,
    '',
    intro,
    '',
    '## Extracted notes',
  ];

  const serviceSections = summarizeServiceSections(page.text);
  if (serviceSections.length) {
    lines.push('');
    lines.push('### Service signals');
    for (const section of serviceSections.slice(0, 8)) {
      lines.push(`- ${section.name}: ${section.snippet}`);
    }
  }

  if (page.phone || page.address || page.hours || page.socialLinks.length) {
    lines.push('');
    lines.push('### Contact signals');
    if (page.phone) {
      lines.push(`- Phone: ${page.phone}`);
    }
    if (page.address) {
      lines.push(`- Address: ${page.address}`);
    }
    if (page.hours) {
      lines.push(`- Hours: ${page.hours}`);
    }
    for (const link of page.socialLinks) {
      lines.push(`- Social: ${link}`);
    }
  }

  if (pageType === 'blog') {
    lines.push('');
    lines.push('### Blog note');
    lines.push('- Blog pages are useful for tone and topical context, but not all claims should be treated as operational facts.');
  }

  lines.push('');
  lines.push('### Verbatim-safe summary');
  lines.push('- This page was condensed into short factual bullets for assistant grounding.');

  return lines.join('\n');
}

function buildBusinessOverviewMarkdown({ businessName, rootUrl, pages, focusNotes, facts }) {
  const primaryPage = pages.find((page) => page.pageType === 'home') ?? pages[0];
  const serviceTerms = new Set();

  for (const page of pages) {
    for (const service of summarizeServiceSections(page.text)) {
      serviceTerms.add(service.name);
    }
  }

  const services = [...serviceTerms].sort((a, b) => a.localeCompare(b));

  return [
    `# ${businessName} Knowledge Base Overview`,
    '',
    `Root URL: ${rootUrl}`,
    `Primary source title: ${primaryPage?.title ?? 'Unknown'}`,
    '',
    '## What this assistant should know',
    ...makeParagraphs([
      facts.description ? facts.description : 'Use the site language as the source of truth for brand tone and service descriptions.',
      facts.phone ? `Main phone: ${facts.phone}` : 'Phone number not found on the source pages.',
      facts.address ? `Location: ${facts.address}` : 'Address not found on the source pages.',
      facts.hours ? `Hours: ${facts.hours}` : 'Hours not found on the source pages.',
    ]),
    '',
    '## Services found on the site',
    ...services.length ? services.map((service) => `- ${service}`) : ['- No service names were extracted automatically.'],
    '',
    '## Brand cues',
    '- Likely tone: polished, calm, premium, and wellness-focused. This is an inference from the business name and service mix, not a quoted brand statement.',
    '- The assistant should sound helpful, not medical or salesy.',
    '',
    '## Operating rules',
    ...makeParagraphs([
      'Answer common questions directly when the answer is visible in the KB.',
      'For pricing, schedules, and eligibility questions, only state facts that are present in the source material.',
      'When the caller wants to book, collect details and hand off to the team if no live booking system is confirmed.',
      'When the caller is unsure, keep the conversation moving with one question at a time.',
    ]),
    '',
    '## Focus notes',
    ...focusNotes.map((note) => `- ${note}`),
  ].join('\n');
}

function buildAssistantPromptMarkdown({ businessName, facts }) {
  return [
    `# ${businessName} Assistant Prompt`,
    '',
    'You are the front-desk voice assistant for this med spa.',
    'Your job is to answer questions, book appointments, and take messages.',
    '',
    '## Behavior',
    '- Be warm, concise, and polished.',
    '- Ask one question at a time.',
    '- Confirm phone numbers, treatments, and preferred timing back to the caller.',
    '- Do not invent pricing, provider availability, or medical claims.',
    '- If the caller asks for something outside the KB, offer a callback or human handoff.',
    '',
    '## Booking flow',
    '- Capture: name, callback number, treatment interest, desired timeframe, and whether this is a first-time visit.',
    '- If the caller wants to book but no live calendar integration is confirmed, take a detailed message and promise follow-up.',
    '',
    '## Message-taking flow',
    '- Capture the reason for the call, preferred callback number, and best time to reach them.',
    '- Summarize the message before ending the call.',
    '',
    '## Source facts',
    ...makeParagraphs([
      facts.phone ? `Phone: ${facts.phone}` : 'Phone not extracted.',
      facts.address ? `Address: ${facts.address}` : 'Address not extracted.',
      facts.hours ? `Hours: ${facts.hours}` : 'Hours not extracted.',
    ]),
  ].join('\n');
}

function buildTestScenariosMarkdown(businessName) {
  return [
    `# ${businessName} Test Scenarios`,
    '',
    'Use these calls to find flaws before a live demo.',
    '',
    '## Scenarios',
    '- I want Botox pricing and I only have 30 seconds.',
    '- I have never been to a med spa before. What should I expect?',
    '- I want to book a filler consult next week.',
    '- I am calling after hours and need to leave a message.',
    '- Do you do laser hair removal on the face and bikini line?',
    '- I am comparing med spas. Why would I choose you?',
    '- I have a skin concern and want to know if RF microneedling is a fit.',
    '- Can someone call me back today? I am not ready to book yet.',
    '',
    '## Expected failure checks',
    '- The assistant should not invent exact prices unless the source clearly states them.',
    '- The assistant should not give medical advice or diagnose conditions.',
    '- The assistant should not ramble when a direct answer is enough.',
    '- The assistant should not miss callback details on message-taking calls.',
  ].join('\n');
}

function buildFaqMarkdown({ businessName, facts, pages }) {
  const services = [];

  for (const page of pages) {
    for (const service of summarizeServiceSections(page.text)) {
      services.push(service);
    }
  }

  const dedupedServices = [];
  const seen = new Set();
  for (const service of services) {
    if (seen.has(service.name.toLowerCase())) {
      continue;
    }
    seen.add(service.name.toLowerCase());
    dedupedServices.push(service);
  }

  const entries = [
    {
      q: 'Where are you located?',
      a: facts.address || 'The address was not clearly surfaced on the source pages.',
    },
    {
      q: 'What are your hours?',
      a: facts.hours || 'The hours were not clearly surfaced on the source pages.',
    },
    {
      q: 'What is the main phone number?',
      a: facts.phone || 'A phone number was not clearly surfaced on the source pages.',
    },
    {
      q: 'What services do you offer?',
      a: dedupedServices.length
        ? dedupedServices.slice(0, 8).map((service) => service.name).join(', ')
        : 'Service details were not automatically extracted from the source pages.',
    },
    {
      q: 'Can I book an appointment by phone?',
      a: 'Yes, the assistant should collect the request and route it to the team if an online calendar is not confirmed.',
    },
  ];

  return [
    `# ${businessName} FAQ`,
    '',
    ...entries.flatMap((entry) => [`## ${entry.q}`, '', entry.a, '']),
    '## Safety note',
    '- If a caller asks for medical advice, the assistant should keep the answer operational and encourage a professional consult.',
  ].join('\n');
}

function buildBookingMarkdown({ businessName }) {
  return [
    `# ${businessName} Booking and Handoff Rules`,
    '',
    '## Capture fields',
    '- Caller name',
    '- Callback number',
    '- Treatment or service interest',
    '- Desired timeframe',
    '- New patient or returning patient',
    '- Best callback window',
    '',
    '## Book if possible',
    '- If a live scheduling integration exists, offer the next available slot and confirm the appointment details.',
    '- If no live scheduler is connected, take the booking request and route it to a human.',
    '',
    '## Message-taking fallback',
    '- If the caller is not ready to book, capture the reason for the call and a clear callback window.',
    '- Summarize the message before ending.',
    '',
    '## Hard stops',
    '- Do not guess on treatment candidacy, pricing, or downtime.',
    '- Do not claim that a specific outcome is guaranteed.',
  ].join('\n');
}

function buildManifestMarkdown({ businessName, rootUrl, outputDir, pages, facts }) {
  const pageList = pages
    .map((page) => `- [${page.title || page.url}](./${page.fileName})`)
    .join('\n');

  return [
    `# ${businessName} KB Manifest`,
    '',
    `Root URL: ${rootUrl}`,
    '',
    '## Source pages',
    pageList,
    '',
    '## Fact summary',
    ...makeParagraphs([
      facts.phone ? `Phone: ${facts.phone}` : 'Phone not found.',
      facts.address ? `Address: ${facts.address}` : 'Address not found.',
      facts.hours ? `Hours: ${facts.hours}` : 'Hours not found.',
    ]),
  ].join('\n');
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; VoiceOpsKB/1.0; +https://docs.vapi.ai)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchSitemapUrls(rootUrl) {
  const sitemapUrl = new URL('/sitemap.xml', rootUrl).toString();

  try {
    const xml = await fetchPage(sitemapUrl);
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => decodeHtmlEntities(match[1].trim()));
  } catch {
    return [];
  }
}

function selectPages(rootUrl, discoveredLinks, sitemapUrls, maxPages) {
  const root = new URL(rootUrl);
  const candidates = new Map();
  const prioritizedPaths = ['/','/home','/appointments','/contact','/all-services','/face','/services/body'];

  for (const url of [...prioritizedPaths.map((pathname) => new URL(pathname, rootUrl).toString()), ...sitemapUrls, ...discoveredLinks]) {
    try {
      const resolved = new URL(url);
      if (resolved.hostname !== root.hostname) {
        continue;
      }
      resolved.hash = '';
      resolved.search = '';
      const pathname = resolved.pathname === '/home' ? '/' : resolved.pathname;
      resolved.pathname = pathname;
      const normalized = resolved.toString();
      const score = prioritizedPaths.includes(pathname) ? 100 : pathname.split('/').filter(Boolean).length === 0 ? 95 : 50 - pathname.length;
      const existing = candidates.get(normalized);
      if (!existing || existing.score < score) {
        candidates.set(normalized, { url: normalized, score });
      }
    } catch {
      continue;
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, maxPages)
    .map((entry) => entry.url);
}

async function crawlPages(rootUrl, maxPages) {
  const rootHtml = await fetchPage(rootUrl);
  const rootLinks = extractLinks(rootHtml, rootUrl);
  const sitemapUrls = await fetchSitemapUrls(rootUrl);
  const selectedUrls = selectPages(rootUrl, rootLinks, sitemapUrls, maxPages);
  const pages = [];

  for (const url of selectedUrls) {
    try {
      const html = url === normalizeUrl(rootUrl) ? rootHtml : await fetchPage(url);
      const title = extractTitle(html) || new URL(url).pathname.replace(/\/+$/, '').split('/').filter(Boolean).at(-1) || 'Home';
      const description = extractMeta(html, 'description') || extractMeta(html, 'og:description');
      const text = stripTags(html);
      const links = extractLinks(html, url);
      const structuredData = extractJsonLd(html);
      const contactFacts = extractContactFacts(html, url);

      pages.push({
        url,
        title,
        description,
        text,
        links,
        structuredData,
        pageType: classifyPage(url),
        ...contactFacts,
      });
    } catch (error) {
      pages.push({
        url,
        title: new URL(url).pathname,
        description: '',
        text: '',
        links: [],
        structuredData: [],
        pageType: classifyPage(url),
        pageError: error instanceof Error ? error.message : String(error),
        phone: '',
        address: '',
        hours: '',
        socialLinks: [],
      });
    }
  }

  return pages;
}

function inferBusinessName(pages, rootUrl) {
  const homePage = pages.find((page) => page.pageType === 'home');
  const firstTitle = homePage?.title || extractTitle(homePage?.html ?? '') || '';
  if (firstTitle) {
    return firstTitle.replace(/\s+—.*$/, '').replace(/\s+-.*$/, '').trim();
  }

  return titleCase(new URL(rootUrl).hostname.replace(/^www\./, '').split('.')[0]);
}

async function writeFileSafe(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function printSummary({ businessName, outputDir, pages, facts }) {
  console.log(`Built KB pack for ${businessName}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Pages: ${pages.length}`);
  console.log(`Phone: ${facts.phone || 'n/a'}`);
  console.log(`Address: ${facts.address || 'n/a'}`);
  console.log(`Hours: ${facts.hours || 'n/a'}`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    url: 'https://www.serenitymedspa417.com/',
    output: DEFAULT_OUTPUT_ROOT,
    maxPages: DEFAULT_MAX_PAGES,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--url' && next) {
      options.url = next;
      index += 1;
      continue;
    }

    if (arg === '--output' && next) {
      options.output = next;
      index += 1;
      continue;
    }

    if (arg === '--max-pages' && next) {
      options.maxPages = Number(next);
      index += 1;
      continue;
    }
  }

  const rootUrl = normalizeUrl(options.url);
  const pages = await crawlPages(rootUrl, options.maxPages);
  const homePage = pages.find((page) => page.pageType === 'home') ?? pages[0];
  const businessName = homePage?.title ? homePage.title.replace(/\s+—.*$/, '').replace(/\s+-.*$/, '').trim() : titleCase(getHostname(rootUrl).split('.')[0]);

  const facts = {
    description: homePage?.description || '',
    phone: pages.find((page) => page.phone)?.phone || '',
    address: pages.find((page) => page.address)?.address || '',
    hours: pages.find((page) => page.hours)?.hours || '',
  };

  const focusNotes = [
    'Primary demo goal: answer questions, book appointments, and take messages.',
    'Vertical: med spa.',
    'Treat any medical or eligibility question as a safety-sensitive handoff unless the source material clearly answers it.',
    'Be careful with pricing: surface exact prices only when present on the site.',
  ];

  const outputDir = path.resolve(options.output, slugify(businessName || getHostname(rootUrl)));
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const mdPages = [];
  for (const page of pages) {
    const fileName = `page-${String(mdPages.length + 1).padStart(2, '0')}-${slugify(page.title || page.pageType || 'page')}.md`;
    page.fileName = fileName;
    mdPages.push(page);
    await writeFileSafe(path.join(outputDir, fileName), buildPageMarkdown(page));
  }

  await writeFileSafe(
    path.join(outputDir, '00-business-overview.md'),
    buildBusinessOverviewMarkdown({
      businessName,
      rootUrl,
      pages: mdPages,
      facts,
      focusNotes,
    }),
  );

  await writeFileSafe(path.join(outputDir, '01-assistant-prompt.md'), buildAssistantPromptMarkdown({ businessName, facts }));
  await writeFileSafe(path.join(outputDir, '02-booking-and-handoff.md'), buildBookingMarkdown({ businessName }));
  await writeFileSafe(path.join(outputDir, '03-faq.md'), buildFaqMarkdown({ businessName, facts, pages: mdPages }));
  await writeFileSafe(path.join(outputDir, '04-test-scenarios.md'), buildTestScenariosMarkdown(businessName));
  await writeFileSafe(
    path.join(outputDir, 'manifest.md'),
    buildManifestMarkdown({
      businessName,
      rootUrl,
      outputDir,
      pages: mdPages,
      facts,
    }),
  );

  printSummary({
    businessName,
    outputDir,
    pages: mdPages,
    facts,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
