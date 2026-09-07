import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, ArrowRight, Loader2 } from 'lucide-react';
import type { AITool, Category } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  recommendations?: AITool[];
}

interface AIAssistantProps {
  tools: AITool[];
  categories: Category[];
  onAuthRequired: () => void;
}

/**
 * Lightweight keyword-based recommendation engine.
 * Matches user intent against tool names, descriptions, tags, and categories.
 */
function recommendTools(query: string, tools: AITool[], limit = 4): AITool[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  // Intent keywords → category slug mapping
  const intentMap: Record<string, string[]> = {
    'image': ['image-art', 'generative-ai'],
    'picture': ['image-art'],
    'art': ['image-art', 'design-ui'],
    'photo': ['image-art'],
    'video': ['video-animation'],
    'movie': ['video-animation'],
    'film': ['video-animation'],
    'music': ['audio-music'],
    'song': ['audio-music'],
    'audio': ['audio-music'],
    'voice': ['audio-music'],
    'sound': ['audio-music'],
    'code': ['code-development'],
    'coding': ['code-development'],
    'program': ['code-development'],
    'developer': ['code-development'],
    'app': ['code-development', 'automation-agents'],
    'website': ['code-development'],
    'write': ['writing-content'],
    'writing': ['writing-content'],
    'content': ['writing-content', 'marketing-seo'],
    'blog': ['writing-content', 'marketing-seo'],
    'copy': ['writing-content', 'marketing-seo'],
    'email': ['writing-content', 'marketing-seo', 'productivity'],
    'translate': ['translation-language'],
    'translation': ['translation-language'],
    'language': ['translation-language'],
    'research': ['research-analysis'],
    'search': ['research-analysis'],
    'study': ['education-learning', 'research-analysis'],
    'learn': ['education-learning'],
    'education': ['education-learning'],
    'teach': ['education-learning'],
    'student': ['education-learning'],
    'design': ['design-ui'],
    'ui': ['design-ui'],
    'logo': ['design-ui', 'image-art'],
    'presentation': ['productivity'],
    'slides': ['productivity'],
    'marketing': ['marketing-seo'],
    'seo': ['marketing-seo'],
    'social': ['marketing-seo'],
    'business': ['business-finance'],
    'finance': ['business-finance'],
    'data': ['business-finance', 'research-analysis'],
    'analytics': ['business-finance', 'research-analysis'],
    'health': ['health-wellness'],
    'fitness': ['health-wellness'],
    'mental': ['health-wellness'],
    'meditation': ['health-wellness'],
    'food': ['food-recipes'],
    'recipe': ['food-recipes'],
    'cooking': ['food-recipes'],
    'meal': ['food-recipes'],
    'game': ['gaming-entertainment'],
    'gaming': ['gaming-entertainment'],
    '3d': ['3d-modeling'],
    'model': ['3d-modeling'],
    'automate': ['automation-agents'],
    'automation': ['automation-agents'],
    'agent': ['automation-agents'],
    'workflow': ['automation-agents'],
    'chatbot': ['chatbots-assistants'],
    'chat': ['chatbots-assistants'],
    'assistant': ['chatbots-assistants'],
    'platform': ['ai-platforms'],
    'api': ['ai-platforms'],
    'productivity': ['productivity'],
    'notes': ['productivity'],
    'meeting': ['productivity'],
    'schedule': ['productivity'],
  };

  // Find matching category slugs from intent
  const matchedSlugs = new Set<string>();
  for (const [keyword, slugs] of Object.entries(intentMap)) {
    if (q.includes(keyword)) {
      slugs.forEach((s) => matchedSlugs.add(s));
    }
  }

  // Score each tool
  const scored = tools.map((tool) => {
    let score = 0;
    const toolName = tool.name.toLowerCase();
    const toolDesc = tool.description.toLowerCase();
    const toolTags = tool.tags.map((t) => t.toLowerCase());
    const toolCat = tool.category?.slug ?? '';

    // Category match (high weight)
    if (matchedSlugs.has(toolCat)) score += 50;

    // Direct name match
    if (toolName.includes(q)) score += 40;
    if (q.includes(toolName)) score += 40;

    // Keyword matches in description
    for (const word of words) {
      if (toolDesc.includes(word)) score += 5;
      if (toolTags.some((t) => t.includes(word))) score += 8;
      if (toolName.includes(word)) score += 10;
    }

    // Popularity boost
    score += Math.min(tool.popularity / 10, 10);

    // Featured boost
    if (tool.is_featured) score += 5;

    return { tool, score };
  });

  return scored
    .filter((s) => s.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.tool);
}

function generateResponse(query: string, recs: AITool[]): string {
  if (recs.length === 0) {
    return "I couldn't find a specific match for that. Try describing what you'd like to do — for example, 'I need to generate images', 'help me write code', or 'I want to create a video'.";
  }

  const leadins = [
    `Based on what you're looking for, here are ${recs.length} AI tools I'd recommend:`,
    `Here are the best AI tools for that:`,
    `These ${recs.length} tools are a great fit for your needs:`,
  ];
  return leadins[Math.floor(Math.random() * leadins.length)];
}

export function AIAssistant({ tools, categories, onAuthRequired: _onAuthRequired }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi! I'm your AI guide. Tell me what you want to do and I'll recommend the best AI tools for it. For example: 'I need to generate realistic images' or 'help me write marketing copy'.",
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = () => {
    if (!input.trim() || thinking) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    // Simulate thinking delay for better UX
    setTimeout(() => {
      const recs = recommendTools(input, tools);
      const text = generateResponse(input, recs);
      setMessages((prev) => [...prev, { role: 'assistant', text, recommendations: recs }]);
      setThinking(false);
    }, 800);
  };

  const quickPrompts = [
    'Generate realistic images',
    'Help me write code',
    'Create a video',
    'Write marketing copy',
    'Translate languages',
    'Build a website',
  ];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-ink-800 hover:shadow-xl"
        >
          <Sparkles className="h-4 w-4" />
          AI Guide
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-[24rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink-900">AI Guide</h3>
                <p className="text-xs text-ink-400">Find the right AI tool</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-300 transition hover:text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-ink-900 text-white'
                        : 'bg-ink-50 text-ink-700'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Recommendations */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.recommendations.map((tool) => (
                      <a
                        key={tool.id}
                        href={tool.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 transition hover:border-ink-200 hover:shadow-sm"
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${tool.website_url}&sz=64`}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-md object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = '0';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ink-900">
                            {tool.name}
                          </div>
                          <div className="truncate text-xs text-ink-400">
                            {tool.category?.name}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-ink-900" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Quick prompts (only on first message) */}
            {messages.length === 1 && !thinking && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-ink-400">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInput(prompt);
                        setTimeout(() => {
                          const recs = recommendTools(prompt, tools);
                          setMessages((prev) => [
                            ...prev,
                            { role: 'user', text: prompt },
                            { role: 'assistant', text: generateResponse(prompt, recs), recommendations: recs },
                          ]);
                          setThinking(false);
                        }, 800);
                        setThinking(true);
                        setInput('');
                      }}
                      className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:border-ink-300 hover:bg-ink-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-ink-50 px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
                  <span className="text-sm text-ink-400">Finding the best tools...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-ink-100 p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Describe what you need..."
                className="flex-1 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-900 placeholder-ink-300 outline-none focus:border-ink-900"
              />
              <button
                onClick={send}
                disabled={!input.trim() || thinking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white transition hover:bg-ink-800 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
