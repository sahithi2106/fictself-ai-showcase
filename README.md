# FictSelf AI — Story-Aware AI Character Companions for Writers

FictSelf AI is a modern full-stack web application designed for fiction writers and avid readers. It bridges creative writing with personalized character intelligence, allowing writers to interact with persistent, story-aware character companions directly within their drafting workspace.

---

## 📖 Overview & Problem Statement

### The Problem
Traditional creative writing tools isolate prose drafting from worldbuilding bibles and character sheets. When authors attempt to brainstorm or roleplay with conventional conversational LLMs, those models lack long-term memory, hallucinate inconsistent lore, spoil unwritten narrative twists, and fail to speak in the authentic voice of the character.

### The FictSelf Solution
FictSelf couples a rich reader and writer hub with a dedicated **Character Memory & Retrieval Architecture**:
- Characters remember established canon facts, emotional turning points, relationships, and pinned lore.
- Dialogue is grounded in contextual story state without leaking future chapter events.
- An automated memory extraction pipeline suggests narrative facts for writer review, turning prose into living character intelligence.

---

## ✨ Features

### ✍️ Writer Suite
- **Story & Chapter Workspace:** Manage multi-chapter fiction projects, track status (Draft, Ongoing, Completed), word counts, tags, and genres.
- **Character Studio:** Define deep profiles including roles, backstories, personality archetypes, motivations, secrets, and avatar imagery.
- **Dynamic Personas:** Define how the writer or reader is perceived during character interactions (e.g., as another character, an unseen observer, or a co-author).
- **Writer Review Queue:** Review and approve AI-extracted narrative candidates (canon events, secrets, emotional impressions, world rules) before they become permanent memory.

### 🤖 Story-Aware Character Companions
- **Context-Assembled Dialogue:** Each turn pulls relevant canon memories, emotional memories, pinned messages, and recent draft scenes.
- **Conversational Memory Controls:** Pin, edit, branch, or regenerate character responses to guide narrative evolution.
- **Memory Inspector:** Inspect the internal context snapshot used to generate any character response for complete creative transparency.

### 📚 Reader Experience
- **Discover & Read:** Public stories feed with genre filtering, view tracking, and chapter-by-chapter reading progress.
- **Interactive Community:** Chapter voting, threaded reader discussions, user profiles, following feeds, and curated reading lists.

---

## 🏛 Architecture & RAG Pipeline

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Tailwind CSS v4, Motion, Lucide Icons, Vite)        │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON (JWT Auth)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│                                                        │
│  ┌──────────────────┐          ┌────────────────────┐  │
│  │ Context Assembly │ ◄──────► │ Local RAG & Vector │  │
│  │ & Memory Orch.   │          │ (MiniLM-L6 + Chroma)│ │
│  └────────┬─────────┘          └────────────────────┘  │
│           │                                            │
│           ▼                                            │
│  ┌──────────────────┐          ┌────────────────────┐  │
│  │  Groq LLM Client │          │   SQLAlchemy ORM   │  │
│  │ (120B / 70B MoE) │          │  (PostgreSQL DB)   │  │
│  └──────────────────┘          └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Memory Layers & Context Assembly
1. **Canon Memory:** Immutable plot points and objective story facts approved by the author.
2. **Emotional Memory:** Character-specific emotional wounds, loyalties, and subjective impressions.
3. **Live Draft Context:** Context retrieved from the immediate active chapter and preceding scenes.
4. **Story Memory Chunks (RAG):** Local vector similarity search via `sentence-transformers/all-MiniLM-L6-v2` and ChromaDB to inject relevant excerpts.
5. **Session History:** Rolling conversational memory with writer-pinned priority dialogue.

---

## 💰 AI Provider Costs & Usage Disclosure

> [!WARNING]
> **LLM API Usage Costs:** FictSelf currently uses **Groq's Inference API** for character generation and automated memory extraction. Anyone hosting or running this codebase must supply their own API credentials and will be responsible for usage fees incurred.

### LLM Call Points
1. **Character Companion Chat (`POST /api/v1/chat-sessions/{id}/messages`):**
   - Each message turn triggers an inference call to Groq with context assembled from story memory and dialogue history.
   - Max output tokens: 500 per turn.
2. **Automated Memory Extraction (`PUT /api/v1/chapters/{id}`):**
   - **Saving or updating chapter prose automatically dispatches a background task** that prompts Groq to extract 1–3 structured memory candidates from the latest text (max 900 output tokens).
   - This occurs in a background worker to prevent editor latency, but still incurs token consumption on every chapter save.

### Local vs. Paid Services
| Component | Engine / Model | Cost Profile |
|---|---|---|
| Text Embeddings (RAG) | `sentence-transformers/all-MiniLM-L6-v2` | **100% Free** (runs locally on CPU) |
| Vector Store | ChromaDB (SQLite/File-based) | **100% Free** (local filesystem) |
| Relational Storage | PostgreSQL | Standard hosting / local instance |
| Character Chat Generation | Groq (`openai/gpt-oss-120b` or `llama-3.3-70b-versatile`) | **Paid Usage-Based** (subject to Groq quotas/rates) |
| Memory Candidate Extraction | Groq (`openai/gpt-oss-120b`) | **Paid Usage-Based** |

