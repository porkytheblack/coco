import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-coco-bg-primary">
      {/* Header */}
      <header className="border-b border-coco-border-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <Image src="/brand/coco.png" alt="Coco" width={40} height={40} />
            <span className="text-xl font-semibold text-coco-text-primary">Coco</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-coco-text-primary mb-8">Privacy Policy</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-coco-text-secondary">
          <p className="text-lg">
            Last updated: January 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Overview</h2>
            <p>
              Coco is a local-first application. Your privacy is fundamental to how we built this software.
              This policy explains what data Coco collects (spoiler: almost nothing) and how it's handled.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Data Storage</h2>
            <p>
              All your data stays on your machine. Coco stores everything locally, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Wallet information and private keys</li>
              <li>Contract ABIs and workspace configurations</li>
              <li>Transaction history and logs</li>
              <li>Application settings and preferences</li>
            </ul>
            <p>
              We do not have access to any of this data. There are no user accounts, no cloud sync,
              and no telemetry that sends your data to external servers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">AI Features</h2>
            <p>
              When you use Coco's AI assistant features, your queries are sent to third-party AI providers
              (such as OpenAI or Anthropic) to generate responses. These queries may include context about
              your current workspace, such as contract code or error messages you're asking about.
            </p>
            <p>
              We recommend reviewing the privacy policies of these AI providers. You can disable AI features
              entirely if you prefer not to send any data to external services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Blockchain Interactions</h2>
            <p>
              When you interact with blockchains through Coco, your transactions are broadcast to public
              blockchain networks. This is inherent to how blockchains work and is not something Coco controls.
              Your wallet addresses and transaction history are publicly visible on-chain.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Analytics</h2>
            <p>
              Coco does not collect analytics or usage data. We don't track how you use the application,
              what features you access, or how often you open it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Updates</h2>
            <p>
              Coco may check for updates periodically. This check only verifies if a new version is available
              and does not transmit any personal or usage data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be reflected on this page
              with an updated revision date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Questions</h2>
            <p>
              If you have questions about this privacy policy, please open an issue on our GitHub repository.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-coco-border-subtle">
          <Link
            href="/"
            className="text-coco-accent hover:text-coco-accent-hover transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </article>
    </main>
  );
}
