export default function HelpPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Vapi AI Copilot</h1>
      <p>
        This assistant is powered by LangChain + xAI and seeded with Vapi docs context.
        Admins receive full operator guidance; clients get scoped DIY guidance + support handoff prompts.
      </p>
      <p>POST questions to <code>/api/assistant-chat</code>.</p>
    </main>
  );
}
