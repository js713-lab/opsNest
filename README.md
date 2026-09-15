# opsNest CodeCrafter

**The Operating System for the Vibe Coding Era.**

As the "vibe coding" movement grows, non-technical creators are generating code faster than ever. **opsNest CodeCrafter** is the missing bridge between raw AI generation and professional software delivery. We provide the structure, visualization, and management layer that lets you turn AI prompts into production-ready software.

You bring the **Vibe**, we provide the **Nest**.

> Elevator pitch: opsNest CodeCrafter turns AI-generated code into production-ready software—link repos, visualize SDLC, run automated tests, and pipe PRs through CodeRabbit so you ship fast without wrangling infra.

---

## 🚀 The 5-Step Vibe Flow

opsNest empowers you to move from idea to reality in five intuitive actions:

### 1. **Vibe (Generate)** ✨
Don't just write code—summon it.
*   **AI Integrations**: Connect directly with **Anthropic** and **CodeRabbit** to generate features and review code.
*   **Ideation**: Use our tools to spark ideas and let the AI handle the syntax while you handle the logic.

### 2. **Manage (Structure)** 🗂️
Turn chaos into clarity.
*   **Project Hub**: Organize your various AI experiments into structured **Projects**.
*   **Status Tracking**: Instantly see what's `Active`, `Idle`, or in `Error` state without digging into logs.
*   **Repository Linking**: Seamlessly link your Git repositories to your dashboard.

### 3. **Visualize (Trace)** 👁️
See the invisible work.
*   **Visual SDLC**: Watch your code flow through the pipeline: **Plan → Code → Test → Deploy**.
*   **Real-Time Updates**: No more guessing—see exactly where your build is in the process.
*   **Metrics**: Track deployment times and success rates at a glance.

### 4. **Ship (Integrate)** 🚢
Deliver to the world.
*   **Integrations Hub**: Connect the tools you use (GitHub, Slack) to automate your workflow.
*   **Environment Control**: Switch seamlessly between `Sandbox` for testing and `Production` for the world.
*   **Release Management**: Push your vibe to reality with confidence.

### 5. **Maintain (Evolve)** 🔧
Keep the magic alive.
*   **Testing Dashboard**: Ensure your app stays healthy as you add new features—catch bugs before your users do.
*   **Smart Indexing**: Keep your AI context fresh. As your codebase grows, opsNest indexes it so your AI always knows the full picture.
*   **Script Automation**: Use generated scripts to handle boring maintenance tasks, so you can focus on the next big idea.

---

## 👥 Who is this for?

We built opsNest for the new generation of software creators:

### 🎨 The Vibe Coder (Creator)
You have 100 ideas before breakfast. You use Cursor, ChatGPT, and Claude to build, but you get stuck on *deployment* and *organization*.
*   **Goal**: Ship fast, don't worry about infra.
*   **OpsNest Value**: "I just pasted my repo link, and now I can see my build pipeline visualized without touching Jenkins."

### 🌳 The System Gardener (Maintainer)
You care about longevity. You know that AI code can be messy, and you need tools to prune, test, and stabilize the codebase.
*   **Goal**: Stability, clean code, no regressions.
*   **OpsNest Value**: "I use the Testing Dashboard to make sure the new feature the AI wrote didn't break the login page."

---

## 💡 Real-World Scenarios

### Scenario 1: The "Sunday Morning Startup"
*   **User**: Alex, a Product Manager who can't code fluent React.
*   **Action**: Alex prompts an entire MVP for a "Dog Walking Uber" using Cursor.
*   **Problem**: He has a folder of files but no idea how to run it or if it works.
*   **OpsNest Flow**:
    1.  Alex creates a project in **opsNest**.
    2.  He links the folder.
    3.  OpsNest creates the **SDLC Pipeline**.
    4.  Alex hits "Deploy to Sandbox" and shares the link with friends.

