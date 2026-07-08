import React, { useState, useEffect } from "react";
import {
  Bike, ChevronDown, Check,
  TrendingUp, Wallet, ArrowRight, Sparkles
} from "lucide-react";

const PLAN_DEFS = {
  Starter: { days: 4, free: 1, delivery: false },
  Standard: { days: 12, free: 3, delivery: false },
  Premium: { days: 25, free: 5, delivery: true },
};

const naira = (n) =>
  "₦" + Math.round(n).toLocaleString("en-NG");

// ---------------------------------------------------------------------------

function TicketStrip({ days, free, size = "md" }) {
  const cellSize = size === "lg" ? "w-8 h-10 text-xs" : "w-6 h-8 text-[10px]";
  const cells = Array.from({ length: days + free }, (_, i) => i < days);
  return (
    <div className="flex flex-wrap gap-1.5">
      {cells.map((paid, i) => (
        <div
          key={i}
          className={`${cellSize} rounded-[4px] flex items-center justify-center font-semibold transition-all duration-300 ${
            paid
              ? "bg-white/10 border border-white/20 text-[#F3ECDD]"
              : "bg-[#E8A93B] text-[#16241B] scale-105 shadow-[0_0_0_2px_rgba(232,169,59,0.25)]"
          }`}
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {paid ? i + 1 : "F"}
        </div>
      ))}
    </div>
  );
}

function AnimatedNumber({ value, prefix = "" }) {
  return (
    <span
      className="tabular-nums transition-all duration-300"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {prefix}
      {Math.round(value).toLocaleString("en-NG")}
    </span>
  );
}

