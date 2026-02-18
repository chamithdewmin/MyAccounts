import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Sparkles, MessageCircle, Loader2, ChevronRight, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const AIInsights = () => {
  const { totals, settings } = useFinance();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const currency = settings?.currency || 'LKR';

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestions(null);
    try {
      const data = await api.ai.getSuggestions();
      setSuggestions(data.suggestions || '');
    } catch (err) {
      toast({
        title: 'Could not get suggestions',
        description: err?.message || 'Check that OPENAI_API_KEY is set in the server.',
        variant: 'destructive',
      });
      setSuggestions(null);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setAskLoading(true);
    setAnswer(null);
    try {
      const data = await api.ai.ask(q);
      const ans = data.answer || '';
      setAnswer(ans);
      setHistory((prev) => [...prev.slice(-9), { question: q, answer: ans }]);
    } catch (err) {
      toast({
        title: 'Could not get answer',
        description: err?.message || 'Check that OPENAI_API_KEY is set in the server.',
        variant: 'destructive',
      });
      setAnswer(null);
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>AI Insights - MyAccounts</title>
        <meta name="description" content="AI-powered financial analysis, suggestions, and Q&A from your data" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze your money in & out, get next-move suggestions, and ask questions about your finances.
          </p>
        </div>

        {/* Financial snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-secondary p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cash in Hand</p>
              <p className="text-lg font-bold">{currency} {(totals?.cashInHand ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-secondary p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bank Balance</p>
              <p className="text-lg font-bold">{currency} {(totals?.bankBalance ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-secondary p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Profit (This Month)</p>
              <p className="text-lg font-bold">{currency} {(totals?.monthlyProfit ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-secondary p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Payments</p>
              <p className="text-lg font-bold">{currency} {(totals?.pendingPayments ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-card rounded-lg border border-secondary p-6">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-primary" />
            What&apos;s my next move?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Get AI suggestions based on your current cash, income, expenses, and pending invoices.
          </p>
          <Button onClick={fetchSuggestions} disabled={suggestionsLoading}>
            {suggestionsLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI suggestions
              </>
            )}
          </Button>
          {suggestions && (
            <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-secondary text-sm whitespace-pre-wrap">
              {suggestions}
            </div>
          )}
        </div>

        {/* Ask AI */}
        <div className="bg-card rounded-lg border border-secondary p-6">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Ask AI anything
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Ask questions about your money in, money out, profit, tax, or what to do next. Answers are based only on your data.
          </p>
          <form onSubmit={handleAsk} className="flex gap-2 flex-wrap">
            <Input
              placeholder="e.g. Why did my expenses go up this month? What should I do with pending invoices?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 min-w-[200px]"
              disabled={askLoading}
            />
            <Button type="submit" disabled={askLoading || !question.trim()}>
              {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
            </Button>
          </form>
          {answer !== null && (
            <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-secondary">
              <p className="text-xs font-medium text-muted-foreground mb-2">Answer</p>
              <p className="text-sm whitespace-pre-wrap">{answer}</p>
            </div>
          )}
          {history.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Previous Q&A</p>
              {history.slice(-3).reverse().map((item, i) => (
                <div key={i} className="p-3 rounded-lg border border-secondary bg-background/50 space-y-1">
                  <p className="text-sm font-medium text-foreground">Q: {item.question}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">A: {item.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIInsights;
