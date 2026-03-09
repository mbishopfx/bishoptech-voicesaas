export default function AdminPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Admin Control Plane</h1>
      <p>Create tenants, launch assistants fast, manage templates/voices, and monitor outcomes.</p>
      <ol>
        <li>Provision tenant + client user</li>
        <li>Select vertical template + voice profile</li>
        <li>Create assistant via Vapi API</li>
        <li>Attach phone routing and booking webhooks</li>
      </ol>
      <p>Implementation notes: <code>/docs/ARCHITECTURE.md</code></p>
    </main>
  );
}
