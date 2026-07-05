"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/search/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "border-[#e4e4e7] bg-[#fafafa] text-black"
          : "border-[#e4e4e7] bg-white text-black"
      )}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#71717a]">
        {isUser ? "You" : "Assistant"}
      </p>
      <p className="whitespace-pre-wrap">
        {message.content || (message.role === "assistant" ? "…" : "")}
      </p>
      {message.citations && message.citations.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.citations.map((citation) => (
            <Badge
              key={citation.index}
              variant="outline"
              className="rounded-full border-[#e4e4e7] bg-[#fafafa] px-2.5 py-0.5 text-xs font-medium text-black"
            >
              [{citation.index}] {citation.title}
              {citation.page ? ` p.${citation.page}` : ""}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ChatPageClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [libraryEmpty, setLibraryEmpty] = useState(false);

  useEffect(() => {
    fetch("/api/library")
      .then((response) => response.json())
      .then((data) => setLibraryEmpty((data.papers ?? []).length === 0))
      .catch(() => setLibraryEmpty(true));
  }, []);

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || loading) return;

    const userMessageId = createMessageId();
    const assistantMessageId = createMessageId();

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: message },
    ]);
    setLoading(true);

    let assistantContent = "";
    let citations: Citation[] = [];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event: "));
          const dataLine = lines.find((line) => line.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace("event: ", "");
          const data = JSON.parse(dataLine.replace("data: ", ""));

          if (event === "citations") {
            citations = data.citations ?? [];
          }
          if (event === "token") {
            assistantContent += data.token ?? "";
            setMessages((prev) =>
              prev.map((entry) =>
                entry.id === assistantMessageId
                  ? { ...entry, content: assistantContent, citations }
                  : entry
              )
            );
          }
          if (event === "error") {
            throw new Error(data.error ?? "Chat stream failed");
          }
        }
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Chat failed";
      toast.error(errMessage);
      setMessages((prev) =>
        prev.filter(
          (entry) =>
            entry.id === userMessageId ||
            (entry.id === assistantMessageId && entry.content.length > 0)
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-black">Chat</h1>
        <p className="text-sm text-[#71717a]">
          Ask questions over papers in your library. Answers cite retrieved chunks.
        </p>
      </header>

      {libraryEmpty ? (
        <div className="rounded-lg border border-dashed border-[#e4e4e7] bg-white p-8 text-center">
          <p className="text-sm text-[#71717a]">
            Search and add papers to your library before chatting.
          </p>
        </div>
      ) : (
        <div className="flex h-[min(70vh,720px)] flex-col overflow-hidden rounded-lg border border-[#e4e4e7] bg-white">
          <div className="border-b border-[#e4e4e7] px-6 py-4">
            <h2 className="text-sm font-medium text-black">Research Q&amp;A</h2>
            <p className="mt-1 text-sm text-[#71717a]">
              Ask a question about your indexed papers.
            </p>
          </div>

          <div className="min-h-0 flex-1">
            <MessageScrollerProvider autoScroll scrollPreviousItemPeek={64}>
              <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport className="px-6 py-4">
                <MessageScrollerContent aria-busy={loading} className="gap-4">
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#71717a]">
                      Your conversation will appear here.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === "user"}
                      >
                        <ChatMessageBubble message={message} />
                      </MessageScrollerItem>
                    ))
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton direction="end" />
            </MessageScroller>
          </MessageScrollerProvider>
          </div>

          <form
            className="flex gap-2 border-t border-[#e4e4e7] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about methods, findings, comparisons..."
              rows={3}
              className="min-h-[88px] flex-1 resize-none rounded-xl border-[#e4e4e7] bg-white text-base shadow-none focus-visible:ring-black/10"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-12 self-end rounded-full bg-black px-5 text-white hover:bg-black/90"
            >
              {loading ? "Thinking..." : "Send"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
