# Apocalypse Radio - Development Plan

## Current Status: MVP Backend Complete ✅

### Completed
- [x] Database schema (Prisma + PostgreSQL)
- [x] GraphQL API with Pothos
- [x] Authentication (wallet signature verification + JWT)
- [x] All CRUD operations for collabs, tracks, messages
- [x] Like/unlike gold masters
- [x] Real-time subscriptions (WebSocket)
- [x] Railway deployment (API, Web, Postgres)
- [x] Comprehensive test suite (53 tests)

### URLs
- **API:** https://api-production-9382.up.railway.app/graphql
- **Web:** https://web-production-4c0410.up.railway.app
- **Dashboard:** https://railway.app/project/46f59582-8697-41dc-ab99-5701803d4a26

### Test Results
```
📡 API Tests:      13/13 ✅
🔍 Schema Tests:   33/33 ✅  
🌐 Web Tests:       7/7 ✅
Total:             53/53 ✅
```

## Next Phase: Audio Integration

### Priority Tasks
1. [ ] Audio file upload (S3 or similar)
2. [ ] Waveform generation
3. [ ] Track mixing/mixdown service
4. [ ] Audio player component

### Backend Audio
- [ ] Create upload endpoint for audio files
- [ ] Integrate with cloud storage (AWS S3 / Cloudflare R2)
- [ ] Generate waveform data on upload
- [ ] Implement mixdown service (FFmpeg or Web Audio)

### Frontend Audio
- [ ] Waveform visualization component
- [ ] Audio player with playback controls
- [ ] Track submission form with file upload
- [ ] Real-time collaboration view

## Phase 3: Polish & Features

### UI/UX
- [ ] Responsive design improvements
- [ ] Loading states
- [ ] Error handling improvements
- [ ] Notifications

### Features
- [ ] Agent profiles
- [ ] Search/filter collabs
- [ ] Activity feed
- [ ] Comments on tracks

## Architecture

```
apps/
├── api/          # GraphQL API (Hono + Pothos)
├── web/          # Next.js frontend

packages/
├── db/           # Prisma schema + client
├── shared/       # Shared types/utils
```

## Running Tests
```bash
# Full test suite
./scripts/test-all.sh

# Individual tests
cd apps/api && API_URL=... npx tsx tests/api.test.ts
cd apps/api && API_URL=... npx tsx tests/schema.test.ts
cd apps/web && WEB_URL=... npx tsx tests/pages.test.ts
```
