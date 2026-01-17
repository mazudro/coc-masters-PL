# CoC Masters PL CWL Dashboard - Deployment & Operations Guide

## Deployment Overview

The CoC Masters PL CWL Dashboard is deployed on **Vercel**, a globally distributed edge platform optimized for Next.js and Vite SPA projects.

- **Production URL**: https://coc-masters-pl.vercel.app
- **Custom Domain**: Available (configure in Vercel dashboard)
- **Auto-deployments**: Triggered on git push to `main` branch
- **Manual Deployments**: Via Vercel CLI or Dashboard

## Prerequisites for Deployment

### Required Tools
- Vercel CLI (`npm install -g vercel`)
- Vercel account with project linked
- GitHub repository access
- Authentication: `vercel login` (device code or token)

### Project Configuration
- `vercel.json` in root (SPA rewrite rules) ✓
- `package.json` build script ✓
- `.vercelignore` (optional, to exclude files)

## Deployment Methods

### Method 1: Automatic (Recommended)

**GitHub Auto-Deploy**

1. Project linked to Vercel via GitHub app
2. Push to `main` branch
3. Vercel automatically:
   - Detects project type (Vite)
   - Runs `npm run build`
   - Uploads `dist/` to CDN
   - Applies `vercel.json` rewrites
   - Updates production alias

**To Setup**:
```bash
vercel link  # Links current directory to Vercel project
```

### Method 2: Manual CLI

**Deploy from Local Machine**

```bash
# Preview deployment (temporary URL)
vercel

# Production deployment (updates main domain)
vercel --prod

# With auto-confirmation
vercel --prod --yes

# Custom region/team
vercel --prod --team=your-team-name
```

**Output**:
```
🔍  Inspect: https://vercel.com/.../deployments/...
⏳  Production: https://coc-masters-pl-xxx... [deploying]
✅  Production: https://coc-masters-pl-xxx... [ready]
🔗  Aliased: https://coc-masters-pl.vercel.app
```

### Method 3: Vercel Dashboard

1. Visit https://vercel.com/dashboard
2. Select "coc-masters-pl" project
3. Go to "Deployments" tab
4. Click "Deploy" or use git integration

## Build & Deployment Process

### Build Command
```bash
npm run build
```

**Steps**:
1. `npm run prebuild` – XLSX → JSON transformation
2. `tsc -b --noCheck` – TypeScript type-check
3. `vite build` – Bundle & optimize for production

**Output**: `dist/` directory with:
- `index.html` (SPA entry point)
- `assets/index-*.js` (React + dependencies)
- `assets/index-*.css` (Tailwind CSS)
- `assets/*.svg` (Images)

### Deployment Configuration

**vercel.json** (SPA Rewrite)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Why**: All routes return `index.html`, letting React Router handle routing client-side.

### Environment Variables

**No Required Env Vars** for core functionality.

**Optional** (if extending app):

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | API endpoint | `https://api.example.com` |
| `VITE_ANALYTICS_ID` | Analytics key | `G-XXXXXXXX` |

**Setting in Vercel**:
1. Project settings → Environment Variables
2. Add key-value pairs (separate for preview/production)
3. Redeploy to apply

**Using in Code**:
```tsx
const apiUrl = import.meta.env.VITE_API_URL
```

## Monitoring & Debugging

### Vercel Dashboard Monitoring

1. **Deployments Tab**:
   - View all past deployments
   - See build logs & timing
   - Rollback to previous versions

2. **Analytics**:
   - Page views & performance metrics
   - Edge network latency
   - Top requests & errors

3. **Functions** (if using serverless):
   - Execution logs
   - Memory usage
   - Cold starts

### Build Logs

To view build logs:
```bash
vercel logs  # Latest deployment
vercel logs --state=READY  # Successful builds
vercel logs --state=ERROR  # Failed builds
```

### Inspecting a Deployment

```bash
vercel inspect <deployment-url>
```

Shows:
- Deployment ID & metadata
- Build duration
- Aliases assigned
- Build output size

Example:
```bash
vercel inspect https://coc-masters-pl-xxx...vercel.app
```

## Managing Deployments

### Preview Deployments

Created for every commit (if auto-deploy enabled):
- Unique URL per deployment
- Test before merging to main
- Auto-removed after 7 days (configurable)

**View Previews**:
1. Push feature branch to GitHub
2. Vercel auto-creates preview deployment
3. GitHub PR shows preview link
4. Share link for feedback

### Production Rollback

If deployment breaks:

```bash
# View recent deployments
vercel ls

# Rollback to specific deployment
vercel promote <deployment-id>

# Or via dashboard: Deployments > [old] > Promote
```

### Aliasing

Map custom domains to deployments:

```bash
# Create alias
vercel alias set <deployment-url> <domain>

# Example
vercel alias set coc-masters-pl-xxx.vercel.app my-custom.com
```

## Performance & Optimization

### Vercel Edge Locations

Automatically served from ~280 edge locations worldwide:
- Requests routed to nearest edge
- Static assets cached globally
- CDN automatically handles compression

**Check Region**: Response headers show `server: Vercel`

### Cache Invalidation

Built artifacts (`/assets/*`, `/*.js`, `/*.css`):
- Content-hashed filenames (auto-purge on new deploy)
- 1-year cache headers on immutable assets
- `index.html` never cached (serves fresh)

**Manual Purge** (if needed):
- Redeploy: `vercel --prod`
- Or delete old deployment in dashboard

