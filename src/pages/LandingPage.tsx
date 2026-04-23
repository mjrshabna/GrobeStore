import Navbar from '../components/Navbar';
import TopBanner from '../components/TopBanner';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import MainContent from '../components/MainContent';
import FooterSection from '../components/FooterSection';
import BottomNav from '../components/BottomNav';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <Navbar />
      <main className="flex-grow pb-32 md:pb-0">
        <TopBanner />
        <Hero />
        <Categories />
        <MainContent />
      </main>
      <FooterSection />
      <BottomNav />
    </div>
  );
}
