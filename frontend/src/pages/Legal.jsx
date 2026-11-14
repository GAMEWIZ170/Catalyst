import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

// Privacy and terms are public: a student reads them before making an account.
function LegalPage({ title, updated, children }) {
  return <div className="legal-page">
    <ThemeToggle />
    <Link className="auth-brand" to="/" aria-label="Catalyst home"><span className="brand-mark">C</span><span>Catalyst</span></Link>
    <main className="legal-card" id="main" tabIndex="-1">
      <h1>{title}</h1>
      <p className="muted">Last updated {updated}</p>
      {children}
      <nav className="legal-links" aria-label="Legal pages">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/">Back to Catalyst</Link>
      </nav>
    </main>
  </div>;
}

export function Privacy() {
  return <LegalPage title="Privacy" updated="14 November 2026">
    <p>Catalyst is a revision platform for University of Ghana students. This page says what we keep about you, why, for how long, and how to remove it.</p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Account:</strong> your name, your email, and your password. The password is stored scrambled (hashed), so nobody, including us, can read it.</li>
      <li><strong>Your choices:</strong> your avatar, exam date, daily goal, and whether you finished the welcome steps.</li>
      <li><strong>Your study activity:</strong> lessons you finished, test scores and answers, flashcard ratings, mistakes, how well you know each topic, notes, saved items, where you stopped in a lesson, and how many minutes you studied.</li>
      <li><strong>Messages:</strong> the notifications shown under the bell.</li>
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
    </ul>

    <h2>See your data, change it, delete it</h2>
    <ul>
      <li>In <Link to="/settings">Settings</Link> you can download all your data as a file, change your password, change your email, and delete your account.</li>
      <li>Deleting is permanent. Your name and email are removed and the account cannot be opened again. Your notes, saved items, study time and exam answers are deleted. Scores and progress stay without your name, so overall learning statistics keep working.</li>
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