### Performance Metrics

Monitor in Vercel Analytics:
- **FCP**: First Contentful Paint
- **LCP**: Largest Contentful Paint
- **CLS**: Cumulative Layout Shift
- **Core Web Vitals**: Passing ✓

**Target**: <2.5s LCP, <100ms FID, <0.1 CLS

## Scaling & Limits

### Free Tier
- 100 deployments/month
- 6 team members
- Unlimited static hosting
- Global CDN included
- Auto preview deployments

### Pro/Business Tiers
- Unlimited deployments
- Increased team size
- Priority support
- Custom analytics
- Logs & monitoring

**Current Plan**: Check https://vercel.com/account/billing

## Data Updates

### Updating CWL Statistics

```bash
# 1. Update source data
# Replace data-src/cwl-stats.xlsx with latest export

# 2. Regenerate JSON locally
npm run prebuild

# 3. Verify output
ls -la public/data/
cat public/data/family.json  # Check timestamps

# 4. Commit both xlsx and json
git add data-src/cwl-stats.xlsx public/data/
git commit -m "chore: update CWL data for Dec 2025 season"

# 5. Push (auto-deploys to Vercel)
git push origin main
```

### Vercel Auto-Deploy Workflow

```
Update data-src/cwl-stats.xlsx locally
         ↓
git push to main branch
         ↓
GitHub webhook triggers Vercel
         ↓
Vercel runs build command
         ↓
npm run prebuild regenerates JSON
         ↓
vite build bundles app
         ↓
Assets uploaded to CDN
         ↓
Live within ~2-5 minutes
         ↓
Check deployment at vercel.com/dashboard
```

## Troubleshooting Deployments

### Build Fails

**Check Logs**:
```bash
vercel logs --state=ERROR
```

**Common Issues**:
- TypeScript errors: Check `tsc` output
- Missing env vars: Add to Vercel dashboard
- Missing files: Check `.vercelignore`
- Node version mismatch: Vercel auto-selects Node 22

### Deployment Takes Too Long

**Optimize**:
- Clear node_modules cache
- Reduce bundle size (code-split)
- Use `npm ci` instead of `npm install` in CI

**Check Build Duration**:
```bash
vercel ls  # View build times
```

### Routes Return 404

**Verify**:
- `vercel.json` is in root directory
- `vercel.json` has correct rewrite rules
- Run `vercel --prod --yes` to redeploy with config

**Debug**:
```bash
curl -I https://coc-masters-pl.vercel.app/players
# Should return 200 (not 404)

curl -I https://coc-masters-pl.vercel.app/clan/P0J2J8GJ
# Should return 200 (not 404)
```

### Static Assets Not Loading

**Clear Cache**:
1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
2. Incognito/Private window
3. Redeploy: `vercel --prod --yes`

### Performance Issues

**Check**:
1. Vercel Analytics dashboard
2. Browser DevTools Network tab
3. Check bundle size: `npm run build`
4. Check for large images or unoptimized assets

## Monitoring & Alerting

### Uptime Monitoring

Use external service (e.g., Pingdom, UptimeRobot):
1. Set check interval: 5 minutes
2. Monitor: https://coc-masters-pl.vercel.app
3. Alert email if down

### Error Tracking

Implement error logging (optional):
- Sentry.io for JS errors
- LogRocket for session replay
- Vercel logs for build issues

### Vercel Status Page

Check Vercel infrastructure status:
https://www.vercelstatus.com/

## Custom Domain Setup

### Add Custom Domain

1. In Vercel dashboard → Settings → Domains
2. Enter domain (e.g., coc-masters.pl)
3. Add DNS records (CNAME or A record):
   ```
   CNAME: cname.vercel-dns.com
   OR
   A: 76.76.19.124
   A: 76.76.19.123
   ```
4. Wait for verification (~5-10 min)

### SSL/HTTPS

Automatic via Vercel:
- Free SSL certificate (Let's Encrypt)
- Auto-renews every 90 days
- Auto-redirects HTTP → HTTPS

## Maintenance & Updates

### Dependency Updates

```bash
# Check for updates
npm outdated

# Update all
npm update

# Update major versions
npm install -g npm-check-updates
ncu -u
npm install

# Test locally
npm run build

# Deploy
git push origin main
```

### Vercel CLI Updates

```bash
npm install -g vercel@latest
vercel --version
```

### Node Version Updates

Vercel auto-selects compatible Node version. To specify:
1. Create `.nvmrc` with version (e.g., `22.15.0`)
2. Vercel detects and uses specified version

## Rollback Plan

If production breaks:

### Immediate Action (5 minutes)
```bash
# Check recent deployments
vercel ls | head -5

# Promote previous working deployment
vercel promote <deployment-id>

# Verify at https://coc-masters-pl.vercel.app
```

### Root Cause Analysis
1. Check build logs: `vercel logs --state=ERROR`
2. Review recent changes: `git log --oneline`
3. Check Vercel dashboard for deployment details

### Prevention
1. Always test locally: `npm run build && npm run preview`
2. Use preview deployments before promoting to prod
3. Keep git history clean for easy rollbacks

## Contacts & Support

- **Vercel Support**: https://vercel.com/help
- **GitHub Issues**: https://github.com/mazudro/coc-masters-pl/issues
- **Project Owner**: mazudro
- **Team**: CoC Masters PL family

---

**Last Updated**: January 2025
**Deployment Status**: https://coc-masters-pl.vercel.app
