"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faClock, faList, faCheckCircle, faLock, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";

// Definisikan tipe kustom untuk JwtPayload
interface CustomJwtPayload {
  sub: string;
  user?: {
    id?: number;
    photo_profile?: string;
    name?: string;
  };
}

interface Tryout {
  id: number;
  name: string;
  is_active: boolean;
  program_id: number;
  total_questions?: number;
  duration_minutes?: number;
  exam_category?: string;
  is_free?: boolean;
  price?: number;
  created_at?: string;
}

const supabaseUrl = "https://akpkltltfwyjitbhwtne.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcGtsdGx0Znd5aml0Ymh3dG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTk4NzUsImV4cCI6MjA2OTIzNTg3NX0.Kb7-L2FCCymQTbvQOksbzOCi_9twUrX0lFq9cho1WNI";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DetailTryout() {
  const router = useRouter();
  const { id } = useParams();
  const [tryout, setTryout] = useState<Tryout | null>(null);
  const [name, setName] = useState("");
  const [photoProfile, setPhotoProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const fetchTryoutDetail = async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      const tryoutId = Number(id);
      if (isNaN(tryoutId)) throw new Error("ID tryout tidak valid");

      // Dapatkan program_id dari tryout
      const { data: tryoutData, error: tryoutError } = await supabase
        .from("tryouts")
        .select("id, name, is_active, program_id, created_at, total_questions, duration_minutes, exam_category, is_free, price")
        .eq("id", tryoutId)
        .single();
      if (tryoutError) throw tryoutError;
      setTryout(tryoutData);

      // Cek registrasi user untuk program terkait tryout
      const { data: registration, error: regError } = await supabase
        .from("user_registrations")
        .select("id")
        .eq("user_id", userId)
        .eq("program_id", tryoutData.program_id)
        .single();
      if (regError || !registration) {
        setError("Anda belum terdaftar untuk program ini.");
        setIsAuthorized(false);
        return;
      }
      setIsAuthorized(true);
    } catch (err) {
      setError("Gagal memuat detail tryout: " + (err as Error).message);
      console.error("Error fetching tryout detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) {
      Swal.fire({
        title: "Akses Ditolak",
        text: "Silakan login atau daftar terlebih dahulu!",
        icon: "warning",
        confirmButtonText: "Login",
        confirmButtonColor: "#DC2626",
        showCancelButton: true,
        cancelButtonText: "Kembali",
        cancelButtonColor: "#6B7280",
      }).then((result) => {
        if (result.isConfirmed) router.push("/login");
        else router.back();
      });
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      const user = decoded.user || {};
      setPhotoProfile(user.photo_profile || "");
      const userId = Number(decoded.sub) || Number(user.id);
      if (!userId) {
        setError("User ID tidak valid.");
        setLoading(false);
        return;
      }
      fetchTryoutDetail(userId);
    } catch (error) {
      console.error("Invalid token:", error);
      setName("");
      setPhotoProfile("");
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-100 to-indigo-100">
        <div className="flex items-center gap-3 text-indigo-700 animate-pulse">
          <div className="w-10 h-10 border-4 border-t-indigo-700 border-b-transparent rounded-full animate-spin"></div>
          <span className="text-2xl font-semibold">Memuat Detail Tryout...</span>
        </div>
      </div>
    );
  }

  if (error || !isAuthorized || !tryout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-100 to-indigo-100">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-4xl mr-2 animate-pulse" />
            <p className="text-red-600 text-2xl font-semibold">{error || "Akses tidak diizinkan"}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <main className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-purple-100 to-indigo-100 p-4 sm:p-6 lg:p-8 ml-16 overflow-x-hidden max-w-full">
        {/* Header Section with Animation */}
        <div className="flex items-center justify-between mb-8 animate-fadeIn">
          <div className="flex items-center">
            <button
              onClick={() => window.history.back()}
              className="mr-4 p-3 bg-white rounded-full shadow-md hover:bg-blue-50 hover:shadow-lg transition-all duration-300 transform hover:scale-110"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-blue-600" />
            </button>
            <div className="h-3 w-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
            <h1 className="ml-3 text-2xl sm:text-3xl font-bold text-blue-800 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Detail Tryout
            </h1>
          </div>
          {name && (
            <div className="flex items-center gap-2 animate-slideIn">
              {photoProfile && (
                <img
                  src={photoProfile}
                  alt="Profile"
                  className="h-10 w-10 rounded-full object-cover border-2 border-yellow-400 hover:border-yellow-500 transition-all duration-300"
                />
              )}
              <span className="text-sm font-medium text-blue-800">{name}</span>
            </div>
          )}
        </div>

        {/* Main Content with Decorative Elements */}
        <div className="flex justify-center my-10">
          <div className="w-full max-w-[1000px] bg-white/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-blue-200 hover:shadow-blue-200/50 transition-all duration-500 transform hover:scale-102">
            {/* Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl opacity-50 -z-10 animate-pulse-slow"></div>

            {/* Title Section */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 mb-8 animate-bounceIn">
              {tryout.name}
            </h2>

            {/* Details Section with Icons and Animation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-800">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-300 animate-fadeInUp">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 w-6 h-6" />
                <div>
                  <span className="text-lg font-medium">Kategori</span>
                  <span className="block text-xl font-semibold mt-1">{tryout.exam_category || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all duration-300 animate-fadeInUp delay-100">
                <FontAwesomeIcon icon={faList} className="text-indigo-500 w-6 h-6" />
                <div>
                  <span className="text-lg font-medium">Jumlah Soal</span>
                  <span className="block text-xl font-semibold mt-1">{tryout.total_questions || "N/A"} Soal</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-300 animate-fadeInUp delay-200">
                <FontAwesomeIcon icon={faClock} className="text-blue-500 w-6 h-6" />
                <div>
                  <span className="text-lg font-medium">Durasi</span>
                  <span className="block text-xl font-semibold mt-1">{tryout.duration_minutes || "N/A"} Menit</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-all duration-300 animate-fadeInUp">
                <FontAwesomeIcon icon={tryout.is_free ? faCheckCircle : faLock} className={tryout.is_free ? "text-green-500" : "text-red-500"} />
                <div>
                  <span className="text-lg font-medium">Harga</span>
                  <span className="block text-xl font-semibold mt-1">
                    {tryout.is_free ? "Gratis" : `Rp ${Number(tryout.price || 0).toLocaleString("id-ID")}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-all duration-300 animate-fadeInUp delay-300">
                <span className="w-6 h-6"></span> {/* Placeholder for alignment */}
                <div>
                  <span className="text-lg font-medium">Dibuat</span>
                  <span className="block text-xl font-semibold mt-1">
                    {tryout.created_at ? new Date(tryout.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-300 animate-fadeInUp delay-400">
                <span className="w-6 h-6"></span> {/* Placeholder for alignment */}
                <div>
                  <span className="text-lg font-medium">Status</span>
                  <span className="block text-xl font-semibold mt-1">{tryout.is_active ? "Aktif" : "Tidak Aktif"}</span>
                </div>
              </div>
            </div>

            {/* Button Section with Animation */}
            <div className="flex justify-center mt-10">
              <button
                onClick={() => router.push(`/program/detail_soal/${tryout.id}`)}
                className="w-[300px] h-14 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xl font-semibold rounded-2xl flex items-center justify-center hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 transform hover:scale-105 animate-pulse-slow"
              >
                Dapatkan Soal
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// CSS Animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes bounceIn {
    0% { transform: scale(0.9); opacity: 0; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes slideIn {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes pulseSlow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
  .animate-fadeInUp { animation: fadeInUp 0.5s ease-in-out; }
  .animate-bounceIn { animation: bounceIn 0.8s ease-in-out; }
  .animate-slideIn { animation: slideIn 0.5s ease-in-out; }
  .animate-pulse-slow { animation: pulseSlow 2s infinite; }
`;

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);
document.adoptedStyleSheets = [styleSheet];
