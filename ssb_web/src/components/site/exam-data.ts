import type { Source } from "@/lib/posts";

export type ExamInfo = {
  slug: "nda" | "cds" | "afcat" | "capf";
  name: string;
  full: string;
  tagline: string;
  title: string;
  description: string;
  what: string[];
  official: Source[];
  eligibilityNote: string;
  ssb: string[];
  usesSsb: boolean;
  plan: { title: string; body: string }[];
  posts: string[];
  faq: { q: string; a: string }[];
  verify: string[];
};

const NOTICE = "Age limits, educational qualifications, marital status rules, vacancies and dates are published in each year's official notice and can change. We do not state them here. Read the current notice before you apply.";

export const EXAM_PAGES: ExamInfo[] = [
  {
    slug: "nda", name: "NDA", full: "National Defence Academy",
    tagline: "The route into the Army, Navy and Air Force wings straight after Class 12.",
    title: "NDA preparation: written exam to SSB",
    description: "How the NDA entry works, how the SSB fits in, and a preparation plan. Eligibility and dates are linked to the official UPSC notice, never guessed.",
    what: [
      "The NDA entry is run through an examination conducted by UPSC for students who have finished, or are about to finish, Class 12. Candidates who qualify the written exam are called to the Services Selection Board.",
      "Selection leads to training for the Army, Navy or Air Force. Which services and branches are open, and who can apply, is set out in the notice for each exam.",
    ],
    official: [{ label: "UPSC, official examination notices", url: "https://upsc.gov.in/" }, { label: "Join Indian Army", url: "https://joinindianarmy.nic.in/" }, { label: "Join Indian Navy", url: "https://www.joinindiannavy.gov.in/" }, { label: "Indian Air Force", url: "https://indianairforce.nic.in/" }],
    eligibilityNote: NOTICE,
    usesSsb: true,
    ssb: [
      "After the written exam, qualified candidates are called to a Services Selection Board centre for the five-day procedure.",
      "Day 1 is the screening round (OIR and PPDT). Candidates who clear it go on to psychology tests, group tasks, the personal interview and the conference.",
      "Because NDA candidates are young, assessors know you have little work history. They look at how you think, how you handle others and how you speak about the things you have actually done.",
    ],
    plan: [
      { title: "Run two tracks from the start", body: "Study for the written exam, and add small daily SSB habits next to it: exercise, an editorial, a short speech or one written test." },
      { title: "Learn the SSB format early", body: "Read the five-day procedure and the Officer Like Qualities guide so nothing is new on the day." },
      { title: "Practise the screening round", body: "Take timed OIR and PPDT practice. Day 1 decides whether you stay." },
      { title: "Build the psychology tests", body: "Write WAT, SRT, TAT and SDT sets under the clock and read the feedback for patterns." },
      { title: "Prepare the group and interview rounds", body: "Practise group discussions with friends, give short talks and rehearse your PIQ aloud." },
    ],
    posts: ["nda-written-exam-to-ssb-planning-timeline", "nda-vs-cds-vs-afcat-ssb", "ssb-interview-process-5-day-procedure", "ssb-90-day-study-plan"],
    faq: [
      { q: "Does ReadyKadet prepare me for the NDA written exam?", a: "No. ReadyKadet covers the SSB stage: OIR, PPDT, TAT, WAT, SRT, SDT, lecturette practice and interview guidance. Use official papers and notices for the written exam." },
      { q: "Where do I find the NDA age limit and dates?", a: "In the official UPSC notice for the exam you plan to sit. We do not repeat them because they are set each time." },
      { q: "Is the SSB the same for NDA and other entries?", a: "The five-day procedure and the Officer Like Qualities are the same across entries. What changes is the entry route and, for some services, extra tests." },
    ],
    verify: ["Which services are open to NDA candidates and whether women can apply should be confirmed in the current UPSC notice."],
  },
  {
    slug: "cds", name: "CDS", full: "Combined Defence Services",
    tagline: "For graduates aiming at the military, naval and air force academies.",
    title: "CDS preparation: written exam to SSB",
    description: "How the CDS entry works for graduates, how the SSB fits in, and a preparation plan. Eligibility and dates are linked to the official UPSC notice.",
    what: [
      "The CDS examination is conducted by UPSC for graduates who want to train as officers at the academies named in the notice. Candidates who qualify the written exam are called to the SSB.",
      "Academies belong to different services, so choosing your preference is choosing a service. Read the academy comparison on this blog to see how they differ.",
    ],
    official: [{ label: "UPSC, official examination notices", url: "https://upsc.gov.in/" }, { label: "Join Indian Army", url: "https://joinindianarmy.nic.in/" }, { label: "Join Indian Navy", url: "https://www.joinindiannavy.gov.in/" }, { label: "Indian Air Force", url: "https://indianairforce.nic.in/" }],
    eligibilityNote: NOTICE,
    usesSsb: true,
    ssb: [
      "Qualified candidates attend a Services Selection Board for the five-day SSB. For Air Force preferences, an extra aptitude test may apply; read the notice.",
      "Graduates have more to talk about in the PIQ and interview: college, projects, activities. Everything you list can become a question, so write only what you can discuss.",
      "The Officer Like Qualities are the same for every entry, so one preparation plan covers the lot.",
    ],
    plan: [
      { title: "Choose your academy preferences with care", body: "Read about each service and pick the ones you would be glad to serve in." },
      { title: "Split your time", body: "Give the written syllabus most of your study time, and keep a daily SSB habit going beside it." },
      { title: "Practise the written psychology tests", body: "Take TAT, WAT, SRT and SDT under the clock. Look for repeating patterns in the feedback." },
      { title: "Prepare your PIQ and your story", body: "Know your education, activities and reasons for joining, line by line." },
      { title: "Get fit and read the medical standards", body: "Check the notice early, see a doctor about anything that can be fixed, and exercise regularly." },
    ],
    posts: ["cds-ima-ina-afa-ota-differences", "nda-vs-cds-vs-afcat-ssb", "piq-form-filling-guide-ssb", "ssb-30-day-study-plan"],
    faq: [
      { q: "Does ReadyKadet cover the CDS written exam?", a: "No. It covers the SSB stage only." },
      { q: "Can I apply to more than one service?", a: "The notice states how preferences work. Read it carefully, and keep your PIQ answers consistent if you attend more than one board." },
      { q: "Where are the CDS eligibility rules?", a: "In the official UPSC notice. We link to it and do not restate the rules." },
    ],
    verify: ["Academy details and the written-exam pattern for each academy should be confirmed in the current UPSC notice."],
  },
  {
    slug: "afcat", name: "AFCAT", full: "Air Force Common Admission Test",
    tagline: "The Indian Air Force's own test for flying and ground duty officers.",
    title: "AFCAT preparation: written test to Air Force Selection Board",
    description: "How the AFCAT entry works, what the Air Force Selection Board is, and a preparation plan. Dates and eligibility are linked to the official notice.",
    what: [
      "AFCAT is conducted by the Indian Air Force for graduates who want to be officers in the flying or ground duty branches. Candidates who qualify the written test are called to an Air Force Selection Board.",
      "Branches, eligibility and medical standards, which are stricter for flying roles, are in the notice for each cycle.",
    ],
    official: [{ label: "AFCAT, official portal", url: "https://afcat.cdac.in/" }, { label: "Indian Air Force", url: "https://indianairforce.nic.in/" }],
    eligibilityNote: NOTICE,
    usesSsb: true,
    ssb: [
      "The Air Force Selection Board follows the same logic as the SSB: a screening stage, then psychology tests, group tasks and an interview.",
      "Candidates for flying roles are understood to take an extra computer-based aptitude test. Confirm the details in the official notice.",
      "Your OIR, psychology test, group and interview preparation carries across all services.",
    ],
    plan: [
      { title: "Prepare for the written test", body: "Use the syllabus and pattern in the official notice, and timed mock papers." },
      { title: "Check medical standards first", body: "Flying roles have strict standards. Read the notice and see a doctor early." },
      { title: "Learn the board format", body: "Read the SSB guides on this blog. The qualities assessed are the same." },
      { title: "Practise the written psychology tests", body: "TAT, WAT, SRT and SDT under the clock, with feedback on every attempt." },
      { title: "Know the Air Force", body: "Its branches, ranks, history and recent news will come up in the interview." },
    ],
    posts: ["afcat-and-air-force-selection-board-what-to-expect", "ranks-in-indian-army-navy-air-force", "nda-vs-cds-vs-afcat-ssb", "medical-standards-for-ssb-where-to-check"],
    faq: [
      { q: "Is the AFSB the same as the SSB?", a: "It follows the same assessment logic and uses the same qualities. Some tests, especially for flying roles, may differ. Check the official notice." },
      { q: "Does ReadyKadet help with the AFCAT written test?", a: "No. It prepares you for the selection board stage." },
      { q: "Where do I find AFCAT dates and eligibility?", a: "On the official AFCAT portal. We link to it and do not restate them." },
    ],
    verify: ["The structure of the Air Force Selection Board stages and the flying aptitude test should be confirmed against an official Air Force source."],
  },
  {
    slug: "capf", name: "CAPF", full: "Central Armed Police Forces (Assistant Commandants)",
    tagline: "A different route from the SSB: know what carries over and what does not.",
    title: "CAPF Assistant Commandant: what to prepare",
    description: "How the CAPF Assistant Commandant selection differs from the SSB, and which parts of SSB preparation still help. Official notices linked, nothing guessed.",
    what: [
      "Assistant Commandants in the Central Armed Police Forces are recruited through an examination conducted by UPSC. This is a different organisation and process from the Army, Navy and Air Force.",
      "As far as we understand, the process includes a written exam, physical standards and tests, an interview or personality test and a medical examination. Confirm the stages in the current notice.",
    ],
    official: [{ label: "UPSC, official examination notices", url: "https://upsc.gov.in/" }, { label: "Ministry of Home Affairs", url: "https://www.mha.gov.in/" }],
    eligibilityNote: NOTICE,
    usesSsb: false,
    ssb: [
      "The five-day SSB is not, as far as we understand, part of CAPF Assistant Commandant selection. Check the notice to confirm what the final stage tests.",
      "What carries over: fitness, interview skills, current affairs and the officer-like habits of discipline and responsibility.",
      "What does not: the PPDT, TAT, WAT, SRT and SDT practice is built for the SSB. It can still help you write and think under pressure, but it is not designed for this process.",
    ],
    plan: [
      { title: "Start with the notice", body: "Read the stages, syllabus and physical standards in the official UPSC notice." },
      { title: "Prepare the written exam on its own track", body: "Use official papers and the syllabus. ReadyKadet does not cover it." },
      { title: "Build fitness early", body: "The physical stage has standards in the notice. Train safely and steadily." },
      { title: "Prepare for the interview", body: "Work on honest, structured answers, current affairs and your own background." },
      { title: "If you also want an armed forces entry", body: "Plan both carefully. The SSB preparation on ReadyKadet applies to those entries." },
    ],
    posts: ["capf-assistant-commandant-selection-what-is-different", "current-affairs-routine-for-ssb-interview", "physical-fitness-preparation-for-ssb", "ssb-interview-nerves-and-communication"],
    faq: [
      { q: "Does ReadyKadet prepare me for CAPF?", a: "Only in part. It helps with interview practice, writing under time pressure and general officer-like habits. It is built for the SSB, not for the CAPF written exam or physical tests." },
      { q: "Is there an SSB for CAPF?", a: "As far as we understand, no. Confirm what the final stage is in the current UPSC notice." },
      { q: "Where are the CAPF eligibility rules and dates?", a: "In the official UPSC notice. We link to it and do not restate them." },
    ],
    verify: ["The stages of CAPF Assistant Commandant selection, and that it has no SSB-style assessment, should be confirmed against the current UPSC notice."],
  },
];

export const getExam = (slug: string) => EXAM_PAGES.find((e) => e.slug === slug);
