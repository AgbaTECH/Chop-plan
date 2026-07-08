import { Building2, Globe2, Target, Users } from "lucide-react";

export default function About() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="bg-card py-20 border-b border-border">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-5xl font-serif font-black mb-6 text-secondary">Our Story</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            We built Chop Plan to solve a very specific problem: the 1PM Lagos lunch panic.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                To create predictable, reliable revenue for local food businesses while completely automating the lunch decision for busy professionals. We believe food should be a source of joy, not daily stress.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By shifting from a la carte to subscription, we help vendors plan inventory, reduce waste, and build sustainable businesses, passing the savings on to you.
              </p>
            </div>
            
            <div className="bg-accent/5 p-8 rounded-3xl border border-accent/10 relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Globe2 className="w-24 h-24" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-accent">The Lagos Focus</h3>
              <p className="text-muted-foreground leading-relaxed mb-4 relative z-10">
                Lagos is chaotic. Traffic is unpredictable, delivery riders get lost, and schedules change. A subscription model cuts through the noise.
              </p>
              <ul className="space-y-3 mt-6 relative z-10">
                {[
                  "Empowering local SME kitchens",
                  "Reducing daily delivery friction",
                  "Creating reliable food routines"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-serif font-bold mb-12 text-center text-white">What We Value</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <Users className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2 text-white">Community First</h3>
              <p className="text-white/70">We build tools that connect people who make great food with people who need it.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <Building2 className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2 text-white">Vendor Success</h3>
              <p className="text-white/70">When our restaurant partners thrive and grow, the entire ecosystem benefits.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <Target className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2 text-white">Radical Simplicity</h3>
              <p className="text-white/70">Our product must reduce decisions, not add to them. Keep it simple.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
