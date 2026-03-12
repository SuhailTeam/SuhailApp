# Companion App Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul `public/index.html` from an admin dashboard into a 4-tab companion app with dark navy theme, and add backend support for settings, structured activity logs, and battery status.

**Architecture:** Single-page vanilla HTML/CSS/JS app with client-side tab switching. Backend changes in `src/app.ts` (new endpoints, structured activity), new `src/services/settings-store.ts` (global settings), and modifications to `src/services/tts-service.ts` (pass voice options) and `src/services/face-service.ts` (include enrolledAt in list response).

**Tech Stack:** TypeScript (Bun runtime), Express (via @mentra/sdk), vanilla HTML/CSS/JS, ElevenLabs TTS (via SDK)

**Spec:** `docs/superpowers/specs/2026-03-11-companion-app-redesign-design.md`

---

## Chunk 1: Backend Changes

### Task 1: Create Settings Store

**Files:**
- Create: `src/services/settings-store.ts`

- [ ] **Step 1: Create the settings store module**

Create `src/services/settings-store.ts` with a global in-memory settings object:

```typescript
import { Logger } from "../utils/logger";

const logger = new Logger("SettingsStore");

export interface AppSettings {
  speechSpeed: number;   // 0.5 - 2.0
  volume: number;        // 0.0 - 1.0
  voicePreset: "default" | "male" | "female";
  language: "ar" | "en";
}

const defaults: AppSettings = {
  speechSpeed: 1.0,
  volume: 0.8,
  voicePreset: "default",
  language: (process.env.DEFAULT_LANGUAGE as "ar" | "en") || "ar",
};

let settings: AppSettings = { ...defaults };

export function getSettings(): AppSettings {
  return { ...settings };
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  if (partial.speechSpeed !== undefined) {
    settings.speechSpeed = Math.max(0.5, Math.min(2.0, partial.speechSpeed));
  }
  if (partial.volume !== undefined) {
    settings.volume = Math.max(0.0, Math.min(1.0, partial.volume));
  }
  if (partial.voicePreset !== undefined && ["default", "male", "female"].includes(partial.voicePreset)) {
    settings.voicePreset = partial.voicePreset;
  }
  if (partial.language !== undefined && ["ar", "en"].includes(partial.language)) {
    settings.language = partial.language;
  }
  logger.info(`Settings updated: ${JSON.stringify(settings)}`);
  return { ...settings };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /c/Users/User/Desktop/suhail/.claude/worktrees/laughing-gagarin && bun run typecheck`
Expected: No errors related to settings-store.ts

- [ ] **Step 3: Commit**

```bash
git add src/services/settings-store.ts
git commit -m "feat: add global settings store for voice/language preferences"
```

---

### Task 2: Modify TTS Service to Use Settings

**Files:**
- Modify: `src/services/tts-service.ts`

- [ ] **Step 1: Update speak() to pass SpeakOptions from settings**

In `src/services/tts-service.ts`, add the import and modify the `speak()` function:

```typescript
import { getSettings } from "./settings-store";
```

Add a voice ID helper and replace the `speak` function body (line 28-38) to pass voice options:

