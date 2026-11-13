// Demo seed. Run: npm run seed:demo      (create what is missing)
//                 npm run seed:demo -- --reset   (delete DEMO content and the two demo users)
// Reads .env at runtime. Never prints passwords or the database URI.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const hashPassword = require("../src/utils/bcrypt");
const User = require("../src/models/user.models");
const Course = require("../src/models/course.models");
const Unit = require("../src/models/unit.models");
const Lesson = require("../src/models/lesson.models");
const Test = require("../src/models/test.models");
const Question = require("../src/models/question.models");
const Flashcard = require("../src/models/flashcard.models");
const Material = require("../src/models/material.models");
const Progress = require("../src/models/progress.models");
const TestResult = require("../src/models/testresult.models");
const FlashcardProgress = require("../src/models/flashcardprogress.models");

const COURSE_CODE = "DEMO113";
const VIDEO_ID = "FSyAehMdpyI";
const RESET = process.argv.includes("--reset");

const need = (names) => {
  const missing = names.filter((n) => !process.env[n] || !process.env[n].trim());
  if (missing.length) {
    console.error(`Missing in .env: ${missing.join(", ")}`);
    process.exit(1);
  }
};

// ---------- content ----------
const mcq = (text, options, correctIndex, explanation) => ({ type: "mcq", text, options, correctIndex, explanation });
const tf = (text, answer, explanation) => ({ type: "true_false", text, answer: String(answer), explanation });
const card = (front, back) => ({ front, back });

