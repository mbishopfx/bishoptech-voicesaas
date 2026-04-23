import { redirect } from 'next/navigation';

export default function ClientAgentsRedirectPage() {
  redirect('/client/assistants');
}
