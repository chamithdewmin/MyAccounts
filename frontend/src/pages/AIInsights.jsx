import { Send, Trash2 } from 'lucide-react';

const QUICK_PROMPTS = [
  'What are my top expenses this month?',
  'How is my profit trending?',
  'Which clients owe me money?',
  'How can I reduce my expenses?',
  'What was my best income month?',
  'Give me a cash flow summary',
];

const TypingDots = () => (
  <span className="inline-flex items-center gap-1 px-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
      />
    ))}
  </span>
);

const AIAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
    <Sparkles className="w-3.5 h-3.5 text-white" />
  </div>
);

const AIInsights = () => {
  const { totals, settings } = useFinance();
  const { toast } = useToast();
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  const currency = settings?.currency || 'LKR';
  const isLoading = suggestionsLoading || askLoading;

  const scrollToBottom = () => {
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
    }, 80);
  };

  useEffect(() => { scrollToBottom(); }, [messages, askLoading, suggestionsLoading]);

  const now = () => new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: '✨ Get AI suggestions', time: now() }]);
    scrollToBottom();
    try {
      const data = await api.ai.getSuggestions();
      setMessages((prev) => [...prev, { role: 'ai', variant: 'suggestion', content: data.suggestions || '', time: now() }]);
    } catch (err) {
      toast({ title: 'Could not get suggestions', description: err?.message || 'Check your AI API key.', variant: 'destructive' });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAsk = async (q) => {
    const text = (q || question).trim();
    if (!text || isLoading) return;
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: text, time: now() }]);
    setAskLoading(true);
    scrollToBottom();
    try {
      const data = await api.ai.ask(text);
      setMessages((prev) => [...prev, { role: 'ai', variant: 'answer', content: data.answer || '', time: now() }]);
    } catch (err) {
      toast({ title: 'Could not get answer', description: err?.message || 'Check your AI API key.', variant: 'destructive' });
    } finally {
      setAskLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); handleAsk(); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };

  return (
    <>
      <Helmet>
        <title>AI Insights - LogozoDev</title>
        <meta name="description" content="AI-powered financial analysis, suggestions, and Q&A from your data" />
      </Helmet>

      <div className="page-y-sm min-w-0 flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">AI Insights</h1>
              <p className="text-xs text-muted-foreground">Powered by your financial data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {suggestionsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="hidden sm:inline">Get AI suggestions</span>
              <span className="sm:hidden">Suggest</span>
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 min-h-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
          {/* Messages */}
          <div ref={threadRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Ask me anything about your finances</p>
                  <p className="text-sm text-muted-foreground mt-1">I only use your own data to answer.</p>
                </div>
                {/* Quick prompt chips */}
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleAsk(p)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary/50 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'ai' && <AIAvatar />}
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                    U
                  </div>
                )}
                <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.variant === 'suggestion' && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Suggestions</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : msg.variant === 'suggestion'
                        ? 'bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 text-foreground rounded-tl-sm'
                        : 'bg-secondary/60 border border-border text-foreground rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">{msg.time}</span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {(askLoading || suggestionsLoading) && (
              <div className="flex gap-2.5">
                <AIAvatar />
                <div className="bg-secondary/60 border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 border-t border-border p-3 sm:p-4 bg-card/80">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask about your profit, expenses, clients…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 min-w-0 resize-none rounded-xl border border-border bg-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all max-h-32 disabled:opacity-60"
                style={{ lineHeight: '1.5' }}
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white flex-shrink-0 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIInsights;