const units = [
  {
    title: "Atomic Structure",
    lessons: [
      {
        title: "Structure of the atom",
        explanation:
          "An atom has a small, dense nucleus made of protons and neutrons, with electrons moving around it.\n\n" +
          "The atomic number $Z$ is the number of protons. The mass number $A$ is protons plus neutrons, so $N = A - Z$.\n\n" +
          "Isotopes are atoms of one element with different numbers of neutrons, for example $\\ce{^{12}C}$ and $\\ce{^{14}C}$.\n\n" +
          "An ion forms when an atom gains or loses electrons: $\\ce{Na -> Na+ + e-}$.",
        test: [
          mcq("How many neutrons are in $\\ce{^{23}_{11}Na}$?", ["11", "12", "23", "34"], 1, "$N = A - Z = 23 - 11 = 12$."),
          mcq("Which particle has a negative charge?", ["Proton", "Neutron", "Electron", "Nucleus"], 2, "Electrons carry a charge of $-1$."),
          tf("Isotopes of an element have different numbers of protons.", false, "Isotopes differ in neutrons. The proton number defines the element."),
          tf("The nucleus holds almost all the mass of an atom.", true, "Protons and neutrons are about 1800 times heavier than an electron."),
        ],
        cards: [
          card("Atomic number", "Number of protons, $Z$."),
          card("Mass number", "Protons + neutrons, $A$."),
          card("Isotopes", "Same $Z$, different number of neutrons."),
          card("Charge of a proton", "$+1$"),
          card("Neutrons in $\\ce{^{14}C}$", "8, since $14 - 6 = 8$."),
          card("Cation or anion: $\\ce{Na+}$?", "Cation: it lost one electron."),
        ],
        link: { title: "Atoms and isotopes (Khan Academy)", url: "https://www.khanacademy.org/science/chemistry/atomic-structure-and-properties" },
      },
      {
        title: "Electron configuration",
        explanation:
          "Electrons fill orbitals from lowest energy upward (the Aufbau principle): 1s, 2s, 2p, 3s, 3p, 4s, 3d.\n\n" +
          "Each orbital holds at most two electrons with opposite spin (Pauli). Orbitals of equal energy fill singly first (Hund).\n\n" +
          "Oxygen ($Z = 8$) is $1s^2 2s^2 2p^4$. Sodium is $[\\ce{Ne}]\\,3s^1$.\n\n" +
          "Transition metals lose their 4s electrons first: $\\ce{Fe -> Fe^{2+} + 2e-}$.",
        test: [
          mcq("What is the electron configuration of $\\ce{Mg}$ ($Z = 12$)?", ["$1s^2 2s^2 2p^6 3s^1$", "$1s^2 2s^2 2p^6 3s^2$", "$1s^2 2s^2 2p^6 3p^2$", "$1s^2 2s^2 2p^5 3s^2$"], 1, "12 electrons fill 1s, 2s, 2p and then 3s."),
          mcq("How many electrons can one orbital hold?", ["1", "2", "6", "10"], 1, "An orbital holds two electrons of opposite spin."),
          tf("The 4s orbital fills before the 3d orbital.", true, "4s is lower in energy for neutral atoms up to calcium."),
          tf("Two electrons in the same orbital can have the same spin.", false, "Pauli exclusion: they must have opposite spin."),
        ],
        cards: [
          card("Aufbau principle", "Fill orbitals from lowest energy upward."),
          card("Pauli exclusion", "Max 2 electrons per orbital, opposite spins."),
          card("Hund's rule", "Fill equal-energy orbitals singly before pairing."),
          card("Capacity of the p subshell", "6 electrons (3 orbitals)."),
          card("Configuration of $\\ce{Na}$", "$1s^2 2s^2 2p^6 3s^1$"),
          card("Configuration of $\\ce{Cl-}$", "Same as argon: $[\\ce{Ne}]\\,3s^2 3p^6$"),
        ],
        link: { title: "Electron configurations (Khan Academy)", url: "https://www.khanacademy.org/science/chemistry/electronic-structure-of-atoms" },
      },
      {
        title: "Periodic trends",
        explanation:
          "Across a period (left to right) the nuclear charge rises while the shielding stays similar, so atoms get smaller and hold their electrons more tightly.\n\n" +
          "Down a group, extra shells make atoms larger and ionisation energy falls.\n\n" +
          "First ionisation energy: $\\ce{M(g) -> M+(g) + e-}$. Electronegativity increases towards fluorine.\n\n" +
          "Example: $\\ce{Li}$ is bigger than $\\ce{F}$, but $\\ce{F}$ holds electrons far more strongly.",
        test: [
          mcq("Which has the largest atomic radius?", ["Li", "Na", "K", "Be"], 2, "Radius grows down a group, and K is lowest in this list."),
          mcq("Which is the most electronegative element?", ["O", "Cl", "N", "F"], 3, "Fluorine has the highest electronegativity."),
          tf("First ionisation energy generally increases across a period.", true, "Greater nuclear charge pulls electrons in harder."),
          tf("Atomic radius increases from left to right across a period.", false, "It decreases because the nuclear charge increases."),
        ],
        cards: [
          card("Trend in radius across a period", "Decreases."),
          card("Trend in radius down a group", "Increases."),
          card("First ionisation energy", "Energy to remove one electron: $\\ce{M(g) -> M+(g) + e-}$"),
          card("Most electronegative element", "Fluorine."),
          card("Why does IE fall down a group?", "Outer electron is further away and better shielded."),
          card("Isoelectronic species", "Same number of electrons, e.g. $\\ce{Na+}$ and $\\ce{Ne}$."),
        ],
        link: { title: "Periodic trends (Khan Academy)", url: "https://www.khanacademy.org/science/chemistry/periodic-table" },
      },
    ],
    unitTest: [
      mcq("An atom has 17 protons and 18 neutrons. What is its mass number?", ["17", "18", "35", "1"], 2, "$A = 17 + 18 = 35$."),
      mcq("Which species is isoelectronic with $\\ce{Ar}$?", ["$\\ce{Na+}$", "$\\ce{K+}$", "$\\ce{Li+}$", "$\\ce{F-}$"], 1, "$\\ce{K+}$ has 18 electrons, the same as argon."),
      tf("Fluorine has a larger atomic radius than lithium.", false, "Fluorine is further right in period 2, so it is smaller."),
      tf("A 3p subshell can hold 6 electrons.", true, "Three orbitals, two electrons each."),
    ],
  },
  {
    title: "Chemical Bonding",
    lessons: [
      {
        title: "Ionic bonding",
        explanation:
          "Ionic bonds form when a metal transfers electrons to a non-metal. The oppositely charged ions attract each other.\n\n" +
          "Sodium chloride: $\\ce{Na + 1/2 Cl2 -> NaCl}$, giving $\\ce{Na+}$ and $\\ce{Cl-}$ in a lattice.\n\n" +
          "Lattice energy grows with higher charge and smaller ions, so $\\ce{MgO}$ has a much larger lattice energy than $\\ce{NaCl}$.\n\n" +
          "Ionic solids have high melting points and conduct electricity when molten or dissolved.",
        test: [
          mcq("Which compound is ionic?", ["$\\ce{CO2}$", "$\\ce{CH4}$", "$\\ce{MgCl2}$", "$\\ce{HCl}$"], 2, "A metal and a non-metal give an ionic compound."),
          mcq("What is the formula of aluminium oxide?", ["$\\ce{AlO}$", "$\\ce{Al2O3}$", "$\\ce{Al3O2}$", "$\\ce{AlO2}$"], 1, "$\\ce{Al^{3+}}$ and $\\ce{O^{2-}}$ balance as 2 and 3."),
          tf("Ionic solids conduct electricity when solid.", false, "Ions are fixed in the lattice. They conduct when molten or dissolved."),
          tf("MgO has a higher lattice energy than NaCl.", true, "Both ions carry a 2+/2- charge and are smaller."),
        ],
        cards: [
          card("Ionic bond", "Electrostatic attraction between oppositely charged ions."),
          card("Formula of calcium chloride", "$\\ce{CaCl2}$"),
          card("Lattice energy rises with", "Higher ion charge and smaller ion size."),
          card("Ions in $\\ce{Na2O}$", "$\\ce{2Na+}$ and $\\ce{O^{2-}}$"),
          card("Why high melting point?", "Strong attraction throughout the lattice."),
          card("Charge on a group 2 ion", "$2+$"),
        ],
        link: { title: "Ionic bonds (Khan Academy)", url: "https://www.khanacademy.org/science/chemistry/chemical-bonds" },
      },
      {
        title: "Covalent bonding",
        explanation:
          "A covalent bond is a shared pair of electrons between two non-metal atoms.\n\n" +
          "Water: $\\ce{H2O}$ has two single bonds. Carbon dioxide: $\\ce{O=C=O}$ has two double bonds. Nitrogen: $\\ce{N#N}$ has a triple bond.\n\n" +
          "More bonds between two atoms means a shorter, stronger bond: bond order $\\ce{N#N} > \\ce{N=N} > \\ce{N-N}$.\n\n" +
          "A bond is polar when the atoms differ in electronegativity, e.g. $\\ce{H-Cl}$.",
        test: [
          mcq("How many bonds are in $\\ce{N2}$?", ["1", "2", "3", "4"], 2, "Nitrogen has a triple bond: $\\ce{N#N}$."),
          mcq("Which bond is the most polar?", ["$\\ce{H-H}$", "$\\ce{C-H}$", "$\\ce{O-H}$", "$\\ce{Cl-Cl}$"], 2, "Oxygen and hydrogen differ most in electronegativity."),
          tf("A double bond is longer than a single bond between the same atoms.", false, "More shared pairs pull the atoms closer, so it is shorter."),
          tf("Covalent bonds form between two non-metals.", true, "They share electrons instead of transferring them."),
        ],
        cards: [
          card("Covalent bond", "A shared pair of electrons."),
          card("Bonds in $\\ce{CO2}$", "Two double bonds: $\\ce{O=C=O}$"),
          card("Bond length vs bond order", "Higher order means shorter bond."),
          card("Polar bond", "Unequal sharing because of an electronegativity difference."),
          card("Lone pairs on O in $\\ce{H2O}$", "Two."),
          card("Dative bond", "Both shared electrons come from one atom, as in $\\ce{NH4+}$."),
        ],
        link: { title: "Covalent bonds (Khan Academy)", url: "https://www.khanacademy.org/science/chemistry/chemical-bonds/covalent-bonds" },
      },
      {
        title: "Molecular shapes",
        explanation:
          "VSEPR theory says electron pairs around a central atom repel each other and spread as far apart as possible.\n\n" +
          "$\\ce{CH4}$ has four bonding pairs and is tetrahedral (109.5°). $\\ce{NH3}$ has three bonding pairs and one lone pair, so it is trigonal pyramidal. $\\ce{H2O}$ has two lone pairs and is bent.\n\n" +
          "Lone pairs repel more than bonding pairs, so the angles shrink: $\\ce{CH4}$ 109.5°, $\\ce{NH3}$ about 107°, $\\ce{H2O}$ about 104.5°.",
        test: [
          mcq("What is the shape of $\\ce{CH4}$?", ["Linear", "Bent", "Tetrahedral", "Trigonal planar"], 2, "Four bonding pairs spread out in a tetrahedron."),
          mcq("What is the shape of $\\ce{NH3}$?", ["Trigonal pyramidal", "Tetrahedral", "Linear", "Bent"], 0, "Three bonding pairs and one lone pair."),
          tf("Lone pairs repel more strongly than bonding pairs.", true, "This is why the $\\ce{H2O}$ angle is below 109.5°."),
          tf("$\\ce{CO2}$ is a bent molecule.", false, "It has two double bonds and no lone pairs on carbon, so it is linear."),
        ],
        cards: [
          card("VSEPR", "Electron pairs repel and spread out as far as possible."),
          card("Shape of $\\ce{H2O}$", "Bent, about 104.5°."),
          card("Shape of $\\ce{CO2}$", "Linear, 180°."),
          card("Shape of $\\ce{BF3}$", "Trigonal planar, 120°."),
          card("Bond angle in $\\ce{CH4}$", "109.5°"),
          card("Which repel more?", "Lone pair vs lone pair > lone pair vs bonding pair > bonding vs bonding."),
        ],
        link: { title: "VSEPR theory (Khan Academy)", url: "https://www.khanacademy.org/science/chemistry/chemical-bonds/vsepr-theory" },
      },
    ],
    unitTest: [
      mcq("Which compound has the highest melting point?", ["$\\ce{NaCl}$", "$\\ce{CH4}$", "$\\ce{HCl}$", "$\\ce{H2O}$"], 0, "Ionic lattices need the most energy to break."),
      mcq("What is the bond angle in $\\ce{BF3}$?", ["90°", "109.5°", "120°", "180°"], 2, "Trigonal planar."),
      tf("$\\ce{N2}$ contains a triple bond.", true, "Written $\\ce{N#N}$."),
      tf("$\\ce{MgCl2}$ is a covalent molecule.", false, "It is an ionic lattice."),
    ],
  },
];

