import { Suspense } from 'react';
import Navbar from '@/app/components/Navbar';
import VerifyEmailForm from './verify-form';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent mb-2">
              Verifică Email
            </h1>
            <p className="text-gray-400">Am trimis un cod de verificare la emailul tău</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
            <Suspense fallback={<div className="text-center text-gray-400">Se încarcă...</div>}>
              <VerifyEmailForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
