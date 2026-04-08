import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers"; 

export default async function AppPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 p-6 hidden md:block">
        <h2 className="text-xl font-semibold mb-8">Dear Diary</h2>

        <nav className="space-y-3 text-sm text-gray-400">
          <p className="text-white">Dashboard</p>
          <p className="hover:text-white cursor-pointer">Entries</p>
          <p className="hover:text-white cursor-pointer">Insights</p>
          <p className="hover:text-white cursor-pointer">Settings</p>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">
            Welcome back, {session?.user.name}
          </h1>

          <Link
            href="#"
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm"
          >
            + New Entry
          </Link>
        </div>

        {/* Empty state */}
        <div className="border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400 mb-4">
            You haven’t written anything yet.
          </p>

          <p className="text-gray-500 text-sm mb-6">
            Start your first journal entry and begin your journey.
          </p>

          <button className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg">
            Write your first entry
          </button>
        </div>

        {/* Demo entries */}
        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-medium text-gray-300">Recent entries</h2>

          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-800 rounded-lg p-4 hover:bg-gray-900 transition"
            >
              <h3 className="font-medium">Entry #{i}</h3>
              <p className="text-sm text-gray-400 mt-1">
                This is a sample journal entry preview...
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
