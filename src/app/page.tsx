import Link from 'next/link'
import { Zap, CheckCircle2, RotateCcw, BarChart3, Upload, Bookmark, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Repeat</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 md:py-32 px-6">
        {/* Gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6">
            <RotateCcw className="w-3 h-3" />
            Powered by Spaced Repetition (1-3-7-21)
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            The smartest way to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-primary">
              master DSA
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed">
            Track your practice across any question list, get automatic spaced-revision schedules,
            and visualize your progress with beautiful analytics. All in one place.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
            >
              Start for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3">Everything you need to ace your interviews</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            No more messy spreadsheets. Repeat gives you structure, revision schedules, and analytics — automatically.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: CheckCircle2,
                title: 'One-Click Solve Tracking',
                description: 'Mark questions as solved with a single checkbox. Progress syncs instantly across all your lists.',
                color: '#22c55e',
              },
              {
                icon: RotateCcw,
                title: 'Auto Revision Schedules',
                description: 'Solved a question? Repeat automatically creates 4 revision checkpoints at days 1, 3, 7, and 21.',
                color: '#f59e0b',
              },
              {
                icon: BarChart3,
                title: 'Rich Analytics',
                description: 'Activity heatmaps, difficulty breakdowns, topic charts, and cumulative progress — all at a glance.',
                color: '#8b5cf6',
              },
              {
                icon: Upload,
                title: 'Import Any Spreadsheet',
                description: 'Drag and drop your CSV or Excel file. The smart wizard auto-maps columns and preserves your solved status.',
                color: '#3b82f6',
              },
              {
                icon: Bookmark,
                title: 'Smart Bookmarks',
                description: 'Organize tricky questions into folders with emoji labels. Never lose track of questions to revisit.',
                color: '#ec4899',
              },
              {
                icon: Zap,
                title: 'Streak Tracking',
                description: 'Stay motivated with daily streak tracking. Build consistency and watch your practice habits grow.',
                color: '#f97316',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border bg-card/30 hover:bg-card/60 glow-hover transition-all duration-300"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                </div>
                <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to level up your practice?</h2>
          <p className="text-muted-foreground mb-8">Join for free and start building better study habits today.</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
          >
            Create Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Repeat</span>
          </div>
          <p>Built for focused DSA practice</p>
        </div>
      </footer>
    </div>
  )
}
