"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, CheckCircle } from 'lucide-react'
import Image from "next/image"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"

export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true)
  useRouter() // ensure Next navigation is available for any future inline redirects

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section with Auth */}
      <section className="container mx-auto px-4 py-8 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left side - Hero Content with Image */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              
            </div>
            
            {/* Hero Image */}
            <div className="relative">
              <Image
                width={600}
                height={400}
                src={'/dashboard.png'}
                alt="Fitness trainer working with client"
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            </div>
          </div>

          {/* Right side - Authentication Forms */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <Card className="shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="flex mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setIsLogin(true)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        isLogin
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 dark:text-gray-100 hover:text-gray-900"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setIsLogin(false)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        !isLogin
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 dark:text-gray-100 hover:text-gray-900"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                  <CardTitle className="text-2xl">
                    {isLogin ? "Welcome back" : "Get started today"}
                  </CardTitle>
                  <CardDescription>
                    {isLogin 
                      ? "Sign in to your account to continue" 
                      : "Create your account and start your fitness journey"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLogin ? <LoginForm /> : <RegisterForm />}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Dumbbell className="h-6 w-6" />
              <span className=" font-bold">FitTracker Pro</span>
            </div>
            <p className="text-gray-400">© All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
