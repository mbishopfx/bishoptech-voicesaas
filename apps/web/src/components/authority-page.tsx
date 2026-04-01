import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';

import type { AuthorityPageContent } from '@/lib/authority-pages';

type AuthorityPageProps = {
  page: AuthorityPageContent;
  relatedPages: AuthorityPageContent[];
};

export function AuthorityPage({ page, relatedPages }: AuthorityPageProps) {
  return (
    <main className="voice-landing-shell voice-authority-shell">
      <div className="voice-orb voice-orb-mint" />
      <div className="voice-orb voice-orb-violet" />

      <nav className="voice-topbar">
        <div className="voice-topbar-group">
          <Link className="voice-brand" href="/">
            <span className="voice-brand-mark">
              <LockKeyhole size={16} strokeWidth={2.2} />
            </span>
            <span>BishopTech Voice</span>
          </Link>

          <div className="voice-nav-links">
            <Link href="/">Home</Link>
            <Link href="/insights/why-you-dont-need-a-voice-ai-agency">No Agency</Link>
            <Link href="/insights/fair-voice-ai-pricing">Pricing</Link>
            <Link href="/insights/24-hour-voice-ai-onboarding">24-Hour Onboarding</Link>
          </div>
        </div>

        <div className="voice-topbar-actions">
          <a className="voice-topbar-link" href="mailto:matt@bishoptech.dev?subject=BishopTech%20Voice%20Questions">
            Ask a question
          </a>
          <a className="voice-primary-button" href="mailto:matt@bishoptech.dev?subject=BishopTech%20Voice%20Strategy%20Call">
            Book strategy call
          </a>
        </div>
      </nav>

      {page.sections.map((section) => (
        <section key={section.title} className="voice-section voice-article-section">
          <div className="voice-section-head">
            <div>
              <span className="voice-section-eyebrow">{section.eyebrow}</span>
              <h2>{section.title}</h2>
            </div>
            <p>{section.intro}</p>
          </div>

          <div className="voice-article-grid">
            <article className="glass-card voice-article-panel">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>

            <aside className="glass-card voice-article-aside">
              <span className="voice-section-eyebrow">{section.eyebrow}</span>
              <h3>{section.asideTitle}</h3>
              <div className="voice-check-list">
                {section.asideItems.map((item) => (
                  <div className="voice-check-row" key={item}>
                    <span className="voice-article-bullet" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      ))}

      <section className="voice-section" id="authority">
        <div className="voice-section-head">
          <div>
            <span className="voice-section-eyebrow">Read next</span>
            <h2>More of the BishopTech Voice case.</h2>
          </div>
          <p>These pages are written to answer the objections that usually show up before a business decides to launch.</p>
        </div>

        <div className="voice-authority-grid">
          {relatedPages.map((relatedPage) => (
            <article key={relatedPage.slug} className="glass-card voice-authority-card">
              <span className="voice-section-eyebrow">{relatedPage.eyebrow}</span>
              <h3>{relatedPage.title}</h3>
              <p>{relatedPage.description}</p>
              <Link className="voice-inline-link" href={`/insights/${relatedPage.slug}`}>
                Read this page
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="voice-final-section">
        <div className="glass-card voice-final-card">
          <span className="voice-section-eyebrow">BishopTech Voice</span>
          <h2>{page.ctaTitle}</h2>
          <p>{page.ctaBody}</p>
          <div className="voice-cta-row">
            <a className="voice-primary-button" href="mailto:matt@bishoptech.dev?subject=BishopTech%20Voice%20Strategy%20Call">
              Book strategy call
            </a>
            <Link className="voice-secondary-button" href="/">
              Back to platform
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
