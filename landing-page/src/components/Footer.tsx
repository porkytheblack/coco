import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { GithubIcon, XIcon } from './icons/SocialIcons';
import { siteConfig } from '@/config/links';

export function Footer() {
  return (
    <footer className="py-12 border-t border-coco-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-4">
            <Image
              src="/brand/coco-paw.png"
              alt="Coco"
              width={32}
              height={32}
              className="opacity-60"
            />
            <span className="text-sm text-coco-text-tertiary">
              Built with ❤️ for web3 developers by web3 developers.
            </span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-coco-text-tertiary hover:text-coco-text-primary hover:bg-coco-bg-tertiary transition-all"
              aria-label="GitHub"
            >
              <GithubIcon className="w-5 h-5" />
            </a>
            {/* <a
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-coco-text-tertiary hover:text-coco-text-primary hover:bg-coco-bg-tertiary transition-all"
              aria-label="X (Twitter)"
            >
              <XIcon className="w-5 h-5" />
            </a> */}
          </div>
        </div>

        {/* Bottom Links */}
        <div className="mt-8 pt-8 border-t border-coco-border-subtle flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <Link href={siteConfig.pages.privacy} className="text-coco-text-tertiary hover:text-coco-accent transition-colors">
              Privacy Policy
            </Link>
            <Link href={siteConfig.pages.terms} className="text-coco-text-tertiary hover:text-coco-accent transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="text-sm text-coco-text-tertiary">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
