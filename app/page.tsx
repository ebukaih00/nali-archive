import HeroSearch from '@/components/HeroSearch';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F7F5] flex flex-col items-center justify-start p-4 relative overflow-hidden">
      <HeroSearch />
    </main>
  );
}