```typescript
/** Maps voice preset names to ElevenLabs voice IDs */
function getVoiceId(preset: string): string | undefined {
  const voiceMap: Record<string, string> = {
    // These are placeholder ElevenLabs voice IDs — replace with actual IDs from the ElevenLabs dashboard
    male: "pNInz6obpgDQGcFmaJgB",    // "Adam"
    female: "21m00Tcm4TlvDq8ikWAM",  // "Rachel"
  };
  return voiceMap[preset]; // undefined for "default" — uses SDK default
}

export async function speak(session: AppSession, text: string, sessionId?: string): Promise<void> {
  try {
    logger.info(`Speaking: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    const settings = getSettings();
    await session.audio.speak(text, {
      voice_id: getVoiceId(settings.voicePreset),
      voice_settings: {
        speed: settings.speechSpeed,
      },
      volume: settings.volume,
    });
    if (sessionId) {
      lastResponses.set(sessionId, text);
    }
  } catch (error) {
    logger.error("TTS failed:", error);
  }
}
```

- [ ] **Step 2: Update speakBilingual() and localize() to read language from settings**

Replace `speakBilingual` (line 15-22) to read from settings instead of config:

```typescript
export async function speakBilingual(
  session: AppSession,
  message: BilingualMessage,
  sessionId?: string
): Promise<void> {
  const settings = getSettings();
  const text = message[settings.language];
  await speak(session, text, sessionId);
}
```

Replace `localize` (line 53-55):

```typescript
export function localize(message: BilingualMessage): string {
  const settings = getSettings();
  return message[settings.language];
}
```

**Known limitation:** `config.defaultLanguage` is still used in `app.ts` (transcription language binding at line 209) and `vision-service.ts` (prompt language selection). These are bound at session start and will NOT update at runtime when the user changes language in settings. Changing the language in settings affects TTS output and the webview UI only. To change the transcription/vision language, the user would need to restart the session. This is acceptable for a graduation project.

- [ ] **Step 3: Verify it compiles**

Run: `cd /c/Users/User/Desktop/suhail/.claude/worktrees/laughing-gagarin && bun run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/services/tts-service.ts
git commit -m "feat: TTS now uses settings store for speed, volume, and language"
```

---

### Task 3: Restructure Activity Log and Add Battery/Settings/Face Endpoints

**Files:**
- Modify: `src/app.ts`
- Modify: `src/services/face-service.ts`

- [ ] **Step 1: Add ActivityEntry type and restructure activityLog in app.ts**

In `src/app.ts`, add the import at the top (after the existing imports):

```typescript
import { getSettings, updateSettings } from "./services/settings-store";
```

Replace the `activityLog` property declaration (line 66):

```typescript
/** Rolling log of the last 20 activity events (served to the mini app UI) */
private activityLog: Array<{
  time: string;
  type: string;
  command: string;
  result?: string;
  event: string;
}> = [];
```

Replace the `logActivity` method (line 178-183) with a version that accepts structured data:

```typescript
private logActivity(event: string, type: string = "system", command: string = "", result?: string): void {
  this.activityLog.push({ time: new Date().toISOString(), type, command, result, event });
  if (this.activityLog.length > 20) {
    this.activityLog.splice(0, this.activityLog.length - 20);
  }
}
```

- [ ] **Step 2: Update all logActivity calls to include type and command**

Update each `logActivity()` call in `src/app.ts`:

Line 203 (session start):
```typescript
this.logActivity(`جلسة جديدة (${userId})`, "system", "session-start");
```

Line 271 (session stop):
```typescript
this.logActivity(`انتهت الجلسة (${reason})`, "system", "session-stop");
```

Line 336 (voice command routed) — use a lookup map for readability:
```typescript
const commandTypeMap: Record<string, string> = {
  "scene-summarize": "scene",
  "face-recognize": "face-recognize",
  "face-enroll": "face-enroll",
  "ocr-read-text": "ocr",
  "find-object": "find-object",
  "currency-recognize": "currency",
  "color-detect": "color",
  "visual-qa": "visual-qa",
};
this.logActivity(`أمر صوتي: ${route.command}`, commandTypeMap[route.command] ?? "system", route.command);
```

Note: Define `commandTypeMap` as a private static property on the class (or a module-level const) rather than recreating it on every call.

Line 460 (forward swipe):
```typescript
this.logActivity("سحب للأمام ← وضع الاستماع", "system", "forward-swipe");
```

Line 463 (backward swipe):
```typescript
this.logActivity("سحب للخلف ← إعادة آخر رد", "system", "backward-swipe");
```

Line 494 (left long press):
```typescript
this.logActivity("زر يسار طويل ← إعادة آخر رد", "system", "left-long-press");
```

Line 508 (interrupt):
```typescript
this.logActivity("زر يسار قصير ← مقاطعة والعودة للاستماع", "system", "interrupt");
```

- [ ] **Step 3: Add battery tracking and extend status endpoint**

Add a battery tracking property after `startTime` (around line 69):

```typescript
/** Last known battery level from glasses */
private glassesBattery: { level: number; charging: boolean } | null = null;
```

In `onSession()`, after the existing event listeners (around line 258), add:

```typescript
// Track glasses battery level
session.events.onGlassesBattery((data) => {
  this.glassesBattery = { level: data.level, charging: data.charging };
});
```

Update the `/api/status` endpoint (lines 111-117) to include battery:

```typescript
expressApp.get("/api/status", (_req: any, res: any) => {
  res.json({
    online: true,
    sessions: this.connectedSessions.size,
    uptime: Math.floor((Date.now() - this.startTime) / 1000),
    battery: this.glassesBattery?.level ?? null,
    charging: this.glassesBattery?.charging ?? null,
  });
});
```

- [ ] **Step 4: Add settings API endpoints**

In `registerApiRoutes()`, after the `/webview` route (around line 170), add:

```typescript
expressApp.get("/api/settings", (_req: any, res: any) => {
  res.json(getSettings());
});

