# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal blog "万年水的博客" built with Hugo and the PaperMod theme. Content is in Chinese covering topics like AI, blockchain, IAM/IDaaS, thinking models, psychoanalysis, and personal growth.

## Commands

```bash
# Run development server with live reload
hugo server

# Build static site (outputs to public/)
hugo

# Build with minification (used in CI)
hugo --minify

# Create new post (uses archetypes/default.md template)
hugo new posts/category/post-name.md
```

## Architecture

### Configuration
- `hugo.toml`: Main config - site title, theme, menus, markup settings
- Theme is loaded as git submodule at `themes/PaperMod`
- `baseURL` is set for GitHub Pages deployment: `https://bsong2015.github.io/blog/`

### Content Structure
- `content/posts/`: All blog posts organized by category subdirectories
- Each category has an `_index.md` for section listing
- Post front matter uses `slug = ":filename"` (URL derived from filename)
- Posts are Markdown with optional images (jpg/png) alongside each .md file

### Menu System
The navigation uses nested dropdown menus defined in `hugo.toml`:
- Parent items have `identifier` and `weight` only
- Child items specify `parent`, `identifier`, `name`, `url`, `weight`

Custom CSS (`assets/css/extended/custom.css`) and JS (`assets/js/custom.js`) handle dropdown behavior - the theme doesn't natively support nested menus.

### Deployment
- GitHub Actions workflow at `.github/workflows/deploy.yml`
- Triggers on push to `main` branch
- Uses `peaceiris/actions-hugo@v2` with extended Hugo version
- Deploys to GitHub Pages via `peaceiris/actions-gh-pages@v3`

### Key Settings
- `defaultContentLanguage = "zh"` for Chinese content
- `[markup.goldmark.renderer] unsafe = true` allows raw HTML in Markdown
- `[build] enableGitInfo = true` for git-based timestamps
- Mermaid diagrams enabled via `[params.mermaid] enable = true`

## Workflow Notes

When creating new posts, ensure:
1. Place in appropriate category subdirectory under `content/posts/`
2. Set `draft: false` in front matter when ready to publish
3. Add accompanying images with matching filename prefix if needed
4. The post will auto-appear in category listing via `_index.md`