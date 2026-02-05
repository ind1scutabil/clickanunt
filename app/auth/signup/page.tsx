import SignupForm from "@/app/components/SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            ClickAnunț
          </h1>
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Creeaza Cont
          </h2>
          
          <SignupForm />

          <p className="text-center text-gray-600 mt-6">
            Ai deja cont?{" "}
            <Link 
              href="/auth/login" 
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Conecteaza-te
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Alege tipul de cont potrivit pentru tine: particular sau profesionist</p>
        </div>
      </div>
    </div>
  );
}
