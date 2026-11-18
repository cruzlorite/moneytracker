# MoneyTracker

Plan your year: what comes in, what goes out and what you put aside, with a quick view on your phone of whether you're on track. In Spanish.

## Features

The vocabulary and the rules the app follows, in Spanish: [docs/CONCEPTOS.md](docs/CONCEPTOS.md).

The idea: **plan the year once, roughly, and let your account balance do the accounting.** You plan what comes in, what you know will go out, and limits only for what you want to keep an eye on. Everything else you don't log at all. At the end of each month you enter your balance, and the app tells you what came in, what you spent, and whether you're doing well, so-so or badly against your plan (by what you saved against what you planned to save).

**Your budget for a month** is what the plan expects to come in minus what you plan to save. It covers your expected expenses, your limits, and the rest, unplanned; whatever you don't spend ends up saved. **Each month has its own savings target**, following the plan: a month with an extra pay aims higher, a month with the yearly insurance aims lower (even below zero), every month leaves the same amount unplanned, and the twelve targets add up to your yearly goal. So a month's colour says whether you kept to your plan, not whether it was an expensive month.

**Your month runs from payday to payday.** If your pay comes in late in the month (the 26th, say), "noviembre" runs from 26 October to 25 November, so a month starts with its pay. It's worked out from your main monthly income and can be changed in Plan (*Tu mes empieza el día*); day 1 gives calendar months.

Four tabs and a **+** in the middle of the tab bar to log a spend. Ajustes behind the gear.

- **Hoy**: **what you've spent this month next to your budget for it** (the planned income minus the planned saving), one bar with what the plan's expected expenses still have to take, and a verdict (*Vas muy bien*, *bien*, *regular*, *mal*: will you save what you planned at this pace?); what came in and what you'll save at this pace; what's pending (put your savings aside, confirm variable amounts); and your limits. **Mirar saldo**: type your balance any day and the month updates without logging every spend.
- **Año**: what you've saved against the yearly goal and where you should be today; **the 12 months as a grid**, each coloured by what it saved against the month's target (red 30 % or less, shading to yellow from 60 %, light green at the target, dark green 20 % or more above it), the running month with its progress, the months to come with their largest payment; the expensive months ahead; and the year close when the year ends. Tap a month to open it.
- **A month** (from Año): what came in, what went out and what was saved, your money through the month as a line, what the plan expected, what you logged, and its close.
- **Análisis**: **plan y realidad** for the year (incomes, spending, savings and each limit: planned, so far, and where the year ends), with bars on one scale so lines can be compared; where the money goes over this month, 3 months or the whole plan; what you saved each month; income against spending. Every chart has a table view.
- **Plan**: the yearly **savings and investment goal** (per year or per month, its share of income and whether it fits), **incomes** (monthly, every 3 months, yearly or one-off), **expected expenses** (monthly, every 3 months or yearly; each lands in its own month, so a month with the yearly insurance is an expensive month) and **limits** (*límites*: monthly or yearly caps for what you want to watch: tobacco, gifts, trips, treats; you only log those). Duplicate an item, or drag to reorder.
- **Month close**: *how much is in your account?*, and what you moved to savings that month (a transfer to savings lowers your balance just like spending; only you can tell them apart). From that, what came in, what you spent and what you saved, the verdict, and your money through the month. What's left over counts as saved; what's missing comes off savings. Nothing carries over.
- **Year close**: a summary of the year, then one tap starts the next year with the same plan and a new goal.
- **Spending types**: 43 types in 8 groups, each with an icon, plus **your own** (any name, any of the icons). When logging, your limits' types come first.
- **Planned vs exact amounts**: incomes and expenses count as planned once their date passes; ones marked *varía* ask to be confirmed.
- **Export / import** the plan as a JSON file. **Installable** on the phone's home screen, light and dark themes.

Design: one typeface (Inter, tabular figures), neutral cards, and colour only where it means something: blue what comes in, orange what goes out, red → yellow → green how it's going.

It's a **frontend-only** app: HTML, CSS and JavaScript with no build step and no server. The data lives in a **Google Sheet in your Drive**, or only on the device if you don't connect Google.

## How it works

