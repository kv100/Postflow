// Groq API (Llama 3.3 70B) - OpenAI-compatible REST API
// Free tier: 6000 req/day - more than enough for reply generation

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Crisis detection keywords - ALWAYS force human review
const CRISIS_KEYWORDS = [
  'суїцид', 'самогубств', 'не хочу жити', 'не бачу сенсу', 'хочу померти',
  'різати себе', 'самоповреждени', 'антидепресант', 'панічн.*атак',
  'suicide', 'kill myself', 'end it all', 'self-harm',
  'депресія', 'depression', 'не можу більше', "can't go on",
]

// Spam detection patterns
const SPAM_PATTERNS = [
  /follow.{0,5}follow/i,
  /check.{0,5}(my|bio)/i,
  /DM.{0,5}(me|for)/i,
  /crypto|bitcoin|казино|casino/i,
  /https?:\/\/(?!threads\.net|instagram\.com)/i,
]

function buildSystemPrompt(): string {
  const name = process.env.AI_PERSONA_NAME || 'the account owner'
  const description = process.env.AI_PERSONA_DESCRIPTION || 'a solo founder'
  const product = process.env.AI_PERSONA_PRODUCT || 'my product'
  const productDescription = process.env.AI_PERSONA_PRODUCT_DESCRIPTION || ''
  const tone = process.env.AI_PERSONA_TONE || 'friendly, honest, casual'
  const language = process.env.AI_PERSONA_LANGUAGE || 'detect'

  const languageRules = language === 'detect'
    ? `- Detect the language of the incoming message and reply in the same language.
- If the message is in a language you're unsure about, reply in English.`
    : `- Always reply in: ${language}`

  return `You are a reply assistant for a Threads/Instagram account. Your job is to draft replies that sound like they come from ${name} — ${description}.

## IDENTITY
- Name: ${name}
- Background: ${description}
- Tone: ${tone}
- Product: ${product}${productDescription ? ` — ${productDescription}` : ''}

## VOICE GUIDELINES
- Sound like a real person, not a brand or customer support bot.
- Be genuine, not corporate. Sound like a friend who happens to have a product.
- Vary your reply style — sometimes a one-liner, sometimes a short story.
- If someone jokes — match their energy. Be playful, not serious.
- If someone compliments you — deflect with humor, stay humble.
- If someone criticizes — don't be defensive. Acknowledge, share your perspective.

## LANGUAGE RULES
${languageRules}
- Short sentences. Max 1-3 sentences total.
- Do NOT use emojis unless the incoming message contains them. If it does, use max 1 emoji.

## REPLY RULES
1. Never start with greetings ("Hi!", "Thanks!"). Jump straight into substance.
2. Never use marketing clichés ("innovative", "game-changing", "life-changing")
3. Never be pushy or salesy
4. No signatures. Just the reply text.
5. Admit uncertainty: "Not sure if it'll work for you, but it helps me" > "This will definitely help"
6. Max reply length: 280 characters. Aim for 50-150 characters.
7. Do NOT invent features or statistics.
8. NEVER make medical claims if your product is health-related.
9. Personal experience > general facts
10. Sometimes ask a follow-up question to encourage engagement
11. READ THE PARENT POST CONTEXT (if provided) to understand what the comment is about.
12. If someone roasts you — be a good sport about it.

## ANTI-PATTERNS (NEVER use these)
- Generic agreement phrases ("Exactly!", "So true!", "Absolutely!")
- Starting by agreeing then expanding ("Exactly, and also...") — #1 AI pattern
- Filler phrases that add nothing ("I think that...", "It seems like...")
- Corporate speak ("We appreciate your feedback")

## OUTPUT FORMAT
Reply text only (no quotes, no formatting). Then on a new line:
[CONFIDENCE: 0.XX]

If the message is about crisis/mental health emergency:
[NEEDS_HUMAN_REVIEW]
Draft reply text
[CONFIDENCE: 0.00]

If spam/off-topic:
[SKIP]
[CONFIDENCE: 0.00]`
}

// Lazy-initialized prompt
let _systemPrompt: string | null = null
function getSystemPrompt(): string {
  if (!_systemPrompt) {
    _systemPrompt = buildSystemPrompt()
  }
  return _systemPrompt
}

export interface GeneratedReply {
  reply: string
  confidence: number
  reasoning: string
  category: 'green' | 'yellow' | 'red' | 'skip'
}