const courseTest = [
  mcq("Which describes an isotope?", ["Same protons, different neutrons", "Same neutrons, different protons", "Same electrons, different protons", "Same mass number only"], 0, "Isotopes share $Z$ but differ in $N$."),
  mcq("Which pair forms an ionic compound?", ["$\\ce{C}$ and $\\ce{O}$", "$\\ce{Na}$ and $\\ce{Cl}$", "$\\ce{H}$ and $\\ce{Cl}$", "$\\ce{N}$ and $\\ce{H}$"], 1, "A metal and a non-metal."),
  tf("Electronegativity increases from left to right across a period.", true, "Nuclear charge rises, so atoms attract bonding electrons more."),
  tf("$\\ce{H2O}$ is linear.", false, "Two lone pairs on oxygen make it bent."),
];

// ---------- helpers ----------
const todayKey = (offset = 0) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

const buildQuestions = (testId, list) =>
  list.map((q, i) => {
    const base = { test: testId, type: q.type, text: q.text, explanation: q.explanation, order: i + 1 };
    if (q.type === "mcq") {
      const options = q.options.map((text) => ({ _id: new mongoose.Types.ObjectId(), text }));
      return { ...base, options, correctOption: options[q.correctIndex]._id };
    }
    return { ...base, correctAnswer: q.answer };
  });

