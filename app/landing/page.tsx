"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Zap } from "lucide-react"

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const proceedToLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      router.push("/login")
    }, 2000)
  }

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center z-50">
          <div className="w-15 h-15 border-4 border-white/30 border-t-white rounded-full animate-spin mb-8"></div>
          <div className="text-white text-xl font-medium">Loading Login...</div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='grain' width='100' height='100' patternUnits='userSpaceOnUse'><circle cx='25' cy='25' r='1' fill='white' opacity='0.1'/><circle cx='75' cy='75' r='1' fill='white' opacity='0.1'/><circle cx='50' cy='10' r='0.5' fill='white' opacity='0.1'/><circle cx='10' cy='50' r='0.5' fill='white' opacity='0.1'/><circle cx='90' cy='30' r='0.5' fill='white' opacity='0.1'/></pattern></defs><rect width='100' height='100' fill='url(%23grain)'/></svg>")`,
            animation: "float 20s ease-in-out infinite",
          }}
        />

        <FloatingParticles />

        <div className="text-center text-white z-10 relative px-4">
          <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            2K Inventory
          </h1>

          <p className="text-2xl mb-12 opacity-90">Modern Inventory Management System</p>

          <button
            onClick={proceedToLogin}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            <div className="relative flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Get Started
            </div>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes floatUp {
          to {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white/60 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            animationName: "floatUp",
            animationDuration: `${3 + Math.random() * 3}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  )
}
