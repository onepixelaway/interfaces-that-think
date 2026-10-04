// Notes on Machines of Loving Grace for the reading ideas, written once for this
// essay and stored here, so the ideas need no model calls. The notes match the
// essay's text through a fingerprint of its sentences; if the essay changes, the
// ideas warn in the console and these notes need writing again.
export const NOTES = {
  // fingerprint(JSON.stringify(sentence texts by section)); see essayFingerprint.
  essay: 'b536b550',

  // The supercut: sentences that, read in order and on their own, tell the whole
  // piece. Ids count the essay body's sentences in order, as splitSentences finds
  // them, from s1. The bold lead-ins that open bullet points are emphasized too,
  // by rule, so they aren't listed.
  keySentences: [
    // Opening
    ...'s1 s3 s4 s5 s6 s7 s11 s12 s14 s15 s27 s30 s31 s32 s33 s34 s35 s36 s37 s38'.split(' '),
    // Basic assumptions and framework
    ...'s43 s44 s47 s48 s50 s51 s53 s56 s58 s60 s61 s62 s63 s64 s65 s68 s70 s72 s74 s76 s104 s106 s107 s108'.split(
      ' ',
    ),
    // 1. Biology and health
    ...'s109 s111 s112 s113 s123 s126 s127 s128 s129 s132 s133 s136 s137 s140 s142 s145 s146 s157 s163 s164 s167 s176 s177 s180 s189 s207 s210 s216 s217'.split(
      ' ',
    ),
    // 2. Neuroscience and mind
    ...'s224 s225 s227 s229 s230 s232 s235 s238 s240 s247 s260 s261 s295 s296 s297 s298'.split(' '),
    // 3. Economic development and poverty
    ...'s299 s300 s301 s303 s304 s305 s306 s311 s312 s313 s316 s319 s321 s329 s333 s341 s347 s350 s362 s366 s368 s369 s372 s373'.split(
      ' ',
    ),
    // 4. Peace and governance
    ...'s374 s375 s376 s377 s381 s383 s385 s386 s388 s389 s391 s394 s395 s397 s399 s411 s412 s419 s432 s435 s439 s440 s441'.split(
      ' ',
    ),
    // 5. Work and meaning
    ...'s442 s443 s444 s450 s455 s458 s459 s461 s465 s466 s467 s468 s469 s470 s475'.split(' '),
    // Taking stock
    ...'s477 s478 s480 s481 s483 s484 s485 s486 s488 s495 s500 s501 s502 s503 s504'.split(' '),
  ],

  // Key sentences that Collapse secondary information folds into the text
  // around them, because they only support a neighbor: with them, a short run
  // becomes a block worth collapsing. Emphasis and fading keep them.
  collapseFolds: ['s3', 's227', 's303'],

  // Bridges for Add summary in collapsed area: a first-person sentence for a
  // collapsed run, keyed by fingerprint(the run's hidden text). Runs that read
  // fine without one aren't listed and keep a plain … pill.
  bridges: {
    '98f41819': 'I run Anthropic, so people often assume I’m a pessimist or doomer.',
    '10abf7d5': 'These are only guesses, but I aim for educated, concrete ones.',
    '64e4101f': 'When AI companies tout benefits, we can sound like propagandists.',
    '1135e742': 'I dislike talk of AI leaders as prophets single-handedly shaping the world.',
    d1ca654a: 'I find sci-fi framing makes these futures read like a niche fantasy.',
    '5f5de757': 'I think we need an inspiring vision to fight for, not just fires to fight.',
    '706ec98b': 'I may get plenty wrong, so I see this as a starting prompt for experts.',
    '65986e12': 'I know many people doubt it will be built soon, or at all.',
    c7ba92b5:
      'I find that equally implausible, since smart people could speed up hundreds of problems.',
    ef96899e: 'A given factor may or may not be what limits us at a given time.',
    '6c006fa': 'We rarely ask how much being smarter helps, but I think we should.',
    '49f3e32e':
      'The world only moves so fast, so some of our projects have irreducible minimum times.',
    '3da1943':
      'When data is lacking, as in particle physics, I think more intelligence doesn’t help.',
    f4900d3e: 'I think some chaotic systems stay unpredictable even for the most powerful AI.',
    '4a8fccfb': 'We can’t break laws or harm people, and our institutions change slowly.',
    e2eaba4b: 'Some physical laws, like the speed of light, I see as truly unbreakable.',
    '41a27491': 'I imagine intelligence building new tools and methods to route around old limits.',
    '38eff482': 'We’ve beaten smallpox, but many ancient afflictions still remain to defeat.',
    '5e50bf20':
      'I see slow experiments, noisy data, deep complexity, and slow trials holding biology back.',
    e5c351cb: 'Even after AlphaFold, I find many still see AI as narrowly useful.',
    '15f5e95a': 'I mean AI doing nearly everything biologists do, not just analyzing data.',
    '2828104d': 'These discoveries cut through complexity and drive most of our medical progress.',
    '816ae300': 'I see hundreds of such discoveries waiting, made by skill rather than by luck.',
    '26a9b09c': 'I doubt we can get 100x, because experiments have an irreducible latency.',
    d01331ac: 'Most of our drugs barely work, which forces huge, slow studies.',
    '3c016f37': 'I think trial delays of about a year still fit a 5–10 year transformation.',
    ccf10aad: 'Unlike many technologies, our new medicines tend to get deployed once they exist.',
    '6fbf08b5': 'natural infectious disease, which I think mRNA vaccines can help finish off.',
    a51076d9: 'We’re already on track, and I expect AI to tailor treatment to each cancer.',
    a6632a22: 'I expect embryo screening and safer CRISPR to prevent or cure most of it.',
    '185678c4': 'I’m bullish that better measurement tools will reveal its cause and prevention.',
    ee7ddb47: 'I think diabetes, obesity, and heart disease are easier, and already declining.',
    c40314cc: 'I suspect weight, appearance, and reproduction will be fully under our control.',
    '219761d0': 'I think biomarkers of aging could let us reach a kind of escape velocity.',
    f1b9730f: 'I hope my friends’ children will hear of disease the way we hear of scurvy.',
    fe976b81:
      'I think even biology alone would change the world beyond most people’s expectations.',
    '3a3ffcaa': 'I think mental health matters even more, since hundreds of millions suffer.',
    '76f58e25': 'Our progress comes from a few measurement tools, like optogenetics.',
    '368ea155': 'We’ve already seen an AI interpretability finding rediscovered in mouse brains.',
    b02f810e:
      'I think the scaling hypothesis should shift our focus to objective functions and architectures.',
    '2652a2e6': 'I expect AI neuroscientists to apply that insight better than we have.',
    cb37d1aa: 'I expect AI to speed up new neurotransmitter drugs and genetic research.',
    '33693fc3': 'I mean tools like optogenetics that measure and change what neurons do.',
    f4bed85b:
      'I think AI’s insights could uncover the real causes of psychosis and mood disorders.',
    c65d15b1: 'I think AI could improve therapy and even act as a personal coach.',
    a2275b94: 'I expect PTSD, depression, and addiction to become very treatable.',
    ee05f5cf: 'Restructuring the brain is hard, but I’m optimistic about what AI can invent.',
    '976a623c': 'I expect embryo screening to prevent much of it, though it will be controversial.',
    '2fb4cfe7': 'I’m optimistic that new drugs will help everyone’s brain behave a bit better.',
    '90785ee9': 'I think far more of our lives could hold moments of transcendence and peace.',
    e2b29841:
      'Many existing treatments haven’t reached everyone, and much of our world is still desperately poor.',
    '7c98ca4d': 'I doubt governments will, or should, hand economic policy over to an AI.',
    '422c3b5b': 'So I think AI can likely make those decisions better than we do.',
    '66d12aa8':
      'We must make sure the developing world isn’t left out, though success isn’t guaranteed.',
    '59c0e347':
      'We’ve eradicated diseases before, and I think AI can make those campaigns far smarter.',
    26881157: 'My goal would be a developing world healthier than ours is today.',
    fc402088: 'East Asian economies grew 10% a year, and I think AI could help match that.',
    '5e13587d': 'That would lift sub-Saharan Africa to China’s level, but we must work for it.',
    cf003c5: 'Our crop yields soared in the 20th century, saving millions from hunger.',
    '132167a3': 'I think AI can make fighting climate change far cheaper and less disruptive.',
    '7b47a41b': 'I’m more hopeful here, since our markets and institutions tend to spread access.',
    '1c4b755d': 'I worry it could create an underclass, but I won’t support coercing people.',
    '2c9fc969': 'I know it won’t be a perfect world, and some won’t catch up at first.',
    a14b2ea2: 'We’ve been wrong before, from the world wars to hopes for China’s liberalization.',
    '6e97a7f7': 'I think democracies must set the terms on which powerful AI arrives.',
    '14ad3104': 'We’d use the stick of military strength and the carrot of shared benefits.',
    '92152f83': 'I’m hopeful that democracies leading on AI could favor democracy everywhere.',
    '384fd726':
      'I expect better lives to promote democracy, since authoritarianism thrives on fear.',
    '7548e2c6': 'I think uncensored AI could arm dissidents against repressive governments.',
    '8a8067b6': 'Even our democracies fall short of their promise of equal rights.',
    '6f15e501':
      'I think AI could make our legal systems more impartial and our citizens better informed.',
    d4b121a5: 'I imagine an AI that gets everyone what government owes them.',
    95883997: 'I admit these ideas may be unrealistically utopian.',
    e83af5b2: 'I mean it’s fuzzier, like hunter-gatherers imagining our society as purposeless.',
    '66fe4773': 'I enjoy plenty of things I’m far from best at, and that’s fine.',
    '121b73d4': 'As long as AI does only part of a job, I think we stay highly leveraged.',
    '30a46c16':
      'It could be an AI-run economy rewarding us, but we’ll need lots of experimentation.',
    '98bc1220': 'In Banks’ The Player of Games, I see the Culture’s values beat a ruthless empire.',
    d7fba6f5: 'Few of us would deny that children shouldn’t die of preventable disease.',
  },

  // Summaries for Collapse sections into summaries, keyed by section heading:
  // 1 to 3 sentences in the author's voice.
  sections: {
    '1. Biology and health':
      'I think of AI not as a tool to analyze data but as a virtual biologist that can perform, direct, and improve upon nearly everything biologists do. If so, it could give us the next 50–100 years of biological progress in 5–10 years: a compressed 21st century that defeats most disease and may double the human lifespan.',
    '2. Neuroscience and mind':
      'The framework I laid out for biology applies equally to neuroscience, so AI can compress a century of progress into 5–10 years. I expect that to cure or prevent most mental illness, and to make the world as experienced by humans a much better and more humane place.',
    '3. Economic development and poverty':
      'New technologies only matter if everyone can get them, and I’m less sure AI can fix economies than invent science. Still, I think AI’s health benefits can reach even the poorest countries within 5–10 years, and with strong effort we can make a down payment on the dignity and equality we owe every human being.',
    '4. Peace and governance':
      'I see no strong reason to believe AI will favor democracy on its own, so we will have to fight for that outcome. My guess at the best approach is an entente strategy in which democracies lead on AI, and I hope AI can then make democracies fairer and freer than they are today.',
    '5. Work and meaning':
      'I think meaning comes mostly from human relationships and connection, not from economic labor, so AI doing things better shouldn’t empty our lives. The economic question is harder: in the long run AI may become so effective and cheap that we need a new conversation about how the economy should be organized.',
  },

  // Groupings for Group lists by other principles, keyed by the opening words of
  // each list's first item. Above a list, a sentence starts and a dropdown
  // finishes it: "These limits are organized [one at a time]." asWritten names
  // the grouping Dario used, and each principle's name is another way to finish
  // the sentence ("by whether they last"). Everything a reader sees is in
  // Dario's voice, like the bridges and summaries: "by how sure I am". A principle sorts every item, numbered
  // from 1 in his order, into groups headed by plain phrases ("Limits that won't
  // loosen"), keeping his order within a group; its edits change the few words
  // the new order would leave wrong, as [item, his words, new words].
  groupings: {
    'Biology and physical health': {
      sentence: 'The five fields are organized',
      asWritten: 'from the body outward',
      by: [
        {
          name: 'by how sure I am of progress',
          about: 'In my own words about each field. My order already runs from most to least sure.',
          groups: [
            ['Fields I’m most confident about', [1, 2]],
            ['The field I’m not as confident about', [3]],
            ['The field I’m not nearly as confident about', [4]],
            ['The field I find harder to predict', [5]],
          ],
        },
        {
          name: 'by who has to act',
          about: 'What science can do, what we have to fight for, and what society works out',
          groups: [
            ['Fields where science, sped up by AI, does the work', [1, 2]],
            ['Fields where all of us have to act together', [3, 4]],
            ['The field society works out over time', [5]],
          ],
        },
      ],
    },
    'In terms of pure intelligence': {
      sentence: 'These properties are organized',
      asWritten: 'from one mind to millions',
      by: [
        {
          name: 'by mind, reach, and scale',
          about: 'How it thinks and works, what it can act on, and how many there are',
          groups: [
            ['Properties of its mind', [1, 3]],
            ['Properties of its reach', [2, 4]],
            ['Properties of its scale', [5, 6]],
          ],
        },
      ],
    },
    'Speed of the outside world': {
      sentence: 'These limits are organized',
      asWritten: 'one at a time',
      by: [
        {
          name: 'by whether they last',
          about:
            'From my next paragraph: some limits that are hard in the short run give way in the long run',
          groups: [
            ['Limits that can loosen in the long run', [1, 2, 4]],
            ['Limits that won’t loosen', [3, 5]],
          ],
          edits: [
            [
              5,
              'a starker version of the first point',
              'a starker version of the speed of the outside world',
            ],
          ],
        },
        {
          name: 'by where they come from',
          about: 'Limits set by nature, and limits set by people',
          groups: [
            ['Limits set by nature', [1, 2, 3, 5]],
            ['The limit set by people', [4]],
          ],
        },
      ],
    },
    CRISPR: {
      sentence: 'These discoveries are organized',
      asWritten: 'from tools to ideas',
      by: [
        {
          name: 'by what they do',
          about:
            'My own terms: most of these discoveries are “tools for measurement or precise intervention”',
          groups: [
            ['Discoveries that measure', [2, 3]],
            ['Discoveries that intervene', [1, 4, 5, 6]],
            ['Discoveries that explain', [7]],
          ],
        },
        {
          name: 'by where they’re used',
          about: 'Where each one does its work',
          groups: [
            ['Discoveries used in the lab', [1, 2, 3, 4]],
            ['Discoveries used in the clinic', [5, 6]],
            ['Discoveries that change how we think', [7]],
          ],
        },
      ],
    },
    'Reliable prevention and treatment': {
      sentence: 'These predictions are organized',
      asWritten: 'disease by disease',
      by: [
        {
          name: 'by what’s in the way',
          about: 'The hardest part I see in each, in the terms of my limiting factors',
          groups: [
            ['Predictions that can’t be measured yet', [4, 7]],
            ['Predictions where some cases may hold out', [2, 3]],
            ['Predictions that depend on reaching everyone', [1, 6]],
            ['The prediction already coming true', [5]],
          ],
        },
        {
          name: 'by whether there’s a trend',
          about: 'Continuing what 20th-century medicine started, or starting fresh',
          groups: [
            ['Predictions that continue a trend', [1, 2, 5, 6, 7]],
            ['Predictions that break new ground', [3, 4]],
          ],
        },
      ],
    },
    'Most mental illness can probably be cured': {
      sentence: 'These predictions are organized',
      asWritten: 'from illness to well-being',
      by: [
        {
          name: 'by how sure I am',
          about: 'Sorted by my own hedges, from “very optimistic” to “very uncertain”',
          groups: [
            ['The prediction I’m very optimistic about', [4]],
            ['Predictions I think will probably come true', [1, 3, 5]],
            ['The prediction I’m very uncertain about', [2]],
          ],
          edits: [[5, 'Taking this one step further', 'Going a step beyond everyday problems']],
        },
      ],
    },
    'Distribution of health interventions': {
      sentence: 'These guesses are organized',
      asWritten: 'area by area',
      by: [
        {
          name: 'by how sure I am',
          about: 'In the words of my summary right after the list',
          groups: [
            ['Guesses I’m optimistic about', [1, 3, 4, 5]],
            ['The guess I’m hopeful, though not confident, about', [2]],
            ['The guess I’m concerned about', [6]],
          ],
          edits: [[2, 'in the previous bullet point', 'in the first bullet point']],
        },
        {
          name: 'by who has to act',
          about: 'What AI can invent, what we have to do together, and what each person chooses',
          groups: [
            ['Guesses that rest on what AI can invent', [3, 4]],
            ['Guesses that need us to work together', [1, 2, 5]],
            ['The guess that rests on each person’s choice', [6]],
          ],
        },
      ],
    },
  },

  // Slide through lists as cards: the lists whose items are chunky enough to
  // read one card at a time, keyed like the groupings. Short lists, like the
  // five fields, and lists whose items run too long for a card stay as written.
  // label names the cards for screen readers, and icons gives each item, in
  // Dario's order, the name of a Lucide icon, drawn in its card's corner.
  carousels: {
    'In terms of pure intelligence': {
      label: 'The properties of powerful AI',
      icons: ['brain', 'laptop', 'calendar-clock', 'bot', 'layers', 'network'],
    },
    CRISPR: {
      label: 'Discoveries that drive progress in biology',
      icons: ['scissors', 'microscope', 'dna', 'flashlight', 'syringe', 'shield', 'lightbulb'],
    },
    'Traditional molecular biology': {
      label: 'Ways AI can speed up neuroscience',
      icons: ['flask-conical', 'activity', 'cpu', 'messages-square'],
    },
  },
};
