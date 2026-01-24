import { Header, Hero, Features, AISection, Screenshots, Download, Footer } from '@/components';

export default function Home() {
  return (
    <main className="relative">
      <Header />
      <Hero />
      <Features />
      <AISection />
      <Screenshots />
      <Download />
      <Footer />
    </main>
  );
}
