import { Link } from "react-router-dom";
import ThemeToggle from "../components/layout/ThemeToggle";

// Privacy and terms are public: a student reads them before making an account.
function LegalPage({ title, updated, children }) {
  return <div className="relative flex min-h-dvh flex-col items-center px-4 py-6 [&>.theme-toggle]:absolute [&>.theme-toggle]:top-4 [&>.theme-toggle]:right-4">
    <ThemeToggle />
    <Link className="mb-5 flex min-h-11 items-center gap-2 text-lg font-semibold text-foreground no-underline" to="/" aria-label="Catalyst home"><span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">C</span><span>Catalyst</span></Link>
    <main className="w-full max-w-2xl [&_a]:text-brand-ink [&_h1]:text-2xl [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_li]:leading-relaxed [&_p]:leading-relaxed [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5" id="main" tabIndex="-1">
      <h1>{title}</h1>
      <p className="text-muted-foreground">Last updated {updated}</p>
      {children}
      <nav className="mt-6 flex flex-wrap gap-4 border-t pt-4 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center" aria-label="Legal pages">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/">Back to Catalyst</Link>
      </nav>
    </main>
  </div>;
}

export function Privacy() {
  return <LegalPage title="Privacy" updated="14 November 2026">
    <p>Catalyst is a revision platform for students. This page says what we keep about you, why, for how long, and how to remove it.</p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Account:</strong> your name, your email, and your password. The password is stored scrambled (hashed), so nobody, including us, can read it.</li>
      <li><strong>Your choices:</strong> your avatar, exam date, daily goal, and whether you finished the welcome steps.</li>
      <li><strong>Your study activity:</strong> lessons you finished, test scores and answers, flashcard ratings, mistakes, how well you know each topic, notes, saved items, where you stopped in a lesson, and how many minutes you studied.</li>
      <li><strong>Your progress and rewards:</strong> your XP and level, the achievements you earned, and your weekly goal.</li>
      <li><strong>Friends:</strong> a friend code that is only made when you open the Friends page, an optional display name, and your friend list. Friends see your display name (or just your first name) and your avatar. They see your level unless you choose to hide it. Nobody can find you by searching: only someone who has your code can send a request, and you must accept it. You can remove a friend at any time.</li>
      <li><strong>Shared study sets:</strong> if you share a study set by link or with the community, other students can read its cards, notes and quizzes and see your display name (or first name) as its author. Your uploaded source material is never shared. A set on the community shelf is checked by an admin first, and anyone can report it. If you join a leaderboard when you play a timed quiz, your display name, score and time are shown on that quiz's weekly and monthly boards. You can make a set private or delete it at any time.</li>
      <li><strong>Study circles:</strong> the name of a circle, who is in it, and a combined count of study days for the week. Members see each other's display names and avatars, never who studied more.</li>
      <li><strong>Challenges:</strong> when you challenge a friend, we keep the questions chosen, your score and your friend's score so you can compare. Only you and the friend who played can open it.</li>
      <li><strong>Your study sets:</strong> the notes, flashcards, quizzes and source material (PDF files and pasted text) you put in the Study Lab. They are private to you.</li>
      <li><strong>Messages:</strong> the notifications shown under the bell.</li>
      <li><strong>Reports:</strong> what you write when you report a problem in a lesson or question, and our reply.</li>
      <li><strong>Answer statistics:</strong> every answer adds to a total for its question, such as how many students got it right. These totals have no name on them.</li>
    </ul>
    <p>We do not collect your phone contacts, location, or payment details. Catalyst does not use advertising or tracking services.</p>

    <h2>Why we collect it</h2>
    <p>To run your account, show your progress and streak, schedule your reviews, mark your tests, and email you links you ask for, such as a password reset. We do not sell your data and we do not share it for advertising.</p>

    <h2>Cookies and storage on your device</h2>
    <ul>
      <li>One login cookie named <code>token</code>. It keeps you signed in and is not readable by page scripts.</li>
      <li>Your colour, theme and text size are saved in your browser so the site looks the way you chose.</li>
    </ul>

    <h2>How long we keep it</h2>
    <ul>
      <li>Your account and study data stay until you delete your account.</li>
      <li>Password reset links last 30 minutes, email links 24 hours, and email-change links 1 hour. They work once.</li>
      <li>Notifications are removed after 60 days.</li>
      <li>Friend codes, friendships, circle memberships, shared sets, saves, leaderboard scores, challenges, XP and achievements are removed when you delete your account.</li>
    </ul>

    <h2>See your data, change it, delete it</h2>
    <ul>
      <li>In <Link to="/settings">Settings</Link> you can download all your data as a file, change your password, change your email, and delete your account.</li>
      <li>Deleting is permanent. Your name and email are removed and the account cannot be opened again. Your notes, saved items, study time, exam answers and reports are deleted. Scores and progress stay without your name, so overall learning statistics keep working.</li>
    </ul>

    <h2>Changes</h2>
    <p>If this page changes in a way that matters, we will change the date above.</p>
  </LegalPage>;
}

export function Terms() {
  return <LegalPage title="Terms of use" updated="14 November 2026">
    <p>By making a Catalyst account you agree to these terms. They are short on purpose.</p>

    <h2>Your account</h2>
    <ul>
      <li>Give a real email you can open. Keep your password private. One account is for one student.</li>
      <li>You are responsible for what happens on your account. If you think someone else has it, change your password in Settings.</li>
    </ul>

    <h2>Using Catalyst</h2>
    <ul>
      <li>Use it to study. Do not try to break it, overload it, or look for answers by attacking the site.</li>
      <li>Do not copy, resell or publish Catalyst lessons, questions, flashcards or materials without permission.</li>
      <li>Your own notes stay yours.</li>
      <li>Only upload or paste study material you wrote or have the right to use. It stays private to you and is used only for your own study. We may remove material that breaks this rule.</li>
    </ul>

    <h2>Learning content</h2>
    <p>Catalyst helps you revise. It is not a replacement for your lectures or textbooks, and it cannot promise any exam result. We try to keep content correct, and we fix mistakes when we find them.</p>

    <h2>Availability</h2>
    <p>We work to keep Catalyst running, but it may sometimes be down or change. Features may be added or removed.</p>

    <h2>Ending an account</h2>
    <p>You can delete your account at any time in Settings. We may suspend an account that breaks these terms.</p>

    <h2>Your data</h2>
    <p>How we handle your data is explained in the <Link to="/privacy">Privacy page</Link>.</p>

    <h2>Changes</h2>
    <p>If these terms change in a way that matters, we will change the date above.</p>
  </LegalPage>;
}