// Logo: the outer square takes a `bg` prop matching the surrounding section
// background, so the square blends into the page instead of showing as a
// mismatched color block. `accentFace` controls the inner mark color.
function Logo({ size = 40, bg = "#F5F0E4", accentFace = "#F3ECDD" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      <rect width="220" height="220" rx="48" fill={bg} />
      <circle cx="110" cy="118" r="62" fill={accentFace} />
      <path d="M85 48 Q78 34 88 22" stroke="#E8A93B" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M110 44 Q103 30 113 16" stroke="#E8A93B" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M135 48 Q128 34 138 22" stroke="#E8A93B" strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="152" cy="146" r="21" fill={bg} />
      <circle cx="152" cy="146" r="21" fill="none" stroke="#C1502E" strokeWidth="4" strokeDasharray="4 5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------

export function Landing() {
  const [activePlan, setActivePlan] = useState("Standard");
  const [mealPrice, setMealPrice] = useState(2300);
  const [subCount, setSubCount] = useState(30);

  const [waitlist, setWaitlist] = useState({ name: "", phone: "", area: "" });
  const [waitlistSent, setWaitlistSent] = useState(false);

  const [restaurant, setRestaurant] = useState({ name: "", owner: "", phone: "", area: "" });
  const [restaurantSent, setRestaurantSent] = useState(false);

  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const plan = PLAN_DEFS[activePlan];
  const paidMeals = plan.days * 2;
  const freeMeals = plan.free * 2;
  const amountPaid = paidMeals * mealPrice;
  const valueReceived = (paidMeals + freeMeals) * mealPrice;
  const savings = freeMeals * mealPrice;
  const savingsPct = (plan.free / (plan.days + plan.free)) * 100;

  const projectedRevenue = subCount * amountPaid;

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitWaitlist = (e) => {
    e.preventDefault();
    if (!waitlist.name || !waitlist.phone || !waitlist.area) return;
    setWaitlistSent(true);
  };

  const submitRestaurant = (e) => {
    e.preventDefault();
    if (!restaurant.name || !restaurant.owner || !restaurant.phone) return;
    setRestaurantSent(true);
  };

  const faqs = [
    {
      q: "What happens if I don't finish all my days?",
      a: "Your remaining days simply roll forward — there's no expiry within your active plan period. You can also pause a day in advance if you know you won't make it.",
    },
    {
      q: "Can I switch restaurants mid-plan?",
      a: "Plans are tied to one restaurant at a time, since pricing and menus differ. When your plan ends, you're free to subscribe to a different restaurant next time.",
    },
    {
      q: "How do the free days actually work?",
      a: "They're added automatically at signup based on your plan size — 1 free day on Starter, 3 on Standard, 5 on Premium. You eat them like any other day, no separate redemption step.",
    },
    {
      q: "Is delivery available on every plan?",
      a: "Delivery is included only on Premium. Starter and Standard are pickup at the restaurant, which keeps those plans priced lower.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F0E4] text-[#16241B] tracking-[-0.01em]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        ::selection { background: #E8A93B; color: #16241B; }
      `}</style>

      {/* NAV — background is #F5F0E4, so the logo square uses that same color */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#F5F0E4]/90 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-semibold text-lg font-display tracking-tight">
            <Logo size={34} bg="#F5F0E4" accentFace="#16241B" />
            Chop Plan
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button onClick={() => scrollTo("how")} className="hover:text-[#C1502E] transition-colors">How it works</button>
            <button onClick={() => scrollTo("calculator")} className="hover:text-[#C1502E] transition-colors">Calculate savings</button>
            <button onClick={() => scrollTo("restaurants")} className="hover:text-[#C1502E] transition-colors">For restaurants</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-[#C1502E] transition-colors">FAQ</button>
          </div>
          <button
            onClick={() => scrollTo("waitlist")}
            className="bg-[#16241B] text-[#F3ECDD] px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#233A29] transition-colors"
          >
            Join waitlist
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-[#16241B] text-[#F3ECDD] pt-16 pb-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #E8A93B 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="inline-flex items-center gap-2 text-[#E8A93B] text-xs font-bold uppercase tracking-[0.18em] mb-6">
            <Sparkles size={13} />
            Now onboarding first restaurants — Lagos
          </div>
          <h1 className="font-display text-[clamp(2.6rem,7vw,4.75rem)] leading-[1.04] tracking-[-0.02em] max-w-3xl font-semibold">
            Prepay your lunch.
            <br />
            Get days <span className="text-[#E8A93B]">free</span>.
          </h1>
          <p className="mt-7 text-xl text-[#C9BFA6] max-w-xl leading-relaxed font-light">
            Subscribe to lunch for the week or month at restaurants you already trust.
            The more you commit, the more free days you get.
          </p>
          <div className="flex flex-wrap gap-3 mt-9">
            <button
              onClick={() => scrollTo("calculator")}
              className="bg-[#E8A93B] text-[#16241B] font-bold px-7 py-3.5 rounded-full flex items-center gap-2 hover:brightness-105 transition-all hover:gap-3"
            >
              See how much you'd save <ArrowRight size={16} />
            </button>
            <button
              onClick={() => scrollTo("restaurants")}
              className="border border-white/25 px-7 py-3.5 rounded-full font-semibold hover:bg-white/5 transition-colors"
            >
              I own a restaurant
            </button>
          </div>
          <div className="mt-12">
            <TicketStrip days={4} free={1} size="lg" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 max-w-6xl mx-auto px-6">
        <p className="text-[#C1502E] text-xs font-bold uppercase tracking-[0.16em] mb-3">How it works</p>
        <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">Three steps. No more lunch guesswork.</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            { n: "1", t: "Pick a plan", d: "Choose 4, 12, or 25 paid days. Longer plans unlock more free days — up to 5 free on Premium." },
            { n: "2", t: "Choose your meals", d: "Pick what you're eating in advance, or leave it random. Two meals a day, every day of your plan." },
            { n: "3", t: "Pick up or get delivered", d: "Starter and Standard are pickup. Premium subscribers get every meal delivered." },
          ].map((s) => (
            <div key={s.n} className="bg-[#FBF6EA] rounded-2xl border border-black/5 p-7 shadow-[0_2px_16px_rgba(22,36,27,0.05)] hover:shadow-[0_12px_32px_rgba(22,36,27,0.1)] hover:-translate-y-1 transition-all duration-300">
              <div className="w-9 h-9 rounded-full bg-[#16241B] text-[#F3ECDD] flex items-center justify-center font-bold text-sm mb-5">
                {s.n}
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-[#4A4438] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" className="py-20 bg-[#EFE3C8]">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[#C1502E] text-xs font-bold uppercase tracking-[0.16em] mb-3">Interactive</p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">Calculate what you'd save</h2>
          <p className="text-[#4A4438] max-w-xl mb-10">Pick a plan and an estimated meal price to see your real numbers.</p>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="flex gap-2 mb-6">
                {Object.keys(PLAN_DEFS).map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlan(p)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                      activePlan === p
                        ? "bg-[#16241B] text-[#F3ECDD] border-[#16241B]"
                        : "border-black/10 text-[#16241B] hover:border-[#16241B]/40"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <label className="text-xs font-bold uppercase tracking-wide text-[#6B6355] mb-2 block">
                Price per meal
              </label>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="range"
                  min="1500"
                  max="4000"
                  step="100"
                  value={mealPrice}
                  onChange={(e) => setMealPrice(Number(e.target.value))}
                  className="w-full accent-[#E8A93B]"
                />
                <span className="font-mono text-sm font-semibold w-20 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {naira(mealPrice)}
                </span>
              </div>

              <div className="mt-8 bg-[#16241B] text-[#F3ECDD] rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wide text-[#C9BFA6] mb-3">
                  {activePlan} · {plan.days} paid days + {plan.free} free
                </p>
                <TicketStrip days={plan.days} free={plan.free} />
              </div>
            </div>

            <div className="bg-[#F5F0E4] rounded-2xl p-7 border border-black/5">
              <div className="flex items-center gap-2 text-[#C1502E] mb-5">
                <Wallet size={17} />
                <span className="text-xs font-bold uppercase tracking-wide">Your numbers</span>
              </div>
              <Row label="You pay" value={<AnimatedNumber value={amountPaid} prefix="₦" />} />
              <Row label="Value you receive" value={<AnimatedNumber value={valueReceived} prefix="₦" />} />
              <Row
                label="You save"
                value={<span className="text-[#C1502E] font-bold"><AnimatedNumber value={savings} prefix="₦" /></span>}
                bold
              />
              <div className="mt-5 pt-5 border-t border-black/10 flex items-center justify-between">
                <span className="text-sm text-[#4A4438]">Effective discount</span>
                <span className="font-display text-2xl font-semibold text-[#16241B]">
                  {savingsPct.toFixed(0)}%
                </span>
              </div>
              {plan.delivery && (
                <p className="mt-4 text-xs bg-[#E8A93B]/25 text-[#7A4A17] px-3 py-2 rounded-lg font-medium flex items-center gap-1.5">
                  <Bike size={12} /> Delivery included on this plan
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* RESTAURANTS */}
      <section id="restaurants" className="py-20 bg-[#233A29] text-[#F3ECDD]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-start">
          <div>
            <p className="text-[#E8A93B] text-xs font-bold uppercase tracking-[0.16em] mb-3">For restaurant owners</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-6">
              Guaranteed customers.<br />Predictable income.
            </h2>
            <ul className="space-y-4 mb-10">
              {[
                "Get paid upfront when customers subscribe — before a single meal is served.",
                "See a clear projection of monthly income from subscribers.",
                "Build a base of repeat customers who've already committed to you.",
                "No cost to join as one of our first launch partners.",
                "You stay fully independent — your restaurant, your recipes, your brand.",
              ].map((b, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#C9BFA6]">
                  <span className="w-5 h-5 rounded-full bg-[#E8A93B]/20 text-[#E8A93B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="bg-[#16241B] rounded-2xl p-6">
              <div className="flex items-center gap-2 text-[#E8A93B] mb-4">
                <TrendingUp size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">Revenue projector</span>
              </div>
              <label className="text-xs text-[#C9BFA6] mb-2 block">Subscribers on {activePlan}</label>
              <input
                type="range"
                min="5"
                max="100"
                value={subCount}
                onChange={(e) => setSubCount(Number(e.target.value))}
                className="w-full accent-[#E8A93B] mb-3"
              />
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#C9BFA6]">{subCount} subscribers →</span>
                <span className="font-display text-2xl font-semibold text-[#E8A93B]">
                  <AnimatedNumber value={projectedRevenue} prefix="₦" />
                </span>
              </div>
              <p className="text-[11px] text-[#8A9088] mt-2">Guaranteed before your kitchen opens once.</p>
            </div>
          </div>

          <RestaurantForm
            restaurant={restaurant}
            setRestaurant={setRestaurant}
            submitted={restaurantSent}
            onSubmit={submitRestaurant}
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 max-w-3xl mx-auto px-6">
        <p className="text-[#C1502E] text-xs font-bold uppercase tracking-[0.16em] mb-3">Questions</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight mb-8">Good to know</h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="border border-black/10 rounded-xl overflow-hidden bg-[#FBF6EA]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm"
              >
                {f.q}
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 shrink-0 ml-3 ${openFaq === i ? "rotate-180 text-[#C1502E]" : ""}`}
                />
              </button>
              <div
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 text-sm text-[#4A4438] leading-relaxed">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="py-20 bg-[#EFE3C8]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-start">
          <div>
            <p className="text-[#C1502E] text-xs font-bold uppercase tracking-[0.16em] mb-3">For customers</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">Be first to subscribe at launch</h2>
            <p className="text-[#4A4438] max-w-md">
              Join the waitlist and we'll message you the moment Chop Plan goes live near you — plus early access to launch pricing.
            </p>
          </div>
          <WaitlistForm
            waitlist={waitlist}
            setWaitlist={setWaitlist}
            submitted={waitlistSent}
            onSubmit={submitWaitlist}
          />
        </div>
      </section>

      {/* FOOTER — background is #16241B, so the logo square uses that same color */}
      <footer className="bg-[#16241B] text-[#C9BFA6] py-10 text-center text-sm">
        <div className="flex items-center justify-center gap-2.5 font-display text-[#F3ECDD] font-semibold mb-2 tracking-tight">
          <Logo size={28} bg="#16241B" accentFace="#F3ECDD" /> Chop Plan
        </div>
        <p>Lagos, Nigeria · Prepaid lunch subscriptions for restaurants and the people who love them.</p>
      </footer>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[#4A4438]">{label}</span>
      <span className={`text-lg ${bold ? "font-bold" : "font-semibold"}`}>{value}</span>
    </div>
  );
}

function WaitlistForm({ waitlist, setWaitlist, submitted, onSubmit }) {
  if (submitted) {
    return (
      <div className="bg-[#F5F0E4] rounded-2xl p-7 border border-black/5 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-[#E8A93B] text-[#16241B] flex items-center justify-center mb-4">
          <Check size={22} strokeWidth={3} />
        </div>
        <h3 className="font-display text-xl font-semibold">You're on the list</h3>
        <p className="text-sm text-[#4A4438] mt-2">We'll message you on WhatsApp when we launch near {waitlist.area || "you"}.</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="bg-[#F5F0E4] rounded-2xl p-7 border border-black/5">
      <h3 className="font-display text-xl font-semibold mb-1">Join the waitlist</h3>
      <p className="text-xs text-[#6B6355] mb-5">Takes 30 seconds. No payment required now.</p>
      <Field label="Full name" value={waitlist.name} onChange={(v) => setWaitlist({ ...waitlist, name: v })} placeholder="Your full name" />
      <Field label="Phone / WhatsApp number" value={waitlist.phone} onChange={(v) => setWaitlist({ ...waitlist, phone: v })} placeholder="080..." />
      <Field label="Where do you eat lunch most?" value={waitlist.area} onChange={(v) => setWaitlist({ ...waitlist, area: v })} placeholder="e.g. Victoria Island" />
      <button type="submit" className="w-full mt-5 bg-[#C1502E] text-white font-semibold py-3 rounded-xl hover:brightness-105 transition-all">
        Join waitlist
      </button>
    </form>
  );
}

function RestaurantForm({ restaurant, setRestaurant, submitted, onSubmit }) {
  if (submitted) {
    return (
      <div className="bg-[#16241B] rounded-2xl p-7 border border-white/10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-[#E8A93B] text-[#16241B] flex items-center justify-center mb-4">
          <Check size={22} strokeWidth={3} />
        </div>
        <h3 className="font-display text-xl font-semibold">Request received</h3>
        <p className="text-sm text-[#C9BFA6] mt-2">We'll reach out to {restaurant.name || "you"} on WhatsApp shortly.</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="bg-[#16241B] rounded-2xl p-7 border border-white/10">
      <h3 className="font-display text-xl font-semibold mb-1">I'm a restaurant owner</h3>
      <p className="text-xs text-[#C9BFA6] mb-5">We're hand-picking a small group to launch with.</p>
      <Field dark label="Restaurant name" value={restaurant.name} onChange={(v) => setRestaurant({ ...restaurant, name: v })} placeholder="e.g. Mama Ngozi's Kitchen" />
      <Field dark label="Your name" value={restaurant.owner} onChange={(v) => setRestaurant({ ...restaurant, owner: v })} placeholder="Your full name" />
      <Field dark label="WhatsApp / phone number" value={restaurant.phone} onChange={(v) => setRestaurant({ ...restaurant, phone: v })} placeholder="080..." />
      <Field dark label="Location / area" value={restaurant.area} onChange={(v) => setRestaurant({ ...restaurant, area: v })} placeholder="e.g. Ikeja, Lagos" />
      <button type="submit" className="w-full mt-5 bg-[#E8A93B] text-[#16241B] font-bold py-3 rounded-xl hover:brightness-105 transition-all">
        Request to be a launch partner
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, dark }) {
  return (
    <div className="mt-3.5">
      <label className={`text-xs font-semibold block mb-1.5 ${dark ? "text-[#C9BFA6]" : "text-[#4A4438]"}`}>{label}</label>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-colors ${
          dark
            ? "bg-white/5 border border-white/15 text-[#F3ECDD] placeholder-[#8A9088] focus:border-[#E8A93B]"
            : "bg-[#FBF6EA] border border-black/10 text-[#16241B] focus:border-[#C1502E]"
        }`}
      />
    </div>
  );
}
