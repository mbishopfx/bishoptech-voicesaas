export type AuthoritySection = {
  eyebrow: string;
  title: string;
  intro: string;
  paragraphs: string[];
  asideTitle: string;
  asideItems: string[];
};

export type AuthorityPageContent = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  pills: string[];
  sellingPoints: string[];
  sections: AuthoritySection[];
  ctaTitle: string;
  ctaBody: string;
};

export const authorityPages: AuthorityPageContent[] = [
  {
    slug: 'why-you-dont-need-a-voice-ai-agency',
    eyebrow: 'Authority page',
    title: 'Why most businesses do not need a voice AI agency anymore.',
    description:
      'The case for replacing high monthly retainers with a cleaner voice AI setup, direct API ownership, and a managed platform that keeps costs tied to real usage.',
    summary:
      'Voice AI is early, which makes it easy for agencies to sell fear, complexity, and oversized retainers. The better answer is a strong setup, direct API ownership, live reporting, and practical support when something actually needs to change.',
    pills: ['No bloated retainers', 'Usage-based economics', 'Own the stack', 'Real platform visibility'],
    sellingPoints: [
      'You should not need a middle layer charging agency prices on top of API-driven usage.',
      'A clean setup and a visible dashboard solve more than a vague monthly “management” promise.',
      'Early-stage technology should lower commitment risk, not increase it.',
      'BishopTech Voice keeps the build strong while keeping the ongoing structure honest.',
    ],
    sections: [
      {
        eyebrow: 'Start here',
        title: 'The old software-agency model does not fit this category very well.',
        intro:
          'Agencies used to hold real leverage because the software itself was hard to reach, hard to configure, and hard to maintain without a specialist.',
        paragraphs: [
          'That model made sense when most businesses had no direct relationship with the tools under the hood. A vendor managed the software, an agency managed the vendor, and the client paid for both layers because that was the only practical way to keep a system running. Voice AI is not shaped like that. It sits on APIs, telephony, prompts, and usage-based infrastructure. Those are not mystery assets that deserve permanent markups. They are operating components that need to be set up properly and then watched with common sense.',
          'That difference matters because many businesses are entering voice AI with caution. They know the category is getting better fast. They also know it is still young. When a market looks like that, buyers should get shorter feedback loops, clearer reporting, and cleaner economics. They should not get trapped in a structure that makes experimentation expensive from day one. If the technology is still finding its footing, the pricing model should stay flexible enough for the buyer to learn without feeling pinned into a long, high-cost commitment.',
        ],
        asideTitle: 'The practical read',
        asideItems: [
          'AI voice is infrastructure first, not an agency dependency product.',
          'The client should see what is happening without waiting on a monthly update call.',
          'The real technical value sits in setup quality, workflow logic, and support response time.',
        ],
      },
      {
        eyebrow: 'Usage reality',
        title: 'Voice AI already wants to be billed like usage-based software.',
        intro:
          'The underlying economics are closer to cloud software than they are to a traditional agency deliverable.',
        paragraphs: [
          'Calls consume telephony, model usage, and voice generation. Those costs rise or fall based on what the business actually uses. That is why a bring-your-own-API setup is more honest for the buyer. It keeps the spend close to reality. If call volume grows, usage grows. If the business is quiet, usage stays quiet. That is a far healthier model than paying a high flat retainer every month and then trying to guess how much of that money is covering actual usage and how much is just disappearing into overhead.',
          'This is also where many agency offers lose credibility. They often lump setup, maintenance, strategy, hosting, prompt edits, call reviews, and reporting into one number. That sounds convenient, but it hides the real operating cost of the system. A buyer cannot tell what part of the invoice is paying for the voice stack and what part is paying for the agency’s preferred margin. Once that happens, the client loses visibility and leverage at the same time. That is not a strong position for a business that is still learning how much voice automation it truly needs.',
        ],
        asideTitle: 'What usage-based billing fixes',
        asideItems: [
          'You can see the real operating cost of the stack.',
          'You are not forced into agency overhead when usage is light.',
          'Scaling is tied to volume, not to a bigger retainer conversation.',
        ],
      },
      {
        eyebrow: 'Real risk',
        title: 'The bigger problem is not the technology. It is the opaque contract around it.',
        intro:
          'Most buyers are not actually afraid of the API. They are afraid of getting locked into a setup they cannot see or control.',
        paragraphs: [
          'That fear is rational. A business wants to know where its number lives, where its assistants are configured, how calls are being routed, and what happens if it wants to make a change. If the answer is always “talk to the agency,” then the business is not buying a system. It is buying dependency. That may be tolerable in a mature category with stable economics. It is a bad bargain in a fast-moving market where pricing, model quality, and workflows are all improving quarter by quarter.',
          'BishopTech Voice takes a cleaner position. The stack gets set up for the client. The workflows are mapped. The assistants are scoped by role. The reporting is visible in the platform. The client can review calls, leads, transcripts, and recordings without asking for a weekly screen recording from somebody on the vendor side. That does not remove support. It puts support back in the right place. Support is there for workflow changes, technical issues, and practical refinements. It is not there to preserve a black box.',
        ],
        asideTitle: 'What buyers should expect',
        asideItems: [
          'Clear ownership of the underlying accounts and usage.',
          'A dashboard that makes outcomes visible.',
          'Straight answers about what the monthly support fee does and does not cover.',
        ],
      },
      {
        eyebrow: 'What you actually need',
        title: 'Most businesses need a strong launch, not a large agency engagement.',
        intro:
          'There is still real work in getting voice AI live. The point is not to pretend setup is easy. The point is to price the work honestly.',
        paragraphs: [
          'A serious rollout still needs thought. Someone has to understand the business, map the inbound flow, decide when to hand off, configure the assistants, connect the numbers, set expectations for the dashboard, and test the experience before calls start flowing. That has value, and it is exactly why a one-time setup fee makes sense. It reflects concentrated implementation work with a clear outcome. It does not turn every future month into another negotiation about why the client is still paying agency prices for infrastructure they already funded.',
          'Once the launch is done, the job changes. The business does not need a team living in the account every day just to justify a retainer. It needs light support, reliable fixes, and a place to review performance. That is the model BishopTech Voice is built around. Setup is handled seriously. Ongoing support stays lean. Usage stays tied to what the business actually consumes. That gives the client a much healthier cost structure while still giving them someone to call when they want a workflow adjusted or a technical issue resolved.',
        ],
        asideTitle: 'The lean model',
        asideItems: [
          'Setup is paid once because setup is concentrated implementation work.',
          'Monthly management stays light because ongoing support is lighter by nature.',
          'The client gets stability without inheriting a permanent agency tax.',
        ],
      },
      {
        eyebrow: 'Why it matters now',
        title: 'Early markets reward buyers who keep their costs honest.',
        intro:
          'AI voice is going to keep growing, but a lot of businesses are still deciding when to step in and how much risk they want to take.',
        paragraphs: [
          'That is exactly why the pricing and delivery model matters so much right now. If a business is still warming up to voice AI, the wrong move is to force it into an oversized retainer before it has even seen the system operate in context. The better move is to show a live demo, explain the workflow, make the economics easy to understand, and lower the cost of getting started. When buyers can test the category without feeling trapped, adoption gets easier and trust builds faster.',
          'That is the core argument. You do not need a voice AI agency to sit between you and this technology. You need a capable implementation partner, a clear dashboard, a bring-your-own-API structure, and support that feels like support rather than a monthly leverage point. That is what BishopTech Voice is trying to bring back into the category: sensible setup, transparent usage, and an ongoing fee that reflects actual service instead of market hype.',
        ],
        asideTitle: 'The elevator version',
        asideItems: [
          'Own the usage, not the agency overhead.',
          'Pay for a strong setup, not permanent dependency.',
          'Keep support practical, visible, and tied to real work.',
        ],
      },
    ],
    ctaTitle: 'Move into voice AI without signing up for agency bloat.',
    ctaBody:
      'Book the strategy call, let BishopTech handle the launch, and keep the ongoing cost where it belongs: on usage, workflow support, and a platform you can actually use.',
  },
  {
    slug: 'fair-voice-ai-pricing',
    eyebrow: 'Authority page',
    title: 'Why a one-time setup fee and $99 monthly makes more sense than agency pricing.',
    description:
      'A fairer pricing model for AI voice: one-time implementation, $99 monthly management, BYO-API onboarding, and per-token usage so clients pay for what they actually use.',
    summary:
      'AI voice is still young. That is exactly why the pricing should stay clean. The setup work should be paid once, ongoing management should stay light, and actual usage should stay on a bring-your-own-API basis so the client is paying for the stack they use, not the hype around it.',
    pills: ['One-time setup', '$99 monthly management', 'BYO-API onboarding', 'Pay for usage'],
    sellingPoints: [
      'The setup fee covers the build, the workflow, and the launch work that actually takes effort.',
      'The $99 monthly retainer covers workflow edits, platform access, and real support.',
      'BYO-API pricing keeps token and telephony costs tied to usage instead of hidden inside agency markup.',
      'This is a better fit for a fast-moving market where buyers need clarity before they need scale.',
    ],
    sections: [
      {
        eyebrow: 'Start here',
        title: 'Early markets should not be priced like settled, mature categories.',
        intro:
          'Voice AI is getting better fast, but many businesses are still deciding how aggressive they want to be with adoption.',
        paragraphs: [
          'That matters because the pricing model sets the emotional tone of the sale. When a business is curious but cautious, a large recurring contract feels like a commitment to uncertainty. The owner knows the category is promising. They may even know they want missed-call coverage, outbound reminders, or qualification handled after hours. What they do not want is to start with a huge monthly cost before they understand how often the system will run, how the call flow will work, and how much day-to-day support they will actually need.',
          'That is why BishopTech Voice takes a simpler view. Setup has a cost because setup takes real work. Ongoing management has a cost because support still matters. Usage has a cost because models, telephony, and voice generation are not free. Those three buckets should stay separate enough for the client to understand them. Once those buckets get blurred together, the buyer loses clarity and the vendor gains room to overcharge. In a young market, that is the wrong trade for the client.',
        ],
        asideTitle: 'The pricing principle',
        asideItems: [
          'Charge clearly for implementation.',
          'Keep support lean once the system is stable.',
          'Let usage stay usage-based so the buyer sees the real operating cost.',
        ],
      },
      {
        eyebrow: 'Setup fee',
        title: 'The one-time setup fee pays for the part that is actually hard.',
        intro:
          'A serious voice stack does not appear by itself. It has to be scoped, configured, tested, and shaped around the business.',
        paragraphs: [
          'During setup, BishopTech works through the structure that agencies like to hide behind a retainer. The workflows have to be mapped. The assistant roles have to be scoped. The right models and voices have to be chosen. The phone numbers have to be attached. The dashboard has to be usable. The reporting has to make sense. If the business wants a multi-agent handoff, that needs to be designed. If it needs outbound follow-up or blast messaging, those flows need to be shaped before anything goes live. That is implementation work, and it deserves a direct implementation fee.',
          'The point of charging it once is to keep the deal honest. The client pays for concentrated build work with a clear beginning and a clear output. They are not paying every month for the same setup work to be repackaged as “optimization.” That alone changes the relationship. The buyer is paying for the launch, not for an open-ended obligation. It keeps the business grounded in deliverables instead of forcing them into a vague service wrapper that grows larger as the category gets more fashionable.',
        ],
        asideTitle: 'What setup covers',
        asideItems: [
          'Business scoping and workflow design.',
          'Assistant creation, prompt structure, and voice selection.',
          'Dashboard access, reporting visibility, and testing before launch.',
        ],
      },
      {
        eyebrow: 'Monthly management',
        title: 'The $99 monthly retainer covers support, not inflated overhead.',
        intro:
          'Once the system is live, the work becomes lighter and more focused. The pricing should reflect that.',
        paragraphs: [
          'The monthly retainer exists because real businesses still need a support layer after launch. Someone needs to be available when a workflow should be updated, when a technical issue shows up, when a routing change is needed, or when the client wants help adjusting how the assistants behave. The platform itself also has value because it keeps the stack visible and usable. That is what the $99 fee is there to cover: workflow setups and adjustments, technical issues, and access to the BishopTech Voice platform.',
          'What it is not there to cover is bloated agency overhead. It is not a disguised usage fee. It is not a penalty for keeping the system live. It is not a license for somebody to bill like they are running an enterprise consulting team when the real need is straightforward platform support. Keeping the monthly fee low is part of the offer. It signals that the ongoing relationship is meant to stay practical. The client gets help, stability, and platform access without being treated like a captive account.',
        ],
        asideTitle: 'What the retainer is for',
        asideItems: [
          'Workflow tweaks and routing changes.',
          'Technical troubleshooting and issue resolution.',
          'Platform access so calls, leads, transcripts, and recordings stay easy to review.',
        ],
      },
      {
        eyebrow: 'BYO-API',
        title: 'Bring-your-own-API pricing keeps usage honest and visible.',
        intro:
          'This is one of the biggest differences between BishopTech Voice and a high-retainer agency model.',
        paragraphs: [
          'During onboarding, BishopTech can help the client set up the API side of the stack so the system runs on the client’s own usage footprint. That means model costs, token costs, voice costs, and telephony usage stay much closer to the actual consumption of the system. If the business has a slow month, usage stays light. If the business grows, usage grows with it. That is how a software-powered voice system should behave financially. The cost should track the operation, not the agency’s target margin.',
          'This also protects the client from one of the most frustrating patterns in this category: being billed an inflated flat number without any visibility into what the system really consumed. BYO-API pricing removes that fog. The client can see that the usage belongs to the system and not to someone else’s resale model. That is a healthier way to adopt a new technology, especially in a market that is still taking shape. It gives the buyer room to grow into the category while keeping the economics clear.',
        ],
        asideTitle: 'Why BYO-API matters',
        asideItems: [
          'You pay for the usage your business creates.',
          'The operating cost stays visible instead of being buried in an agency invoice.',
          'It becomes easier to forecast and scale because the cost model is cleaner.',
        ],
      },
      {
        eyebrow: 'The comparison',
        title: 'The cheaper model is not the weaker model. It is the more honest one.',
        intro:
          'A fair pricing model does not make the implementation less serious. It makes the billing match the work.',
        paragraphs: [
          'Agencies often position high recurring fees as proof of sophistication. In reality, the sophistication should show up in the implementation quality, the workflow design, the reporting, and the stability of the system. The client should be able to hear the assistant, follow the logic, and understand the spend. If a vendor needs a large ongoing retainer to make the value feel real, the model is carrying too much of the sales burden. Good implementation does not need a bloated wrapper to justify itself.',
          'That is the practical case for BishopTech Voice. Charge for the setup because setup matters. Keep ongoing management low because the support should be efficient. Let usage stay on a per-token and per-API basis because that is how the technology actually behaves. That gives businesses a realistic way to adopt AI voice while the category is still on its early legs. They get the upside of moving now without being punished by a cost structure that was built to maximize agency extraction instead of long-term trust.',
        ],
        asideTitle: 'The short version',
        asideItems: [
          'One-time setup for real launch work.',
          '$99 monthly for support, workflow help, and platform access.',
          'Usage billed on the stack you actually run, not on agency imagination.',
        ],
      },
    ],
    ctaTitle: 'Pay for the build once. Pay for usage as you use it.',
    ctaBody:
      'That is a better deal for a business entering AI voice now. It keeps the rollout serious, the support available, and the long-term cost attached to reality instead of agency bloat.',
  },
  {
    slug: '24-hour-voice-ai-onboarding',
    eyebrow: 'Authority page',
    title: 'How BishopTech can usually launch a voice agent stack within 24 hours.',
    description:
      'A practical look at the BishopTech Voice onboarding model: kickoff call, BYO-API setup, workflow mapping, voice agent configuration, testing, and a fast launch path in roughly 24 hours for most accounts.',
    summary:
      'Most businesses do not need a long, expensive rollout to get voice AI live. If the offer is clear and the call flow is straightforward, BishopTech can usually scope, set up, test, and launch the stack within about 24 hours while keeping usage on a BYO-API basis.',
    pills: ['24-hour onboarding', 'Fast launch', 'BYO-API setup', 'Live within a day in most cases'],
    sellingPoints: [
      'The onboarding starts with a real strategy call, not a self-serve form.',
      'Most launches can move from approval to live stack inside roughly 24 hours.',
      'BishopTech sets up the BYO-API structure so usage stays tied to the client’s actual consumption.',
      'The monthly retainer starts after launch and stays focused on support, workflows, and platform access.',
    ],
    sections: [
      {
        eyebrow: 'Start here',
        title: 'Most businesses do not need a six-week project plan to get value from voice AI.',
        intro:
          'Long timelines often come from bloated process, not from technical necessity.',
        paragraphs: [
          'If a business has a clear offer, a usable phone flow, and a reasonable sense of what the assistant should handle, the setup can move quickly. The work still has to be done properly. Someone has to scope the call paths, configure the assistant roles, wire the reporting, and test the behavior. But that work is not the same as a traditional enterprise transformation project. For many small and midsize businesses, it is a focused implementation job with a clear launch target. That is why BishopTech can usually move much faster than an agency model that stretches every phase into another line item.',
          'The other reason onboarding can move fast is that the system is being built around practical outcomes, not speculative complexity. The goal is not to architect the most elaborate voice environment possible. The goal is to get the right inbound, outbound, and handoff behavior live so the business can start capturing calls, qualifying leads, and handling repetitive traffic. Speed comes from clarity. If the use case is understood, the rollout should feel like a disciplined sprint rather than a consulting marathon.',
        ],
        asideTitle: 'What helps the timeline',
        asideItems: [
          'A clear business offer and phone objective.',
          'Basic website and GBP context to shape the prompt and positioning.',
          'Quick client approval on the workflow and voice direction.',
        ],
      },
      {
        eyebrow: 'The first day',
        title: 'The 24-hour model is built around one kickoff, one build window, and one launch path.',
        intro:
          'In most cases the work can move in a tight sequence once the strategy call is done.',
        paragraphs: [
          'The first step is the kickoff call. That is where BishopTech learns the real business context: what the company sells, what kind of calls are coming in, what should be handled automatically, when a handoff should happen, and what success actually looks like. That conversation matters because it keeps the rollout grounded in real operations instead of generic AI language. Once that is clear, the system can be built around the business instead of forcing the business to adapt to a canned script.',
          'From there, the build window is straightforward. The workspace is provisioned, the assistants are created, the routing is configured, the dashboard access is prepared, and the workflow map is shaped for the account. If the client is using an inbound-only setup, that can move especially fast. If the account needs outbound campaigns and a specialist handoff layer, it adds some structure, but it is still a contained job. Once the call flow is tested and the logic is clean, the stack can be launched without dragging the client through a long waiting period that mostly exists to make the service feel larger than it is.',
        ],
        asideTitle: 'What happens in the build window',
        asideItems: [
          'Assistant creation and role scoping.',
          'Prompt and workflow setup.',
          'Dashboard access, number assignment, and launch testing.',
        ],
      },
      {
        eyebrow: 'BYO-API setup',
        title: 'Bring-your-own-API is part of onboarding because it protects the client after launch.',
        intro:
          'The onboarding is not just about getting the assistant live. It is about making sure the long-term cost model stays sane.',
        paragraphs: [
          'BishopTech can help the client get the API side set up during onboarding so the usage lives where it should live. That matters because it keeps the operating cost clean from the beginning. The business is not forced into a resale model where usage disappears inside a larger agency invoice. Instead, the stack is structured so model and token costs stay connected to the client’s own usage footprint. That gives the business a far better understanding of what the system actually costs to run.',
          'This is especially important in a market that still feels new. When buyers are testing a category, they need a clean line between implementation cost, monthly support cost, and operating usage. Otherwise they cannot tell whether the system is really working financially. Handling the BYO-API setup during onboarding removes that confusion early. The client starts with the right economic foundation instead of having to unwind a murky billing structure later.',
        ],
        asideTitle: 'Why do it up front',
        asideItems: [
          'It keeps per-token and per-call usage visible from day one.',
          'It avoids the resale fog common in agency offers.',
          'It gives the client cleaner numbers when they start measuring ROI.',
        ],
      },
      {
        eyebrow: 'After launch',
        title: 'The monthly retainer starts after the hard part is done.',
        intro:
          'That is why the ongoing fee can stay lean instead of behaving like a second setup fee every month.',
        paragraphs: [
          'Once the stack is live, the role of monthly management becomes very specific. It is there to cover workflow setups and refinements, technical issues, and access to the BishopTech Voice platform. It is not there to re-sell the launch work forever. The system has already been scoped and built. What the client needs now is a reliable support layer, not a bloated consulting wrapper around a product that is already running.',
          'This distinction is important because it keeps the relationship practical. The client knows what the monthly fee is for. BishopTech knows what is being supported. And the usage stays on the client side of the ledger where it belongs. That is a much healthier arrangement for a fast-launch product. The business gets a quick implementation path and a stable support path without feeling like it has signed up for another oversized service contract just to keep the assistant available.',
        ],
        asideTitle: 'What the retainer covers',
        asideItems: [
          'Workflow adjustments and small operational changes.',
          'Technical troubleshooting when something breaks or needs tuning.',
          'Platform access so the client can review leads, transcripts, recordings, and results.',
        ],
      },
      {
        eyebrow: 'What the promise really means',
        title: 'A 24-hour onboarding promise is not about rushing. It is about removing wasted motion.',
        intro:
          'BishopTech moves quickly by cutting delay, not by cutting corners.',
        paragraphs: [
          'There are always edge cases. A business with a complicated routing tree, unusual compliance needs, or a heavily branched workflow may need more time. But most small and midsize accounts do not need that kind of delay. They need someone who can make decisions, configure the system, test the logic, and ship. That is the operating model here. Move fast where the work is clear. Slow down only where the business actually needs more caution. That is how you get to a fast launch without turning the experience into chaos.',
          'For the client, the value is simple. You can book the call, approve the build, get the APIs configured properly, and usually be live within about a day. You are not waiting around while an agency stretches the timeline to justify a larger invoice. You are getting a serious implementation partner, a usable platform, and a launch process that respects the fact that most businesses want results quickly when the opportunity is obvious.',
        ],
        asideTitle: 'The end result',
        asideItems: [
          'A fast path from approval to live assistant behavior.',
          'A cleaner cost model from day one.',
          'A support structure that starts after launch instead of replacing launch with delay.',
        ],
      },
    ],
    ctaTitle: 'If the use case is clear, the stack should not take forever to launch.',
    ctaBody:
      'Book the strategy call, let BishopTech handle the build, and move into a BYO-API voice setup that can usually be live within about 24 hours for straightforward accounts.',
  },
];

export function getAuthorityPage(slug: string) {
  return authorityPages.find((page) => page.slug === slug);
}
