// What the default readers say out loud in the live styles, the reading couch
// and the reading cursors, written once by Claude: short remarks, each on a
// quote (the article's exact words, found once), said when you scroll to it.
// Each line gets one remark, said to you, the reader. A remark can have more:
// the research or fact behind it, which its bubble expands to show.
export const ASIDES = [
  {
    id: 'a1',
    quote: "If you're anything like me, you think new years resolutions are stupid.",
    comments: [{ reader: 'milo', text: 'You. He means you.' }],
  },
  {
    id: 'a2',
    quote: 'I’ve quit 10x more goals than I’ve achieved.',
    comments: [{ reader: 'june', text: 'For a founder: quitting the wrong bets fast is the job.' }],
  },
  {
    id: 'a4',
    quote:
      'The protocol at the end (to dig deep into your psyche and uncover what you truly want in life) will take about a full day to complete, with effects that last far longer than that.',
    comments: [
      { reader: 'june', text: 'For a founder: block one Saturday. Treat it like an offsite.' },
    ],
  },
  {
    id: 'a5',
    quote:
      'Changing who you are so that your behavior naturally follows (most important, first order)',
    comments: [
      {
        reader: 'iris',
        text: 'Works both ways: Bem’s self-perception theory (1972) found we infer who we are from what we do.',
        more: 'Daryl Bem proposed self-perception theory in 1972: when our feelings are unclear, we infer our attitudes by watching our own behavior. Daphna Oyserman’s research on identity-based motivation shows the other direction, that identities make some actions feel natural. Together they suggest a loop: small actions shift identity, and identity makes the next action easier.',
      },
    ],
  },
  {
    id: 'a6',
    quote:
      'Most people set a surface-level goal, hype themselves up to remain disciplined for the first few weeks, then go back to their old ways without much struggle, because they were trying to build a great life on a rotting foundation.',
    comments: [{ reader: 'milo', text: '“Rotting foundation.” Like your sourdough starter.' }],
  },
  {
    id: 'a7',
    quote: 'Do you think the bodybuilder has to “grind” to eat healthy?',
    comments: [
      {
        reader: 'iris',
        text: 'Survivorship bias, plus Lally and colleagues (2010): new habits took a median of 66 days to become automatic.',
        more: 'We notice the bodybuilders for whom healthy eating became effortless, not the many who still find it hard. In Phillippa Lally’s study at University College London, 96 people tried to build a daily habit; reaching automaticity took a median of 66 days, anywhere from 18 to 254. The grind is real, and it can last months.',
      },
    ],
  },
  {
    id: 'a9',
    quote:
      'If you want a specific outcome in life, you must have the lifestyle that creates that outcome long before you reach it.',
    comments: [{ reader: 'june', text: 'As CEO, run your calendar like the company you want.' }],
  },
  {
    id: 'a10',
    quote: 'If someone says they want to lose 30 pounds, I often don’t believe them.',
    comments: [
      {
        reader: 'iris',
        text: 'Rough example. Biggest Loser contestants’ metabolisms were still slower six years later (Fothergill et al., 2016).',
        more: 'Kevin Hall’s team at the NIH followed 14 contestants from The Biggest Loser and published the results in Obesity in 2016. Six years after the show, their resting metabolism was still about 500 calories a day lower than expected for their size, and most had regained much of the weight. Regain is partly biology, not only lifestyle.',
      },
    ],
  },
  {
    id: 'a12',
    quote:
      'Trust only movement. Life happens at the level of events, not of words. Trust movement.',
    comments: [
      {
        reader: 'iris',
        text: 'This section is Adler’s teleology: behavior is pulled by goals more than pushed by past causes.',
        more: 'Alfred Adler broke from Freud around 1911 and founded Individual Psychology. Where Freud looked for causes in the past, Adler argued behavior is purposive: people act toward goals, often unconscious ones like safety or significance. Kishimi and Koga’s The Courage to Be Disliked (2013) brought the idea to a wide modern audience.',
      },
    ],
  },
  {
    id: 'a13',
    quote:
      'The first step to understanding the mind is to understand that all behavior is goal-oriented.',
    comments: [
      {
        reader: 'iris',
        text: 'Partly. Wood and colleagues found about 43% of daily actions are habits, triggered by cues, not goals.',
        more: 'In diary studies by Wendy Wood, Jeffrey Quinn, and Deborah Kashy (2002), people performed roughly 43% of their daily behaviors in the same setting almost every day, often while thinking about something else. Habits are triggered by cues like time and place rather than by a goal held in mind. Goals start habits; then habits run on their own.',
      },
    ],
  },
  {
    id: 'a14',
    quote:
      'You may not realize that when you sit on the couch in the middle of the day, you are trying to burn time before your next responsibility, as one simple example.',
    comments: [{ reader: 'milo', text: 'You’re reading this on the couch, aren’t you.' }],
  },
  {
    id: 'a15',
    quote:
      'In this case, that goal could be to protect yourself from the judgment that comes from finishing and sharing your work.',
    comments: [{ reader: 'milo', text: 'Your drafts folder just flinched.' }],
  },
  {
    id: 'a16',
    quote: 'If you say you want to quit your dead-end job, but stay in it without any real reason',
    comments: [
      {
        reader: 'iris',
        text: 'Or rent. Mullainathan and Shafir’s research on scarcity shows money stress itself narrows the choices people can see.',
        more: 'In experiments described in Scarcity (2013), economist Sendhil Mullainathan and psychologist Eldar Shafir found that thinking about a large unexpected bill lowered poorer participants’ scores on reasoning tests, which they call a bandwidth tax. Staying in a job can be a rational response to real constraints, not only a hidden goal of safety.',
      },
    ],
  },
  {
    id: 'a17',
    quote:
      'A goal is a projection into the future that acts as a lens of perception which allows you to notice information, ideas, and resources that aid in you achieving that goal.',
    comments: [
      {
        reader: 'iris',
        text: 'The noticing part holds: in the “invisible gorilla” study, people focused on a task missed a gorilla.',
        more: 'In Daniel Simons and Christopher Chabris’s 1999 study, people counting basketball passes in a video often failed to see a person in a gorilla suit walk through; about half missed it. Attention follows what we’re looking for, which supports the lens idea. The stronger claim, that a goal creates resources, goes beyond what this research shows.',
      },
    ],
  },
  {
    id: 'a19',
    quote: 'You may never have been formally hypnotized.',
    comments: [
      {
        reader: 'iris',
        text: 'Context: Maltz was a plastic surgeon whose Psycho-Cybernetics (1960) borrowed cybernetics, the idea Dan uses in section V.',
        more: 'Maxwell Maltz noticed that some patients’ self-image didn’t change even after surgery changed their faces. In Psycho-Cybernetics (1960) he argued the mind works like a goal-seeking servomechanism, borrowing from Norbert Wiener’s cybernetics. It became a founding text of modern self-help, and its steering metaphor returns later in this article.',
      },
    ],
  },
  {
    id: 'a20',
    quote: 'You defend your identity to maintain psychological consistency',
    comments: [
      {
        reader: 'iris',
        text: 'Well documented: Dan Kahan’s research on identity-protective cognition shows we weigh evidence to protect our group.',
        more: 'Dan Kahan and colleagues at Yale’s Cultural Cognition Project found people judge evidence on contested topics, like climate change or gun control, in ways that protect their standing in groups they identify with. In one study, people with stronger math skills were more polarized, not less, when the data touched their identity.',
      },
    ],
  },
  {
    id: 'a22',
    quote: 'When your identity feels threatened, the same thing happens.',
    comments: [{ reader: 'june', text: 'As CEO, this is every tense board meeting.' }],
  },
  {
    id: 'a23',
    quote:
      'The same thing happens when you unconsciously see yourself as a lawyer, a gamer, or somebody else who would not take the actions to achieve a better life.',
    comments: [
      {
        reader: 'iris',
        text: 'Overreach. Research on job crafting shows people reshape the same role to fit who they’re becoming.',
        more: 'Organizational psychologists Amy Wrzesniewski and Jane Dutton described job crafting in 2001: people actively reshape the tasks, relationships, and meaning of their work. A lawyer, or anyone else, can grow within a role. The risk the article points at is an identity held too rigidly to change, not the role itself.',
      },
    ],
  },
  {
    id: 'a24',
    quote: 'The mind evolves through predictable stages over time.',
    comments: [
      {
        reader: 'iris',
        text: '“Predictable” is generous. In Loevinger’s research, most adults settle in the middle stages, and many never move on.',
        more: 'Jane Loevinger’s research on ego development found that most adults stabilize around the middle stages, and many don’t progress further. Stage models describe patterns across large groups; any one person’s path is uneven and depends on circumstances. Development is real, but it’s neither guaranteed nor tidy.',
      },
    ],
  },
  {
    id: 'a25',
    quote:
      'This has been documented enough in models like Maslow’s Hierarchy, Greuter’s stages of ego development, Spiral Dynamics, and Integral Theory, each building off of one another, but it’s also not difficult to observe in society.',
    comments: [
      {
        reader: 'iris',
        text: 'That’s Jane Loevinger’s model, extended by Susanne Cook-Greuter, and measured with a sentence-completion test.',
        more: 'Loevinger developed the Washington University Sentence Completion Test around 1970 to measure ego development, and Cook-Greuter later extended the top of the scale with stages like Construct-Aware and Unitive. Of the models Dan lists, it has the most research behind it. Spiral Dynamics and Integral Theory have little independent validation, and Maslow’s pyramid found weak support as a strict ranking (Wahba and Bridwell, 1976).',
      },
    ],
  },
  {
    id: 'a29',
    quote:
      'For most people reading this, I would assume you hover between 4 and 8, which is a huge gap.',
    comments: [{ reader: 'milo', text: 'You just decided you’re a 7.' }],
  },
  {
    id: 'a30',
    quote: 'The only real test of intelligence is if you get what you want out of life.',
    comments: [
      {
        reader: 'iris',
        text: 'Circular by design. Research defines intelligence as reasoning ability, which predicts outcomes but doesn’t guarantee them.',
        more: 'Psychologists measure intelligence as general mental ability: reasoning, learning, and problem solving. It correlates with education, job performance, and income, but far from perfectly, because luck, opportunity, and effort matter too. Defining intelligence as getting what you want means anyone who doesn’t get it is unintelligent, which can’t be tested.',
      },
    ],
  },
  {
    id: 'a31',
    quote:
      'One ingredient is opportunity (which many people like to mistake as “privilege” - because they the other ingredients).',
    comments: [
      {
        reader: 'iris',
        text: 'A word is missing, and opportunity often is privilege: Chetty found where a child grows up shapes adult income.',
        more: 'Raj Chetty and colleagues at Opportunity Insights studied tax records for millions of Americans. Children whose families moved to better neighborhoods earned more as adults, and the effect grew with each year of childhood spent there. Opportunity is shaped by circumstances people don’t choose, which doesn’t make agency irrelevant.',
      },
    ],
  },
  {
    id: 'a32',
    quote:
      'Cybernetics comes from the greek word kybernetikos which means “to steer” or “good at steering.”',
    comments: [
      {
        reader: 'iris',
        text: 'Close: kybernētikos means “good at steering.” Norbert Wiener named the field in 1948.',
        more: 'Wiener’s book Cybernetics: Or Control and Communication in the Animal and the Machine (1948) took its name from the Greek kybernētēs, steersman. The same root gives us “govern,” by way of Latin gubernare. The core idea is feedback: a system senses the gap between where it is and its goal, and corrects.',
      },
    ],
  },
  {
    id: 'a33',
    quote: 'And act again based on that feedback.',
    comments: [{ reader: 'june', text: 'As CEO, make this your Friday metrics review.' }],
  },
  {
    id: 'a34',
    quote: 'The pancreas excreting insulin after blood glucose spikes.',
    comments: [{ reader: 'milo', text: 'Your pancreas works harder than you before lunch.' }],
  },
  {
    id: 'a35',
    quote: 'The reality is that you can achieve any goal you set your mind to.',
    comments: [
      {
        reader: 'iris',
        text: 'Unfalsifiable as stated. Goal research finds hard goals help, but only when they’re feasible and get feedback.',
        more: 'Edwin Locke and Gary Latham’s goal-setting research, spanning hundreds of studies, found that specific, difficult goals improve performance more than vague ones, but only with commitment, feedback, and the ability to reach them. “Any goal on a large enough timescale” can’t be proven wrong, since failure just means the timescale was too short. Epictetus framed it better: know what is and isn’t up to you.',
      },
    ],
  },
  {
    id: 'a36',
    quote: 'Your mind is the operating system for reality.',
    comments: [{ reader: 'milo', text: 'Your OS needs updates. You keep hitting “later.”' }],
  },
  {
    id: 'a38',
    quote: 'Become a deep generalist',
    comments: [
      {
        reader: 'iris',
        text: 'Supported. David Epstein’s Range (2019) gathers evidence that broad early sampling often beats early specialization.',
        more: 'In Range, Epstein argues that in “wicked” learning environments, where the rules are unclear or change, people with broad experience adapt better than early specialists. He draws on Robin Hogarth’s work on kind and wicked environments and on studies of athletes, scientists, and inventors. In kind domains with clear rules, like chess or golf, early specialization still pays.',
      },
    ],
  },
  {
    id: 'a40',
    quote: 'Through the simple, but often painful act of questioning.',
    comments: [
      {
        reader: 'iris',
        text: 'Socratic, more or less. Research on elaborative interrogation shows that asking “why?” improves learning.',
        more: 'Asking yourself why something is true, called elaborative interrogation, improved learning across studies reviewed by John Dunlosky and colleagues in 2013, who rated it moderately useful. Socrates made questioning a method, exposing what people assumed without examining it. Dan is pointing the same tool at your own life.',
      },
    ],
  },
  {
    id: 'a41',
    quote: 'They discover what they want to pursue and make 6 years of progress in 6 months.',
    comments: [
      {
        reader: 'iris',
        text: 'No source given. Breakthroughs happen, but research on expertise finds skill usually grows gradually.',
        more: 'Dan offers no data for “six years of progress in six months.” Anders Ericsson’s research on expertise found skill grows through years of deliberate practice, though progress can feel sudden when it compounds or when someone finds the right fit. Treat this as an encouraging story, not a forecast.',
      },
    ],
  },
  {
    id: 'a42',
    quote: 'You can’t place the climax at the start of the book and expect it to be interesting.',
    comments: [{ reader: 'milo', text: 'Okay, that’s a good line. Don’t tell him.' }],
  },
  {
    id: 'a43',
    quote: 'Do not attempt to outsource this contemplation to AI.',
    comments: [{ reader: 'milo', text: 'Awkward. We’ll look away.' }],
  },
  {
    id: 'a45',
    quote: 'If absolutely nothing changes for the next five years, describe an average Tuesday.',
    comments: [{ reader: 'june', text: 'As CEO, describe that Tuesday’s calendar honestly.' }],
  },
  {
    id: 'a46',
    quote: 'You lived the safe version.',
    comments: [{ reader: 'milo', text: 'Oof. Okay. Deep breath, buddy.' }],
  },
  {
    id: 'a47',
    quote:
      'Now, we need to turn those into what I call an “anti-vision,” which is a brutal awareness of the life you do not want to live.',
    comments: [
      {
        reader: 'iris',
        text: 'Careful: a 2020 study found “start doing” goals beat “stop doing” goals, 59% to 47% success.',
        more: 'Martin Oscarsson and colleagues followed more than 1,000 people’s New Year’s resolutions for a year, published in PLOS ONE in 2020. At the end, 59% of those with approach goals considered themselves successful, versus 47% with avoidance goals. Oyserman and Markus (1990) found that pairing a feared self with a hoped-for self motivates most, which is what an anti-vision plus a vision does.',
      },
    ],
  },
  {
    id: 'a49',
    quote: 'These journaling exercises are cute, but we want real change.',
    comments: [{ reader: 'milo', text: 'He called his own exercises cute. Iconic.' }],
  },
  {
    id: 'a52',
    quote: 'Where in my life am I trading aliveness for safety?',
    comments: [{ reader: 'june', text: 'For a founder: where is your roadmap playing it safe?' }],
  },
  {
    id: 'a53',
    quote: 'What is the actual enemy?',
    comments: [
      {
        reader: 'iris',
        text: 'Sometimes it is the circumstances. Ross’s “fundamental attribution error” shows how easily we underrate situations.',
        more: 'Lee Ross named the fundamental attribution error in 1977: when explaining behavior, people overweight personality and underweight the situation. Looking past circumstances to an internal pattern can be useful, but check both. Structural barriers are real, and naming them is how they get changed.',
      },
    ],
  },
  {
    id: 'a54',
    quote: 'Instead, think of goals as a point of view.',
    comments: [
      {
        reader: 'iris',
        text: 'Notice the turn: goals were the operating system; now they’re lenses you can swap. Both can’t be literal.',
        more: 'Earlier, Dan described goals as the operating system for reality, fixed and running everything. Here he calls them a point of view you can exchange. As advice, the second is more useful: treating a goal as a lens lets you change it when your situation changes, without feeling like you’ve failed.',
      },
    ],
  },
  {
    id: 'a56',
    quote: 'The optimal state of inner experience is one in which there is order in consciousness.',
    comments: [
      {
        reader: 'iris',
        text: 'Flow needs challenge matched to skill, clear goals, and quick feedback, per Csikszentmihalyi. Not obsession.',
        more: 'Mihaly Csikszentmihalyi studied flow with experience sampling, paging people at random moments to ask what they were doing and feeling. Flow appeared when a challenge stretched but matched a person’s skill, with clear goals and immediate feedback. Games provide those conditions by design, which is why the video game framing works; obsession isn’t part of the recipe.',
      },
    ],
  },
  {
    id: 'a57',
    quote: 'Your 1 month project is the boss fight.',
    comments: [{ reader: 'june', text: 'As CEO, this is your quarter’s one big bet.' }],
  },
  {
    id: 'a58',
    quote: 'Your constraints are the rules.',
    comments: [
      { reader: 'june', text: 'For a founder: write constraints first. Burn rate counts.' },
    ],
  },
  {
    id: 'a59',
    quote:
      'The more you play the game, the stronger this force becomes, and soon enough it becomes who you are, and you wouldn’t have it any other way.',
    comments: [
      {
        reader: 'iris',
        text: 'Overstated in places, useful anyway: the identity, feedback, and goal ideas all have research behind them.',
        more: 'The article’s strongest ideas line up with research: identity shapes behavior (Oyserman), feedback loops drive correction (cybernetics), and specific goals with feedback help (Locke and Latham). The weakest claims are the absolutes: “all behavior,” “any goal,” “six years in six months.” Keep the protocol; drop the guarantees.',
      },
    ],
  },
];
