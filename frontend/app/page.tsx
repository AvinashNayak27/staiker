"use client";
import { useRouter } from "next/navigation";


export default function App() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <header className="sticky top-0 bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <h1 className="text-2xl font-bold text-blue-600">stAIker</h1>
        </div>
      </header>

      <main className="flex-grow px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <img src="/logo.png" alt="stAIker" className="w-36 mx-auto" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Your AI-Powered Accountability Partner
            </h2>
            <p className="text-lg text-gray-600">
              Achieve your goals with transparent tracking and smart contract verification
            </p>
            <button
              onClick={() => router.push("/onboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3 font-medium transition-colors cursor-pointer hover:cursor-pointer"
            >
              Start Your Journey
            </button>
          </section>

          {/* Features Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {[
              {
                title: "Daily Blogging",
                description: "Track your writing streak with Hashnode integration",
                icon: "📝",
              },
              {
                title: "Food Orders",
                description: "Monitor and reduce your food delivery expenses",
                icon: "🍔",
              },
              {
                title: "Ride Tracking",
                description: "Keep your transportation habits in check",
                icon: "🚗",
              },
              {
                title: "Project Deadlines",
                description: "Never miss a submission deadline again",
                icon: "⏰",
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-gray-50 p-6 rounded-lg">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

