# AI Humanizer ✍️

**Live: [mods4u.github.io/Ai-humanizer](https://mods4u.github.io/Ai-humanizer/)**

A free, privacy-first tool that rewrites AI-generated text so it sounds like a person
actually wrote it. Paste text from ChatGPT, Claude, or any AI tool — the humanizer
strips the robotic tells and gives you natural, plain-spoken prose back.

Everything runs **100% in your browser**: plain HTML, CSS and JavaScript. No API keys,
no sign-ups, no tracking — your text never leaves your device.

## What it does

| AI tell | Before | After |
| --- | --- | --- |
| Cliché openers | *In today's fast-paced digital landscape…* | *These days…* |
| Stiff vocabulary | *utilize, leverage, facilitate, numerous* | *use, build on, help with, many* |
| Filler phrases | *It is important to note that…* | *(removed)* |
| Robot transitions | *Furthermore… Moreover… In conclusion…* | *Also… Plus… So…* |
| No contractions | *do not, it is, cannot* | *don't, it's, can't* |
| Em-dash abuse | *fast — flexible — powerful* | *fast, flexible, powerful* |
| Run-on sentences | 40-word monsters | Split at natural pivots |

Plus 150+ other patterns, three intensity levels (**Light / Standard / Bold**),
and a ↻ **Regenerate** button that re-rolls every pass with a fresh random seed.

## Features

- 🎚️ **Three intensities** — Light (gentle cleanup), Standard (default), Bold (full rewrite energy)
- 📊 **Before/after "human score"** — a heuristic that looks for AI tells (clichés, em-dash
  overuse, drowsy rhythm) vs. human tells (contractions, varied pacing)
- ⚙️ **Toggles** for contractions, em-dash fixing, sentence splitting, and natural openers
- 📋 Copy to clipboard / download as `.txt`
- ⌨️ `Ctrl/Cmd + Enter` to humanize
- 📱 Fully responsive dark UI

## Run it locally

It's a static site — any file server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Project layout

```
index.html               # page markup
css/style.css            # styling
js/humanizer.js          # the humanizer engine (rules + scoring)
js/app.js                # UI wiring
favicon.svg              # icon
.nojekyll                # serve files as-is (no Jekyll processing)
```

## Deployment

Hosted on GitHub Pages, built directly from the `main` branch — every push to `main`
is published automatically (`.nojekyll` keeps the build a plain static copy).

## Notes

- The humanizer improves flow and removes AI-isms, but always read the output before
  publishing — you know your meaning best.
- Check your school or workplace policy before submitting humanized text as your own.

## License

MIT
