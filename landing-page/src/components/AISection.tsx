import Image from 'next/image';
import { MessageSquare, AlertCircle, FileCode, Sparkles } from 'lucide-react';

const aiFeatures = [
  {
    icon: MessageSquare,
    title: 'Chat with AI',
    description: 'Ask questions about blockchain concepts, get help with smart contracts, or brainstorm solutions. Context-aware assistance right in your workspace.',
    screenshot: '/screenshots/chat-with-ai.png',
  },
  {
    icon: AlertCircle,
    title: 'Understand Failures',
    description: 'When a transaction fails, Coco explains why. Get clear explanations of revert reasons, gas issues, and common pitfalls without digging through logs.',
    screenshot: '/screenshots/ai-explains-problems.png',
  },
  {
    icon: FileCode,
    title: 'Import Any Contract',
    description: "Don't have the ABI or IDL? No problem. AI can help you import contracts even without standard interfaces—especially useful for Move where there's no standard contract export format.",
    screenshot: '/screenshots/ai-creates-abis.png',
  },
];

export function AISection() {
  return (
    <section id="ai" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#BB9AF7]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-coco-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#BB9AF7]/10 border border-[#BB9AF7]/30 mb-6">
            <Sparkles size={16} className="text-[#BB9AF7]" />
            <span className="text-sm text-[#BB9AF7] font-medium">AI-Powered</span>
          </div>
          <h2 className="section-title">
            Your <span className="gradient-text">AI assistant</span> for blockchain work
          </h2>
          <p className="section-subtitle">
            Get help when you need it. Coco's AI understands your workspace and helps you
            move faster without leaving the app.
          </p>
        </div>

        {/* AI Features */}
        <div className="space-y-24">
          {aiFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className={`flex flex-col ${
                index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
              } items-center gap-12`}
            >
              {/* Text Content */}
              <div className="flex-1 max-w-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#BB9AF7]/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-[#BB9AF7]" />
                </div>
                <h3 className="text-2xl font-bold text-coco-text-primary mb-4">
                  {feature.title}
                </h3>
                <p className="text-coco-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Screenshot */}
              <div className="flex-1 w-full">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-coco-border-subtle shadow-2xl glow">
                  <Image
                    src={feature.screenshot}
                    alt={feature.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
