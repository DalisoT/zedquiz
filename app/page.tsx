import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800">
      {/* Hero Section */}
      <div className="px-6 py-16 text-center">
        <div className="text-7xl mb-6">📚</div>
        <h1 className="text-5xl font-bold text-white mb-3">ZedQuiz</h1>
        <p className="text-primary-100 text-lg max-w-md mx-auto">
          Zambia&apos;s #1 ECZ Exam Preparation Platform
        </p>
      </div>

      {/* Stats */}
      <div className="px-6 pb-8">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="text-2xl font-bold text-white">50K+</div>
            <div className="text-primary-200 text-sm">Students</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="text-2xl font-bold text-white">10K+</div>
            <div className="text-primary-200 text-sm">Questions</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="text-2xl font-bold text-white">A+</div>
            <div className="text-primary-200 text-sm">Results</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-8">
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
            <div className="text-3xl">🤖</div>
            <div className="text-left">
              <h3 className="text-white font-semibold">AI-Powered Marking</h3>
              <p className="text-primary-200 text-sm">Get instant feedback with detailed explanations</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
            <div className="text-3xl">📴</div>
            <div className="text-left">
              <h3 className="text-white font-semibold">Works Offline</h3>
              <p className="text-primary-200 text-sm">Download and study anywhere, even without internet</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
            <div className="text-3xl">📊</div>
            <div className="text-left">
              <h3 className="text-white font-semibold">Track Progress</h3>
              <p className="text-primary-200 text-sm">Build streaks and improve over time</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
            <div className="text-3xl">🏆</div>
            <div className="text-left">
              <h3 className="text-white font-semibold">Leaderboards</h3>
              <p className="text-primary-200 text-sm">Compete with students across Zambia</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="px-6 pb-12">
        <div className="max-w-md mx-auto space-y-3">
          <Link
            href="/signup"
            className="block w-full bg-white text-primary-700 font-bold py-4 rounded-xl shadow-lg text-center"
          >
            Get Started — It&apos;s Free
          </Link>
          <Link
            href="/login"
            className="block w-full bg-transparent border-2 border-white/50 text-white font-semibold py-4 rounded-xl text-center"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-primary-300 text-sm">
         Aligned with ECZ syllabus • Free for all students
        </p>
      </div>
    </main>
  );
}
