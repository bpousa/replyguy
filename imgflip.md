# Imgflip API – **Premium Plan** Quick‑Reference

> **Status**: Account subscribed to **API Premium** (`$9.99 / mo`).
> **Monthly free quotas** *(reset every 30 days)*:
> • **Caption GIFs** – 50 → \$0.02 ea
> • **Template searches** – 200 → \$0.005 ea
> • **Remove watermark** – 100 → \$0.01 ea
> • **Automeme** – 50 → \$0.02 ea
> • **AI meme** – 50 → \$0.02 ea
> Free‑tier endpoints remain **free** under Premium.

---

## 1  Premium Feature Matrix

| Feature               | Endpoint         |  Included  | Cost after Quota                               |
| --------------------- | ---------------- | :--------: | ---------------------------------------------- |
| Get top memes         | `/get_memes`     |  Unlimited | Free                                           |
| Caption static images | `/caption_image` |  Unlimited | Free – `no_watermark` consumes watermark quota |
| Caption animated GIFs | `/caption_gif`   |   50 / mo  | **\$0.02** ea                                  |
| Search templates      | `/search_memes`  |  200 / mo  | **\$0.005** ea                                 |
| Remove watermark      | `no_watermark=1` |  100 / mo  | **\$0.01** ea                                  |
| Automeme              | `/automeme`      |   50 / mo  | **\$0.02** ea                                  |
| AI meme               | `/ai_meme`       |   50 / mo  | **\$0.02** ea                                  |
| Get template by ID    | `/get_meme`      |  Unlimited | Free                                           |

---

## 2  Shared Parameters

| Param          | Type     | Description                         |
| -------------- | -------- | ----------------------------------- |
| `username`     | *string* | Your Imgflip login                  |
| `password`     | *string* | **Send in POST body, never in URL** |
| `no_watermark` | `1\|0`   | Remove watermark (Premium quota)    |

---

## 3  Endpoints

### 3.1  `GET /get_memes` – Popular Templates

*URL* `https://api.imgflip.com/get_memes`

Returns ≈100 templates ordered by recent usage.

```json
{
  "success": true,
  "data": {
    "memes": [
      {
        "id": "61579",
        "name": "One Does Not Simply",
        "url": "https://i.imgflip.com/1bij.jpg",
        "width": 568,
        "height": 335,
        "box_count": 2
      }
    ]
  }
}
```

---

### 3.2  `POST /caption_image` – Static Meme Creation

*URL* `https://api.imgflip.com/caption_image`

**Required form‑urlencoded fields**

| Key                   | Notes                                 |
| --------------------- | ------------------------------------- |
| `template_id`         | ID from `/get_memes` or custom upload |
| `username`,`password` | Credentials                           |

**Text input options**

*Two‑box shorthand*

| Field   | Position    |
| ------- | ----------- |
| `text0` | Top text    |
| `text1` | Bottom text |

*Multi‑box array* `boxes[n][…]`
(Up to 20 boxes; omit `text0/text1`.)

```json
[
  { "text": "One does not simply", "x":10, "y":10, "width":548, "height":100 },
  { "text": "Make custom memes via API", "x":10, "y":225, "width":548, "height":100 }
]
```

Optional fields: `font`, `max_font_size`, `no_watermark`.

**Success example**

```json
{
  "success": true,
  "data": {
    "url": "https://i.imgflip.com/abc123.jpg",
    "page_url": "https://imgflip.com/i/abc123"
  }
}
```

---

### 3.3  `POST /caption_gif` – Animated GIF Templates *(Premium)*

Same schema as **/caption\_image**, but **must** use `boxes[]` (no `text0` / `text1`).
Cost after 50 free: **\$0.02** each.

---

### 3.4  `POST /search_memes` – Full‑Text Template Search *(Premium)*

*URL* `https://api.imgflip.com/search_memes`

| Param            | Notes                             |
| ---------------- | --------------------------------- |
| `query`          | Text to match `name` and aliases  |
| `include_nsfw=1` | Optional – include NSFW templates |

Quota: 200 / mo → **\$0.005** ea beyond.

---

### 3.5  `POST /get_meme` – Fetch Template by ID *(Premium)*

Retrieve a specific template (same response shape as `/search_memes`).

Body fields: `template_id`, `username`, `password`.

---

### 3.6  `POST /automeme` – Auto‑Select Template + Caption *(Premium)*

Automatically captions one of the top 2 048 templates based on your `text`.

| Param          | Notes              |
| -------------- | ------------------ |
| `text`         | Phrase to meme‑ify |
| `no_watermark` | Optional           |

Quota: 50 / mo → **\$0.02** ea beyond.

---

### 3.7  `POST /ai_meme` – Generate Fresh Meme with AI *(Premium)*

| Param          | Default  | Description             |
| -------------- | -------- | ----------------------- |
| `model`        | `openai` | or `classic`            |
| `template_id`  | –        | Optional fixed template |
| `prefix_text`  | –        | Seed/topic (≤ 64 chars) |
| `no_watermark` | –        | Optional                |

Quota: 50 / mo → **\$0.02** ea beyond.

```json
{
  "success": true,
  "data": {
    "url": "https://i.imgflip.com/123abc.jpg",
    "page_url": "https://imgflip.com/i/123abc",
    "template_id": 89370399,
    "texts": ["top caption", "bottom caption"]
  }
}
```

---

## 4  Usage Notes & Best Practices

* **Rate‑limits** still apply on abusive traffic—even on Premium.
* Generated images are **public** (unguessable URL) and auto‑purged if they receive almost no views.
* Always use **your own credentials** in production; shared demo accounts get throttled.
* Official Slack integration uses `/automeme`: [https://imgflip.com/slack](https://imgflip.com/slack).
* Support: **[general@imgflip.com](mailto:general@imgflip.com)**

---

## 5  Quick cURL Sample

```bash
curl -X POST https://api.imgflip.com/caption_image \
  -d template_id=61579 \
  -d username=$IMGFLIP_USER \
  -d password=$IMGFLIP_PASS \
  -d text0="Deploying to prod" \
  -d text1="On a Friday"
```

---

*Document generated 2025‑06‑23.*
