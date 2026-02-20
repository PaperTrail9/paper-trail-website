# API Integration Guide

High-value API integrations to expand capabilities beyond the current dinner automation system.

---

## Twilio API

**Current use:** SMS fallback for dinner confirmations

**Expansion opportunities:**
1. **Voice calls for urgent alerts** - Critical system failures, missed confirmations with voice acknowledgment
2. **WhatsApp Business integration** - Rich messaging with meal photos, interactive buttons for confirmations
3. **Two-way conversational flows** - Natural language dinner rescheduling via SMS/WhatsApp
4. **Scheduled SMS reminders** - Future-dated pickup reminders (15 mins - 7 days ahead)
5. **Conference calls** - Family coordination calls for dinner planning

**Implementation complexity:** Medium

**Value score:** 8/10

**PoC file:** `twilio-poc.js`

**Setup requirements:**
- Twilio Account SID + Auth Token
- Phone number ($1/month)
- WhatsApp Business (requires approval)
- Webhook endpoint for incoming messages

**Key APIs:**
- `client.calls.create()` - Voice calls with TwiML
- `client.messages.create()` - SMS/WhatsApp
- `scheduleType: 'fixed'` - Scheduled messages
- `<Gather>` - Interactive voice response
- `<Conference>` - Multi-party calls

---

## OpenAI API

**Current use:** None (direct LLM calls only)

**Expansion opportunities:**
1. **Structured outputs for data extraction** - Parse unstructured recipe text into typed meal data
2. **Function calling for tool integration** - Let AI decide when to check HEB inventory, schedule pickups, search recipes
3. **Batch API for bulk processing** - Process weekly meal plans efficiently (50% cost reduction)
4. **Chain of thought reasoning** - Step-by-step meal planning with transparent decision-making
5. **Streaming with structured outputs** - Real-time meal suggestion generation

**Implementation complexity:** Low-Medium

**Value score:** 9/10

**PoC file:** `openai-poc.js`

**Setup requirements:**
- OpenAI API key
- `npm install openai zod` (Zod for schema validation)

**Key features:**
- `response_format: { type: "json_schema" }` - Guaranteed schema adherence
- `tools: [...]` - Function calling
- `client.batches.create()` - Bulk processing
- Streaming with `client.responses.stream()`

**Cost notes:**
- GPT-4o: ~$0.005/1K input tokens
- Batch API: 50% discount for non-urgent tasks
- Structured outputs add ~10% token overhead

---

## Claude API

**Current use:** None

**Expansion opportunities:**
1. **XML-based structured outputs** - Claude's preferred structured format
2. **Native tool use** - Cleaner function calling than OpenAI
3. **Long context document analysis** - Analyze months of meal history (200K context)
4. **Multi-turn conversational planning** - Interactive dinner planning sessions
5. **Computer use (beta)** - Interact with recipe websites directly

**Implementation complexity:** Low-Medium

**Value score:** 8/10

**PoC file:** `claude-poc.js`

**Setup requirements:**
- Anthropic API key
- `npm install @anthropic-ai/sdk`

**Key features:**
- 200K token context window
- XML-based structured outputs
- Native tool use with `tool_use` blocks
- Superior at long document analysis

**When to use Claude vs OpenAI:**
- Use Claude for: Long context, document analysis, nuanced reasoning
- Use OpenAI for: Structured outputs, function calling ecosystem, speed

---

## Notion API

**Current use:** None (using markdown files)

**Expansion opportunities:**
1. **Structured task/project tracking** - Better than markdown: queryable, relational, collaborative
2. **Meal planning database** - Weekly menus with ingredient relations, shopping lists
3. **Knowledge base/recipe library** - Searchable recipes with tags, ratings, history
4. **Meeting notes & decisions** - Structured notes with action items, linked to projects
5. **Cross-system sync** - Two-way sync with GitHub issues, calendar events

**Implementation complexity:** Medium

**Value score:** 9/10

**PoC file:** `notion-poc.js`

**Setup requirements:**
- Create integration at https://www.notion.so/my-integrations
- Copy integration token
- Share databases/pages with integration
- `npm install @notionhq/client`

**Key APIs:**
- `notion.databases.query()` - Query with filters/sorts
- `notion.pages.create()` - Create pages with properties
- `notion.blocks.children.append()` - Add content blocks
- `notion.search()` - Full-text search

**Database schema recommendations:**

**Tasks Database:**
- Name (Title)
- Status (Select: To Do, In Progress, Done)
- Priority (Select: Low, Medium, High)
- Due Date (Date)
- Assignee (People)
- Tags (Multi-select)
- Project (Relation)

**Meal Plans Database:**
- Week (Title)
- Week Start (Date)
- Status (Select: Planning, Active, Completed)
- Meals (Relation to Recipes)

**Recipes Database:**
- Name (Title)
- Cuisine (Select)
- Difficulty (Select)
- Prep Time (Number)
- Ingredients (Relation to Ingredients DB)
- Tags (Multi-select)

---

## GitHub API

**Current use:** None (manual git operations)

