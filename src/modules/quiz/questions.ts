import type { QuizQuestion } from "./logic";

/**
 * The six quiz questions. Each option's `score` is the ONLY thing that moves
 * the readiness needle — keep them 0–2 so the max stays 8. `platform` and
 * `data` are context for guide matching and contribute 0. Edit this file to
 * reword or re-weight the quiz (see docs/entities/quiz.md).
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "platform",
    prompt: "What are you moving away from?",
    help: "This tailors the guides we recommend. It doesn't change your score.",
    options: [
      { value: "hosted-site-builder", label: "A hosted site builder", score: 0 },
      { value: "hosted-blog", label: "A hosted blog", score: 0 },
      { value: "social-network", label: "A social network", score: 0 },
      { value: "newsletter-service", label: "A newsletter service", score: 0 },
      { value: "managed-store", label: "A managed store", score: 0 },
      { value: "", label: "Not sure yet", score: 0 },
    ],
  },
  {
    id: "cli",
    prompt: "How comfortable are you with a command line?",
    options: [
      { value: "confident", label: "Confident — I live in the terminal", score: 2 },
      { value: "some", label: "Some — I can follow instructions", score: 1 },
      { value: "none", label: "None — a terminal scares me", score: 0 },
    ],
  },
  {
    id: "budget",
    prompt: "What can you spend to make the move?",
    options: [
      { value: "flexible", label: "Flexible — tools and help are fine", score: 2 },
      { value: "modest", label: "Modest — a little for essentials", score: 1 },
      { value: "none", label: "Nothing — free options only", score: 0 },
    ],
  },
  {
    id: "time",
    prompt: "How much time can you give this?",
    options: [
      { value: "ongoing", label: "Ongoing — I'll see it through", score: 2 },
      { value: "weekend", label: "A weekend or two", score: 1 },
      { value: "little", label: "Almost none right now", score: 0 },
    ],
  },
  {
    id: "data",
    prompt: "How sensitive is the data you'd move?",
    help: "Context for the guides, not a score — sensitive data just means care.",
    options: [
      { value: "low", label: "Low — public content mostly", score: 0 },
      { value: "medium", label: "Medium — some private records", score: 0 },
      { value: "high", label: "High — customer or financial data", score: 0 },
    ],
  },
  {
    id: "motivation",
    prompt: "How set are you on owning your setup?",
    options: [
      { value: "committed", label: "Committed — I want out", score: 2 },
      { value: "curious", label: "Curious — exploring the idea", score: 1 },
      { value: "unsure", label: "Unsure — just testing the water", score: 0 },
    ],
  },
];
