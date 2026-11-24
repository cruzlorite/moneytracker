# MoneyTracker

Plan your year: what comes in, what goes out and what you put aside, with a quick view on your phone of whether you're on track. In Spanish.

## Features

The vocabulary and the rules the app follows, in Spanish: [docs/CONCEPTOS.md](docs/CONCEPTOS.md).

The idea: **plan the year once, roughly, and let your account balance do the accounting.** You plan what comes in, what you know will go out, and limits only for what you want to keep an eye on. Everything else you don't log at all. At the end of each month you enter your balance, and the app tells you what came in, what you spent, and whether you're doing well, so-so or badly against your plan (by what you saved against what you planned to save).

**Your budget for a month** is what the plan expects to come in minus what you plan to save. It covers your expected expenses, your limits, and the rest, unplanned; whatever you don't spend ends up saved. **Each month has its own savings target**, following the plan: a month with an extra pay aims higher, a month with the yearly insurance aims lower (even below zero), every month leaves the same amount unplanned, and the twelve targets add up to your yearly goal. So a month's colour says whether you kept to your plan, not whether it was an expensive month.

**Your month runs from payday to payday.** If your pay comes in late in the month (the 26th, say), "noviembre" runs from 26 October to 25 November, so a month starts with its pay. It's worked out from your main monthly income and can be changed in Plan (*Tu mes empieza el día*); day 1 gives calendar months.

Four tabs and a **+** in the middle of the tab bar to log a spend. Ajustes behind the gear.

