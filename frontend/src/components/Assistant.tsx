import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowUp, Sparkles } from "lucide-react";
import { errorMessage, post } from "../lib/api";
import { Sheet, Spinner } from "./ui";

interface Message {
  from: "you" | "ai";
  text: string;
}

const suggestions = ["What's overdue?", "How much is unpaid?", "What did I spend this month?", "How are my automations doing?"];

export function AssistantButton({ className, compact }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const ask = useMutation({
    mutationFn: (question: string) => post<{ reply: string }>("/assistant", { question }),
    onSuccess: (d) => setMessages((m) => [...m, { from: "ai", text: d.reply }]),
    onError: (err) => setMessages((m) => [...m, { from: "ai", text: errorMessage(err) }]),
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ask.isPending]);

  function send(q: string) {
    const question = q.trim();
    if (!question || ask.isPending) return;
    setMessages((m) => [...m, { from: "you", text: question }]);
    setText("");
    ask.mutate(question);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask AutoFlow"
        className={clsx(
          "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-lilac text-sm font-semibold text-ink-950 transition hover:brightness-105",
          compact ? "w-10" : "px-4",
          className
        )}
      >
        <Sparkles className="h-4 w-4" />
        {!compact && "Ask AutoFlow"}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ask AutoFlow" description="Answers come from your own invoices, expenses and automations.">
        <div ref={listRef} className="max-h-[50vh] min-h-[180px] space-y-3 overflow-y-auto pb-2">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-white/12 px-3.5 py-2 text-sm text-mute transition hover:border-lilac hover:text-fog">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={clsx("flex", m.from === "you" ? "justify-end" : "justify-start")}>
              <p
                className={clsx(
                  "max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-3 text-[15px] leading-relaxed",
                  m.from === "you" ? "rounded-br-md bg-pink text-ink-950" : "rounded-bl-md bg-ink-750"
                )}
              >
                {m.text}
              </p>
            </div>
          ))}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-mute">
              <Spinner className="h-4 w-4" /> Looking at your numbers…
            </div>
          )}
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send(text);
          }}
          className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-ink-900 py-1.5 pl-5 pr-1.5 focus-within:border-lilac/60"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about your money…"
            aria-label="Your question"
            maxLength={500}
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] placeholder:text-dim focus:outline-none"
          />
          <button type="submit" disabled={!text.trim() || ask.isPending} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-lilac text-ink-950 disabled:opacity-40">
            <ArrowUp className="h-5 w-5" />
          </button>
        </form>
      </Sheet>
    </>
  );
}
