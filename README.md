# @openclaw/langcache

Semantic caching skill for [OpenClaw](https://openclaw.ai) using [Redis LangCache](https://redis.io/langcache/).

Reduce LLM costs and latency by caching responses for semantically similar queries, with built-in privacy and security guardrails.

## Features

- **Semantic similarity matching** - Cache hits for similar (not just identical) queries
- **Hard block enforcement** - Automatically blocks caching of sensitive data:
  - Temporal info (today, tomorrow, deadlines, appointments)
  - Credentials (API keys, passwords, tokens, OTP)
  - Identifiers (emails, phone numbers, account IDs)
  - Personal context (relationships, private conversations)
- **Category-aware thresholds** - Different similarity thresholds for factual Q&A vs style transforms
- **CLI and Python integration** - Use from shell scripts or embed in Python agents

## Installation

### Via npm (Recommended)

```bash
npm install openclaw-langcache
```

The skill will be automatically installed to your OpenClaw workspace.

### Via Git

```bash
git clone https://github.com/openclaw/langcache.git ~/.openclaw/workspace/skills/langcache
```

### Manual

Download and extract to `~/.openclaw/workspace/skills/langcache/`

## Configuration

Add your Redis LangCache credentials to `~/.openclaw/secrets.env`:

```bash
LANGCACHE_HOST=your-instance.redis.cloud
LANGCACHE_CACHE_ID=your-cache-id
LANGCACHE_API_KEY=your-api-key
```

Get these from [Redis Cloud Console](https://app.redislabs.com/) after creating a LangCache instance.

## Usage

### Automatic (via OpenClaw agent)

The skill triggers automatically when you mention:
- "cache LLM responses"
- "semantic caching"
- "reduce API costs"
- "configure LangCache"

### CLI

```bash
# Search for cached response
langcache.sh search "What is Redis?"

# With similarity threshold
langcache.sh search "What is Redis?" --threshold 0.9

# Store a response
langcache.sh store "What is Redis?" "Redis is an in-memory data store..."

# Check if content would be blocked
langcache.sh check "What's on my calendar today?"
# Output: BLOCKED: temporal_info

# Delete entries
langcache.sh delete --id <entry-id>
langcache.sh delete --attr model=gpt-4
```

### Python Integration

```python
from examples.agent_integration import CachedAgent, CacheConfig

agent = CachedAgent(config=CacheConfig(
    enabled=True,
    model_id="gpt-5",
))

# Automatically uses cache with policy enforcement
response = await agent.complete("What is semantic caching?")
```

## Caching Policy

### Cacheable (white-list)

| Category | Examples | Threshold |
|----------|----------|-----------|
| Factual Q&A | "What is X?", "How does Y work?" | 0.90 |
| Definitions / docs | API docs, command help | 0.90 |
| Command explanations | "What does `git rebase` do?" | 0.92 |
| Reply templates | "polite no", "follow-up", "intro" | 0.88 |
| Style transforms | "make this warmer/shorter" | 0.85 |

### Never Cached (hard blocks)

| Category | Examples |
|----------|----------|
| Temporal | today, tomorrow, deadline, ETA, "in 20 minutes" |
| Credentials | API keys, passwords, tokens, OTP/2FA |
| Identifiers | emails, phone numbers, account IDs, UUIDs |
| Personal | "my wife said", private conversations, relationships |

## File Structure

```
skills/langcache/
├── SKILL.md              # Skill definition and instructions
├── scripts/
│   └── langcache.sh      # CLI wrapper with policy enforcement
├── references/
│   ├── api-reference.md  # Complete REST API documentation
│   └── best-practices.md # Optimization techniques
└── examples/
    ├── basic-caching.sh      # Simple cache workflow
    └── agent-integration.py  # Python integration pattern
```

## API Reference

See [references/api-reference.md](skills/langcache/references/api-reference.md) for complete REST API documentation.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/caches/{id}/entries/search` | POST | Search for cached response |
| `/v1/caches/{id}/entries` | POST | Store new entry |
| `/v1/caches/{id}/entries/{entryId}` | DELETE | Delete by ID |
| `/v1/caches/{id}/flush` | POST | Clear all entries |

## Requirements

- OpenClaw 2024.1.0+
- Redis Cloud account with LangCache enabled
- Node.js 18+ (for npm installation)
- `jq` and `curl` (for CLI usage)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Resources

- [Redis LangCache Documentation](https://redis.io/docs/latest/develop/ai/langcache/)
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Semantic Caching Guide](https://redis.io/blog/what-is-semantic-caching/)
