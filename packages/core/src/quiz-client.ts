/**
 * Quiz runtime: grades a `{@quiz}` on click.
 *
 * Pure DOM, no external dependency. Clicking an option marks it correct/wrong,
 * reveals the right answer(s) and the explanation, and locks the question
 * (state kept in `data-htsl-answered`, so it is morph-safe). The global click
 * listener is installed once per window — the content never produces a `<script>`.
 */

interface QuizWindow {
  document: Document;
  __htslQuizWired?: boolean;
}

const QUIZ = ".htsl-quiz[data-htsl-quiz]";

function quizzes(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(QUIZ));
}

export function pendingQuiz(root: ParentNode): Element[] {
  return quizzes(root).filter((q) => !q.hasAttribute("data-htsl-quiz-ready"));
}

function grade(quiz: HTMLElement, chosen: HTMLElement): void {
  if (quiz.hasAttribute("data-htsl-answered")) return; // answered once
  const correct = chosen.getAttribute("data-correct") === "1";
  quiz.setAttribute("data-htsl-answered", correct ? "correct" : "wrong");
  chosen.classList.add(correct ? "is-correct" : "is-wrong");
  quiz.querySelectorAll<HTMLElement>(".htsl-quiz-opt").forEach((o) => {
    if (o.getAttribute("data-correct") === "1") o.classList.add("is-correct");
    o.setAttribute("disabled", "");
  });
  const explain = quiz.querySelector<HTMLElement>(".htsl-quiz-explain");
  if (explain) explain.hidden = false;
}

function wireOnce(win: QuizWindow): void {
  if (win.__htslQuizWired) return;
  win.__htslQuizWired = true;
  win.document.addEventListener("click", (e) => {
    const opt = (e.target as Element | null)?.closest?.(".htsl-quiz-opt") as HTMLElement | null;
    const quiz = opt?.closest?.(".htsl-quiz") as HTMLElement | null;
    if (opt && quiz) grade(quiz, opt);
  });
}

/** Hydrate every quiz under `root`. Idempotent and morph-safe. */
export function hydrateQuiz(root?: ParentNode, win?: QuizWindow): number {
  const w = win ?? (globalThis as unknown as { window?: QuizWindow }).window;
  const scope = root ?? w?.document;
  if (!scope) return 0;
  if (w) wireOnce(w);
  let count = 0;
  for (const quiz of quizzes(scope)) {
    if (!quiz.hasAttribute("data-htsl-quiz-ready")) {
      quiz.setAttribute("data-htsl-quiz-ready", "");
      count += 1;
    }
  }
  return count;
}

/** Quizzes are pure DOM (state in attributes); nothing external to free. */
export function purgeQuiz(): void {
  /* no-op — kept for API symmetry */
}
