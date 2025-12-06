

You are a senior full-stack engineer. Build a production-ready MVP for a SaaS developer dashboard called "DevFlow" (placeholder). The system manages projects across the full SDLC and integrates with GitHub, Slack, Anthropic AI (Claude), and CodeRabbit.

SYSTEM CORE FEATURES
1. Projects:
   - Create project by linking GitHub repo (OAuth).
   - Or create project from scratch (scaffold templates).
   - Store repo, branch, provider, env config.

2. SDLC Pipeline:
   - Stages: Plan → Design → Code → Build → Test → Deploy → Monitor.
   - Each stage supports:
     - Attached scripts
     - AI-generated suggestions
     - Manual approvals
     - Status tracking

3. Codebase Indexing:
   - Repo cloned automatically.
   - Files indexed into DB (path, size, hash, lastModified).
   - Detect languages, routes, APIs.
   - Index on demand + scheduled via cron jobs.

4. Cron Job Engine:
   - Schedule:
     - Re-indexing
     - Test runs
     - Bug scans
     - AI code reviews
   - Uses BullMQ + Redis.
   - Human-readable cron preview.

5. Automated Testing:
   - Playwright for E2E page & function testing.
   - Jest for unit.
   - Each cron run generates:
     - Per-page test report
     - Screenshots
     - Logs
   - Failed tests automatically create Bug cards.

6. Bug Detection & Cards:
   - Each failed test becomes a bug record.
   - Cards show:
     - File path
     - Line number (when traceable)
     - Error logs
     - Repro steps
     - Severity
   - "Fix with AI" button (Anthropic)
   - "Quote it" button for marketplace.

7. "Quote It" Bug Marketplace:
   - Bug owner can publish bug as a paid task.
   - Set:
     - Price
     - Description
     - Deadline
   - Other devs can accept.
   - After fix:
     - Owner verifies
     - Fix can be published to community (public solution post).

8. Auto-Generated Bash Scripts:
   - Build/Test/Deploy scripts auto-generated per project.
   - Editable command notes.
   - Copy / Download / Run actions.

9. AI Integrations:
   - Anthropic (Claude):
     - Explain bugs
     - Suggest fixes
     - Generate tests
     - Refactor snippets
   - CodeRabbit:
     - AI code reviews after each index
     - Pull-request style feedback on repo
   - Slack:
     - Test failures notify Slack
     - Bug accepted notify Slack
     - Deploy events notify Slack
   - GitHub:
     - Repo linking
     - Pull requests
     - Commit tracking
     - Issue creation from Bug cards

STACK
- Backend: Node.js + TypeScript + Express
- Frontend: Next.js (TypeScript) + Tailwind
- Database: PostgreSQL + Prisma
- Queue/Cron: BullMQ + Redis
- Auth: GitHub OAuth + JWT
- Tests: Playwright + Jest
- AI: Anthropic Claude API
- DevOps: Docker Compose
- Storage: Local FS (S3-ready abstraction)

DATA MODELS (essential)
- User { id, name, email, githubId, slackWebhook }
- Project { id, name, repoUrl, branch, ownerId, lastIndexedAt, indexStatus }
- FileIndex { projectId, path, type, hash }
- CronJob { id, projectId, expr, lastRunAt, nextRunAt }
- TestResult { projectId, name, route, status, logsPath }
- Bug { id, projectId, filePath, errorMessage, severity, status }
- Quote { id, bugId, price, description, status }
- Order { id, quoteId, devId, status }
- Integration { projectId, type, config }

INTEGRATION FLOWS
✅ GitHub
- OAuth login
- Link repos
- Pull commits
- Create Issues from Bugs
- Push AI-generated fixes

✅ Slack
- Webhook config per project
- Send notifications:
  - Test failed
  - Bug accepted
  - Fix merged
  - Deployment done

✅ CodeRabbit
- POST indexed files for AI review
- Store feedback summary
- Attach feedback to Bug cards

✅ Anthropic (Claude)
- Explain error logs
- Suggest fixes
- Generate missing tests
- Optimize bash scripts

WORKER JOB PIPELINE
1. Index Job:
   - Clone repo
   - Walk files → save FileIndex
   - Detect routes/pages
2. AI Review Job:
   - Send indexed summary to CodeRabbit + Anthropic
3. Test Job:
   - Run Playwright tests
   - Save results
4. Bug Job:
   - Convert failures into Bug cards
   - Notify Slack
5. Marketplace Job:
   - Track quote/order state

API ENDPOINT EXAMPLES
- POST /auth/github
- POST /projects
- POST /projects/:id/index
- POST /projects/:id/tests
- GET /projects/:id/bugs
- POST /bugs/:id/ai-fix
- POST /bugs/:id/quote
- POST /quotes/:id/accept
- POST /integrations/slack
- POST /integrations/coderabbit
- POST /integrations/anthropic

AUTOGEN BASH TEMPLATE
#!/usr/bin/env bash
export NODE_ENV={{env}}
npm ci
npm run index
npm run test
npm run build

MVP ACCEPTANCE
✅ GitHub repo linking works  
✅ Indexing & cron scheduling works  
✅ Playwright test run creates Bug cards  
✅ Slack receives notifications  
✅ AI can explain a bug  
✅ Quote marketplace flow works  
✅ One-click bug publish works  

DELIVERABLES
- /backend
- /frontend
- /worker
- docker-compose.yml
- Prisma schema
- Seed script
- README.md

FIRST IMPLEMENTATION STEPS
1. Setup monorepo + Docker
2. GitHub OAuth + Projects CRUD
3. Index worker + FileIndex model
4. Cron scheduler
5. Playwright test runner
6. Bug cards system
7. Slack webhook integration
8. Anthropic AI explain bug endpoint
9. Quote marketplace

Use mock API keys where required. Focus on building a working demo locally with real flows.