**Expansion opportunities:**
1. **Automated code review** - Lint-like checks on PRs: console.log detection, TODO tracking, missing tests
2. **Issue automation** - Auto-create from errors, stale issue management, auto-assignment by labels
3. **Pull request automation** - Auto-create release PRs, dependabot auto-merge, branch protection
4. **Repository analytics** - Weekly commit/PR/issue reports, contributor stats
5. **Webhook-driven workflows** - Deploy on push, auto-review on PR open

**Implementation complexity:** Medium

**Value score:** 7/10

**PoC file:** `github-poc.js`

**Setup requirements:**
- Fine-grained Personal Access Token
- Repo permissions: contents, issues, pull_requests, checks
- `npm install @octokit/rest @octokit/webhooks`
- Webhook secret for verification

**Key APIs:**
- `octokit.pulls.createReview()` - Automated reviews
- `octokit.issues.create()` - Programmatic issue creation
- `octokit.pulls.merge()` - Auto-merge strategies
- `octokit.repos.listCommits()` - Analytics

**Webhook events to handle:**
- `push` - Deploy on main branch
- `pull_request` - Run automated review
- `issues` - Auto-assign dinner-related issues

---

## Weather API (OpenWeatherMap)

**Current use:** None

**Expansion opportunities:**
1. **Smart dinner planning** - Adjust meal types based on weather (grill vs oven)
2. **Pickup time optimization** - Suggest optimal HEB pickup windows avoiding rain/heat
3. **Weekly meal forecasting** - 7-day forecast for meal planning
4. **Weather alerts** - Severe weather notifications affecting cooking plans
5. **AI weather assistant** - Natural language queries about meal-weather relationship

**Implementation complexity:** Low

**Value score:** 7/10

**PoC file:** `weather-poc.js`

**Setup requirements:**
- Sign up at https://openweathermap.org/
- Subscribe to "One Call 3.0" (separate subscription)
- 1,000 free calls/day, then pay-per-call
- `npm install axios`
- Set `OPENWEATHER_API_KEY`

**Key endpoints:**
- `/onecall` - Current + 48hr hourly + 8-day daily + alerts
- `/onecall/timemachine` - Historical weather
- `/assistant/session` - AI weather assistant

**Pricing:**
- Free tier: 1,000 calls/day to One Call 3.0
- Paid: ~$0.0015/call after free tier
- No subscription required for One Call 3.0

**Integration points:**
- Check weather before finalizing meal plan
- Adjust pickup time recommendations
- Suggest backup indoor meals for severe weather

---

## Implementation Priority

| API | Priority | Effort | Impact | Dependencies |
|-----|----------|--------|--------|--------------|
| **Notion** | P0 | Medium | High | None |
| **OpenAI** | P0 | Low | High | None |
| **Twilio** | P1 | Medium | High | None |
| **Claude** | P1 | Low | Medium | None |
| **GitHub** | P2 | Medium | Medium | None |
| **Weather** | P2 | Low | Medium | None |

## Quick Start Commands

```bash
# Install all dependencies
npm install twilio openai zod @anthropic-ai/sdk @notionhq/client @octokit/rest axios

# Set environment variables
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export NOTION_API_KEY="secret_..."
export GITHUB_TOKEN="ghp_..."
export TWILIO_ACCOUNT_SID="AC..."
export TWILIO_AUTH_TOKEN="..."
export TWILIO_PHONE_NUMBER="+1..."
export OPENWEATHER_API_KEY="..."

# Run PoC demos
node self-improvement/apis/openai-poc.js
node self-improvement/apis/notion-poc.js
node self-improvement/apis/twilio-poc.js
```

## Architecture Recommendations

```
┌─────────────────────────────────────────────────────────────┐
│                    Dinner Automation System                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Notion    │  │   OpenAI     │  │    Claude    │      │
│  │  Task/Recipe │  │ Structured   │  │   Analysis   │      │
│  │   Database   │  │   Outputs    │  │   Context    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │    Twilio    │  │    GitHub    │  │    Weather   │      │
│  │ SMS/Voice/   │  │   Issues/    │  │  Meal Plan   │      │
│  │  WhatsApp    │  │     PRs      │  │ Optimization │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Notes

- Never commit API keys to git
- Use environment variables or secret managers
- Fine-grained PATs for GitHub (limit to specific repos)
- Twilio webhook signature verification required
- Notion: Integration only accesses shared pages
- OpenWeatherMap: Key has rate limits, monitor usage

## Monitoring & Cost Tracking

| API | Free Tier | Paid Rate | Monitoring |
|-----|-----------|-----------|------------|
| OpenAI | $5 trial credits | $0.005/1K tokens | Dashboard + headers |
| Claude | $5 trial credits | $3/M input, $15/M output | Dashboard |
| Notion | Unlimited personal | N/A | Request logs |
| Twilio | $15.50 trial | $0.0075/SMS, $0.013/min voice | Console |
| GitHub | 5,000 req/hour | N/A for PAT | Rate limit headers |
| Weather | 1,000 calls/day | $0.0015/call | Usage dashboard |
