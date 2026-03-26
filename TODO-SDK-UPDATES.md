# SDK v2.1.29 — Changes to Implement

Things we should update in the Suhail app to take advantage of the new MentraOS SDK features.

## High Priority (Should Do)

### ~~1. Use `onTouchEvent()` for gesture handling~~ ✅ Already implemented
- Already uses `session.events.onTouchEvent()` in `app.ts`

### ~~2. Use `session.device.state` for battery tracking~~ ✅ Done
- Replaced `onGlassesBattery` with reactive `device.state` observables; `/api/status` now returns case battery and WiFi status

### ~~3. Use `"full"` photo size~~ ✅ Done
- Changed `capturePhoto()` default from `"large"` to `"full"` for all commands

### ~~4. Add `onPermissionError()` handling~~ ✅ Done
- Added `onPermissionError()` handler in `onSession()` that speaks a bilingual warning

### ~~5. Use audio track mixing for processing feedback~~ ✅ Done
- Added `trackId: 2` to all TTS calls; track 1 available for background audio

### ~~6. Persist settings with `simpleStorage` + `flush()`~~ ✅ Done
- Settings now load from `simpleStorage` on session start and persist on every change with `flush()`

## Medium Priority (Nice to Have)

### 7. Use `releaseOwnership()` for clean disconnects
- **Why:** Ensures clean session handoff when server restarts or user logs out
- **Where:** `src/app.ts` — call `session.releaseOwnership("clean_shutdown")` in `onStop()` or server shutdown handler
- **Effort:** Tiny

### 8. Add WiFi status check on session start
- **Why:** Can warn user if WiFi is disconnected (glasses need WiFi for camera streaming)
- **Where:** `src/app.ts` — in `onSession()`, check `session.isWifiConnected()` and speak a warning if disconnected; optionally trigger `requestWifiSetup()`
- **Effort:** Small

### ~~9. Use `onTranscriptionForLanguage()` for better bilingual support~~ ✅ Already implemented
- Already uses `session.events.onTranscriptionForLanguage()` with `disableLanguageIdentification: true` in `app.ts`

### 10. Use webview auth helpers for companion app
- **Why:** `createAuthMiddleware()` and `exchangeToken()` provide proper authentication for the companion app instead of rolling our own
- **Where:** `src/app.ts` — replace custom webview auth (if any) with SDK's `createAuthMiddleware()`
- **Effort:** Medium

## Low Priority (Future / Post-Graduation)

### 11. LED feedback during processing
- **Why:** Visual feedback while commands are processing (green blink = listening, blue = processing, red = error)
- **Where:** `src/commands/base-command.ts` and `src/app.ts`
- **Effort:** Small

### 12. Explore `onToolCall()` for cloud-triggered actions
- **Why:** Could enable remote triggers (e.g., companion app sends a "describe scene" command via cloud)
- **Where:** `src/app.ts` — override `onToolCall()` in `SuhailApp`
- **Effort:** Medium

### 13. App-to-app messaging (multi-user)
- **Why:** Could enable caretaker/family member features — e.g., a family member can see what the user sees
- **Where:** New feature entirely
- **Effort:** Large

### 14. Managed video streaming with re-streaming
- **Why:** Could stream the user's POV to a caretaker via YouTube/Twitch private stream
- **Where:** New feature
- **Effort:** Large
