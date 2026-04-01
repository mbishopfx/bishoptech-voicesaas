'use client';

import { useEffect, useId, useState } from 'react';

type MermaidPreviewProps = {
  chart: string;
};

export function MermaidPreview({ chart }: MermaidPreviewProps) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#d7dff9',
            primaryTextColor: '#0a1020',
            primaryBorderColor: '#8ea0d9',
            lineColor: '#7ee2cf',
            secondaryColor: '#7ee2cf',
            tertiaryColor: '#111828',
            fontFamily: 'var(--font-body)',
            background: '#0b0f18',
          },
          securityLevel: 'loose',
        });

        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, chart);

        if (!cancelled) {
          setSvg(rendered);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to render Mermaid preview.');
        }
      }
    }

    void renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="mermaid-fallback">
        <p>Mermaid preview failed.</p>
        <pre>{chart}</pre>
      </div>
    );
  }

  return <div className="mermaid-preview" dangerouslySetInnerHTML={{ __html: svg }} />;
}
