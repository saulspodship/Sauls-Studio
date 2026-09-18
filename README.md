# Saul’s Podship Studio

A self-contained, responsive production dashboard for **Saul's Podship**. It is designed around Volume I's 100 Bible story treatments and provides a separate general-content workflow.

## What is included

- A searchable **100 Bible Stories** library, structured from Genesis to Revelation.
- An imported **Archive Video Ideas** library: the owner’s 100 Tough Questions plus 1,000 book-by-book study questions, searchable and convertible directly into a production brief.
- Story and general-content production briefs.
- Reel/Short `9:16` mode with **top biblical visual + bottom presenter/avatar** composition.
- YouTube `16:9` landscape mode with a presenter beside visuals.
- Script, scene-plan and caption editing; render-plan and caption-copy exports.
- Browser-side avatar/voice reference attachment UI, with consent reminders.
- A small server-side project API and a secure **provider webhook handoff**. Provider credentials are never put in the browser.
- Editorial, likeness-rights, translation-attribution and accessibility checkpoints.

## Run locally

Node.js 20+ is all that is required (there are no package dependencies):

```bash
cd podship-video-studio
npm start
```

Open `http://localhost:3000`.

## Deploy free on Vercel at `studio.saulspodship.com`

This project now includes Vercel Functions in `api/`. On the Vercel Hobby plan it uses **browser local storage** for projects, so there is no paid database requirement. Each creator's drafts remain in their own browser; export the JSON production plan if you need a backup or transfer it to another machine.

1. Create a private GitHub repository and push the `podship-video-studio` folder contents to it.
2. In Vercel, choose **Add New → Project**, import that repository, and deploy. Vercel will serve `public/index.html` and expose `/api/generate-script` automatically.
3. In **Project → Settings → Environment Variables**, add:

   ```bash
   OPENROUTER_API_KEY=your_private_key
   OPENROUTER_MODEL=openrouter/free
   APP_URL=https://studio.saulspodship.com
   PEXELS_API_KEY=your_free_pexels_key
   ```

   `OPENROUTER_MODEL` is optional. `openrouter/free` selects from the currently available free-model route. Never put the key in `index.html`, a Git commit, or a public browser setting.
4. In **Project → Settings → Domains**, add `studio.saulspodship.com`. Because the root domain is managed in Vercel, follow the DNS record shown there (normally a `CNAME` for `studio`).
5. Open the subdomain and create a draft. The script endpoint uses OpenRouter when its key is present; all production projects are still saved locally in the browser at no database cost.

The Vercel deployment is deliberately a **creator-only dashboard**, not a public anonymous script generator. Use Vercel's available deployment/project access protections, or keep the Studio URL private, before adding a model key. A public AI endpoint can be abused even if its key is server-side.

## Free local workflow: Flick + Wan 2.2

The Studio now uses **Flick** rather than Google Flow as its free motion-animation handoff.

1. In **Video Studio**, choose **Flick workflow** and download the Flick animation brief.
2. Install Flick in a supported local AI coding agent using its official setup instructions: `https://github.com/Creatorberry/flick`.
3. Give the downloaded brief to the Flick-enabled agent. Flick creates editable Remotion scene animations and local MP4 previews on your computer.
4. Use the Studio’s **Free B-roll** tab to find approved free Pexels footage.
5. Use HeyGen or an approved local Wan S2V workflow for the presenter layer.

Flick is local software. It cannot run on Vercel and it does not create a cloud-hosted video by itself. It uses Remotion and FFmpeg to create original scene animations from the approved brief.

### Wan 2.2 open-source video options

The **Wan 2.2 jobs** button creates downloadable local-GPU jobs for:

- `Wan2.2-TI2V-5B` — text/image-to-video B-roll;
- `Wan2.2-I2V-A14B` — detailed image-to-video Bible scenes;
- `Wan2.2-S2V-14B` — approved portrait + authorized audio talking-head clips.

Wan 2.2 is open-source, but it requires a capable NVIDIA GPU worker; Vercel cannot run it. Read `WAN2.2-LOCAL-WORKER-GUIDE.md` before use.

### Free Pexels B-roll

Add the optional server-only `PEXELS_API_KEY` above to enable B-roll search directly in Studio. Get the free key at `https://www.pexels.com/api/`. The key is never delivered to the browser.

## Connecting a real AI pipeline

The interface intentionally does **not** pretend a sample image or sample voice can generate a final video by itself. Full AI video creation needs approved provider accounts, your original avatar/voice assets, and provider-specific consent/risk controls.

### OpenRouter for the AI writing stage

The Studio now supports OpenRouter directly for script, scene and caption drafts. You still need an **OpenRouter account and API key**; it must be installed as a server/hosting secret, never entered in the browser or committed to Git.

```bash
OPENROUTER_API_KEY=your_secret_key \
# Optional: select a currently available free model. If omitted, the server selects an available :free text model.
OPENROUTER_MODEL=your-provider/your-model:free \
APP_URL=https://studio.saulspodship.com \
npm start
```

OpenRouter's API is OpenAI-compatible and uses a Bearer API key. Its `:free` variants have lower rate limits; choose the current model from its model catalogue rather than hard-coding a model name. See OpenRouter's [Quickstart](https://openrouter.ai/docs/quickstart) and [FAQ](https://openrouter.ai/docs/faq).

### Optional custom script and render services

You may replace the built-in OpenRouter script call or connect an actual video pipeline using these server-only variables:

```bash
AI_SCRIPT_WEBHOOK=https://your-secure-orchestrator.example/create-script \
AI_RENDER_WEBHOOK=https://your-secure-orchestrator.example/render-video \
npm start
```

`AI_SCRIPT_WEBHOOK` takes precedence over OpenRouter when both are set.

### Script webhook request

`POST AI_SCRIPT_WEBHOOK`

```json
{
  "task": "create_script",
  "project": { "title": "...", "passage": "...", "format": "reel|landscape" },
  "responseSchema": "PodshipScriptV1"
}
```

Return a script object with `hook`, `thesis`, `narration` (array of `{section, seconds, text}`), and `theologicalReview`.

### Render webhook request

`POST AI_RENDER_WEBHOOK`

```json
{
  "task": "render_video",
  "manifest": {
    "schema": "podship.render.v1",
    "output": { "format": "reel|landscape", "duration": 75, "captions": true },
    "layout": { "visualPosition": "top|right", "avatarPosition": "bottom|left" },
    "assets": { "avatar": {}, "voice": {} },
    "script": {}
  }
}
```

Return JSON such as:

```json
{ "status": "rendering", "jobId": "provider-job-123", "statusUrl": "https://..." }
```

Your private orchestrator is where you would invoke the specific services you select—e.g. a script model, licensed image/video generator or footage library, licensed avatar service, authorized TTS/recorded narration, captioner, music library, and a compositor. It should upload files to private object storage and pass signed URLs to the renderer rather than putting media in the browser.

## Production safety gate

Before enabling auto-publish, keep a human approval step for:

1. biblical passage accuracy, theological claims, and translation attribution;
2. consent and terms for the avatar and voice;
3. visual, music, font and stock-footage licensing;
4. platform and local disclosure requirements for AI-assisted or synthetic media;
5. captions, descriptions, chapter markers and accessibility.

## Integrating into saulspodship.com

This workspace is a standalone Node app because the live site's source repository/hosting credentials were not provided. It can be deployed at a subdomain such as `studio.saulspodship.com`, or the `public/index.html` interface can be integrated into the existing website after its source repository is supplied.
