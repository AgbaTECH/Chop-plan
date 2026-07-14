import { db } from "@workspace/db";
import {
  usersTable, vendorsTable, subscriptionPlansTable,
  mealsTable, subscriptionsTable, blogPostsTable,
  adminsTable, subscriptionDaysTable, planTimetableTable,
} from "@workspace/db";
import {
  totalScheduleDays, buildBasicScheduleRows, buildPremiumScheduleRows,
  PREMIUM_DAYS_PER_MONTH, PREMIUM_FREE_DAYS,
} from "./lib/schedule";
import { hashPassword } from "./lib/sessions";

const BASE = "/images";

async function seed() {
  console.log("Seeding database…");

  // -- Users --
  const [user1] = await db.insert(usersTable).values({
    name: "Amara Okafor",
    email: "amara@example.com",
    passwordHash: await hashPassword("password123"),
    phone: "08012345678",
    area: "Lekki",
  }).returning();
  const [user2] = await db.insert(usersTable).values({
    name: "Chidi Nwosu",
    email: "chidi@example.com",
    passwordHash: await hashPassword("password123"),
    phone: "08087654321",
    area: "Victoria Island",
  }).returning();
  const [user3] = await db.insert(usersTable).values({
    name: "Fatima Bello",
    email: "fatima@example.com",
    passwordHash: await hashPassword("password123"),
    phone: "08055566677",
    area: "Ikeja",
  }).returning();

  // -- Vendors --
  const [v1] = await db.insert(vendorsTable).values({
    businessName: "Mama Nkechi's Kitchen",
    ownerName: "Nkechi Obi",
    email: "nkechi@mamakitchen.ng",
    passwordHash: await hashPassword("vendor123"),
    phone: "08011122233",
    area: "Lekki",
    cuisineType: "Nigerian Home Cooking",
    description: "Authentic Nigerian meals prepared fresh daily. From jollof rice to egusi soup, we bring the taste of home to your office.",
    coverImage: `${BASE}/vendor-cover-1.jpg`,
    rating: 4.8,
  }).returning();

  const [v2] = await db.insert(vendorsTable).values({
    businessName: "VI Eats",
    ownerName: "Tunde Adeyemi",
    email: "tunde@vieats.ng",
    passwordHash: await hashPassword("vendor123"),
    phone: "08022233344",
    area: "Victoria Island",
    cuisineType: "Continental & Nigerian Fusion",
    description: "Premium lunch experience combining Nigerian flavours with international cooking techniques. Perfect for the island professional.",
    coverImage: `${BASE}/vendor-cover-2.jpg`,
    rating: 4.6,
  }).returning();

  const [v3] = await db.insert(vendorsTable).values({
    businessName: "Ikeja Buka Express",
    ownerName: "Segun Adeola",
    email: "segun@ikejabukaexpress.ng",
    passwordHash: await hashPassword("vendor123"),
    phone: "08033344455",
    area: "Ikeja",
    cuisineType: "Traditional Buka",
    description: "Classic Lagos buka experience. Fresh soups, swallows, and rice dishes. We cook the way your grandma taught.",
    coverImage: `${BASE}/vendor-cover-3.jpg`,
    rating: 4.5,
  }).returning();

  const [v4] = await db.insert(vendorsTable).values({
    businessName: "Surulere Bowl & Grill",
    ownerName: "Chioma Eze",
    email: "chioma@surulerebowl.ng",
    passwordHash: await hashPassword("vendor123"),
    phone: "08044455566",
    area: "Surulere",
    cuisineType: "Grills & Rice Bowls",
    description: "Healthy bowls and grilled proteins for the modern Lagos worker. Balanced, tasty, and always fresh.",
    coverImage: `${BASE}/vendor-cover-4.jpg`,
    rating: 4.7,
  }).returning();

  // -- Meals -- (created before plans, since Basic/Premium plans reference meal ids)
  const mealSets = [
    // Vendor 1 - Mama Nkechi's Kitchen
    { vendorId: v1.id, meals: [
      { name: "Jollof Rice & Fried Chicken", description: "Smoky party jollof rice served with crispy fried chicken and coleslaw", priceNaira: 2800, imageUrl: `${BASE}/meal-jollof-chicken.jpg`, category: "Rice", available: true },
      { name: "Egusi Soup & Pounded Yam", description: "Rich egusi soup with assorted meats and stockfish, served with smooth pounded yam", priceNaira: 3200, imageUrl: `${BASE}/meal-egusi-pounded-yam.jpg`, category: "Soup & Swallow", available: true },
      { name: "Moin Moin & Ogi", description: "Steamed bean pudding with egg and fish filling, served with warm ogi", priceNaira: 1500, imageUrl: `${BASE}/meal-moin-moin.jpg`, category: "Light Meals", available: true },
    ]},
    // Vendor 2 - VI Eats
    { vendorId: v2.id, meals: [
      { name: "Suya Grilled Platter", description: "Tender suya beef skewers with spiced onion salad and tomato chutney", priceNaira: 4500, imageUrl: `${BASE}/meal-suya.jpg`, category: "Grills", available: true },
      { name: "Nigerian Fried Rice Bowl", description: "Aromatic fried rice with tiger prawns, mixed vegetables and liver", priceNaira: 3800, imageUrl: `${BASE}/meal-fried-rice.jpg`, category: "Rice", available: true },
      { name: "Pepper Soup Special", description: "Spicy goat meat pepper soup — the Lagos hangover cure and lunch hero", priceNaira: 3500, imageUrl: `${BASE}/meal-pepper-soup.jpg`, category: "Soups", available: true },
    ]},
    // Vendor 3 - Ikeja Buka Express
    { vendorId: v3.id, meals: [
      { name: "Akara & Bread", description: "Freshly fried bean fritters with sliced bread — classic Lagos breakfast-lunch", priceNaira: 1200, imageUrl: `${BASE}/meal-akara.jpg`, category: "Light Meals", available: true },
      { name: "Egusi Soup & Eba", description: "Thick egusi soup with smoked catfish and fresh eba", priceNaira: 2500, imageUrl: `${BASE}/meal-egusi-pounded-yam.jpg`, category: "Soup & Swallow", available: true },
      { name: "Jollof Rice & Stew", description: "Home-style jollof rice with rich tomato stew and assorted protein", priceNaira: 2300, imageUrl: `${BASE}/meal-jollof-chicken.jpg`, category: "Rice", available: true },
    ]},
    // Vendor 4 - Surulere Bowl & Grill
    { vendorId: v4.id, meals: [
      { name: "Boli & Fish", description: "Charcoal-roasted plantain served with grilled tilapia and pepper sauce", priceNaira: 2200, imageUrl: `${BASE}/meal-boli.jpg`, category: "Grills", available: true },
      { name: "Protein Suya Bowl", description: "Brown rice base with suya chicken, roasted peppers and tzatziki", priceNaira: 3800, imageUrl: `${BASE}/meal-suya.jpg`, category: "Bowls", available: true },
      { name: "Fried Rice & Chicken", description: "Light Nigerian fried rice with grilled chicken thighs and plantain chips", priceNaira: 3200, imageUrl: `${BASE}/meal-fried-rice.jpg`, category: "Rice", available: true },
    ]},
  ];

  const mealsByVendor = new Map<number, { id: number; name: string }[]>();
  for (const ms of mealSets) {
    const inserted = await db.insert(mealsTable).values(ms.meals.map((m) => ({ vendorId: ms.vendorId, ...m }))).returning();
    mealsByVendor.set(ms.vendorId, inserted);
  }

  // -- Subscription Plans (Basic + Premium) --
  // v1 and v2 offer both tiers; v3 is Basic-only; v4 is Premium-only — this
  // exercises every combination the demo accounts need to keep working.
  const [m1a, m1b, m1c] = mealsByVendor.get(v1.id)!;
  const [m2a, m2b, m2c] = mealsByVendor.get(v2.id)!;
  const [m3a] = mealsByVendor.get(v3.id)!;
  const [m4a, m4b, m4c] = mealsByVendor.get(v4.id)!;

  async function createBasicPlan(vendorId: number, priceNaira: number, mealId: number) {
    const [plan] = await db.insert(subscriptionPlansTable).values({
      vendorId, tier: "basic", priceNaira, daysPerMonth: 12, freeDays: 3, basicMealId: mealId,
    }).returning();
    return plan;
  }

  async function createPremiumPlan(
    vendorId: number,
    priceNaira: number,
    rotation: { dayOfWeek: number; mealId: number }[],
    freeDay: { dayOfWeek: number; mealId: number }
  ) {
    const [plan] = await db.insert(subscriptionPlansTable).values({
      vendorId, tier: "premium", priceNaira, daysPerMonth: PREMIUM_DAYS_PER_MONTH, freeDays: PREMIUM_FREE_DAYS, basicMealId: null,
    }).returning();
    await db.insert(planTimetableTable).values([
      ...rotation.map((r) => ({ planId: plan.id, dayOfWeek: r.dayOfWeek, mealId: r.mealId, isFreeDay: false })),
      { planId: plan.id, dayOfWeek: freeDay.dayOfWeek, mealId: freeDay.mealId, isFreeDay: true },
    ]);
    return { plan, timetable: [...rotation.map((r) => ({ ...r, isFreeDay: false })), { ...freeDay, isFreeDay: true }] };
  }

  const v1Basic = await createBasicPlan(v1.id, 9200, m1a.id);
  const v1Premium = await createPremiumPlan(v1.id, 57500, [
    { dayOfWeek: 1, mealId: m1a.id }, { dayOfWeek: 2, mealId: m1b.id },
    { dayOfWeek: 4, mealId: m1a.id }, { dayOfWeek: 5, mealId: m1b.id },
  ], { dayOfWeek: 0, mealId: m1c.id });

  const v2Basic = await createBasicPlan(v2.id, 12000, m2a.id);
  const v2Premium = await createPremiumPlan(v2.id, 74800, [
    { dayOfWeek: 1, mealId: m2a.id }, { dayOfWeek: 2, mealId: m2b.id },
    { dayOfWeek: 4, mealId: m2a.id }, { dayOfWeek: 5, mealId: m2b.id },
  ], { dayOfWeek: 0, mealId: m2c.id });

  const v3Basic = await createBasicPlan(v3.id, 8300, m3a.id);

  const v4Premium = await createPremiumPlan(v4.id, 62700, [
    { dayOfWeek: 1, mealId: m4a.id }, { dayOfWeek: 2, mealId: m4b.id },
    { dayOfWeek: 4, mealId: m4a.id }, { dayOfWeek: 5, mealId: m4b.id },
  ], { dayOfWeek: 0, mealId: m4c.id });

  // -- Subscriptions --
  const today = new Date().toISOString().split("T")[0];

  const insertedSubs = await db.insert(subscriptionsTable).values([
    { userId: user1.id, vendorId: v1.id, planId: v1Premium.plan.id, startDate: today, status: "active" },
    { userId: user1.id, vendorId: v2.id, planId: v2Basic.id, startDate: today, status: "active" },
    { userId: user2.id, vendorId: v1.id, planId: v1Basic.id, startDate: today, status: "active" },
    { userId: user2.id, vendorId: v3.id, planId: v3Basic.id, startDate: today, status: "active" },
    { userId: user3.id, vendorId: v2.id, planId: v2Premium.plan.id, startDate: today, status: "active" },
  ]).returning();

  // -- Pickup schedule rows for each seeded subscription --
  const basicPlansById = new Map([v1Basic, v2Basic, v3Basic].map((p) => [p.id, p]));
  const premiumPlansById = new Map([v1Premium, v2Premium, v4Premium].map((p) => [p.plan.id, p]));
  const scheduleRows = insertedSubs.flatMap((sub) => {
    const basicPlan = basicPlansById.get(sub.planId);
    if (basicPlan) {
      const totalDays = totalScheduleDays(basicPlan.daysPerMonth, basicPlan.freeDays);
      return buildBasicScheduleRows(sub.id, sub.startDate, totalDays, basicPlan.basicMealId!);
    }
    const premiumPlan = premiumPlansById.get(sub.planId)!;
    return buildPremiumScheduleRows(sub.id, sub.startDate, premiumPlan.timetable);
  });
  if (scheduleRows.length > 0) {
    await db.insert(subscriptionDaysTable).values(scheduleRows);
  }

  // -- Admin account --
  // Seeds a single admin using ADMIN_PASSWORD from the environment so a fresh
  // setup always has usable admin credentials. Falls back to a dev-only
  // default if the secret isn't set (e.g. first-time local seeding).
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  await db.insert(adminsTable).values({
    name: "Adebayo Olanrewaju",
    email: "adebayoolanrewaju970@gmail.com",
    passwordHash: await hashPassword(adminPassword),
  }).onConflictDoUpdate({
    target: adminsTable.email,
    set: { passwordHash: await hashPassword(adminPassword) },
  });

  // -- Blog Posts --
  await db.insert(blogPostsTable).values([
    {
      title: "How Prepaid Lunch Plans are Changing Lagos Office Culture",
      slug: "prepaid-lunch-plans-lagos",
      excerpt: "Discover why more Lagos companies are switching to subscription lunch plans — and the surprising benefits for both employees and restaurant owners.",
      content: `The Lagos lunch hour used to mean one thing: the mad scramble. Navigating go-slow traffic, arguing over where to eat, or settling for expensive hotel buffets just to save time. But a quiet revolution is happening in offices across Lekki, VI, and Ikeja.\n\nPrepaid lunch subscriptions — where workers commit to a local restaurant for the week or month in advance — are gaining serious traction. And the numbers make sense for everyone involved.\n\n**For workers:** You save 15–20% compared to walk-in prices, skip the daily decision fatigue, and get priority service. If you're on a 12-day plan, you get 3 days free. On a Premium 25-day plan? Five bonus days. That's almost a whole extra week of lunch, on the house.\n\n**For restaurants:** Guaranteed cash flow before the month begins transforms how they operate. No more guessing how many portions to cook. Vendors on Chop Plan report reducing food waste by up to 30% and seeing a 25% increase in monthly revenue.\n\nThe model is borrowed from the Japanese "teishoku" tradition and adapted for Lagos realities — fast service, local flavours, and flexible plans that fit the Nigerian work calendar.\n\nWe think this is just the beginning.`,
      author: "Chop Plan Editorial",
      publishedAt: new Date("2025-06-15"),
      coverImage: `${BASE}/blog-cover-1.jpg`,
      category: "Industry",
    },
    {
      title: "5 Lagos Restaurant Owners Share Their First Month on Chop Plan",
      slug: "restaurant-owners-first-month",
      excerpt: "We spoke to five vendors about what changed — from guaranteed weekly revenue to building real relationships with their regular lunch customers.",
      content: `When Nkechi Obi opened Mama Nkechi's Kitchen in Lekki, she expected the same unpredictability every restaurateur faces: busy Mondays, ghost-town Wednesdays, and no real way to plan.\n\nThree months after joining Chop Plan, her Wednesday revenue matches her best Fridays.\n\n"The subscription customers come in and they're calm," she told us. "They're not stressed about money or time because it's already sorted. That energy changes the whole restaurant."\n\nHer experience mirrors what we're hearing across the platform:\n\n**Tunde at VI Eats** says his food cost ratio dropped because he can now plan his market runs precisely. "I used to buy 30% extra just in case. Now I know I'm cooking for exactly 47 people on a Tuesday. I go to the market and buy for 47 people."\n\n**Segun of Ikeja Buka Express** was skeptical at first. "I thought subscription was for big brands, not buka like me." His first month proved him wrong — 23 subscribers, ₦614,000 in guaranteed monthly revenue, before he served a single plate.\n\nThe pattern is consistent: vendors who commit to the model within the first month typically see it become their primary revenue stream within 90 days.\n\nIf you own a restaurant and want to stabilise your monthly income, the onboarding takes less than 10 minutes.`,
      author: "Chop Plan Editorial",
      publishedAt: new Date("2025-07-01"),
      coverImage: `${BASE}/blog-cover-2.jpg`,
      category: "Stories",
    },
    {
      title: "The Science of the Lagos Lunch Break: Why Your Midday Meal Matters",
      slug: "science-lagos-lunch-break",
      excerpt: "Research shows that eating well at lunch improves afternoon productivity by up to 40%. Here's what busy professionals told us about their current lunch habits — and what they wish they could change.",
      content: `Ask any Lagos professional about their lunch routine and you'll hear one of two stories: either they eat at their desk (a sad, guilty container of whatever was easiest) or they lose 40–60 minutes navigating the city to find something decent.\n\nNeither option is serving them well.\n\nA 2024 study by the Lagos Business School found that employees who eat a proper, satisfying midday meal report 38% higher afternoon productivity than those who skip or eat poorly. They also report lower stress levels and fewer late-afternoon energy crashes.\n\nThe barrier isn't desire — almost everyone we surveyed said they *want* to eat better at lunch. The barriers are time, cost uncertainty, and decision fatigue.\n\nThis is exactly the problem prepaid lunch subscriptions solve. When your lunch is already decided and already paid for, you eliminate two of the three friction points. The time savings are real too: Chop Plan subscribers with pickup options typically spend less than 8 minutes on their lunch transaction.\n\nThe remaining ingredient? Finding a vendor whose food you actually trust and enjoy. That's what our vendor discovery feature is built for — not just the nearest option, but the right option for you, with full meal menus, ratings, and transparent pricing before you commit a single naira.`,
      author: "Dr. Adaeze Nwosu",
      publishedAt: new Date("2025-07-08"),
      coverImage: `${BASE}/blog-cover-3.jpg`,
      category: "Lifestyle",
    },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
