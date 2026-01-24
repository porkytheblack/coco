'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const screenshots = [
  {
    src: '/screenshots/home.png',
    title: 'Home Dashboard',
    description: 'See all your chains at a glance. Quick access to networks, wallets, and workspaces.',
  },
  {
    src: '/screenshots/workspace-view.png',
    title: 'Chain Overview',
    description: 'Manage wallets and workspaces for each chain. Everything organized in one view.',
  },
  {
    src: '/screenshots/wallet-view.png',
    title: 'Wallet Details',
    description: 'Full transaction history, balances, and quick actions. Send funds or request from faucets.',
  },
  {
    src: '/screenshots/abi-view.png',
    title: 'Contract Interface',
    description: 'Browse contract functions, create transactions, and interact with smart contracts directly.',
  },
  {
    src: '/screenshots/transaction-view.png',
    title: 'Transaction History',
    description: 'Every transaction saved with full context. Never lose track of what you deployed.',
  },
  {
    src: '/screenshots/choose-mainnet-or-testnet.png',
    title: 'Network Selection',
    description: 'Easily switch between mainnet and testnet for any supported chain.',
  },
];

export function Screenshots() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section id="screenshots" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-coco-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="section-title">
            See Coco in <span className="gradient-text">action</span>
          </h2>
          <p className="section-subtitle">
            A clean, intuitive interface designed for blockchain developers who value organization.
          </p>
        </div>

        {/* Screenshot Carousel */}
        <div className="relative">
          {/* Embla Viewport */}
          <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
            <div className="flex">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.src}
                  className="flex-[0_0_100%] min-w-0"
                >
                  <div className="relative aspect-[16/10] max-w-5xl mx-auto rounded-2xl overflow-hidden border border-coco-border-subtle shadow-2xl glow">
                    <Image
                      src={screenshot.src}
                      alt={screenshot.title}
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Overlay gradient at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-coco-bg-primary/90 to-transparent" />
                    {/* Caption */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-semibold text-coco-text-primary mb-1">
                        {screenshot.title}
                      </h3>
                      <p className="text-sm text-coco-text-secondary">
                        {screenshot.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-coco-bg-elevated/80 backdrop-blur border border-coco-border-subtle flex items-center justify-center text-coco-text-secondary hover:text-coco-text-primary hover:border-coco-accent transition-all z-10"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-coco-bg-elevated/80 backdrop-blur border border-coco-border-subtle flex items-center justify-center text-coco-text-secondary hover:text-coco-text-primary hover:border-coco-accent transition-all z-10"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Dot Navigation */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {screenshots.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-coco-accent scale-125'
                  : 'bg-coco-border-default hover:bg-coco-border-strong'
              }`}
            />
          ))}
        </div>

        {/* Thumbnails Row */}
        <div className="hidden lg:flex items-center justify-center gap-4 mt-8">
          {screenshots.map((screenshot, index) => (
            <button
              key={screenshot.src}
              onClick={() => scrollTo(index)}
              className={`relative w-32 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? 'border-coco-accent scale-105'
                  : 'border-coco-border-subtle hover:border-coco-border-default opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={screenshot.src}
                alt={screenshot.title}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
