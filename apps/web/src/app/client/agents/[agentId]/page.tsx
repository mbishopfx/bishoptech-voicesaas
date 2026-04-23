import { redirect } from 'next/navigation';

type AgentRedirectPageProps = {
  params: Promise<{
    agentId: string;
  }>;
};

export default async function ClientAgentRedirectPage({ params }: AgentRedirectPageProps) {
  const { agentId } = await params;
  redirect(`/client/assistants/${agentId}`);
}
