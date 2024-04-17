import OpenAI from "openai";
import type { AugmentedLaunch, Launch, Maker } from "./index";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to create a personalized Product Hunt comment
async function createProductHuntComment(launch: Launch): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: "system",
                content:
`# Instructions
- Create a personalized Product Hunt comment for their product launch
- Congradulate the founder(s) on their launch
- Ask an engaging question if suitable
- Don't wrap your response in quotes
- Don't use emojis or hashtags
- Don't say we use their tool or want to collaborate
- Don't write a cringey or superfluous comment

# Context
I am also a founder with an upcoming launch on product hunt, called SiteForge, an AI powered website generation tool (wireframing, sitemap generation, SEO optimised branded content generation)`
            },
            {
                role: 'user',
                content:
`Product Title: ${launch.title}
Tagline: ${launch.tagline}
Description: ${launch.description}
Categories: ${launch.categories.join(', ')}
Maker Comment: ${launch.maker_comment || 'No maker comment available'}
Makers:
${launch.product?.makers.map(maker => `
${maker.name}
${maker.bio || 'No bio available'}
`).join('\n')}`
            }
        ]

    });

    return response.choices[0].message.content!
}

// Function to generate a personalized Twitter DM
async function generateTwitterDM(maker: Maker, launch: Launch): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: "system",
                content:
`# Instructions
- Create a personalized Twitter direct message for the founder of this product hunt launch, with the goal of getting their support on our upcoming launch in 2-3 weeks (SiteForge)
- Personalise the message to the maker and the launch
- Do not use emojis, hash tags
- Do not say we use their tool, or "want to collaborate"
- Your response should not be wrapped in quotes
- Use the example generic DM as a reference of the tone and style we want, but don't copy it and make sure it's personalised.
- Explain that the message is from the founder of SiteForge who recently upvoted their product and is now reaching out to request support for their upcoming launch on Product Hunt.

# Context
I am also a founder with an upcoming launch on product hunt, called SiteForge, an AI powered website generation tool
(wireframing, sitemap generation, SEO optimised branded content generation) and would like their support on our upcoming launch in 2-3 weeks

My name is Albert, and I'm the founder of https://siteforge.io

# Example Generic DM
Hey there [Name]!

Congrats your Product Hunt launch, I supported it with an upvote and comment - I like what you're doing with XYZ and how you're doing XYZ.

I'm reaching out from SiteForge; we're preparing for our own launch featuring AI-powered website planning, wireframing and content-writing tool

It would mean a lot to us to have your support when we launch in the coming weeks.

Can we count on your vote? I'll make sure to send you a reminder link on our launch day!`
            },
            {
                role: 'user',
                content:
`Maker's Name: ${maker.name}
Maker's Bio: ${maker.bio || 'No bio available'}
Product Title: ${launch.title}
Tagline: ${launch.tagline}
Description: ${launch.description}
Their maker comment: ${launch.maker_comment || 'No maker comment available'}`
            }
        ]
    });

    return response.choices[0].message.content!
}


const launch: Launch = {
    "launch_url": "https://www.producthunt.com/posts/lateron-email",
    "maker_comment": "Hello, everyone! 👋\n\nThank you for supporting us. I'm back again with something new. Please welcome, LaterOn.email ✉️ 🕒\n\nThis is a distraction-free reading experience platform for newsletters without flooding your inbox. You can subscribe to as many newsletters as you want, and we will be a buffer to collect; summarize; and forward them to you one email per week or month. LaterOn also has an AI companion to ask anything about the newsletter content.\n\nPlease don't hesitate to contact us at hi@lateron.email",
    "tagline": "Let's make a newsletter sexy again",
    "title": "LaterOn.email",
    "description": "LaterOn works as a buffer between you and the newsletters you subscribed to. You can subscribe to as many newsletters as you want with @lateron.email, and we will aggregate, summarize, and forward them to you in a single email per week or month.",
    "product": {
        "product_url": "https://www.producthunt.com/products/lateron-email",
        "website_url": "https://lateron.email?ref=producthunt",
        "makers": [
            {
                "founder_url": "https://www.producthunt.com/@mgilangjanuar",
                "name": "M Gilang Januar",
                "bio": "Solopreneur",
                "founder_twitter": "https://twitter.com/mgilangjanuar",
            }
        ]
    },
    "day_rank": "#7",
    "categories": [
        "Email",
        "Newsletters",
        "Artificial Intelligence"
    ],
    // "generated_comment": null,
    // "sent_comment": false,
    // "sent_twitter_dm": false
}

async function update_launch_generations(launch: AugmentedLaunch) {
    if(!launch.generated_comment) launch.generated_comment = await createProductHuntComment(launch)
    for (let maker of launch?.product?.makers || []) {
        if(!maker.twitter_dm_pre_launch) maker.twitter_dm_pre_launch = await generateTwitterDM(maker, launch)
    }
}

async function process_all_launches() {
    const launches = await Bun.file("launches.json", { type: "application/json" }).json() as Record<string, AugmentedLaunch>

    const launches_array = Object.values(launches)

    await Promise.all(launches_array.map(launch => update_launch_generations(launch)))

    await Bun.write("launches.json", JSON.stringify(launches, null, 4))
}

await process_all_launches()