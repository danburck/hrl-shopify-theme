---
name: update-schedule
description: Update the hyperreallove.com/pages/schedule page with the current month's upcoming Journal Club events from Notion, and deploy it live. Use when the user asks to "update the schedule", "refresh the schedule page", or wants the monthly Journal Club schedule sync.
---

# Update Schedule Page

Monthly task: pull the current month's confirmed events from the Notion "Journal Clubs" database and publish them to the live schedule page on hyperreallove.com.

## 1. Get the events from Notion

Database: `https://app.notion.com/p/232f7c1c5afa8090aa72e112fe329ce7` (data source id `collection://232f7c1c-5afa-8015-834f-000b664fa604`, titled "Journal Clubs (Database)").

This workspace is on a plan below Business, so `notion-query-database-view` and `notion-query-data-sources` will fail with a "requires Business plan" error — don't bother trying them. Instead:

1. Use `notion-search` with `data_source_url: "collection://232f7c1c-5afa-8015-834f-000b664fa604"` and a query like the target month name (e.g. "August") or "Journal Club" to surface recently-edited pages — results include a `timestamp` (last-edited time) that's a good signal for which pages are current.
2. `notion-fetch` each candidate page individually to read its properties: `Status`, `date:Date:start`, `Title`, `Subtitle`, `Address`, `Type`, `Link`, `Theme`.
3. Filter to pages where:
   - `date:Date:start` falls in the target month
   - `Status == "Upcoming"` — **exclude** `Draft`, `Completed`, and `Cancelled`. Draft rows are events being planned that aren't confirmed yet; don't publish them even if the date matches.
4. Note the `Theme` multi-select value on the Upcoming rows (usually one shared theme per month, e.g. "Learning To Listen"). If no Upcoming row has a Theme set yet, ask the user for the month's theme rather than guessing or reusing last month's.

**Always show the user the filtered event list (and theme) and get explicit confirmation before editing the page** — the Draft/Upcoming distinction is a judgment call that should stay human-approved, and Notion status can be stale.

## 2. Edit the page section

File: `sections/page-spaces.liquid` in this repo.

Replace the whole `<div class="page-spaces__month-header">...</div>` block and all `<article class="spaces-event">...</article>` blocks inside `<div class="page-spaces__events">` with one header + one article per confirmed event. Keep every other line in the file untouched (styles, schema block, etc. don't change month to month).

Header pattern:
```html
<div class="page-spaces__month-header">
  <h2 class="page-spaces__month-title">{{ Month }} {{ Year }}</h2>
  <p class="page-spaces__theme-line"><span class="page-spaces__theme-label">Theme:</span> {{ Theme }}</p>
</div>
```

Per-event pattern:
```html
<article class="spaces-event">
  <div class="spaces-event__date-col">
    <span class="spaces-event__date-top">{{ "Mon DD" e.g. "Jul 04" }}</span>
    <span class="spaces-event__date-bottom">{{ "Sat, 9am" — weekday abbreviation + local time }}</span>
  </div>
  <div class="spaces-event__info">
    <h2 class="spaces-event__name">{{ Title }}</h2>
    <p class="spaces-event__description">{{ Subtitle }}</p>
    <p class="spaces-event__location">{{ Address }}</p>
  </div>
  <div class="spaces-event__action">
    <a href="{{ Link }}" target="_blank" class="spaces-event__btn">Join</a>
  </div>
</article>
```

Sort events chronologically. Convert the Notion UTC datetime to CET/CEST local time for the displayed time.

## 3. Commit

```bash
cd "/Users/danburck/Dropbox/Claude Code/hrl-shopify-theme"
git add sections/page-spaces.liquid
git commit -m "Update schedule to <Month> <Year>"
```

This repo requires SSH-signed commits (`commit.gpgsign=true`, `gpg.format=ssh`). If `git commit` hangs, the SSH agent has no loaded identity — ask the user to run `ssh-add ~/.ssh/id_ed25519` in their own terminal (Touch ID / passphrase prompt), then retry. Don't use `--no-gpg-sign` to work around it.

Only stage `sections/page-spaces.liquid` unless the user tells you to also commit other pending changes in the repo — this repo tends to carry unrelated in-progress work (other `.liquid`/`.css`/`.js` files); don't sweep those into a schedule-update commit without asking.

## 4. Push and deploy

```bash
git push origin main
```

**Don't rely on the GitHub Actions auto-deploy** — as of 2026-07, the `Deploy to Shopify` workflow has no `SHOPIFY_STORE_URL` / `SHOPIFY_THEME_ID` / `SHOPIFY_CLI_THEME_TOKEN` secrets configured in the repo, so it fails immediately on every push (`Nonexistent flag: --theme-id=`). Check `gh run list --limit 1` after pushing — if it's still failing, deploy manually instead of waiting on it:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"   # global default node (v16) is too old for the Shopify CLI
cd "/Users/danburck/Dropbox/Claude Code/hrl-shopify-theme"
npx shopify theme push --store=hyperreallove.myshopify.com --theme=200339030359 --allow-live
```

The live theme id is `200339030359` — the `156720365800` id in `package.json`'s `deploy` script is stale, don't use it. If unsure, confirm with `npx shopify theme list --store=hyperreallove.myshopify.com` (look for `role: [live]`).

This push goes straight to the live store — confirm with the user before running it, same as any other live deploy.

## 5. Verify

Fetch `https://hyperreallove.com/pages/schedule` (browser tool or WebFetch) and check the month, theme, and event(s) rendered match what was confirmed in step 1.
