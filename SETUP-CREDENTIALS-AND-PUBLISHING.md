# Saul’s Podship Studio — API, Video and Auto-Publishing Setup

This is the owner checklist for a production deployment at `https://studio.saulspodship.com`.

> **Never send an API key, social password, cookies, recovery code, or OAuth token in chat.** Add secrets only in Vercel: **Project → Settings → Environment Variables**.

---

## First: the Flick and Wan 2.2 distinction

**Flick** is a free, local Remotion-animation workflow. It receives a Saul’s Podship Studio scene brief and creates editable local animation files using a supported AI coding agent. It does not run inside Vercel.

**Wan 2.2** is free open-source video-generation software from Alibaba. The Studio creates TI2V, I2V and S2V job files for it, but Wan must run on your own capable NVIDIA GPU or a separate GPU worker. It also does not run inside Vercel.

For the immediate production workflow:

- use **Pexels** for free stock B-roll;
- use **HeyGen** for the hosted talking-head/presenter layer;
- use **Flick** for free editable motion-graphics scenes;
- use **Wan 2.2** only where a GPU worker is available for custom original visual/talking-head clips.

Read `WAN2.2-LOCAL-WORKER-GUIDE.md` included with the project before configuring Wan.

---

## 1. OpenRouter — script, captions, titles and prompts

### What it powers

- Bible-story scripts
- Archive-question explainers
- Video hooks and calls to action
- Captions, titles, descriptions, hashtags and scene prompts

### Create the key

