import { createClient } from "@/utils/supabase/server";
import HeroSearch from '@/components/HeroSearch';
import Link from 'next/link';
import { Suspense } from 'react';
import { Globe2, Volume2, BookOpen, Users, Heart, ArrowRight, Database, BadgeCheck, HandHeart, Speech } from 'lucide-react';


export default async function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  const isSearchActive = !!searchParams.search || !!searchParams.name;

  // Fetch count
  const { count } = await supabase
    .from('names')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'verified');

  const totalCount = count || 0;
  const limit = 100;
  const maxOffset = totalCount > limit ? totalCount - limit : 0;
  const randomOffset = Math.floor(Math.random() * maxOffset);

  // Fetch random selection of names with origins to mix tribes
  const { data: randomNames } = await supabase
    .from('names')
    .select('name, origin')
    .eq('verification_status', 'verified')
    .range(randomOffset, randomOffset + limit - 1);

  const statsCount = count || 2847;

  // Logic to mix Igbo, Yoruba, and Hausa names
  const allFetched = (randomNames || []).filter(n => !/[?!\uFFFD]/.test(n.name));

  // Helper to get random items from array
  const getRandom = (arr: any[], n: number) =>
    arr.sort(() => Math.random() - 0.5).slice(0, n);

  const igbo = allFetched.filter(n => n.origin?.toLowerCase().includes('igbo'));
  const yoruba = allFetched.filter(n => n.origin?.toLowerCase().includes('yorub'));
  const hausa = allFetched.filter(n => n.origin?.toLowerCase().includes('hausa'));

  let selected: any[] = [];

  // Standard mix: 2 from each major tribe if possible
  selected = [
    ...selected,
    ...getRandom(igbo, 2),
    ...getRandom(yoruba, 2),
    ...getRandom(hausa, 2)
  ];

  // Fill remaining spots (to reach 6) with any other available names not yet selected
  const currentNames = new Set(selected.map(s => s.name));
  const remaining = allFetched.filter(n => !currentNames.has(n.name));

  if (selected.length < 6) {
    selected = [...selected, ...getRandom(remaining, 6 - selected.length)];
  }

  // Shuffle the final selection
  const popularNames = selected
    .map(n => n.name)
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[#F8F7F5] flex flex-col font-sans text-foreground overflow-x-hidden">
      {/* HEADER */}
      <header className="w-full flex justify-between items-center py-6 px-6 md:px-12 max-w-7xl mx-auto">
        <Link href="/" className="text-3xl font-serif font-bold text-[#4e3629]">
          Nali
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/contribute" className="px-5 py-2.5 rounded-full bg-white border border-[#E9E4DE] text-[#4e3629] text-sm font-medium hover:bg-[#F3EFEC] hover:border-[#D7CCC8] transition-colors">
            Become a contributor
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className={`flex flex-col items-center justify-center pt-12 pb-16 px-4 md:px-6 w-full max-w-5xl mx-auto text-center relative ${isSearchActive ? 'pt-8' : ''}`}>


        {/* Hero Title */}
        <h1 className="text-3xl md:text-5xl font-serif font-medium text-[#2C2420] mb-12 leading-tight pointer-events-none">
          Learn the correct pronunciation of Nigerian names
        </h1>



        {/* Stats Badge - Removed as requested to be replaced by marquee line */}

        {/* Search Component */}
        <div className="w-full pointer-events-auto relative z-20">
          <Suspense fallback={<div className="h-16 w-full max-w-[680px] bg-white/50 rounded-xl animate-pulse mx-auto opacity-50"></div>}>
            <HeroSearch popularNames={popularNames} />
          </Suspense>
        </div>

        {/* Marquee Section (Only show if not searching interactions are active that might be distracted, but usually fine to keep) */}
      </section>



      {/* ... Rest of sections ... */}


      {/* FEATURES SECTION & CTA - Hidden when searching */}
      {!isSearchActive && (
        <>
          <section className="py-16 md:py-24 px-6 md:px-12 w-full max-w-7xl mx-auto border-t border-[#E9E4DE]">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-serif text-[#2C2420] font-medium mb-4">Preserving the sound of our identity</h2>
              <p className="text-[#4e3629] max-w-xl mx-auto">We capture the authentic rhythm of every name, ensuring our heritage is spoken correctly for generations to come.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 bg-white rounded-2xl border border-[#F0EBE6] flex flex-col items-start hover:border-[#4e3629] transition-colors">
                <div className="w-12 h-12 bg-[#F5F2EF] rounded-xl flex items-center justify-center mb-6 text-[#4e3629]">
                  <Volume2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-medium text-[#2C2420] mb-3">Authentic Tones</h3>
                <p className="text-[#4e3629] text-sm leading-relaxed">Listen to names articulated with native tones, helping you master the correct pitch and rhythm of distinct Nigerian names.</p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 bg-white rounded-2xl border border-[#F0EBE6] flex flex-col items-start hover:border-[#4e3629] transition-colors">
                <div className="w-12 h-12 bg-[#F5F2EF] rounded-xl flex items-center justify-center mb-6 text-[#4e3629]">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-medium text-[#2C2420] mb-3">8,600+ Names</h3>
                <p className="text-[#4e3629] text-sm leading-relaxed">Dive into a rich library of names and access authentic audio pronunciations that preserve our heritage.</p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 bg-white rounded-2xl border border-[#F0EBE6] flex flex-col items-start hover:border-[#4e3629] transition-colors">
                <div className="w-12 h-12 bg-[#F5F2EF] rounded-xl flex items-center justify-center mb-6 text-[#4e3629]">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-medium text-[#2C2420] mb-3">Expert Verified</h3>
                <p className="text-[#4e3629] text-sm leading-relaxed"> Every name is verified by our cultural experts to ensure it is pronounced properly.</p>
              </div>
            </div>
          </section>

          {/* CTA SECTION */}
          <section className="py-12 md:py-16 px-6 md:px-12 w-full max-w-5xl mx-auto text-center">
            <div className="bg-[#4e3629] rounded-[40px] p-10 md:p-16 relative overflow-hidden shadow-xl shadow-[#4e3629]/10">
              <div className="max-w-2xl mx-auto relative z-10 text-white">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                  <HandHeart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-4xl font-serif font-medium mb-4">Become a voice for your culture</h2>
                <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed font-sans">
                  Nali is built by the community, for the community. If you're a native speaker, your voice can help preserve our heritage for future generations.
                </p>
                <Link
                  href="/contribute"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#4e3629] rounded-full font-bold text-base hover:bg-[#F3EFEC] transition-all active:scale-95 group"
                >
                  Become a Contributor
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* FOOTER */}
      <footer className="w-full py-10 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-t border-[#E9E4DE] mt-auto text-sm text-[#6B6661]">
        <div className="flex items-center gap-1.5">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-[#4e3629] fill-[#4e3629]" />
          <span>for preserving Nigerian heritage</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/about" className="hover:text-[#4e3629] transition-colors">About</Link>
          <Link href="/contribute" className="hover:text-[#4e3629] transition-colors">Contribute</Link>
          <Link href="/studio/library" className="hover:text-[#4e3629] transition-colors font-medium text-primary">Contributor Studio</Link>
        </div>
      </footer>
    </main>
  );
}