- **Three modes**: Google (a sheet in your Drive plus a copy on the device for offline use), this device only (`localStorage`), and a demo with made-up data.
- **Sign-in**: Google Identity Services in the browser, scope `drive.file` only: the app can see the files it created and nothing else in your Drive. No API key is needed.
- **One sheet** named `MoneyTracker`, tagged in Drive `appProperties` (`app=hucha`) so the app finds it on any device:

  | Tab | Columns |
  |---|---|
  | `_hucha` | `key, value`: `schema`, `goal`, `start` (first month, `YYYY-MM`), `cycle_day` (the day your month starts; empty: from your pay), `cats` (JSON: your own spending types `{id, name, icon}`), `years` (JSON: past years' closes) |
  | `items` | `id, kind (in/out), name, amount, freq (monthly/quarterly/yearly/once), month, year, day, pot, vary, note, real, budget, cat` |
  | `meses` | `ym, saved, pots, pot_spent, real, close, challenge, bal, open, check`: put aside; (unused, older versions); (older versions: exact amounts of funded expenses); JSON item id → exact amount that month; the close `{amount}` (left over, or missing if negative: it counts as saved); (unused, older versions); account balance when the month ended; balance when it began (only needed once); the last look at the balance `{date, bal}` |
  | `gastos` | `id, date, amount, note, cat`: spending, with its type (`cat`, see `js/cats.js`); it counts against your limit of that type if you have one, otherwise it's simply spending |

  You can edit the sheet by hand; keep the header row. Changes are saved 0.7 s after the last edit by rewriting the changed tabs, and the app reloads the sheet when it comes back to the foreground. Edits made while offline or with an expired session stay on the device and are sent later.
- **Months**: the plan covers 12 months from `start`. Each month's target = what the plan leaves that month (planned income − expected expenses − monthly limits − yearly limits / 12) − the same unplanned amount for every month, chosen so the twelve add up to `goal`. What a month leaves to spend freely = what comes in − expected expenses − limits − its target. What you spent = balance at the start + what came in − put aside − balance at the end. What you saved = put aside + what was left over at the close. A month is completed when what you saved reaches its target and you didn't spend more than it left you. Verdict: well from the target, so-so from 60 % of it, badly below that.

## Project structure

```
index.html            single page
privacy.html          privacy notice (linked from the app and the consent screen)
manifest.webmanifest  home-screen install
config.js             Google OAuth client ID (public by design)
styles.css            styles, light and dark
fonts/                Inter (SIL Open Font License), served from the repo
icons/                app icon
js/model.js           pure calculations: items, months from payday to payday, balances
js/google.js          sign-in, Drive and Sheets
js/store.js           data modes, local copy and sync
js/app.js             views and actions
js/play.js            the month's pace and which month needs closing
js/fx.js              animations
js/sort.js            drag to reorder lists
js/cats.js            spending types: names, groups, icons, guessing a type from a name
js/icons-extra.js     112 more icons to pick for your own spending types (Pixelarticons, MIT)
js/charts.js          small SVG charts (columns, pairs, split bar, ranked bars) and their tables
js/demo.js            made-up demo data
js/i18n.js            languages: t() and the chosen language
js/i18n/en.js         English texts
docs/CONCEPTOS.md     vocabulary, formulas and colours (the reference the app must match)
tests/                node --test
```

## Languages

Spanish and English. The app follows the browser's language and can be changed in Settings.

Every visible text goes through `t()`, with the Spanish text as the key: `t('Este mes')`, or `t('Saldo del {d}', { d })` when it carries a value. A missing translation shows the Spanish text instead of breaking. Dates and numbers follow the language (`1.567 €` / `€1,567`).

Currency is a separate choice (EUR, USD, GBP, MXN, ARS, COP, CLP, PEN, BRL, CHF, CAD, AUD, JPY): any language with any currency, both set in Settings and kept on the device. Amounts are only shown in that currency; there is no conversion.

To add a language: copy `js/i18n/en.js`, translate the values, and list it in `LANGS` and `DICT` in `js/i18n.js`.

## Google setup

In the [Google Cloud Console](https://console.cloud.google.com/) (a project without billing):

1. Enable the **Google Sheets API** and the **Google Drive API**.
2. **OAuth consent screen**: user type *External*; scopes `openid`, `email` and `.../auth/drive.file` (none are sensitive); privacy policy link `https://<your-user>.github.io/hucha/privacy.html`. In *Testing* mode, add yourself as a test user.
3. **Create an OAuth client ID** of type *Web application*, with authorized JavaScript origins `https://<your-user>.github.io` and `http://localhost:8000`. No redirect URIs.
4. Put the client ID in [config.js](config.js). It's public by design: it gives no access to any data without your sign-in. No secrets go in this repo.

You can reuse the OAuth client of another app served from the same origin, but the consent screen will then show that app's name.

## Local development

```sh
python3 -m http.server 8000   # http://localhost:8000
node --test tests/*.test.mjs
```

## Deploy

Push to `main` on GitHub, choose *Settings → Pages → Source: GitHub Actions*, and [the workflow](.github/workflows/pages.yml) publishes the repo as is.

**Your data never goes in the repo.** `.gitignore` excludes every `.json` except `package.json` and the manifest, and the `private/` folder. Keep plan exports out of the repo folder anyway.

## License

[MIT](LICENSE). Fonts: [SIL Open Font License](https://openfontlicense.org). Icons: Pixelarticons and the HackerNoon Pixel Icon Library, both MIT (see [THIRD_PARTY.md](THIRD_PARTY.md)).
