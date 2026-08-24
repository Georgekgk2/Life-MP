"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/context/cart-context";
import { formatHryvnia } from "@/formatters";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

export function CartDrawer() {
  const {
    items,
    vendorGroups,
    totalItems,
    totalAmountUah,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const panelRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isCartOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        const opener = openerRef.current;
        openerRef.current = null;
        if (opener && document.contains(opener)) {
          window.requestAnimationFrame(() => opener.focus());
        }
      }
      return;
    }

    if (!wasOpenRef.current) {
      const activeElement = document.activeElement;
      openerRef.current =
        activeElement instanceof HTMLElement ? activeElement : null;
      wasOpenRef.current = true;
    }

    const panel = panelRef.current;
    const initialFocusFrame = window.requestAnimationFrame(() => {
      const initialFocus = panel?.querySelector<HTMLElement>(
        '[data-cart-initial-focus="true"]',
      );
      initialFocus?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
        return;
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const focusableElements = getFocusableElements(panel);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      } else if (!panel.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(initialFocusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, isCartOpen]);

  if (!isCartOpen) {
    return null;
  }

  return (
    <div
      className="cart-drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeCart();
        }
      }}
    >
      <aside className="cart-drawer-panel" ref={panelRef}>
        <header className="cart-drawer__header">
          <div className="cart-drawer__title">
            <h2 id="cart-drawer-title">Кошик покупок</h2>
            <span className="cart-drawer__count">{totalItems}</span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Закрити кошик"
            className="button button--icon cart-drawer__close"
            data-cart-initial-focus="true"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <div className="cart-drawer__empty-icon" aria-hidden="true">
                🧺
              </div>
              <h3>Ваш кошик порожній</h3>
              <p>
                Оберіть унікальні крафтові вироби від українських майстрів у
                каталозі.
              </p>
              <Link
                href="/catalog"
                onClick={closeCart}
                className="button button--primary"
              >
                Перейти до каталогу
              </Link>
            </div>
          ) : (
            vendorGroups.map((group) => (
              <section className="cart-drawer__vendor" key={group.vendorHandle}>
                <div className="cart-drawer__vendor-header">
                  <div className="cart-drawer__vendor-name">
                    <span aria-hidden="true">🌿</span>
                    <strong>{group.vendorName}</strong>
                  </div>
                  <span className="cart-drawer__vendor-note">
                    Пряма відправка
                  </span>
                </div>

                <div className="cart-drawer__items">
                  {group.items.map((item) => (
                    <div className="cart-drawer__item" key={item.id}>
                      <div className="cart-drawer__item-copy">
                        <Link
                          href={`/catalog/${item.categorySlug}/${item.slug}`}
                          onClick={closeCart}
                          className="cart-drawer__item-name"
                        >
                          {item.name}
                        </Link>
                        <span className="cart-drawer__item-price">
                          {formatHryvnia(item.priceUah)}
                        </span>
                      </div>

                      <div
                        className="cart-drawer__quantity"
                        aria-label="Кількість"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label={`Зменшити кількість ${item.name}`}
                          className="button button--icon button--square"
                        >
                          −
                        </button>
                        <span className="cart-drawer__quantity-value">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          aria-label={`Збільшити кількість ${item.name}`}
                          className="button button--icon button--square"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Видалити ${item.name}`}
                          className="button button--icon cart-drawer__remove"
                        >
                          <span aria-hidden="true">⌫</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-drawer__subtotal">
                  <span>Підсумок майстерні</span>
                  <strong>{formatHryvnia(group.subtotalUah)}</strong>
                </div>
              </section>
            ))
          )}
        </div>

        {items.length > 0 && (
          <footer className="cart-drawer__footer">
            <div className="cart-drawer__total">
              <span>Разом до сплати</span>
              <strong>{formatHryvnia(totalAmountUah)}</strong>
            </div>

            <div className="cart-drawer__footer-actions">
              <Link
                href="/checkout"
                onClick={closeCart}
                className="button button--primary cart-drawer__checkout"
              >
                Оформити замовлення <span aria-hidden="true">→</span>
              </Link>
              <button
                type="button"
                onClick={clearCart}
                title="Очистити кошик"
                className="button button--secondary"
              >
                Очистити
              </button>
            </div>

            <p className="cart-drawer__disclaimer">
              Чернетка кошика: серверне замовлення, оплата й доставка не
              створюються.
            </p>
          </footer>
        )}
      </aside>
    </div>
  );
}