function detectCrisis(text: string): boolean {
  const lowerText = text.toLowerCase()
  return CRISIS_KEYWORDS.some(keyword => {
    if (keyword.includes('.*')) {
      return new RegExp(keyword, 'i').test(lowerText)
    }
    return lowerText.includes(keyword.toLowerCase())
  })
}

function detectSpam(text: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(text))
}

export async function generateReply(
  mentionContent: string,
  mentionAuthor: string,
  parentPostContent?: string
): Promise<GeneratedReply> {
  // Pre-check: crisis detection
  if (detectCrisis(mentionContent)) {
    return {
      reply: "Чую тебе. Це важливіше ніж будь-який застосунок. Лайфлайн Україна: 7333 (безкоштовно, цілодобово). Там є люди, які реально можуть допомогти.",
      confidence: 0.0,
      reasoning: 'Crisis keywords detected - requires human review',
      category: 'red',
    }
  }

  // Pre-check: spam detection
  if (detectSpam(mentionContent)) {
    return {
      reply: '',
      confidence: 0.0,
      reasoning: 'Spam detected - skip',
      category: 'skip',
    }
  }

  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set')
    }

    // Build user prompt with optional parent post context
    let userPrompt = ''
    if (parentPostContent) {
      userPrompt = `Reply to this Threads comment. The comment is under OUR post.\n\nOUR POST: "${parentPostContent}"\n\nCOMMENT by @${mentionAuthor}: "${mentionContent}"`
    } else {
      userPrompt = `Reply to this Threads comment:\n\nAuthor: @${mentionAuthor}\nMessage: "${mentionContent}"`
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Groq API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse response
    return parseAIResponse(content, mentionContent)
  } catch (error) {
    console.error('AI reply generation failed:', error)
    return {
      reply: '',
      confidence: 0.0,
      reasoning: `AI error: ${error instanceof Error ? error.message : 'Unknown'}`,
      category: 'red',
    }
  }
}

function parseAIResponse(content: string, originalMessage: string): GeneratedReply {
  const lines = content.trim().split('\n').filter(l => l.trim())

  // Check for [SKIP]
  if (lines.some(l => l.includes('[SKIP]'))) {
    return {
      reply: '',
      confidence: 0.0,
      reasoning: 'AI classified as spam/skip',
      category: 'skip',
    }
  }

  // Check for [NEEDS_HUMAN_REVIEW]
  const needsReview = lines.some(l => l.includes('[NEEDS_HUMAN_REVIEW]'))

  // Extract confidence
  let confidence = 0.7 // default
  const confidenceLine = lines.find(l => l.includes('[CONFIDENCE:'))
  if (confidenceLine) {
    const match = confidenceLine.match(/\[CONFIDENCE:\s*([\d.]+)\]/)
    if (match) {
      confidence = Math.min(1, Math.max(0, parseFloat(match[1])))
    }
  }

  // Force low confidence for crisis
  if (needsReview) {
    confidence = 0.0
  }

  // Extract reply text (everything except meta-lines)
  const replyLines = lines.filter(l =>
    !l.includes('[CONFIDENCE:') &&
    !l.includes('[SKIP]') &&
    !l.includes('[NEEDS_HUMAN_REVIEW]')
  )
  const reply = replyLines.join(' ').trim()

  // Determine category
  let category: 'green' | 'yellow' | 'red' | 'skip'
  if (needsReview || confidence < 0.5) {
    category = 'red'
  } else if (confidence >= 0.85) {
    category = 'green'
  } else {
    category = 'yellow'
  }

  return {
    reply: reply.substring(0, 500), // Safety limit
    confidence,
    reasoning: needsReview ? 'AI flagged for human review' : `AI confidence: ${confidence}`,
    category,
  }
}

// Check if reply should be auto-sent
// During learning phase (first 14 days), NEVER auto-send
export function shouldAutoSend(
  confidence: number,
  threshold: number = 0.85,
  learningPhase: boolean = true // Set to false after 14 days
): boolean {
  if (learningPhase) return false // 100% manual moderation during learning phase
  return confidence >= threshold
}

// Get random delay in minutes for human-like timing
export function getReplyDelay(commentAgeMinutes: number): number {
  const base = commentAgeMinutes < 60 ? 8 :
               commentAgeMinutes < 720 ? 15 : 30
  const jitter = Math.random() * base * 2
  const humanFactor = Math.random() < 0.15 ? base * 3 : 0 // 15% chance of "busy" delay
  return Math.round(base + jitter + humanFactor)
}