1. Go to [OpenRouter](https://openrouter.ai/) and create/sign in to an account.
2. Open **Settings → Keys**: `https://openrouter.ai/settings/keys`.
3. Create a new key named `podship-studio-production`.
4. Set a strict usage limit. For initial testing, select free models only and keep paid credits disabled or capped.
5. Copy the key immediately. It is a secret.
6. In the Vercel project for Saul’s Podship Studio, go to **Settings → Environment Variables** and add:

   ```bash
   OPENROUTER_API_KEY=your_key_here
   OPENROUTER_MODEL=openrouter/free
   APP_URL=https://studio.saulspodship.com
   ```

7. Select **Production**, **Preview**, and **Development** environments if you want the Studio to work in all three.
8. Redeploy the project after adding the variables.

The current Studio build already supports `OPENROUTER_API_KEY` and `openrouter/free` for its script-drafting endpoint.

---

## 2. Pexels — free stock B-roll search

Pexels supplies free-to-use stock photos and video clips. The Studio's **Free B-roll** tab can search Pexels for each selected story and format, then link you to the clip page for download and use behind the HeyGen presenter.

1. Create/sign in to a Pexels account: `https://www.pexels.com/api/`.
2. Request/copy your free API key.
3. In Vercel → **Settings → Environment Variables**, add:

   ```bash
   PEXELS_API_KEY=your_pexels_key
   ```

4. Select **Production** and **Preview**, then redeploy.

The key stays server-side; it is never sent to a visitor's browser. Pexels says its API has a default limit of 200 requests per hour and 20,000 per month. Always review each clip's page and suitability before publishing.

---

## 3. Flick and Wan 2.2 — free local render options

### Flick: editable motion animation

1. In Studio, select **Flick workflow** and download the generated brief.
2. Follow Flick's official install instructions: `https://github.com/Creatorberry/flick`.
3. Give the brief to Flick in your supported local AI coding agent.
4. Review the named Remotion animation scenes it creates before use.

Flick's code is free, but it runs on your computer and needs Node.js, Python, and a supported local agent workflow. It does not generate cloud video in Vercel.

### Wan 2.2: original video and local talking head

1. In Studio, select **Wan 2.2 jobs**.
2. Choose the task:
   - `TI2V-5B` for text/image-to-video B-roll;
   - `I2V-A14B` for detailed image-to-video scenes;
   - `S2V-14B` for an approved portrait plus authorized narration audio.
3. Download the JSON job and run it on your GPU worker.

Wan model weights are open source, but GPU hardware or rented GPU time is not free. Do **not** add a Google/Gemini key for this workflow. See `WAN2.2-LOCAL-WORKER-GUIDE.md`.

---

## 4. Accounts required for automatic publishing

Before integration, make sure you own/administer these exact publishing destinations:

| Platform | Required destination | Not supported by this production plan |
|---|---|---|
| Facebook | A Facebook **Page** | Posting automatically to a personal profile |
| Instagram | An Instagram **Professional** account (Business or Creator) | A personal-only Instagram account |
| YouTube | The Saul's Podship YouTube channel | Uploading without channel owner authorization |
| TikTok | The Saul's Podship TikTok account | Unreviewed public publishing without TikTok approval |

For the cleanest Meta setup, link the Instagram Professional account to the Facebook Page in Meta Business Suite before creating the integration.

---

## 5. Meta: Facebook Page and Instagram Reels

Meta can publish Facebook Page posts and Instagram Professional-account videos/Reels after the account owner completes OAuth authorization.

### One-time owner setup

1. Confirm you have **Full control** or the **Content** task on the Saul's Podship Facebook Page.
2. Convert the Instagram account to **Business** or **Creator** if it is personal.
3. Link that Instagram account to the Facebook Page.
4. Go to [Meta for Developers](https://developers.facebook.com/), create a Meta app for `Saul’s Podship Studio`, and add the relevant Facebook/Instagram content publishing use case.
5. Add these redirect URLs when the production Studio's connect buttons are implemented:

   ```text
   https://studio.saulspodship.com/api/oauth/meta/callback
   ```

6. Complete the Meta authorization screen in Studio and grant the requested publishing permissions.
7. Submit the app for Meta review if Meta requires it for the intended production access level.

The integration must request only permissions that are needed. Typical publishing permissions include `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, and `instagram_content_publish`.

### How auto-publishing works

- The final MP4 must be stored at a publicly accessible HTTPS URL for Meta to fetch during publishing.
- Studio uploads/creates the media container, waits for it to finish processing, then publishes it to the selected Page and Instagram account.
- Instagram publishing is for Professional accounts and is subject to Meta's publishing limits and policies.

Official references:
- [Facebook Pages API: Getting Started](https://developers.facebook.com/docs/pages-api/getting-started/)
- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)

---

## 6. YouTube automatic uploads

YouTube uses a secure browser sign-in, not a permanent text API key for uploads.

### One-time owner setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select the `Saul’s Podship Studio Publishing` project.
3. Open **APIs & Services → Library** and enable **YouTube Data API v3**.
4. Open **APIs & Services → OAuth consent screen** and complete the required app details.
5. Open **Credentials → Create Credentials → OAuth client ID**.
6. Select **Web application**.
7. Add this authorized redirect URI:

   ```text
   https://studio.saulspodship.com/api/oauth/youtube/callback
   ```

8. Add the client credentials to Vercel only:

   ```bash
   YOUTUBE_CLIENT_ID=...
   YOUTUBE_CLIENT_SECRET=...
   ```

9. In the Studio's future **Connect YouTube** screen, sign in to the Saul's Podship YouTube channel and click **Allow** for the upload permission.

The app uses the `youtube.upload` OAuth scope and the YouTube `videos.insert` endpoint to upload the finished MP4, title, description, tags, and selected visibility/schedule settings.

Official reference: [YouTube Data API — videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert)

---

## 7. TikTok automatic publishing

TikTok requires a TikTok for Developers app and Content Posting API approval for normal public direct posts.

### One-time owner setup

1. Go to [TikTok for Developers](https://developers.tiktok.com/).
2. Create an app for `Saul’s Podship Studio`.
3. Add the **Content Posting API** product.
4. Verify `studio.saulspodship.com` when TikTok asks for URL/domain verification.
5. Add this redirect URI when prompted:

   ```text
   https://studio.saulspodship.com/api/oauth/tiktok/callback
   ```

6. Submit the app for TikTok review/audit with a short demonstration video of the Studio's upload/publish flow.
7. Add the approved client credentials to Vercel only:

   ```bash
   TIKTOK_CLIENT_KEY=...
   TIKTOK_CLIENT_SECRET=...
   ```

8. In Studio, click **Connect TikTok**, sign in to the Saul's Podship account, and authorize posting.

Unreviewed TikTok Content Posting API clients are restricted to private posts; public direct posting needs the required audit/approval.

Official references:
- [TikTok app registration](https://developers.tiktok.com/doc/getting-started-create-an-app)
- [TikTok app review FAQ](https://developers.tiktok.com/doc/getting-started-faq)

---

## 8. What “no technical setup for you” can realistically mean

The application can provide a one-screen **Connect Accounts** wizard. Your part can be reduced to:

1. Click **Connect Facebook & Instagram** and approve Meta's permissions.
2. Click **Connect YouTube** and approve Google upload access.
3. Click **Connect TikTok** and approve TikTok posting access.
4. Choose each default destination and posting schedule.

However, nobody can legitimately skip:

- your own sign-in and permission approval;
- HeyGen billing for hosted talking-head generation, or your own GPU hardware/rented GPU time for Wan;
- Meta/TikTok developer-account setup and any required app review;
- consent for your avatar/voice;
- platform-specific policy compliance.

The Studio should encrypt OAuth refresh tokens server-side, never expose them to the browser, and provide a **Disconnect** control for each account.

---

## 9. Recommended launch sequence

1. Deploy `studio.saulspodship.com` on Vercel.
2. Add **OpenRouter** only; use it to test 10 scripts from your story and archive libraries.
3. Add the free Pexels key and test B-roll search in Studio.
4. Download a Flick brief and test one local scene animation.
5. If you have a capable GPU worker, test one Wan TI2V-5B job before attempting S2V talking-head output.
6. Use HeyGen only for approved presenter clips until the Wan S2V quality and hardware workflow are proven.
7. Build the render queue and public MP4 storage.
8. Create one Meta developer app, one Google OAuth client, and one TikTok developer app.
9. Connect your accounts with OAuth.
10. Test all four platforms using **private/unlisted/draft** posts.
11. Enable automatic scheduled publishing only after the test posts, captions, aspect ratios, and links are confirmed.

Do not enable “publish automatically” before the theological-review, rights-review, and source-attribution rules are working.
