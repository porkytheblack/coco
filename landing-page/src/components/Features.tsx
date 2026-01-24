import {
  Layers,
  Wallet,
  FolderOpen,
  History,
  Globe,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: 'Multi-Chain Support',
    description: 'Work with EVM chains, Solana, and Aptos in one unified interface. Each ecosystem with its native tooling.',
    color: 'text-coco-accent',
    bgColor: 'bg-coco-accent/10',
  },
  {
    icon: Wallet,
    title: 'Wallet Management',
    description: 'Create, import, and organize wallets by chain. Label them by role, view balances, and fund from faucets with one click.',
    color: 'text-coco-success',
    bgColor: 'bg-coco-success/10',
  },
  {
    icon: FolderOpen,
    title: 'Workspace Organization',
    description: 'Group your contracts, wallets, and transactions by project. Keep your dev environment tidy and structured.',
    color: 'text-[#BB9AF7]',
    bgColor: 'bg-[#BB9AF7]/10',
  },
  {
    icon: History,
    title: 'Transaction History',
    description: 'Every transaction is saved with full context: params, hash, events, logs, gas, and errors. Your history becomes documentation.',
    color: 'text-coco-warning',
    bgColor: 'bg-coco-warning/10',
  },
  {
    icon: Globe,
    title: 'Mainnet & Testnet',
    description: 'Switch between mainnet and testnet for any chain. Keep your environments separate but accessible.',
    color: 'text-coco-error',
    bgColor: 'bg-coco-error/10',
  },
  {
    icon: Shield,
    title: 'Local-First',
    description: 'Your keys and data stay on your machine. No accounts, no sync, no cloud. Full ownership of your development environment.',
    color: 'text-coco-accent',
    bgColor: 'bg-coco-accent/10',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-coco-bg-primary via-coco-bg-secondary to-coco-bg-primary" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="section-title">
            A better workflow for <span className="gradient-text">blockchain developers</span>
          </h2>
          <p className="section-subtitle">
            Coco brings order to blockchain development chaos. Organize chains, wallets, and contracts
            without losing track of what you've done.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="feature-card group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-coco-text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-coco-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
