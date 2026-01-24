import Image from 'next/image';
import { Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-coco-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BB9AF7]/5 rounded-full blur-3xl" />
        <Image
          src="/brand/coco-paw.png"
          alt=""
          width={400}
          height={400}
          className="absolute top-20 right-10 opacity-5 rotate-12"
        />
        <Image
          src="/brand/coco-paw.png"
          alt=""
          width={300}
          height={300}
          className="absolute bottom-20 left-10 opacity-5 -rotate-12"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Mascot */}
        <div className="mb-8 animate-float">
          <Image
            src="/brand/coco.png"
            alt="Coco - Your blockchain development assistant"
            width={180}
            height={180}
            className="mx-auto drop-shadow-2xl"
            priority
          />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coco-accent-subtle border border-coco-accent/30 mb-6 animate-fade-in">
          <Sparkles size={16} className="text-coco-accent" />
          <span className="text-sm text-coco-accent font-medium">Local-first blockchain development</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up">
          <span className="gradient-text">Everything in one place</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-coco-text-secondary max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Your blockchain development workstation. Organize chains, wallets, and contracts.
          Track every transaction. Built for EVM, Solana, and Aptos.
        </p>

        {/* CTA Button */}
        <div className="flex items-center justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <a href="#download" className="btn btn-primary text-lg px-10 py-4 glow-accent">
            Download for Free
          </a>
        </div>
      </div>
    </section>
  );
}