### Scenario 2: Taming the Spaghetti
*   **User**: Sarah, a Senior Dev using AI to speed up work.
*   **Action**: Sarah uses AI to generate 5,000 lines of boilerplate code.
*   **Problem**: The code works, but it's fragile. One change breaks everything.
*   **OpsNest Flow**:
    1.  Sarah uses the **Testing Dashboard** to visualize where tests are failing.
    2.  She uses **CodeRabbit Integration** within opsNest to auto-review the AI's pull request.
    3.  She merges with confidence, knowing the **Visual SDLC** turned green.

---

## 🛠️ Under the Hood (Tech Stack)

For the technical users and those learning to dig deeper, opsNest is built on a modern, robust stack:

- **Frontend**: [React](https://reactjs.org/) (v18) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Database/Auth**: [Supabase](https://supabase.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🔗 GitHub OAuth & Repo Linking

Follow these steps to enable “Connect with GitHub” and repo import:

1) Create a GitHub OAuth App  
   - Homepage: `https://your-domain` (or `http://localhost:5173` in dev)  
   - Callback URL: `http://localhost:5173/oauth/github/callback`
   - Copy `client_id` and `client_secret`.

2) Backend token exchange endpoint  
   - Implement `VITE_GITHUB_TOKEN_EXCHANGE_URL` on your backend to exchange `code` for `access_token` (Web App Flow).  
   - Never expose `client_secret` in the frontend.  
   - Endpoint spec (example):
     - `POST /api/github/oauth/callback`  
       body: `{ code, redirect_uri }`  
       response: `{ access_token }`

3) Frontend env vars  
   - `VITE_GITHUB_CLIENT_ID=your_client_id`  
   - `VITE_GITHUB_TOKEN_EXCHANGE_URL=https://your-backend/api/github/oauth/callback`

4) Connect flow  
   - Go to Dashboard → Integrations → GitHub → “Connect with GitHub”.  
   - After redirect, the callback page exchanges `code` via your backend, stores the token locally, and (optionally) upserts to `integrations_config` for demo.

5) Import repos into Projects  
   - After connecting GitHub, open “New Project” → “Load repos” to pull your GitHub repositories and prefill name/URL/branch.

Security notes  
   - Use the `state` param (implemented) to prevent CSRF.  
   - Store tokens securely server-side; the current flow is demo-friendly and keeps a local token for quick testing.  
   - Consider revocation/refresh flows per GitHub best practices.

---

## 🏁 Getting Started

Ready to start managing your vibe?

### Prerequisites
- Node.js (v16+)
- A [Supabase](https://supabase.com/) project

### Installation

1. **Clone the Nest:**
   ```bash
   git clone https://github.com/your-username/opsnest-codecrafter.git
   cd opsnest-codecrafter
   ```

2. **Install Dependencies:**
    ```bash
    npm install
    ```

3. **Configure Variables:**
   Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   # AI/LLM providers (set the keys you want to test)
   VITE_CODERABBIT_API_KEY=your_coderabbit_key
   VITE_CODERABBIT_BASE_URL=https://api.coderabbit.ai/api/v1
   # Optional: proxy overrides (dev auto proxies /api/coderabbit to the target)
   CODERABBIT_PROXY_TARGET=https://api.coderabbit.ai/api/v1
   VITE_CODERABBIT_PROXY_URL=http://localhost:8790/api/coderabbit
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
   VITE_GEMINI_MODEL=gemini-2.5-flash
   VITE_ANTHROPIC_API_KEY=your_anthropic_key
   ```

4. **Launch:**
    ```bash
    npm run dev
    ```
   Open [http://localhost:5173](http://localhost:5173) to start vibing.

---

## 🤝 Contributing

The Vibe Coding movement is open to everyone.
1. Fork it.
2. Create your feature branch (`git checkout -b feature/NewVibe`).
3. Commit your changes.
4. Push and open a Pull Request.

## 📄 License

MIT License.

