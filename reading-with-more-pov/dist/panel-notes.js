// What the default readers said about the article, written once by Claude and
// stored with the page, so nothing calls a model while you read. A quote is
// the article's exact words, usually a whole sentence, and must appear once.
// A thread's first comment starts it; the rest reply in order.
export const THREADS = [
  {
    id: 't1',
    quote: "If you're anything like me, you think new years resolutions are stupid.",
    comments: [
      {
        reader: 'iris',
        text: 'Prior work cuts against the opening line. Norcross and colleagues (2002) followed people who made resolutions and people who wanted the same change but didn’t. At six months, 46% of resolvers were still succeeding, versus 4% of the others.',
      },
      {
        reader: 'milo',
        text: 'You made one this year too. It lasted until about the second Tuesday of January. No judgment. Some judgment.',
      },
      {
        reader: 'june',
        text: 'As CEO, this is your annual planning problem. The plan is rarely the issue; the follow-through system is. Give each resolution one owner.',
      },
    ],
  },
  {
    id: 't2',
    quote: 'I’ve quit 10x more goals than I’ve achieved.',
    comments: [
      {
        reader: 'june',
        text: 'For a founder, this is the job: most bets don’t work. Quitting the wrong one quickly is a skill, not a failure.',
      },
      { reader: 'milo', text: 'Finally, a stat where you’re crushing it.' },
    ],
  },
  {
    id: 't3',
    quote:
      'Changing who you are so that your behavior naturally follows (most important, first order)',
    comments: [
      {
        reader: 'iris',
        text: 'This is identity-based motivation (Daphna Oyserman’s work), and it holds up. But the arrow runs both ways: Bem’s self-perception theory (1972) found we infer who we are from what we do. Acting first changes identity too.',
      },
      {
        reader: 'june',
        text: 'For a founder, consider writing the culture you want as “we’re a team that ships every week,” then shipping every week. Each makes the other easier.',
      },
    ],
  },
  {
    id: 't4',
    quote: 'The bodybuilder has to grind to eat unhealthily.',
    comments: [
      {
        reader: 'iris',
        text: 'Two checks. Survivorship bias: we only see the bodybuilders for whom it became easy. And in Lally’s 2010 study, habits took a median of about 66 days to form, anywhere from 18 to 254. The grind phase is real.',
      },
      { reader: 'milo', text: '254 days. So you’re on day 3 of 254. Pace yourself, champ.' },
    ],
  },
  {
    id: 't5',
    quote:
      'If you want a specific outcome in life, you must have the lifestyle that creates that outcome long before you reach it.',
    comments: [
      {
        reader: 'june',
        text: 'As CEO, run your calendar like the company you want to run: one hour a week on hiring, even with two people.',
      },
      {
        reader: 'milo',
        text: 'Translation: your “when I’m rich I’ll start waking up early” plan is officially cancelled.',
      },
    ],
  },
  {
    id: 't6',
    quote: 'If someone says they want to lose 30 pounds, I often don’t believe them.',
    comments: [
      {
        reader: 'iris',
        text: 'Weight is the hardest example he could pick. A 2016 follow-up of Biggest Loser contestants (Fothergill et al.) found their metabolisms stayed slowed years later. Regain isn’t only a lifestyle failure.',
      },
      {
        reader: 'june',
        text: 'For a founder, consider protecting your health the way you protect runway. Bodies push back, and that isn’t a character flaw.',
      },
    ],
  },
  {
    id: 't7',
    quote:
      'The first step to understanding the mind is to understand that all behavior is goal-oriented.',
    comments: [
      {
        reader: 'iris',
        text: 'This section is Alfred Adler’s teleology almost straight: we’re pulled by goals more than pushed by causes. But “all behavior” overreaches. Wendy Wood’s diary studies found roughly 43% of daily actions are habits, cue and response, not goals.',
      },
      {
        reader: 'milo',
        text: 'So your fourth trip to the fridge tonight was goal-oriented. Bold of the fridge to be your life’s purpose.',
      },
    ],
  },
  {
    id: 't8',
    quote:
      'In this case, that goal could be to protect yourself from the judgment that comes from finishing and sharing your work.',
    comments: [
      {
        reader: 'milo',
        text: 'This is about your drafts folder. Yes, that one. With the file called final_v7_REAL.',
      },
      {
        reader: 'june',
        text: 'For a founder, consider shipping something small this week to three customers you trust. Call it a beta.',
      },
      {
        reader: 'iris',
        text: 'Supported. Sirois and Pychyl (2013) frame procrastination as short-term mood repair: avoiding a bad feeling now, not a lack of discipline.',
      },
    ],
  },
  {
    id: 't9',
    quote:
      'A goal is a projection into the future that acts as a lens of perception which allows you to notice information, ideas, and resources that aid in you achieving that goal.',
    comments: [
      {
        reader: 'iris',
        text: 'The noticing part is well supported: in Simons and Chabris’s 1999 “invisible gorilla” study, people counting passes missed a gorilla walking through. That a goal creates resources, rather than helping you see them, is a bigger claim.',
      },
      {
        reader: 'june',
        text: 'As CEO, write the one company goal on a sticky note by your laptop. Watch which intros and conversations you start noticing.',
      },
    ],
  },
  {
    id: 't10',
    quote:
      'But if you have accepted an idea - from yourself, your teachers, your parents, friends, advertisements, from any other source - and further, if you are firmly convinced that idea is true, it has the same power over you as the hypnotist’s words have over the hypnotized subject.',
    comments: [
      {
        reader: 'iris',
        text: 'Context worth having: Maltz was a plastic surgeon who wrote Psycho-Cybernetics in 1960, borrowing the same cybernetics Dan reaches for in section V.',
      },
    ],
  },
  {
    id: 't11',
    quote: 'You defend your identity to maintain psychological consistency',
    comments: [
      {
        reader: 'iris',
        text: 'This has a name and a literature: identity-protective cognition, from Dan Kahan’s work. People weigh evidence in ways that protect their standing in groups they belong to.',
      },
      {
        reader: 'milo',
        text: 'Which explains how hard you defend your “I just work better at 2am” theory.',
      },
    ],
  },
  {
    id: 't12',
    quote:
      'The same thing happens when you unconsciously see yourself as a lawyer, a gamer, or somebody else who would not take the actions to achieve a better life.',
    comments: [
      { reader: 'milo', text: 'If you’re a lawyer AND a gamer, you just took double damage.' },
      {
        reader: 'june',
        text: 'For a founder, the cage is often “founder” itself. Keep one identity that isn’t the company.',
      },
    ],
  },
  {
    id: 't13',
    quote:
      'This has been documented enough in models like Maslow’s Hierarchy, Greuter’s stages of ego development, Spiral Dynamics, and Integral Theory, each building off of one another, but it’s also not difficult to observe in society.',
    comments: [
      {
        reader: 'iris',
        text: 'Corrections: the ego development model is Jane Loevinger’s, extended by Susanne Cook-Greuter. Maslow’s pyramid found little support as a strict ranking (Wahba and Bridwell’s 1976 review), and Spiral Dynamics and Integral Theory have almost no independent validation.',
      },
      {
        reader: 'milo',
        text: 'You’re about to open Spiral Dynamics in a new tab and lose an hour. I’ve seen your browser.',
      },
    ],
  },
  {
    id: 't14',
    quote:
      'For most people reading this, I would assume you hover between 4 and 8, which is a huge gap.',
    comments: [
      {
        reader: 'iris',
        text: 'Not what the data shows. In Cook-Greuter’s large adult samples, most people land around stages 4 and 5, and only a few percent reach Strategist or beyond.',
      },
      {
        reader: 'milo',
        text: 'You immediately decided you’re a 7. Bold, from someone with 43 unread voicemails.',
      },
    ],
  },
  {
    id: 't15',
    quote:
      'One ingredient is opportunity (which many people like to mistake as “privilege” - because they the other ingredients).',
    comments: [
      {
        reader: 'iris',
        text: 'A word is missing (“because they lack”?), and the claim is shaky. Raj Chetty’s mobility research found where a child grows up strongly predicts their adult income. Opportunity often is privilege.',
      },
      {
        reader: 'june',
        text: 'For a founder starting with less, shrink the first experiment, not the vision.',
      },
    ],
  },
  {
    id: 't16',
    quote:
      'Cybernetics comes from the greek word kybernetikos which means “to steer” or “good at steering.”',
    comments: [
      {
        reader: 'iris',
        text: 'Close: kybernētikos is “good at steering,” and kybernētēs is the steersman. Norbert Wiener named the field in 1948. “Govern” comes from the same root, by way of Latin gubernare.',
      },
    ],
  },
  {
    id: 't17',
    quote: 'The mark of low intelligence is the inability to learn from your mistakes.',
    comments: [
      {
        reader: 'iris',
        text: 'Intelligence in the research sense (reasoning, working memory) isn’t the same as learning from feedback. What he describes is closer to metacognition. Useful idea, unusual label.',
      },
      {
        reader: 'milo',
        text: 'By this definition, you became a genius the day you stopped texting your ex.',
      },
    ],
  },
  {
    id: 't18',
    quote: 'The reality is that you can achieve any goal you set your mind to.',
    comments: [
      {
        reader: 'iris',
        text: 'Rejected as stated. “Any goal” on “a large enough timescale” can’t be tested: if you fail, the timescale just wasn’t large enough. Epictetus drew the better line, opening his Handbook with what is and isn’t up to us.',
      },
      {
        reader: 'milo',
        text: 'You read this and briefly considered the NBA. Let’s start with the stairs.',
      },
      {
        reader: 'june',
        text: 'As CEO, believing the team can grow helps it persist. Believing every outcome is yours to control burns you out. Hold the vision, not the guarantee.',
      },
    ],
  },
  {
    id: 't19',
    quote: 'Go to school. Get the job. Get offended. Play victim. Retire at 65.',
    comments: [
      {
        reader: 'june',
        text: 'For a founder, consider which “known path” your company is quietly copying, and whether you chose it.',
      },
      {
        reader: 'milo',
        text: '“Get offended” snuck into that list the way you sneak into the group chat at 1am.',
      },
    ],
  },
  {
    id: 't20',
    quote: 'Do not attempt to outsource this contemplation to AI.',
    comments: [
      { reader: 'milo', text: 'Says the article you’re reading with three AIs. We’ll look away.' },
      {
        reader: 'june',
        text: 'As CEO, write it by hand anyway. Bring us your notes afterward if you want a second pair of eyes.',
      },
    ],
  },
  {
    id: 't21',
    quote:
      'What truth about your current life would be unbearable to admit to someone you deeply respect?',
    comments: [
      {
        reader: 'june',
        text: 'As CEO, this is the question to answer before your next board meeting. You can tear it up after.',
      },
      { reader: 'milo', text: 'You just thought of it. Don’t scroll away. I saw that.' },
    ],
  },
  {
    id: 't22',
    quote: 'If absolutely nothing changes for the next five years, describe an average Tuesday.',
    comments: [
      {
        reader: 'june',
        text: 'For a founder, make it concrete: your 9am standup, your 2pm calendar, your inbox at 10pm. The specifics are what make it bite.',
      },
    ],
  },
  {
    id: 't23',
    quote:
      'Now, we need to turn those into what I call an “anti-vision,” which is a brutal awareness of the life you do not want to live.',
    comments: [
      {
        reader: 'iris',
        text: 'Prior work suggests leaning on fear alone underperforms. A 2020 study of New Year’s resolutions (Oscarsson et al.) found “start doing” goals succeeded more often than “stop doing” goals, about 59% to 47%.',
      },
      {
        reader: 'june',
        text: 'For a founder, cap the anti-vision at 20 minutes, then write the vision. Fear is fuel for a pitch, not a place to run a company from.',
      },
    ],
  },
  {
    id: 't24',
    quote:
      'If you answered those truthfully, and if you are in the right chapter of your life, you will feel a deep sense of dis-ease and possibly disgust for how you are currently living.',
    comments: [
      {
        reader: 'iris',
        text: 'Supported with a caveat: in Breines and Chen’s 2012 experiments, self-compassion after a failure made people more motivated to improve, not less. Disgust isn’t required.',
      },
      {
        reader: 'june',
        text: 'As CEO, you’d never talk to your cofounder the way you’re about to talk to yourself. Be honest, not cruel.',
      },
    ],
  },
  {
    id: 't25',
    quote: 'The more random and non-conflicting with your schedule there are, the better.',
    comments: [
      {
        reader: 'june',
        text: 'For a founder, consider putting these on your calendar like board prep, at odd times like 11:07, so they don’t blend in.',
      },
      {
        reader: 'iris',
        text: 'This is close to experience sampling, the method Larson and Csikszentmihalyi developed: random prompts asking what you’re doing and feeling. People are usually surprised by their own data.',
      },
    ],
  },
  {
    id: 't26',
    quote: 'Am I moving toward the life I hate or the life I want?',
    comments: [
      {
        reader: 'milo',
        text: 'Set this as your lock screen. Right next to the 47 notifications you’re ignoring.',
      },
    ],
  },
  {
    id: 't27',
    quote: 'What is the actual enemy? Name it clearly. Not circumstances. Not other people.',
    comments: [
      {
        reader: 'iris',
        text: 'Partly supported. Internal patterns matter, but structural barriers are real too, and naming them is how they get changed.',
      },
      {
        reader: 'june',
        text: 'For a founder, the enemy is often “I have to do it all myself.” Name it, then hire for it.',
      },
    ],
  },
  {
    id: 't28',
    quote: 'Instead, think of goals as a point of view.',
    comments: [
      {
        reader: 'iris',
        text: 'Notice the turn: earlier, goals were the operating system; here they’re swappable lenses. They can’t both be literally true, but as advice, this is the better one.',
      },
      {
        reader: 'milo',
        text: 'So goals are an operating system AND a pair of sunglasses. Just like your personality.',
      },
    ],
  },
  {
    id: 't29',
    quote: 'Because games are the poster child for obsession, enjoyment, and flow states.',
    comments: [
      {
        reader: 'iris',
        text: 'One distinction from the Csikszentmihalyi quote above: flow comes from a challenge matched to skill, with clear goals and fast feedback. Obsession isn’t part of it. Games work because of the goals and the feedback.',
      },
      {
        reader: 'june',
        text: 'As CEO, the one-month boss fight is your quarter’s bet in miniature: long enough to matter, short enough to finish.',
      },
    ],
  },
  {
    id: 't30',
    quote: 'Your constraints are the rules.',
    comments: [
      {
        reader: 'june',
        text: 'For a founder, write constraints first: sleep, burn rate, no new debt. The founders who skip this burn out by month three.',
      },
      {
        reader: 'milo',
        text: 'Your constraint is “don’t quit the job yet.” Great constraint. Very adult. I’m proud and a little bored.',
      },
    ],
  },
];

