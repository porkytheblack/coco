'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface CocoLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

// Rotating phrases in Japanese, Korean, and English
const coderPhrases = [
  { ja: 'コーヒーは美味しかった？', ko: '커피 맛있었어?', en: 'How was your coffee?' },
  { ja: 'divは中央揃えにした？', ko: 'div 중앙 정렬했어?', en: 'Have you centered your div?' },
  { ja: '今日は何を作る？', ko: '오늘은 뭘 만들 거야?', en: 'What are you building today?' },
  { ja: 'ブロックチェーンを構築中', ko: '블록체인 구축 중', en: 'Building on the blockchain' },
  { ja: 'バグを見つけた？', ko: '버그 찾았어?', en: 'Found any bugs yet?' },
];

// Greeting phrases for when logo is clicked
const greetingPhrases = {
  ja: 'こんにちは！',
  ko: '안녕하세요!',
  en: 'Hello!',
};

type Language = 'ja' | 'ko' | 'en';

export function CocoLogo({ width = 120, height = 120, className }: CocoLogoProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ja');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingLanguage, setGreetingLanguage] = useState<Language>('ja');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const greetingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/coco/hi.mp3');
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Rotate through phrases and languages
  useEffect(() => {
    if (showGreeting) return; // Pause rotation when showing greeting

    const interval = setInterval(() => {
      setIsAnimatingOut(true);

      setTimeout(() => {
        // Rotate language first, then phrase when back to Japanese
        setCurrentLanguage((prev) => {
          if (prev === 'ja') return 'ko';
          if (prev === 'ko') return 'en';
          // When cycling back to Japanese, also change the phrase
          setCurrentPhraseIndex((idx) => (idx + 1) % coderPhrases.length);
          return 'ja';
        });
        setIsAnimatingOut(false);
      }, 300); // Half of animation duration
    }, 3333); // ~10 seconds for full cycle of 3 languages

    return () => clearInterval(interval);
  }, [showGreeting]);

  // Handle logo click
  const handleLogoClick = useCallback(() => {
    // Play sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed (likely due to autoplay policy)
      });
    }

    // Show greeting animation
    setShowGreeting(true);
    setGreetingLanguage('ja');

    // Clear any existing timeout
    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current);
    }

    // Cycle through greeting languages
    const cycleGreeting = (lang: Language, delay: number) => {
      greetingTimeoutRef.current = setTimeout(() => {
        if (lang === 'ja') {
          setGreetingLanguage('ko');
          cycleGreeting('ko', 1000);
        } else if (lang === 'ko') {
          setGreetingLanguage('en');
          cycleGreeting('en', 1000);
        } else {
          // End greeting, return to normal rotation
          setTimeout(() => {
            setShowGreeting(false);
          }, 1500);
        }
      }, delay);
    };

    cycleGreeting('ja', 1000);

    return () => {
      if (greetingTimeoutRef.current) {
        clearTimeout(greetingTimeoutRef.current);
      }
    };
  }, []);

  const currentPhrase = coderPhrases[currentPhraseIndex];
  const displayText = showGreeting
    ? greetingPhrases[greetingLanguage]
    : currentPhrase[currentLanguage];

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {/* Logo with hover and click effects */}
      <button
        onClick={handleLogoClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(
          'relative cursor-pointer transition-transform duration-300 focus:outline-none',
          isHovered && 'animate-pulse-slow'
        )}
        aria-label="Click to hear Coco say hi"
      >
        <Image
          src="/brand/coco.png"
          alt="Coco"
          width={width}
          height={height}
          className={clsx(
            'transition-all duration-300',
            isHovered && 'scale-105 drop-shadow-lg'
          )}
          priority
        />
      </button>

      {/* Rotating text */}
      <div className="h-8 mt-4 overflow-hidden">
        <p
          className={clsx(
            'text-sm text-coco-text-secondary transition-all duration-300 ease-in-out text-center',
            isAnimatingOut
              ? 'opacity-0 transform translate-y-2'
              : 'opacity-100 transform translate-y-0',
            showGreeting && 'text-coco-accent font-medium'
          )}
        >
          {displayText}
        </p>
      </div>

      {/* Custom pulse animation styles */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
