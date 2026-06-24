import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Replace the dev-friendly CSP in index.html with a strict one for the production
 * build: no remote origins, no `unsafe-eval`, no inline scripts, locked object/
 * base/frame. (`connect-src 'self'` drops the dev-only websocket for HMR.)
 *
 * Note: `style-src` keeps `'unsafe-inline'` — the app uses inline style attributes
 * for dynamic widths (e.g. progress bars); scripts remain fully locked down, which
 * is the security-critical part. Some directives (frame-ancestors, form-action)
 * are only enforced via an HTTP header — see SECURITY.md for the recommended host
 * header when self-hosting.
 */
function strictCsp(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
  ].join('; ');
  return {
    name: 'strict-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
        `<meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), strictCsp()],
});
