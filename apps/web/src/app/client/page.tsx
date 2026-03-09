export default function ClientPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Client Portal</h1>
      <p>Clients can safely edit approved assistant settings and view call/booking performance.</p>
      <ul>
        <li>Business info + hours + escalation routing</li>
        <li>System message + FAQ + objection handling snippets</li>
        <li>Booking and missed-call intake preferences</li>
      </ul>
      <p>Anything outside allowed scope is documented with guided instructions.</p>
    </main>
  );
}
