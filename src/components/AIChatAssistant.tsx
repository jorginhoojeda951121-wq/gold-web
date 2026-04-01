import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, User, Bot, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function AIChatAssistant({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && messages.length === 0) {
      setMessages([{
        id: '1',
        text: "Hello! 👋 I'm your AI Shop Assistant. I can help you analyze your business data. Ask me about your sales, profit, stock, or outstanding payments!",
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [visible]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/report-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          // You could dynamically pass the current selectedLocation/company_id from context here
          company_id: 1, 
          location_id: 1, 
          user_id: 1 
        })
      });

      if (!response.ok) throw new Error("API Network Error");
      const data = await response.json();
      
      let replyText = data.response;
      if (!replyText && data.error) {
        replyText = "Error: " + data.error;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: replyText || "I couldn't process your request right now. Try again later.",
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("AI Assistant Fetch Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "Sorry, the AI backend is currently unreachable. Make sure the Node server is running on the correct port and the API is accessible.",
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  const quickSuggestions = [
    "Today Sales",
    "Profit",
    "Low Stock",
    "Top Items",
    "Outstanding",
    "Gold Stock",
    "Expenses",
    "Weekly Sales"
  ];

  return (
    <Card className="fixed bottom-20 right-6 w-80 md:w-96 h-[500px] shadow-2xl flex flex-col z-50 overflow-hidden border-blue-200">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center rounded-t-lg">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-yellow-300" />
          AI Shop Assistant
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20 rounded-full" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-2 bg-slate-50 border-b flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {quickSuggestions.map((s, i) => (
          <button 
            key={i}
            onClick={() => handleSend(s)}
            className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 max-w-[85%] ${m.isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.isUser ? 'bg-blue-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
              {m.isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div className={`p-3 rounded-2xl ${m.isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border rounded-tl-none shadow-sm'}`}>
              <p className="text-sm">{m.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 self-start">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div className="p-3 bg-white border rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t flex gap-2">
        <Input 
          className="flex-1"
          placeholder="Ask a question..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
        />
        <Button size="icon" onClick={() => handleSend(inputText)} disabled={!inputText.trim() || isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