const createTest = async (parent, list, extra = {}) => {
  const test = await Test.create({ ...parent, isPublished: true, ...extra });
  await Question.create(buildQuestions(test._id, list));
  return test;
};

const ensureUser = async (label, emailVar, passVar, name, role) => {
  const email = process.env[emailVar].trim().toLowerCase();
  let user = await User.findOne({ email });
  if (user) {
    console.log(`${label}: already exists, left unchanged`);
    return user;
  }
  user = await User.create({ name, email, password: await hashPassword(process.env[passVar]), role });
  console.log(`${label}: created`);
  return user;
};

// ---------- reset ----------
const reset = async () => {
  need(["DEMO_STUDENT_EMAIL", "DEMO_ADMIN_EMAIL"]);
  const emails = [process.env.DEMO_STUDENT_EMAIL, process.env.DEMO_ADMIN_EMAIL].map((e) => e.trim().toLowerCase());
  const users = await User.find({ email: { $in: emails } }).select("_id").lean();
  const userIds = users.map((u) => u._id);
  const courses = await Course.find({ code: /^DEMO/ }).select("_id").lean();
  const courseIds = courses.map((c) => c._id);
  const unitDocs = await Unit.find({ course: { $in: courseIds } }).select("_id").lean();
  const unitIds = unitDocs.map((u) => u._id);
  const lessons = await Lesson.find({ unit: { $in: unitIds } }).select("_id").lean();
  const lessonIds = lessons.map((l) => l._id);
  const tests = await Test.find({ $or: [{ lesson: { $in: lessonIds } }, { unit: { $in: unitIds } }, { course: { $in: courseIds } }] }).select("_id").lean();
  const testIds = tests.map((t) => t._id);
  const cards = await Flashcard.find({ lesson: { $in: lessonIds } }).select("_id").lean();
  const cardIds = cards.map((c) => c._id);

  const out = {
    flashcardProgress: (await FlashcardProgress.deleteMany({ $or: [{ flashcard: { $in: cardIds } }, { user: { $in: userIds } }] })).deletedCount,
    testResults: (await TestResult.deleteMany({ $or: [{ test: { $in: testIds } }, { user: { $in: userIds } }] })).deletedCount,
    progress: (await Progress.deleteMany({ $or: [{ lesson: { $in: lessonIds } }, { user: { $in: userIds } }] })).deletedCount,
    questions: (await Question.deleteMany({ test: { $in: testIds } })).deletedCount,
    tests: (await Test.deleteMany({ _id: { $in: testIds } })).deletedCount,
    flashcards: (await Flashcard.deleteMany({ _id: { $in: cardIds } })).deletedCount,
    materials: (await Material.deleteMany({ lesson: { $in: lessonIds } })).deletedCount,
    lessons: (await Lesson.deleteMany({ _id: { $in: lessonIds } })).deletedCount,
    units: (await Unit.deleteMany({ _id: { $in: unitIds } })).deletedCount,
    courses: (await Course.deleteMany({ _id: { $in: courseIds } })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: userIds } })).deletedCount,
  };
  console.log("Reset done. Deleted:", JSON.stringify(out));
};

