Paradyx
Developer Credibility Platform — Shifting How Skill is Evaluated

Paradyx solves a core problem: as AI makes polished output cheap, code alone stops being a signal of real skill. What actually distinguishes a developer is whether they understand the decisions, tradeoffs, and problems behind what they built.

Paradyx captures that understanding by letting developers log their reasoning as they work. An AI reads each entry and evaluates reasoning quality. This is not to grade or punish, but to ask the questions: "What alternatives did you weigh? How do you know this was the right call?" Everything rolls up into a public profile that companies can actually read to see the developer behind the code.


Key Features
Reasoning-First Design: Developers log four entry types: decisions (what you chose and why), struggles (what blocked you and what you tried), solved (what fixed it and why), and progress (quick notes on what moved forward)
AI Mentor, Not Judge: Claude-powered grader evaluates reasoning quality with follow-up questions, surfacing depth and tradeoffs
Production-Ready: Built in 4 weeks, deployed to production, passed independent security audit (zero critical findings)
Security Hardened: Prompt-injection hardening, structured JSON validation, input error recovery. Processes real submissions without crashes
Calibration-Ready: Golden set validation framework designed for future grader calibration via user feedback loop


Why This Matters
The AI era creates a credibility crisis: anyone can produce polished-looking code and portfolios. Paradyx shifts evaluation from what was shipped to how the person thinks about what they shipped. For companies, this is unfakeable proof of engineering judgment. For developers, it's a durable record of growth.


Technical Architecture

Frontend: React + Next.js (real-time UI, GitHub OAuth login, submission interface) 
Backend: Node.js/Express API (authentication, webhook handling, LLM integration) 
Database: PostgreSQL/Supabase (user data, reasoning entries, grading results, profiles) 
LLM Integration: Claude API (reasoning evaluation, follow-up generation, structured output) Security: Prompt-injection hardening, JSON schema validation, rate limiting, error handling


Project Structure
Frontend: React components for submission, profile viewing, entry types
Backend: API routes for auth, submissions, grading, profile aggregation
Database: Schema for users, entries, gradings, feedback, leaderboard
LLM Integration: Prompt design for reasoning evaluation, structured output handling
Security: Input validation, auth middleware, error recovery


How It Works
1. Developer logs reasoning:

Submits code + reasoning entry (decision, struggle, solved, or progress)

2. AI grader evaluates:

Claude reads the code + reasoning
Scores on reasoning quality (understanding of decisions, alternatives considered, tradeoffs acknowledged)
Generates follow-up questions to deepen understanding

3. Public profile features:

Entries organized by project
Growth charts show reasoning quality over time
Companies can read to understand the developer's judgment


Results & Validation

Production Metrics:

Shipped in 4 weeks (full-stack deployment)
Passed independent security audit (zero critical findings identified)
Hardened against prompt-injection attacks 
Structured JSON validation ensures malformed outputs never reach users
Input error recovery handles edge cases without crashes

Grader Validation Framework:

Golden set validation ready: 20-30 hand-graded reasoning entries
Feedback loop designed so users can flag incorrect evaluations
Framework enables future grader calibration as users submit real reasoning

Reliability:

Processes real submissions without crashes or malformed outputs
Rate limiting and error recovery protect against API failures
Supabase PostgreSQL handles concurrent submissions


Key Insight
In an AI-enabled world, output quality becomes a weaker signal of skill. What becomes rare and valuable is the ability to explain why you made the decisions you did, what alternatives you considered, and how you know you chose right. Paradyx makes that thinking visible and evaluates it thoroughly. It turns the developer's most reliable asset (their judgment) into a portable, verifiable credential.


Limitations & Future Work
Current State:

Single-user validation phase (no users yet)
Grader calibration pending real user submissions
Platform ready for beta launch

Future Roadmap:

Leaderboard/public profiles 
Integrations with recruiting platforms
Comparative reasoning analysis (see how your decision-making compares across projects)
Export credentials for job applications



License
Personal project. Built Summer 2026.


Author
Arvin Purbager

Email: arvin@bu.edu

LinkedIn: linkedin.com/in/arvin-purbager