expressApp.put("/api/settings", (req: any, res: any) => {
  try {
    const updated = updateSettings(req.body || {});
    res.json(updated);
  } catch (error) {
    logger.error("Failed to update settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});
```

- [ ] **Step 5: Extend face list response to include enrolledAt**

In `src/services/face-service.ts`, update the `listFaces()` function (line 221) to include `enrolledAt`:

Change the return type and push logic:

```typescript
export async function listFaces(): Promise<Array<{ name: string; faceId: string; hasPhoto: boolean; enrolledAt: string | null }>> {
  await ensureCollectionReady();

  const meta = await readMetadata();
  const faces: Array<{ name: string; faceId: string; hasPhoto: boolean; enrolledAt: string | null }> = [];
  let nextToken: string | undefined;

  do {
    const response = await rekognition.send(
      new ListFacesCommand({
        CollectionId: collectionId,
        MaxResults: 100,
        NextToken: nextToken,
      })
    );

    for (const face of response.Faces ?? []) {
      if (face.FaceId && face.ExternalImageId) {
        const localEntry = meta[face.FaceId];
        const name = localEntry?.name ?? decodeName(face.ExternalImageId);
        let hasPhoto = false;
        try {
          await fs.access(path.join(facesDir, `${face.FaceId}.jpg`));
          hasPhoto = true;
        } catch {}

        faces.push({
          name,
          faceId: face.FaceId,
          hasPhoto,
          enrolledAt: localEntry?.enrolledAt ?? null,
        });
      }
    }

    nextToken = response.NextToken;
  } while (nextToken);

  logger.info(`Listed ${faces.length} enrolled faces`);
  return faces;
}
```

Also update the `listFaces` method in `src/services/ai-handler.ts` (line 58) to match:

```typescript
async listFaces(): Promise<Array<{ name: string; faceId: string; hasPhoto: boolean; enrolledAt: string | null }>> {
  logger.info("AI Handler → List Faces");
  return faceService.listFaces();
}
```

- [ ] **Step 6: Verify it compiles**

Run: `cd /c/Users/User/Desktop/suhail/.claude/worktrees/laughing-gagarin && bun run typecheck`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/app.ts src/services/face-service.ts src/services/ai-handler.ts
git commit -m "feat: structured activity log, battery tracking, settings API, enrolledAt in faces"
```

---

## Chunk 2: Frontend — Complete Overhaul of public/index.html

### Task 4: Rewrite public/index.html — CSS Foundation and Tab Navigation

**Files:**
- Modify: `public/index.html` (complete rewrite)

This is a full rewrite of the file. The new file should contain all CSS, HTML structure, and JS in one file. Due to size, this task covers the CSS variables, base styles, tab navigation, and the Home tab.

- [ ] **Step 1: Write the new index.html with CSS foundation, tab navigation, and Home tab**

Completely replace `public/index.html`. The new file structure:

1. **CSS** — Design system from spec: dark navy (#0D111C), cyan (#06B6D4), card surfaces (#1a1f2e), system font, 12px rounded corners, slider styles, modal styles, bottom nav styles. Use CSS logical properties for RTL support (`margin-inline-start`, `padding-inline-end`, etc.).

2. **HTML structure:**
   ```html
   <body>
     <header> <!-- App name + connection status banner --> </header>
     <main>
       <section id="tab-home"> <!-- Voice commands list --> </section>
       <section id="tab-contacts"> <!-- Face contact book --> </section>
       <section id="tab-activity"> <!-- Activity feed --> </section>
       <section id="tab-settings"> <!-- Settings page --> </section>
     </main>
     <nav id="bottom-nav"> <!-- 4 tab buttons --> </nav>
     <!-- Modals: face detail, photo viewer -->
   </body>
   ```

3. **JS** — Tab switching logic, bilingual strings, render functions.

Key CSS requirements from the spec:
- Background: `#0D111C`, surfaces: `#1a1f2e`, dividers: `#252a3a`
- Primary accent: `#06B6D4` (cyan), success: `#22c55e`
- Bottom nav: fixed to bottom, `#1a1f2e` background, active tab in cyan
- Cards: `#1a1f2e` background, `12px` border-radius
- Typography: system-ui font, headings 16-18px weight 700, body 12-13px
- Section labels: 10px uppercase with `letter-spacing: 1px`, color `#64748b`
- Slider: cyan gradient fill, glowing thumb with `box-shadow: 0 0 6px rgba(6,182,212,0.4)`
- `aria-label` on all interactive elements, `aria-live="polite"` on status regions
- `dir="rtl"` on `<html>` when Arabic is selected

Home tab content:
- Connection status banner (gradient card, shows Connected/Disconnected + battery %)
- Voice commands list (8 items from spec, each with icon in colored bg circle, name, and example phrase in quotes)

Bilingual strings needed (keep the same ones from the existing file plus new ones for the redesigned UI).

The complete HTML file should be self-contained (all CSS in `<style>`, all JS in `<script>`). Target approximately 800-1000 lines.

- [ ] **Step 2: Verify the page loads**

Run: `cd /c/Users/User/Desktop/suhail/.claude/worktrees/laughing-gagarin && bun run start &`
Open `http://localhost:3000` and verify:
- Dark navy background renders
- Bottom nav shows 4 tabs (Home, Contacts, Activity, Settings)
- Home tab shows status banner and voice commands list
- Tab switching works (clicking nav items shows/hides sections)
Kill the server after checking.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: rewrite companion app — CSS foundation, tab nav, Home tab"
```

---

### Task 5: Contacts Tab (Face Contact Book)

**Files:**
- Modify: `public/index.html` (add to the Contacts section)

- [ ] **Step 1: Implement the Contacts tab**

In the `#tab-contacts` section and the associated JS, implement:

1. **Search bar** — text input with search icon, filters contacts by name (client-side)
2. **Contact list** — each contact card shows:
   - Photo thumbnail (52px rounded square) with colored border, or letter avatar fallback if no photo
   - Name and enrollment date (formatted as relative time like "2 days ago")
   - Right chevron indicator
   - `onclick` opens the detail modal
3. **Empty state** — when no contacts: icon + "Say 'Remember this person' while wearing the glasses"
4. **Error state** — when fetch fails: "Could not load contacts" + retry button
5. **Detail modal** — reuse/adapt the existing modal structure:
   - Full photo (or large letter avatar)
   - Name, enrollment date
   - Rename button → shows input field
   - Delete button → confirmation dialog
   - Close button
6. **Fullscreen photo viewer** — tap photo to view full-screen
7. **Polling** — fetch `/api/faces` every 30s
8. **Search** — client-side filter on the cached face list

All API calls: `GET /api/faces`, `GET /api/faces/:faceId/photo`, `PUT /api/faces/:faceId`, `DELETE /api/faces/:faceId` (these already exist).

- [ ] **Step 2: Test the contacts tab**

Verify:
- Empty state shows when no faces enrolled
- If faces exist, they appear with photos/avatars
- Search filters the list
- Tapping a contact opens the modal
- Rename and delete work
- Error state shows if server is down

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: contacts tab with photo cards, search, detail modal"
```

---

### Task 6: Activity Tab

**Files:**
- Modify: `public/index.html` (add to the Activity section)

- [ ] **Step 1: Implement the Activity tab**

In the `#tab-activity` section and JS:

1. **Activity feed** — reverse-chronological list of entries from `/api/activity`
2. **Color-coded left border** per `type` field:
   - `scene` → `#06B6D4` (cyan)
   - `face-recognize`, `face-enroll` → `#a855f7` (purple)
   - `ocr` → `#22c55e` (green)
   - `currency` → `#f59e0b` (amber)
   - `find-object` → `#3b82f6` (blue)
   - `color` → `#ec4899` (pink)
   - `visual-qa` → `#8b5cf6` (violet)
   - `system` → `#64748b` (gray)
3. **Each entry shows:**
   - Icon (matching command type)
   - Command name (bilingual)
   - Result preview (truncated, from `result` field, or `command` name if no result)
   - Timestamp (relative: "2m ago", "1h ago")
4. **Time grouping** — group entries by time (optional: show time header when gap > 30 min)
5. **Empty state** — "Activity will appear here as you use voice commands"
6. **Polling** — fetch `/api/activity` every 5s

- [ ] **Step 2: Verify activity tab renders**

- Verify empty state when no activity
- If activity exists, entries render with correct colors and icons
- Polling updates the list

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: activity tab with color-coded feed"
```

---

### Task 7: Settings Tab

**Files:**
- Modify: `public/index.html` (add to the Settings section)

- [ ] **Step 1: Implement the Settings tab**

In the `#tab-settings` section and JS:

1. **Device section** (read-only, from `/api/status`):
   - Battery: shows percentage + charging icon, or "—" if null
   - Connection: "Connected" (green) or "Disconnected" (red)

2. **Voice Output section**:
   - Speech Speed slider: range input 0.5-2.0, step 0.1, displays current value like "1.0x"
   - Volume slider: range input 0-100 (maps to 0.0-1.0), displays percentage
   - Voice preset picker: three buttons/options (Default, Male, Female), currently selected highlighted in cyan

3. **App section**:
   - Language toggle: two buttons (Arabic, English), selected one highlighted
   - On language change: update `dir` attribute on `<html>`, re-render all text, save to settings API

4. **About section**:
   - "Suhail v1.0.0" with "SWE 496" badge

5. **Settings persistence**:
   - On page load: `GET /api/settings` to populate current values
   - On any change: `PUT /api/settings` with updated values
   - Debounce slider changes (300ms) to avoid excessive API calls
   - On save failure: revert slider to previous value, show brief error indicator

6. **Slider styling**: Custom CSS for range inputs matching the mockup — cyan gradient track, glowing thumb

- [ ] **Step 2: Test settings**

Verify:
- Sliders move and display values
- Voice preset and language buttons toggle
- Changes persist via API (refresh page, values stay)
- Language toggle switches UI text and RTL direction

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: settings tab with voice controls and language toggle"
```

---

## Chunk 3: Polish and Accessibility

### Task 8: Accessibility and RTL Polish

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add ARIA attributes and semantic HTML**

Review the entire file and ensure:
- All interactive elements have `aria-label` attributes
- Status banner has `aria-live="polite"` for screen reader announcements
- Tab navigation uses `role="tablist"`, tabs use `role="tab"`, panels use `role="tabpanel"`
- Modal has `role="dialog"` and `aria-modal="true"`
- Slider inputs have `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label`
- Focus trap in modal (Tab cycles within modal when open)
- Visible focus rings on all interactive elements (`:focus-visible` outline)

- [ ] **Step 2: Test RTL layout**

Switch to Arabic and verify:
- Text aligns right
- Bottom nav order does not reverse (icons stay in same position)
- Chevrons and icons position correctly
- Search input text aligns right
- Sliders still work correctly
- Modal layout is correct

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: accessibility ARIA attributes and RTL polish"
```

---

### Task 9: Final Integration Test and Cleanup

**Files:**
- Modify: `public/index.html` (minor fixes)
- Modify: `src/app.ts` (update logger message for new routes)

- [ ] **Step 1: Run typecheck**

Run: `cd /c/Users/User/Desktop/suhail/.claude/worktrees/laughing-gagarin && bun run typecheck`
Expected: No errors

- [ ] **Step 2: Start server and test all tabs**

Run: `cd /c/Users/User/Desktop/suhail/.claude/worktrees/laughing-gagarin && bun run start`

Test checklist:
- Home tab: status banner shows, voice commands list renders, polls status
- Contacts tab: face list loads (or empty state), search works, modal opens, rename/delete work
- Activity tab: shows feed (or empty state), polls and updates
- Settings tab: sliders work, voice preset toggles, language switches UI + RTL, about section shows
- Switch between tabs rapidly — no visual glitches
- Switch language — all text updates, RTL flips correctly
- Refresh page — settings persist

- [ ] **Step 3: Update API routes logger message**

In `src/app.ts`, update the logger message at line 172 to include new routes:

```typescript
logger.info("API routes registered (/api/status, /api/activity, /api/faces, /api/settings, /webview)");
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html src/app.ts
git commit -m "chore: final integration test fixes and route logging update"
```

---

### Task 10: Update .gitignore for Brainstorm Files

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore if not already present**

Check if `.superpowers/` is in `.gitignore`. If not, add it:

```
# Superpowers brainstorm mockups
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers/ to gitignore"
```
