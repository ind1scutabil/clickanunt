"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TestLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-login test user for development
    const testUser = {
      id: "test-user-123",
      email: "test@autoplatform.ro",
      name: "Test User",
      role: "user",
      trustScore: 50,
      isVerified: false
    };

    const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGF1dG9wbGF0Zm9ybS5ybyIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.test";

    localStorage.setItem("user", JSON.stringify(testUser));
    localStorage.setItem("accessToken", testToken);

    console.log("✅ Test user logged in:", testUser);

    // Redirect to new listing page
    setTimeout(() => {
      router.push("/listings/new");
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">🔐 Test Login</h1>
        <p className="text-gray-300">Loghând în ca test user...</p>
        <p className="text-gray-400 mt-4 text-sm">Vei fi redirecționat la pagina de creare anunț...</p>
      </div>
    </div>
  );
}
