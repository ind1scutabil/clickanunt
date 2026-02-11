"use client";
import { useState } from "react";
import TurnstileWidget from "@/app/components/TurnstileWidget";
import { getCsrfToken } from "@/lib/security/csrf-client";
import { useRouter } from "next/navigation";

type AccountType = "personal" | "business";

interface FormData {
  // Basic
  email: string;
  password: string;
  confirmPassword: string;
  
  // Personal
  firstName: string;
  lastName: string;
  
  // Business
  businessName: string;
  businessCUI: string;
  businessRegCom: string;
  businessPhone: string;
  businessEmail: string;
  businessLocation: string;
  businessDescription: string;
  contactPersonName: string;
}

interface ValidationError {
  [key: string]: string;
}

export default function SignupFormExtended() {
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    businessName: "",
    businessCUI: "",
    businessRegCom: "",
    businessPhone: "",
    businessEmail: "",
    businessLocation: "",
    businessDescription: "",
    contactPersonName: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError>({});
  const [currentStep, setCurrentStep] = useState<"type" | "basic" | "details">("type");
  const router = useRouter();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateCUI = (cui: string): boolean => {
    // Romanian CUI format: 8-10 digits or 2 letters + 6-8 digits
    return /^(RO)?[0-9]{6,10}$|^[A-Z]{2}[0-9]{6,8}$/.test(cui.replace(/[^A-Z0-9]/g, ""));
  };

  const validatePersonal = (): boolean => {
    const newErrors: ValidationError = {};

    if (!validateEmail(formData.email)) newErrors.email = "Email invalid";
    if (formData.password.length < 8) newErrors.password = "Parola trebuie să aibă minimum 8 caractere";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Parolele nu se potrivesc";
    if (!formData.firstName.trim()) newErrors.firstName = "Prenumele este obligatoriu";
    if (!formData.lastName.trim()) newErrors.lastName = "Numele de familie este obligatoriu";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBusiness = (): boolean => {
    const newErrors: ValidationError = {};

    if (!validateEmail(formData.email)) newErrors.email = "Email invalid";
    if (formData.password.length < 8) newErrors.password = "Parola trebuie să aibă minimum 8 caractere";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Parolele nu se potrivesc";
    if (!formData.businessName.trim()) newErrors.businessName = "Numele companiei este obligatoriu";
    if (!formData.businessCUI.trim()) newErrors.businessCUI = "CUI este obligatoriu";
    if (!validateCUI(formData.businessCUI)) newErrors.businessCUI = "Format CUI invalid (ex: RO12345678)";
    if (!formData.businessRegCom.trim()) newErrors.businessRegCom = "Numărul de înregistrare în registrul comerțului este obligatoriu";
    if (!formData.businessPhone.trim()) newErrors.businessPhone = "Telefon business obligatoriu";
    if (!formData.contactPersonName.trim()) newErrors.contactPersonName = "Numele persoanei de contact este obligatoriu";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === "type") {
      setCurrentStep("basic");
    } else if (currentStep === "basic") {
      if (validateEmail(formData.email) && 
          formData.password.length >= 8 && 
          formData.password === formData.confirmPassword) {
        setCurrentStep("details");
      } else {
        setErrors({
          email: !validateEmail(formData.email) ? "Email invalid" : "",
          password: formData.password.length < 8 ? "Parola prea scurtă" : "",
          confirmPassword: formData.password !== formData.confirmPassword ? "Parolele nu se potrivesc" : "",
        });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep === "details") {
      setCurrentStep("basic");
    } else if (currentStep === "basic") {
      setCurrentStep("type");
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate based on account type
      const isValid = accountType === "personal" ? validatePersonal() : validateBusiness();
      if (!isValid) {
        setMessageType("error");
        setMessage("Vă rugăm verificați erori în formular");
        setLoading(false);
        return;
      }

      // Prepare registration data
      if (!turnstileToken) {
        throw new Error("Verificarea bot este necesară");
      }

      const registerData = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        accountType,
        turnstileToken,
        // Personal fields
        name: accountType === "personal" 
          ? `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()
          : formData.contactPersonName.trim(),
        // Business fields
        ...(accountType === "business" && {
          businessName: formData.businessName.trim(),
          businessCUI: formData.businessCUI.trim().replace(/[^0-9]/g, ""),
          businessRegCom: formData.businessRegCom.trim(),
          businessPhone: formData.businessPhone.trim(),
          businessEmail: formData.businessEmail.trim() || formData.email,
          businessLocation: formData.businessLocation.trim(),
          businessDescription: formData.businessDescription.trim(),
        }),
      };

      // Register user
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/auth/register-extended", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(registerData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Eroare la crearea contului");
      }

      setMessageType("success");
      setMessage(accountType === "business" 
        ? "✅ Cont business creat! Verifică-ți emailul pentru activare..."
        : "✅ Cont creat cu succes! Verifică-ți emailul pentru activare...");

      // Redirect to verification
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
      }, 2000);
    } catch (err: unknown) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* STEP 1: SELECT ACCOUNT TYPE */}
      {currentStep === "type" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alege tipul de cont</h3>
            <div className="space-y-3">
              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition" 
                     style={{ borderColor: accountType === "personal" ? "#4f46e5" : "#d1d5db" }}>
                <input
                  type="radio"
                  name="accountType"
                  value="personal"
                  checked={accountType === "personal"}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-4 h-4 mt-1 text-indigo-600"
                />
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">👤 Cont Personal</p>
                  <p className="text-sm text-gray-600">Pentru utilizatori particulari care cumpără și vând ocazional</p>
                  <p className="text-xs text-gray-500 mt-2">• Facturi cu date personale</p>
                </div>
              </label>

              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition"
                     style={{ borderColor: accountType === "business" ? "#4f46e5" : "#d1d5db" }}>
                <input
                  type="radio"
                  name="accountType"
                  value="business"
                  checked={accountType === "business"}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-4 h-4 mt-1 text-indigo-600"
                />
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">🏢 Cont Business/Profesionist</p>
                  <p className="text-sm text-gray-600">Pentru firme, dealeri și profesionisti care vând regulat</p>
                  <p className="text-xs text-gray-500 mt-2">• Facturi cu date companiei (CUI, Reg. Com.)</p>
                  <p className="text-xs text-gray-500">• Acces la funcții business avansate</p>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <TurnstileWidget onVerify={setTurnstileToken} action="register" />
          </div>

          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${
              messageType === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleNextStep}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Continuă →
          </button>
        </div>
      )}

      {/* STEP 2: BASIC INFORMATION */}
      {currentStep === "basic" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informații de Autentificare
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                errors.email ? "border-red-500 focus:ring-2 focus:ring-red-500" : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
              }`}
              placeholder="exemplu@email.com"
              required
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Parolă</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                errors.password ? "border-red-500 focus:ring-2 focus:ring-red-500" : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
              }`}
              placeholder="Minim 8 caractere, 1 literă, 1 cifră"
              required
            />
            {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Confirma Parolă</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                errors.confirmPassword ? "border-red-500 focus:ring-2 focus:ring-red-500" : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
              }`}
              placeholder="••••••••"
              required
            />
            {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex-1 border-2 border-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition"
            >
              ← Înapoi
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Continuă →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PERSONAL OR BUSINESS DETAILS */}
      {currentStep === "details" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {accountType === "personal" ? "Informații Personale" : "Informații Legale & Facturare"}
            </h3>
          </div>

          {/* PERSONAL DETAILS */}
          {accountType === "personal" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Prenume</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="ex: Ion"
                  required
                />
                {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Nume de Familie</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="ex: Popescu"
                  required
                />
                {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </>
          )}

          {/* BUSINESS DETAILS */}
          {accountType === "business" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>ℹ️ Informații Legale:</strong> Datele introduse vor fi folosite pentru generarea automată a facturilor.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Nume Companie *</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                    errors.businessName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="ex: FIRMA SRL"
                  required
                />
                {errors.businessName && <p className="text-red-600 text-xs mt-1">{errors.businessName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">CUI/Cod Fiscal *</label>
                  <input
                    type="text"
                    value={formData.businessCUI}
                    onChange={(e) => handleInputChange("businessCUI", e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                      errors.businessCUI ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="ex: RO12345678"
                    required
                  />
                  {errors.businessCUI && <p className="text-red-600 text-xs mt-1">{errors.businessCUI}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Reg. Comerț *</label>
                  <input
                    type="text"
                    value={formData.businessRegCom}
                    onChange={(e) => handleInputChange("businessRegCom", e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                      errors.businessRegCom ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="ex: J46/123/2024"
                    required
                  />
                  {errors.businessRegCom && <p className="text-red-600 text-xs mt-1">{errors.businessRegCom}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Telefon Business *</label>
                <input
                  type="tel"
                  value={formData.businessPhone}
                  onChange={(e) => handleInputChange("businessPhone", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                    errors.businessPhone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="ex: +40712345678"
                  required
                />
                {errors.businessPhone && <p className="text-red-600 text-xs mt-1">{errors.businessPhone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Email Business</label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => handleInputChange("businessEmail", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition"
                  placeholder="ex: office@firma.ro (opțional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Locație Companie</label>
                <input
                  type="text"
                  value={formData.businessLocation}
                  onChange={(e) => handleInputChange("businessLocation", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition"
                  placeholder="ex: Jud. Gorj, Municipiul Târgu Jiu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Descriere Activitate</label>
                <textarea
                  value={formData.businessDescription}
                  onChange={(e) => handleInputChange("businessDescription", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition"
                  placeholder="ex: Comerț cu autovehicule"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Persoană de Contact *</label>
                <input
                  type="text"
                  value={formData.contactPersonName}
                  onChange={(e) => handleInputChange("contactPersonName", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg outline-none transition ${
                    errors.contactPersonName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="ex: Ion Popescu"
                  required
                />
                {errors.contactPersonName && <p className="text-red-600 text-xs mt-1">{errors.contactPersonName}</p>}
              </div>
            </>
          )}

          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${
              messageType === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex-1 border-2 border-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              ← Înapoi
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Se creeaza cont..." : "Creeaza Cont"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
