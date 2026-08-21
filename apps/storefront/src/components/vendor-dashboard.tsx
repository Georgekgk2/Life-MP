export function VendorDashboard() {
  return (
    <main
      className="section"
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "3rem 1rem",
      }}
    >
      <section
        aria-labelledby="vendor-dashboard-unavailable-title"
        style={{
          padding: "2rem 1.5rem",
          textAlign: "center",
          backgroundColor: "#fff",
          border: "1px solid var(--color-sand-200)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛡️</div>
        <h1
          id="vendor-dashboard-unavailable-title"
          style={{
            margin: "0 0 0.75rem",
            color: "var(--color-pine-900)",
            fontSize: "1.7rem",
          }}
        >
          Кабінет майстра недоступний
        </h1>
        <p
          style={{
            margin: "0 auto 1.5rem",
            maxWidth: "620px",
            color: "var(--color-ink-muted)",
            lineHeight: 1.6,
          }}
        >
          Для доступу потрібна автентифікація майстра та серверна перевірка
          дозволів. Дані кабінету будуть доступні після підключення захищеного
          API.
        </p>

        <aside
          role="status"
          style={{
            padding: "1rem 1.25rem",
            textAlign: "left",
            backgroundColor: "var(--color-sand-100)",
            border: "1px solid var(--color-sand-200)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-ink)",
            lineHeight: 1.6,
          }}
        >
          <strong>Безпечний режим:</strong> маршрут не завантажує дані з
          локального сховища браузера, не показує дані інших майстрів і не
          виконує жодних змін.
        </aside>
      </section>
    </main>
  );
}
