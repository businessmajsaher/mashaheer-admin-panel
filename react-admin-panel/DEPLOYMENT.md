# Deployment & Routing Guide

This project is a Single Page Application (SPA) built with React and Vite. For routing to work correctly in production (handling page reloads), your web server must be configured to serve `index.html` for all unknown routes.

We have included configuration files for common hosting providers:

## Supported Environments (Auto-Configured)

1.  **Vercel**: Configured via `vercel.json`.
2.  **Netlify**: Configured via `netlify.toml` and `public/_redirects`.
3.  **Apache (cPanel, shared hosting)**: Configured via `public/.htaccess`.
4.  **IIS (Azure Web Apps, Windows Server)**: Configured via `public/web.config`.

## Other Environments

### Nginx

If you are using Nginx, add the following to your server block configuration:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### GitHub Pages

GitHub Pages does not natively support SPAs with browser history. You have two options:
1.  Use `HashRouter` instead of `BrowserRouter` in `src/App.tsx`.
2.  Use a [404 hack](https://github.com/rafgraph/spa-github-pages) (copy `index.html` to `404.html`).

### Docker / Custom Node Server

If you are serving the `dist` folder using a Node.js server, ensure you use a package that supports SPA rewriting.

**Example with `serve`:**
```bash
npm install -g serve
serve -s dist
```
The `-s` (single) flag rewrites all not-found requests to `index.html`.

## Local Preview

To preview the production build locally:

```bash
npm run build
npm run preview
```
The `vite preview` command is configured to handle SPA fallbacks.
