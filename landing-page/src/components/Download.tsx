import Image from 'next/image';
import { AppleLogo, WindowsLogo, LinuxLogo } from './icons/OSIcons';
import { siteConfig } from '@/config/links';

const platforms = [
  {
    name: 'macOS',
    Icon: AppleLogo,
    description: 'Apple Silicon & Intel',
    downloadUrl: siteConfig.downloads.macos,
    available: true,
  },
  {
    name: 'Windows',
    Icon: WindowsLogo,
    description: 'Windows 10/11',
    downloadUrl: siteConfig.downloads.windows,
    available: true,
  },
  {
    name: 'Linux',
    Icon: LinuxLogo,
    description: 'AppImage & .deb',
    downloadUrl: siteConfig.downloads.linux,
    available: true,
  },
];

export function Download() {
  return (
    <section id="download" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-coco-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#BB9AF7]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Image
            src="/brand/coco.png"
            alt="Coco"
            width={100}
            height={100}
            className="mx-auto mb-6 animate-float"
          />
          <h2 className="section-title">
            Ready to bring order to <span className="gradient-text">your blockchain workflow</span>?
          </h2>
          <p className="section-subtitle">
            Download Coco for free. No accounts, no subscriptions—just install and start building.
          </p>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {platforms.map((platform) => (
            <a
              key={platform.name}
              href={platform.downloadUrl}
              className={`feature-card text-center group ${
                !platform.available ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-coco-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <platform.Icon className="w-8 h-8 text-coco-accent" />
              </div>
              <h3 className="text-lg font-semibold text-coco-text-primary mb-1">
                {platform.name}
              </h3>
              <p className="text-sm text-coco-text-secondary mb-4">
                {platform.description}
              </p>
              <span className="btn btn-primary w-full">
                {platform.available ? 'Download' : 'Coming Soon'}
              </span>
            </a>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-coco-text-tertiary mb-4">
            Current version: <span className="text-coco-text-secondary">{siteConfig.version}</span>
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <a
              href={siteConfig.links.releaseNotes}
              target="_blank"
              rel="noopener noreferrer"
              className="text-coco-text-secondary hover:text-coco-accent transition-colors"
            >
              Release Notes
            </a>
            <span className="text-coco-border-default">|</span>
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-coco-text-secondary hover:text-coco-accent transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
