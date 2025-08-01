import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Users, Calendar, TrendingUp, CheckCircle, Star } from "lucide-react"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      {/* <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">FitTracker Pro</span>
          </div>
          <div className="space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header> */}

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Professional Exercise Program Management
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Streamline your fitness coaching with our comprehensive platform. Create personalized programs, track
          progress, and help your clients achieve their fitness goals.
        </p>
        <div className="space-x-4">
          <Button size="lg" asChild>
            <Link href="/auth/register">Start Free Trial</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">Learn More</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Everything You Need to Succeed
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Client Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage all your clients in one place. Track their progress, goals, and preferences.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Program Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and schedule personalized workout programs with flexible timing options.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Progress Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor client progress with detailed analytics and performance metrics.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Dumbbell className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Exercise Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access a comprehensive library of exercises with detailed instructions and variations.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white dark:bg-gray-800 py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Why Choose FitTracker Pro?</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Streamlined Workflow</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Save time with automated program creation and progress tracking.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Client Engagement</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Keep clients motivated with interactive workouts and progress visualization.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Professional Tools</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Access professional-grade tools for program design and client management.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 text-white">
              <div className="text-center">
                <Star className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                <p className="mb-6">Join thousands of fitness professionals who trust FitTracker Pro.</p>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/auth/register">Start Your Free Trial</Link>
                </Button>
              </div>
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
              <span className="text-xl font-bold">FitTracker Pro</span>
            </div>
            <p className="text-gray-400">© 2024 FitTracker Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