// Emoji reactions, like Google Docs': each is one reader's emoji on some of
// the article's exact words.
export const REACTIONS = [
  { quote: 'This will be comprehensive.', reader: 'iris', emoji: '👀' },
  {
    quote:
      'Most people set a surface-level goal, hype themselves up to remain disciplined for the first few weeks, then go back to their old ways without much struggle, because they were trying to build a great life on a rotting foundation.',
    reader: 'milo',
    emoji: '😬',
  },
  {
    quote:
      'Most people set a surface-level goal, hype themselves up to remain disciplined for the first few weeks, then go back to their old ways without much struggle, because they were trying to build a great life on a rotting foundation.',
    reader: 'june',
    emoji: '💯',
  },
  {
    quote: "This next sentence may sound simple, but it is baffling how many people don't get it.",
    reader: 'iris',
    emoji: '🙄',
  },
  {
    quote:
      'If you want a specific outcome in life, you must have the lifestyle that creates that outcome long before you reach it.',
    reader: 'milo',
    emoji: '🔥',
  },
  {
    quote:
      'If you want a specific outcome in life, you must have the lifestyle that creates that outcome long before you reach it.',
    reader: 'june',
    emoji: '🎯',
  },
  {
    quote:
      'If you want a specific outcome in life, you must have the lifestyle that creates that outcome long before you reach it.',
    reader: 'iris',
    emoji: '🔥',
  },
  {
    quote:
      'I hold my tongue from telling her, “If I weren’t having fun, why would I be doing what I’m doing?”',
    reader: 'milo',
    emoji: '😂',
  },
  {
    quote: 'You scratch your nose because you want to make the itch go away.',
    reader: 'iris',
    emoji: '🤔',
  },
  {
    quote:
      'In this case, that goal could be to protect yourself from the judgment that comes from finishing and sharing your work.',
    reader: 'milo',
    emoji: '😬',
  },
  {
    quote:
      'In this case, that goal could be to protect yourself from the judgment that comes from finishing and sharing your work.',
    reader: 'june',
    emoji: '🎯',
  },
  {
    quote: 'The lesson here is that real change requires changing your goals.',
    reader: 'june',
    emoji: '👏',
  },
  {
    quote: 'When your identity feels threatened, the same thing happens.',
    reader: 'iris',
    emoji: '🎯',
  },
  {
    quote: 'When your identity feels threatened, the same thing happens.',
    reader: 'june',
    emoji: '💯',
  },
  { quote: 'The mind evolves through predictable stages over time.', reader: 'iris', emoji: '🤔' },
  {
    quote:
      'For most people reading this, I would assume you hover between 4 and 8, which is a huge gap.',
    reader: 'milo',
    emoji: '👀',
  },
  {
    quote: 'The only real test of intelligence is if you get what you want out of life.',
    reader: 'iris',
    emoji: '🤔',
  },
  {
    quote: 'The only real test of intelligence is if you get what you want out of life.',
    reader: 'milo',
    emoji: '🔥',
  },
  {
    quote: 'The pancreas excreting insulin after blood glucose spikes.',
    reader: 'iris',
    emoji: '🤓',
  },
  {
    quote: 'The reality is that you can achieve any goal you set your mind to.',
    reader: 'iris',
    emoji: '🙄',
  },
  {
    quote: 'The reality is that you can achieve any goal you set your mind to.',
    reader: 'milo',
    emoji: '❤️',
  },
  { quote: 'Your mind is the operating system for reality.', reader: 'june', emoji: '🤔' },
  {
    quote: 'Go to school. Get the job. Get offended. Play victim. Retire at 65.',
    reader: 'milo',
    emoji: '😬',
  },
  { quote: 'Become a deep generalist', reader: 'june', emoji: '❤️' },
  { quote: 'Become a deep generalist', reader: 'june', emoji: '👏' },
  {
    quote: 'Through the simple, but often painful act of questioning.',
    reader: 'june',
    emoji: '❤️',
  },
  { quote: 'Questioning is thinking, and very few people do it.', reader: 'june', emoji: '💯' },
  {
    quote: 'They discover what they want to pursue and make 6 years of progress in 6 months.',
    reader: 'iris',
    emoji: '🤔',
  },
  {
    quote: 'You can’t place the climax at the start of the book and expect it to be interesting.',
    reader: 'june',
    emoji: '👏',
  },
  {
    quote: 'You can’t place the climax at the start of the book and expect it to be interesting.',
    reader: 'milo',
    emoji: '❤️',
  },
  { quote: 'Do not attempt to outsource this contemplation to AI.', reader: 'iris', emoji: '😂' },
  { quote: 'Do not attempt to outsource this contemplation to AI.', reader: 'milo', emoji: '😂' },
  { quote: 'Do not attempt to outsource this contemplation to AI.', reader: 'june', emoji: '👀' },
  {
    quote:
      'What truth about your current life would be unbearable to admit to someone you deeply respect?',
    reader: 'milo',
    emoji: '😬',
  },
  { quote: 'You lived the safe version.', reader: 'milo', emoji: '😬' },
  { quote: 'You lived the safe version.', reader: 'june', emoji: '🎯' },
  {
    quote: 'What is the most embarrassing reason you haven’t changed?',
    reader: 'milo',
    emoji: '🫠',
  },
  {
    quote: 'These journaling exercises are cute, but we want real change.',
    reader: 'iris',
    emoji: '😂',
  },
  { quote: 'Where in my life am I trading aliveness for safety?', reader: 'milo', emoji: '❤️' },
  { quote: 'Where in my life am I trading aliveness for safety?', reader: 'june', emoji: '🔥' },
  {
    quote: 'Write a single sentence that captures what you refuse to let your life become.',
    reader: 'june',
    emoji: '🎯',
  },
  { quote: 'Enjoyment is found in progress.', reader: 'june', emoji: '👏' },
  { quote: 'Enjoyment is found in progress.', reader: 'iris', emoji: '💯' },
  { quote: 'That was a lot.', reader: 'milo', emoji: '😮‍💨' },
  { quote: 'Stick with me.', reader: 'iris', emoji: '🍿' },
  { quote: 'You turn your life into a video game.', reader: 'milo', emoji: '🎮' },
  { quote: 'You turn your life into a video game.', reader: 'june', emoji: '🔥' },
  { quote: 'Your 1 month project is the boss fight.', reader: 'milo', emoji: '🔥' },
  {
    quote:
      'The more you play the game, the stronger this force becomes, and soon enough it becomes who you are, and you wouldn’t have it any other way.',
    reader: 'milo',
    emoji: '❤️',
  },
  {
    quote:
      'The more you play the game, the stronger this force becomes, and soon enough it becomes who you are, and you wouldn’t have it any other way.',
    reader: 'june',
    emoji: '👏',
  },
];