// ---------- seed ----------
const seed = async () => {
  need(["DEMO_STUDENT_EMAIL", "DEMO_STUDENT_PASSWORD", "DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD"]);
  const student = await ensureUser("Demo student", "DEMO_STUDENT_EMAIL", "DEMO_STUDENT_PASSWORD", "Demo Student", "student");
  await ensureUser("Demo admin", "DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD", "Demo Admin", "admin");

  let course = await Course.findOne({ code: COURSE_CODE });
  if (course) {
    console.log(`Course ${COURSE_CODE}: already exists, content left unchanged`);
  } else {
    course = await Course.create({
      code: COURSE_CODE,
      title: "Demo: General Chemistry I",
      description: "Sample CHEM113 content: atomic structure and chemical bonding.",
      isPublished: true,
    });
    for (const [ui, u] of units.entries()) {
      const unit = await Unit.create({ course: course._id, title: u.title, order: ui + 1 });
      for (const [li, l] of u.lessons.entries()) {
        const lesson = await Lesson.create({
          unit: unit._id, title: l.title, order: li + 1, explanation: l.explanation, isPublished: true,
          ...(ui === 0 && li === 0 ? { videoHost: "youtube", videoId: VIDEO_ID } : {}),
        });
        await createTest({ scope: "lesson", lesson: lesson._id, title: `${l.title} quiz` }, l.test, { passPercent: 60 });
        await Flashcard.create(l.cards.map((c, i) => ({
          lesson: lesson._id, front: { text: c.front }, back: { text: c.back }, order: i + 1, isPublished: true,
        })));
        await Material.create({ lesson: lesson._id, title: l.link.title, kind: "link", linkUrl: l.link.url, order: 1, isPublished: true });
      }
      await createTest({ scope: "unit", unit: unit._id, title: `${u.title} test` }, u.unitTest);
    }
    await createTest({ scope: "course", course: course._id, title: "Demo course test" }, courseTest);
    console.log(`Course ${COURSE_CODE}: created (2 units, 6 lessons, 9 tests)`);
  }

  // Progress for the demo student: first lesson done, its test taken, 3-day streak
  const unit1 = await Unit.findOne({ course: course._id, order: 1 }).select("_id").lean();
  const lesson1 = await Lesson.findOne({ unit: unit1._id, order: 1 }).select("_id").lean();
  const test1 = await Test.findOne({ scope: "lesson", lesson: lesson1._id }).select("_id").lean();
  const days = [todayKey(0), todayKey(1), todayKey(2)];
  await Progress.findOneAndUpdate(
    { user: student._id, lesson: lesson1._id },
    { $set: { completed: true, score: 75 }, $setOnInsert: { completedAt: new Date() }, $addToSet: { completedDays: todayKey(0) } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await TestResult.findOneAndUpdate(
    { user: student._id, test: test1._id },
    { $set: { bestScore: 75, lastScore: 75, attempts: 2 }, $setOnInsert: { completedAt: new Date() }, $addToSet: { completedDays: { $each: days } } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  console.log("Demo student progress: set (1 lesson done, 1 test taken, 3-day streak)");
};

(async () => {
  need(["MONGODB_URI"]);
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await (RESET ? reset() : seed());
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
