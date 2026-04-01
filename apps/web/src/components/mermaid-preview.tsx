'use client';

import { useEffect, useId, useState } from 'react';

type MermaidPreviewProps = {
  chart: string;
};

type MermaidBrowserApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, chart: string) => Promise<{ svg: string }>;
};

declare global {
  interface Window {
    mermaid?: MermaidBrowserApi;
    __bishopTechMermaidReady?: Promise<MermaidBrowserApi>;
  }
}

function loadMermaid() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mermaid can only load in the browser.'));
  }

  if (window.mermaid) {
    return Promise.resolve(window.mermaid);
  }

  if (window.__bishopTechMermaidReady) {
    return window.__bishopTechMermaidReady;
  }

  window.__bishopTechMermaidReady = new Promise<MermaidBrowserApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-mermaid-loader="bishoptech"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.mermaid) {
          resolve(window.mermaid);
          return;
        }

        reject(new Error('Mermaid script loaded, but the global API was not found.'));
      });

      existingScript.addEventListener('error', () => reject(new Error('Unable to load Mermaid.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js';
    script.async = true;
    script.dataset.mermaidLoader = 'bishoptech';
    script.onload = () => {
      if (window.mermaid) {
        resolve(window.mermaid);
        return;
      }

      reject(new Error('Mermaid script loaded, but the global API was not found.'));
    };
    script.onerror = () => reject(new Error('Unable to load Mermaid.'));
    document.head.appendChild(script);
  });

  return window.__bishopTechMermaidReady;
}

export function MermaidPreview({ chart }: MermaidPreviewProps) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      try {
        const mermaid = await loadMermaid();
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
