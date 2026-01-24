import Link from 'next/link';
import Image from 'next/image';

export default function TermsOfService() {
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
        <h1 className="text-4xl font-bold text-coco-text-primary mb-8">Terms of Service</h1>

        <div className="prose prose-invert max-w-none space-y-8 text-coco-text-secondary">
          <p className="text-lg">
            Last updated: January 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using Coco, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the software.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Description of Service</h2>
            <p>
              Coco is a desktop application that helps blockchain developers organize their development
              workflow. It provides tools for managing wallets, interacting with smart contracts, and
              tracking transactions across multiple blockchain networks.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Use at Your Own Risk</h2>
            <p>
              Coco is provided "as is" without warranty of any kind. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Blockchain transactions are irreversible. Once you send a transaction, it cannot be undone.
              </li>
              <li>
                You are solely responsible for securing your private keys and wallet information.
              </li>
              <li>
                You are responsible for verifying all transaction details before signing or broadcasting.
              </li>
              <li>
                Smart contract interactions carry inherent risks including loss of funds.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, the developers of Coco shall not be liable for any
              direct, indirect, incidental, special, consequential, or exemplary damages, including but
              not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Loss of funds, tokens, or digital assets</li>
              <li>Loss of data or wallet information</li>
              <li>Unauthorized access to your wallets</li>
              <li>Errors in transaction execution</li>
              <li>Any other damages arising from your use of the software</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">No Financial Advice</h2>
            <p>
              Coco is a development tool. Nothing in the software or its documentation constitutes
              financial, investment, legal, or tax advice. Always do your own research and consult
              appropriate professionals before making financial decisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Third-Party Services</h2>
            <p>
              Coco may interact with third-party services including blockchain networks, RPC providers,
              and AI services. Your use of these services is subject to their respective terms and
              conditions. We are not responsible for the availability, accuracy, or reliability of
              third-party services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of Coco after
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-coco-text-primary">Open Source</h2>
            <p>
              Coco is open source software. The source code is available for review, and contributions
              are welcome under the terms of the project's license.
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
