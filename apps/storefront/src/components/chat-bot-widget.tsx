"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FAQ_TOPICS, type FaqTopic } from "@/data/faq-assistant-data";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      el.getAttribute("aria-hidden") !== "true" &&
      el.getClientRects().length > 0,
  );
}

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  link?:
    | {
        href: string;
        label: string;
      }
    | undefined;
};

export function ChatBotWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Вітаємо на вітрині ЛАЙФ! Я — помічник демонстраційного режиму. Оберіть тему нижче, щоб швидко дізнатися про платформу, каталог чи майстрів:",
    },
  ]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);

  // Auto-scroll messages respecting user's prefers-reduced-motion preference
  useEffect(() => {
    if (isOpen) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      messagesEndRef.current?.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }, [messages, isOpen]);

  // Accessibility: Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        if (openerRef.current && document.contains(openerRef.current)) {
          openerRef.current.focus();
        }
      }
      return;
    }

    wasOpenRef.current = true;
    const panel = panelRef.current;
    if (!panel) return;

    // Set initial focus to close button
    const initialFocusTimer = setTimeout(() => {
      const closeBtn = panel.querySelector<HTMLElement>(
        '[data-chatbot-close="true"]',
      );
      closeBtn?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusableElements(panel);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(initialFocusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTopic = (topic: FaqTopic) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: topic.question,
    };

    const botMsg: Message = {
      id: `bot-${Date.now() + 1}`,
      sender: "bot",
      text: topic.answer,
      link: topic.link,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "Діалог оновлено. Оберіть тему, яка вас цікавить:",
      },
    ]);
  };

  // Do not render floating chatbot on checkout funnel or internal pages to avoid CTA overlap
  if (
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/moderation") ||
    pathname?.startsWith("/vendor")
  ) {
    return null;
  }

  return (
    <aside aria-label="Помічник сайту" className="chatbot-root">
      {/* Popover dialog */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          id="faq-assistant-dialog"
          aria-modal="true"
          aria-labelledby="faq-assistant-title"
          className="chatbot-panel"
        >
          {/* Header */}
          <header className="chatbot-panel__header">
            <div className="chatbot-panel__title-group">
              <span className="chatbot-panel__icon" aria-hidden="true">
                💬
              </span>
              <div>
                <h2 id="faq-assistant-title" className="chatbot-panel__title">
                  Помічник вітрини
                </h2>
                <span className="chatbot-panel__badge">Демо-довідка</span>
              </div>
            </div>
            <button
              type="button"
              data-chatbot-close="true"
              onClick={() => setIsOpen(false)}
              aria-label="Закрити помічника"
              className="chatbot-panel__close-btn"
            >
              ✕
            </button>
          </header>

          {/* Messages body */}
          <div
            className="chatbot-panel__body"
            aria-live="polite"
            aria-atomic="false"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-msg chatbot-msg--${msg.sender}`}
              >
                <div className="chatbot-msg__bubble">
                  <p className="chatbot-msg__text">{msg.text}</p>
                  {msg.link && (
                    <div className="chatbot-msg__action">
                      <Link
                        href={msg.link.href}
                        onClick={() => setIsOpen(false)}
                        className="chatbot-msg__link"
                      >
                        {msg.link.label}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick FAQ Pills */}
          <div className="chatbot-panel__pills">
            <span className="chatbot-panel__pills-label">Часті питання:</span>
            <div className="chatbot-panel__pills-list">
              {FAQ_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleSelectTopic(topic)}
                  className="chatbot-pill-btn"
                >
                  {topic.question}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="chatbot-panel__footer">
            <button
              type="button"
              onClick={handleReset}
              className="chatbot-panel__reset-btn"
            >
              🔄 Очистити діалог
            </button>
            <span className="chatbot-panel__disclaimer">
              Без збору PII • Локальні дані
            </span>
          </footer>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        ref={openerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="faq-assistant-dialog"
        aria-label={
          isOpen ? "Закрити помічника вітрини" : "Відкрити помічника вітрини"
        }
        className={`chatbot-fab ${isOpen ? "chatbot-fab--open" : ""}`}
      >
        <span className="chatbot-fab__icon" aria-hidden="true">
          {isOpen ? "✕" : "💬"}
        </span>
        <span className="chatbot-fab__label">Довідка</span>
      </button>
    </aside>
  );
}
