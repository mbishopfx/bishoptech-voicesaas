import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AuthorityPage } from '@/components/authority-page';
import { authorityPages, getAuthorityPage } from '@/lib/authority-pages';

type AuthorityPageRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return authorityPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({ params }: AuthorityPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getAuthorityPage(slug);

  if (!page) {
    return {
      title: 'BishopTech Voice',
    };
  }

  return {
    title: `${page.title} | BishopTech Voice`,
    description: page.description,
    alternates: {
      canonical: `/insights/${page.slug}`,
    },
    openGraph: {
      title: `${page.title} | BishopTech Voice`,
      description: page.description,
      type: 'article',
    },
  };
}

export default async function AuthorityArticlePage({ params }: AuthorityPageRouteProps) {
  const { slug } = await params;
  const page = getAuthorityPage(slug);

  if (!page) {
    notFound();
  }

  return <AuthorityPage page={page} relatedPages={authorityPages.filter((entry) => entry.slug !== page.slug)} />;
}
