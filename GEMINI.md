
# Directory Overview

This directory contains a personal blog built with Hugo. The blog is titled "万年水的博客" (Wan Nian Shui's Blog) and uses the PaperMod theme. The content is written in Markdown and covers topics such as artificial intelligence, reading, thinking models, and personal growth.

# Key Files

*   `hugo.toml`: The main configuration file for the Hugo site. It defines the site's title, theme, menus, and other settings.
*   `content/`: This directory contains the blog posts in Markdown format. Each subdirectory in `content/posts` represents a different category of posts.
*   `archetypes/default.md`: This is the template for new blog posts. By default, new posts are created as drafts.
*   `.github/workflows/deploy.yml`: This file defines the GitHub Actions workflow that automatically builds and deploys the blog to GitHub Pages.

# Usage

## Creating a New Post

To create a new blog post, you can use the following Hugo command:

```bash
hugo new posts/new-post.md
```

This will create a new Markdown file in the `content/posts` directory with the default front matter. Remember to change the `draft` status to `false` in the front matter when you are ready to publish the post.

## Running the Blog Locally

To run the blog locally, you can use the following command:

```bash
hugo server
```

This will start a local server at `http://localhost:1313/`.

## Building the Blog

To build the static site, you can use the following command:

```bash
hugo
```

This will generate the static files in the `public` directory.
