import { Link } from "wouter";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl">
      <h1 className="text-4xl md:text-6xl font-serif font-bold mb-8">About Chop Plan</h1>
      
      <div className="prose prose-lg prose-green max-w-none">
        <p className="text-xl text-muted-foreground mb-12">
          We built Chop Plan because we were tired of the daily "what's for lunch?" debate. 
          Lagos has some of the best food in the world, but accessing it predictably during a busy workday is a chore.
        </p>

        <h2 className="font-serif text-3xl font-bold mt-12 mb-6">Our Mission</h2>
        <p>
          We connect hungry professionals with excellent local restaurants through predictable, prepaid subscriptions. 
          By paying upfront, customers get guaranteed daily meals without the daily ordering friction, and restaurants 
          get the predictable revenue they need to thrive.
        </p>

        <h2 className="font-serif text-3xl font-bold mt-12 mb-6">For Professionals</h2>
        <p>
          Your time is valuable. Spending 30 minutes every day deciding what to eat, coordinating delivery, and 
          dealing with delayed riders adds up. With Chop Plan, you make that decision once a week. Your food arrives, 
          and you can focus on what matters.
        </p>

        <h2 className="font-serif text-3xl font-bold mt-12 mb-6">For Restaurants</h2>
        <p>
          The restaurant business is unpredictable. Subscriptions change that. When you know exactly how many 
          meals you need to prepare on a Tuesday before the week even begins, you can buy ingredients in bulk, 
          eliminate waste, and optimize your kitchen staff's time.
        </p>
      </div>
    </div>
  );
}