- **Hoy**: the month (payday to payday, named by the month it ends in) with arrows to look at the neighbouring months. **Por confirmar** at the top (fold it, confirm one by one), what you've spent next to the month's budget, one bar with what the plan's expected expenses still have to take, a verdict, what came in and what you'll save at this pace; one card with **your budgets and what you spent by type**; the account's balance over the last 30, 60 or 90 days; and the month's **movements**, newest first (tap one to edit it). **Actualizar saldo**: type your balance any day (and when you log a movement today, a checkbox, on by default, updates it for you) (each update is kept and can be deleted); amounts are always shown with their cents, like the bank's and the month updates without logging every spend.
- **Año**: what you've saved against the yearly goal and where you should be today; **the 12 months as a grid**, each coloured by what it saved against the month's target; the year close when the year ends. Years are plan years (they start in the month you choose in Ajustes): you can look ahead, never back.
- **A month** (from Año or the arrows in Hoy): what came in, what went out and what was saved, your money through the month as a line, what the plan expected, what you logged (tap to edit), and its close.
- **Análisis**: **plan y realidad** for the year with bars on one scale; where the money goes over this month, 3 months or the whole plan (switching redraws only that part); what you saved each month; income against spending. Every chart has a table view with a coloured **Diferencia** column (red / green only say whether it went well).
- **Plan**: the yearly **savings and investment goal**, **incomes** (monthly, every 3 months, yearly or one-off), **expected expenses** and **budgets** (monthly or yearly amounts for a type: tobacco, gifts, trips; you only log those; "sin presupuestar" is the rest). **The plan has a history**: changing an item applies from the current month on (or from/until the months you choose), earlier months keep what they had, and every change is recorded (Ajustes → Cambios del plan). One-offs appear only in their own year.
- **Comparar alternativas** (from Plan): a *decision* (buy a car, buy or rent a home, buy a flat to let or invest the money…) has *alternatives* (lease, new, nearly new, used, public transport) and *scenarios* (returns your money could earn, net of fees and before tax: 0 %, 3 %, 5 %, 10 %). Each alternative becomes monthly cash flows (`js/tco.js`): what you pay at the start, loan payments, running costs and incomes (the rent a flat brings in) that rise with inflation, stay fixed, or also rise or fall with age (maintenance +10 %/yr, insurance −5 %/yr by default, editable), every-N-years costs, and at the end the sale (resale value by mode: following inflation (homes, by default; ± a % a year), typical curve by the thing's age (average car, keeps its value, premium, electric, phones; a used one picks the curve up at its age when bought — iSeeCars, KBB, Experian, Mapfre, Ganvam, BankMyCell), a % a year down or up, a known sale price, straight-line, or none; minus selling costs and the loan still owed). The answer is the **gain or loss of net worth** each alternative brings, from 0, the way an accountant sees it (they all start with the same money invested: what the dearest one needs on day one; purchase taxes are a loss on day one). Buying is a swap and paying a loan's capital is saving, so neither changes it; running costs, interest, one-off taxes, selling costs and depreciation take it down; appreciation and the return of the money left invested take it up. Every alternative starts from that same money, invested at the scenario's return; everything it pays comes out of it and stops earning — the opportunity cost — so each alternative depends only on itself (income isn't counted: it would be the same whatever you chose). Formal terms throughout, with definitions in ⓘ cards (net future value, change in net worth, common initial capital, liquidation value, alternative return, indifference return, payback period). Three switches over the results: net of opportunity cost (on by default: the net future value against the null alternative — the initial capital left invested —, equal to the NPV compounded to the horizon, comparable and additive between decisions; off, the change in net worth from the initial capital), Spain's savings tax (19–30 % bands; each year on the gains realized by taking money out of the investments, with a cost basis, and when selling on the gain still in them and on the gain of the sale, after purchase costs; on by default; no exemptions) and taking out inflation. Results come per scenario and year by year, in euros of each year or of today (so a net worth can grow in euros and still lose buying power), with each alternative's accounts (where its gain or loss comes from). It also gives the break-even year and return. Templates, grouped (home, car, others), start from standard Spanish figures for 2026 (idealista prices and rents, INE mortgage rates and terms, purchase taxes and fees ≈10 % second-hand / ≈13 % new, IBI, community, insurance, selling ≈5 %): buy or rent (or stay at your parents'), new build or second-hand, buy to let or invest, pay off the mortgage or invest, cash or a 20- or 30-year mortgage, a car (cash or financed), petrol or electric, a master's degree (public, private, while working, or not), a phone. A concept can apply only some years (the salary you give up the year you study, a raise from the second). On a computer the alternatives are a table (concepts in rows, alternatives in columns, Enter moves down); on a phone, one tab per alternative. Decisions are saved only when you press Guardar; leaving with unsaved changes asks first.
- **Month close**: *how much is in your account on the last day of the month?*, and what you moved to savings (a transfer to savings lowers your balance just like spending). Closing late is fine: use the balance of that last day. What's left over counts as saved; what's missing comes off savings. Nothing carries over.
- **Year close**: a summary of the year, then one tap starts the next year with the same plan and a new goal.
- **Spending types**: 43 types in 8 groups with icons, plus **your own** (any name, any icon, a colour from a palette that passes contrast). Search them by text (synonyms and typos are fine); when logging, the ones you use most come first. **Ahorro e inversión** is a type that leaves your account but isn't spending: *Aportar* or *Retirar*, the only place a negative amount makes sense.
- **Colours**: income blue, spending neutral, savings violet; red → green only for verdicts (over or under a plan).
- **Planned vs exact amounts**: incomes and expenses count as planned once their date passes (items with no day count from the month's first day); ones marked *varía* ask to be confirmed, and a confirmed one can be un-confirmed.
- **Ajustes**: calendar (when your year and your month start), start balance, language (Español / English), currency, theme, update the app.
- **Installable and offline**: a service worker (`sw.js`) lets Chrome install it as an app with its own icon and open it with no connection (network first, so updates always win). **Reminders** (Ajustes → Avisos, opt-in): "Cierre de octubre", incomes you are waiting for and planned expenses on their day (each kind can be turned off); the page leaves dated notes in the worker and, where the browser allows it (periodic sync, installed Chrome on Android), they become system notifications. The browser decides when to look, so they can be hours late.
- **Export / import** the plan as a JSON file. **Installable** on the phone's home screen, light and dark themes.

Design: one typeface (Inter, tabular figures), neutral cards, and colour only where it means something: blue what comes in, orange what goes out, red → yellow → green how it's going.

It's a **frontend-only** app: HTML, CSS and JavaScript with no build step and no server. The data lives in a **Google Sheet in your Drive**, or only on the device if you don't connect Google.

## How it works

- **Three modes**: Google (a sheet in your Drive plus a copy on the device for offline use), this device only (`localStorage`), and a demo with made-up data.
- **Sign-in**: Google Identity Services in the browser, scope `drive.file` only: the app can see the files it created and nothing else in your Drive. No API key is needed.
- **One sheet** named `MoneyTracker`, tagged in Drive `appProperties` (`app=hucha`) so the app finds it on any device:

  | Tab | Columns |
  |---|---|
  | `_hucha` | `key, value`: `schema`, `goal`, `start` (first month, `YYYY-MM`), `cycle_day` (the day your month starts; empty: from your pay), `lang` and `currency` (your language and currency, kept here so a device that forgets them gets them back), `cats` (JSON: your own spending types `{id, name, icon, color}`), `years` (JSON: past years' closes) |
  | `items` | `id, kind (in/out), name, amount, freq (monthly/quarterly/yearly/once), month, year, day, pot, vary, note, real, budget, cat, from, to, at` (an item is several rows with the same `id`: its versions, each with the months it was in force and when it was changed) |
  | `meses` | `ym, saved, pots, pot_spent, real, close, challenge, bal, open, check, open_date, dates, checks`: put aside; (unused, older versions); (older versions: exact amounts of funded expenses); JSON item id → exact amount that month; the close `{amount}` (left over, or missing if negative: it counts as saved); (unused, older versions); account balance when the month ended; balance when it began (only needed once); the last look at the balance `{date, bal}` |
  | `cambios` | `at, what…`: the plan's change history (what changed, when, from which month) |
  | `calculos` | `id, name, at, years, infl, ret, opts`: saved decisions (`ret` is the scenario shown; `opts` is JSON `{ rets, sel, rows, alts }`: the scenarios' returns, the shared concepts and each alternative's price, value mode, selling costs, loan and amounts). Comparisons saved by older versions are read and converted |
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