### Public Deployment Safety Advice
- **Do not expose an open registration instance with your personal API key attached.**
- Implement strict per-user rate limiting (e.g., using Redis or SlowAPI) before opening access.
- Configure spend limits and billing alerts in your [Groq Dashboard](https://console.groq.com/settings/billing) to avoid unexpected costs.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React 19, TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4
- **Animations & Icons:** Motion (`motion/react`), Lucide React

### Backend
- **Framework:** FastAPI (Python 3.12+)
- **ASGI Server:** Uvicorn
- **Database & ORM:** PostgreSQL, SQLAlchemy 2.0, Alembic
- **Vector Search & Embeddings:** ChromaDB, LangChain Text Splitters, SentenceTransformers (`all-MiniLM-L6-v2`)
- **LLM Inference:** Groq Python SDK
- **Authentication:** OAuth2 Password Bearer with JWT (`python-jose`, `pwdlib[bcrypt]`)
- **Email Verification:** SMTP (TLS) OTP dispatch

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js** 20+ and **npm**
- **Python** 3.12+
- **PostgreSQL** (local instance or managed service such as Supabase, Neon, or Railway)
- **Groq API Key** (from [console.groq.com](https://console.groq.com))

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r pyproject.toml
# Or if using uv:
uv sync

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials, a strong SECRET_KEY, and your GROQ_API_KEY
```

#### Run Database Migrations
```bash
# Apply Alembic schema migrations
alembic upgrade head
```

#### Launch the Backend Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API documentation will be available at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup

```bash
# From project root
npm install

# Start Vite development server
npm run dev
```
The application will launch at `http://localhost:3000`.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default / Example |
|---|---|---|
| `PROJECT_NAME` | Display title for OpenAPI and backend | `FictSelf API` |
| `SECRET_KEY` | JWT signing secret (**must change in production**) | Generated random string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session token lifetime | `10080` (7 days) |
| `POSTGRES_SERVER` | PostgreSQL hostname | `localhost` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `your_password` |
| `POSTGRES_DB` | PostgreSQL database name | `fictself` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `DATABASE_URL` | Optional complete connection URI (overrides POSTGRES_*) | `postgresql://user:pass@host:5432/db` |
| `GROQ_API_KEY` | API key from Groq Console | `gsk_...` |
| `LLM_PROVIDER` | LLM inference backend | `groq` |
| `LLM_MODEL` | Model identifier | `openai/gpt-oss-120b` |
| `EMBEDDING_MODEL_NAME` | Local HuggingFace sentence transformer | `sentence-transformers/all-MiniLM-L6-v2` |
| `CHROMA_PERSIST_DIR` | Directory for vector store persistence | `./chroma_db` |
| `SMTP_SERVER` | SMTP mail server for signup OTPs | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username / address | `your_account@gmail.com` |
| `SMTP_PASSWORD` | SMTP app password | `your_app_password` |

---

## 📌 Implementation Status & Limitations

### Currently Implemented
- Full character memory hierarchy (Canon, Emotional, Pinned, RAG Story Chunks).
- Live context assembly with question-type heuristic classification.
- Groq integration for fast character dialogue and memory candidate extraction.
- Writer Review Queue for editorial oversight of AI suggestions.
- Full reader flow: discover, chapter reader, commenting, following, bookmarks, and chapter voting.
- Local vector database indexing using ChromaDB and SentenceTransformers.

### Limitations & Planned Roadmap
- **No Built-in Rate Limiting:** Rate limiting on chat and save endpoints is not currently enforced in application code. Production instances should place an API gateway or middleware (e.g., SlowAPI) in front of FastAPI.
- **Local Media Storage:** Uploaded covers and avatars are stored on the local server filesystem (`uploads/`). Multi-instance cloud deployments will require an S3-compatible object storage provider.
- **Local Ollama Support:** Direct local model inference (e.g., running Ollama with Gemma 2 or Llama 3 locally) is architectural-ready via the `BaseLLMProvider` abstraction, but is not yet implemented.
- **Single LLM Provider Active:** Currently configured for Groq; OpenAI, Anthropic, or custom local gateways require extending the `LLMProviderFactory`.

---

## 🤝 Credits & Acknowledgements

- Built with [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), [Vite](https://vitejs.dev/), and [Tailwind CSS](https://tailwindcss.com/).
- LLM inference powered by [Groq](https://groq.com/).
- Embeddings and semantic chunking via [SentenceTransformers](https://sbert.net/) and [LangChain Text Splitters](https://github.com/langchain-ai/langchain).
- Vector indexing via [ChromaDB](https://www.trychroma.com/).
- UI iconography by [Lucide React](https://lucide.dev/).

