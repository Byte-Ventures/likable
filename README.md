# Likable Landing Page

Simple, static landing page for likable.gratis

## Local Preview

```bash
# Open in browser
open landing/index.html

# Or use a simple HTTP server
cd landing
python3 -m http.server 8000
# Visit http://localhost:8000
```

## Deploy to Cloudflare Pages

### 1. Push to GitHub

The landing page is already in the repo at `/landing`.

### 2. Set up Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application** → **Pages**
3. Connect your GitHub account and select the `likable` repository
4. Configure build settings:
   - **Framework preset:** None
   - **Build command:** (leave empty)
   - **Build output directory:** `/landing`
5. Click **Save and Deploy**

### 3. Configure Custom Domain

1. In Cloudflare Pages, go to your project
2. Click **Custom domains** tab
3. Add `likable.gratis` and `www.likable.gratis`
4. Cloudflare will automatically configure DNS if the domain is on Cloudflare

### 4. DNS Configuration (if domain not on Cloudflare)

Add these records to your DNS provider:

```
Type: CNAME
Name: @
Value: likable-pages.pages.dev (your Cloudflare Pages URL)

Type: CNAME
Name: www
Value: likable-pages.pages.dev
```

## Alternative: GitHub Pages

If you prefer GitHub Pages:

```bash
# From repo root
git subtree push --prefix landing origin gh-pages
```

Then configure custom domain in GitHub repo settings.

## Files

- `index.html` - Single-file landing page with inline CSS and JS
- `README.md` - This file

## Features

- ✅ Zero dependencies
- ✅ Single HTML file
- ✅ Responsive design
- ✅ Dark mode optimized
- ✅ Copy-to-clipboard functionality
- ✅ Fast loading (< 10KB)
