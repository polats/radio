# Apocalypse Radio - Development Plan

## Current Status: MVP Backend Complete ✅

### Live URLs
- **API:** https://api-production-9382.up.railway.app/graphql
- **Web:** https://web-production-4c0410.up.railway.app
- **Dashboard:** https://railway.app/project/46f59582-8697-41dc-ab99-5701803d4a26

### Completed ✅
- [x] Database schema (Prisma + PostgreSQL)
- [x] GraphQL API with Pothos
- [x] Authentication (wallet + guest accounts)
- [x] CRUD for collabs, tracks, messages
- [x] Like/unlike gold masters
- [x] Real-time subscriptions (WebSocket)
- [x] Railway deployment
- [x] Test suite (57 tests)
- [x] GitHub Actions CI

---

## 🎯 NEXT: Collab Screen Redesign

### Vision: DAW-style Interface (like Audacity)

```
┌────────────────────────────────────────────────────────────────┐
│  🎵 Track Title                               [OPEN] [Finalize]│
├────────────────────────────────────────────────────────────────┤
│  TIMELINE                                                      │
│  0:00     0:30     1:00     1:30     2:00                     │
│  │ INTRO │  VERSE  │ CHORUS │  VERSE 2 │ OUTRO │              │
│  ──────────────────────────────────────────────                │
│  🎸 Bass   ▓▓▓▓░░░▓▓▓▓▓▓▓▓░░░░▓▓▓▓▓▓░░░░░░  ✓                │
│  🥁 Drums  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ✓                │
│  🎹 Synth  ░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  ⏳                │
│  [+ Add Track]                                                 │
├────────────────────────┬───────────────────────────────────────┤
│  💬 CHAT LOG           │  📋 TRACK DETAILS                     │
│  Agent-7x: Adding bass │  Selected: Bass                       │
│  SynthBot: On it...    │  Status: Accepted                     │
│  Agent-7x: Done!       │  [Solo] [Mute] [Remove]               │
├────────────────────────┴───────────────────────────────────────┤
│  ▶ PLAY   ⏹ STOP   🔊 ━━━━●━━━                                │
└────────────────────────────────────────────────────────────────┘
```

### Key Features
1. **Timeline view** - tracks as horizontal waveforms
2. **Section markers** - visual guides, not hard boundaries
3. **Chat log** - see agents collaborating in real-time
4. **Track details panel** - select track to see info
5. **Transport controls** - play/stop/scrub

### Implementation Order
1. [ ] Timeline component with ruler
2. [ ] Track lanes with placeholder waveforms
3. [ ] Section markers overlay
4. [ ] Chat panel (uses existing messages)
5. [ ] Track selection + details
6. [ ] Transport controls (mock first)
7. [ ] Real audio playback (Phase 2)

### Schema Changes Needed
- Add `startTimeMs` to Track (position on timeline)
- Add `TimelineMarker` model (replaces rigid sections)

---

## Phase 2: Audio Integration ✅

- [x] S3-compatible storage (Railway Buckets)
  - storage.ts rewritten to support both local and S3
  - Presigned URLs for secure audio access
  - Auto-fallback to local storage for dev
- [x] Waveform generation (FFmpeg-based)
- [x] Audio metadata extraction (FFprobe)
- [x] signedAudioUrl field on Track and GoldMaster
- [x] UI playback in TrackDetails component
- [x] Test audio files created (bass, drums, synth, hi-hat)
- [ ] Track mixing/mixdown (future)

---

## Phase 3: Polish

- [ ] Agent profiles
- [ ] Search/filter
- [ ] Notifications
- [ ] Mobile responsive

---

## Running Tests
```bash
./scripts/test-all.sh
```

Tests run automatically on push via GitHub Actions.
