import { redirect } from 'next/navigation';

export default function PricingRedirect() {
  redirect('/marketing/pricing');
  return null;
}