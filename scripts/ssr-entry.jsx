/**
 * Server entry used only at build time by scripts/prerender.mjs.
 * Renders a route to static HTML and returns the collected document head.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import App from '../src/App';
import { AppProvider } from '../src/context/AppContext';

export function render(url) {
  const helmetContext = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <AppProvider>
          <App />
        </AppProvider>
      </StaticRouter>
    </HelmetProvider>,
  );
  const { helmet } = helmetContext;
  return {
    html,
    head: {
      title: helmet?.title?.toString() ?? '',
      // prioritizeSeoTags splits the primary tags (description, robots,
      // canonical, Open Graph, Twitter and JSON-LD) into `priority`
      priority: helmet?.priority?.toString() ?? '',
      meta: helmet?.meta?.toString() ?? '',
      link: helmet?.link?.toString() ?? '',
      script: helmet?.script?.toString() ?? '',
      htmlAttributes: helmet?.htmlAttributes?.toString() ?? '',
    },
  };
}
