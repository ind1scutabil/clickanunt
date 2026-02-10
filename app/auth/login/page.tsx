import LoginForm from "@/app/components/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Buton înapoi acasă */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Înapoi acasă
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            ClickAnunț
          </h1>
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Autentificare
          </h2>
          
          <LoginForm />

          <p className="text-center text-gray-600 mt-6">
            Nu ai cont?{" "}
            <Link 
              href="/auth/signup" 
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Creeaza cont nou
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Demo: Foloseste orice email pentru a te conecta</p>
        </div>
      </div>
    </div>
  );
}
