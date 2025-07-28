"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faTrophy, faStar, faHistory } from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";

// Definisikan tipe kustom untuk JwtPayload
interface CustomJwtPayload {
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  iat: number;
}

// Definisikan tipe untuk data attempt
interface AttemptItem {
  attempt_number: number | null;
}

interface QuestionResult {
  id: number;
  question_text: string;
  user_answer: string | null;
  correct_answer: string;
  test_category: string;
  difficulty?: number; // Parameter kesulitan item (b) untuk IRT
}

const supabaseUrl = "https://akpkltltfwyjitbhwtne.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcGtsdGx0Znd5aml0Ymh3dG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTk4NzUsImV4cCI6MjA2OTIzNTg3NX0.Kb7-L2FCCymQTbvQOksbzOCi_9twUrX0lFq9cho1WNI";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function NilaiTryout() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const attempt = Number(searchParams.get("attempt")) || 1;
  const [scoreData, setScoreData] = useState<{
    overall_score: number;
    category_scores: Record<string, number>;
  } | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<number[]>([]);

  // Fungsi untuk menghitung probabilitas jawaban benar berdasarkan model 1PL Rasch
  const calculateProbability = (theta: number, difficulty: number) => {
    return 1 / (1 + Math.exp(-(theta - difficulty)));
  };

  // Fungsi untuk menghitung skor IRT per subtest
  const calculateIRTScore = (results: QuestionResult[], subtest: string) => {
    const subtestResults = results.filter((r) => r.test_category === subtest);
    if (subtestResults.length === 0) return 0;

    // Asumsi theta (kemampuan peserta) dihitung sederhana berdasarkan jumlah jawaban benar
    const correctCount = subtestResults.filter(
      (r) => r.user_answer === r.correct_answer
    ).length;
    const totalQuestions = subtestResults.length;
    const theta = Math.log(correctCount / (totalQuestions - correctCount + 0.5)); // Hindari pembagian nol

    // Hitung total probabilitas untuk jawaban benar
    let totalProbability = 0;
    subtestResults.forEach((result) => {
      const difficulty = result.difficulty ?? (Math.random() * 4 - 2); // Dummy difficulty [-2, 2]
      if (result.user_answer === result.correct_answer) {
        totalProbability += calculateProbability(theta, difficulty);
      }
    });

    // Skalakan ke 0-1000
    const maxProbability = subtestResults.length; // Maksimum probabilitas jika semua benar
    const scaledScore = (totalProbability / maxProbability) * 1000;
    return Math.round(scaledScore);
  };

  useEffect(() => {
    fetchScore();
    fetchAttempts();
    fetchQuestionResults();
  }, [id, attempt]);

  const fetchScore = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token tidak ditemukan");

      const decodedToken = jwtDecode<CustomJwtPayload>(token);
      const userId = decodedToken.user.id;

      const { data, error } = await supabase
        .from("user_tryout_scores")
        .select("overall_score, category_scores")
        .eq("user_id", userId)
        .eq("tryout_id", id)
        .eq("attempt_number", attempt)
        .single();
      if (error) throw error;
      setScoreData(data);
    } catch (err) {
      console.error("Error fetching score:", err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal memuat nilai!",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token tidak ditemukan");

      const decodedToken = jwtDecode<CustomJwtPayload>(token);
      const userId = decodedToken.user.id;

      const { data, error } = await supabase
        .from("user_tryout_results")
        .select("attempt_number")
        .eq("user_id", userId)
        .eq("tryout_id", id);
      if (error) throw error;

      const attemptNumbers = data.map((item: AttemptItem) => item.attempt_number);
      const filteredNumbers = attemptNumbers.filter((num): num is number => num !== null);
      const uniqueAttempts = Array.from(new Set<number>(filteredNumbers)).sort((a, b) => a - b);

      setAttempts(uniqueAttempts);
    } catch (err) {
      console.error("Error fetching attempts:", err);
    }
  };

const fetchQuestionResults = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Token tidak ditemukan");

    const decodedToken = jwtDecode<CustomJwtPayload>(token);
    const userId = decodedToken.user.id;

    // Ambil hasil jawaban user
    const { data, error } = await supabase
      .from("user_tryout_results")
      .select("question_id, user_answer, correct_answer")
      .eq("user_id", userId)
      .eq("tryout_id", id)
      .eq("attempt_number", attempt)
      .order("question_id");

    if (error) throw error;

    // Pastikan question_id array valid (number[])
    const questionIds: number[] = data
      .map((item) => item.question_id)
      .filter((id): id is number => typeof id === "number");

    // Ambil data soal dari tabel questions, termasuk difficulty
    const { data: questions, error: questionError } = await supabase
      .from("questions")
      .select("id, question_text, test_category, difficulty")
      .in("id", questionIds);

    if (questionError) throw questionError;

    // Gabungkan hasil jawaban dengan data soal
    const results: QuestionResult[] = data.map((result) => {
      const question = questions.find((q) => q.id === result.question_id);
      return {
        id: result.question_id,
        question_text: question?.question_text || "Soal tidak ditemukan",
        user_answer: result.user_answer,
        correct_answer: result.correct_answer,
        test_category: question?.test_category || "Unknown",
        difficulty: question?.difficulty ?? (Math.random() * 4 - 2), // Dummy difficulty jika kosong
      };
    });

    // Subtest yang dihitung
    const subtests = [
      "Penalaran Umum",
      "Pengetahuan dan Pemahaman Umum",
      "Pemahaman Bacaan dan Menulis",
      "Pengetahuan Kuantitatif",
      "Literasi Bahasa Indonesia",
      "Literasi Bahasa Inggris",
      "Penalaran Matematika",
    ];

    // Hitung skor per subtest
    const categoryScores: Record<string, number> = {};
    subtests.forEach((subtest) => {
      categoryScores[subtest] = calculateIRTScore(results, subtest);
    });

    // Hitung skor keseluruhan sebagai rata-rata dari semua subtest
    const overallScore =
      subtests.reduce((sum, subtest) => sum + (categoryScores[subtest] || 0), 0) /
      subtests.length;

    // Simpan hasil ke state
    setScoreData({
      overall_score: Math.round(overallScore),
      category_scores: categoryScores,
    });
    setQuestionResults(results);
  } catch (err) {
    console.error("Error fetching question results:", err);
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Gagal memuat hasil jawaban!",
    });
  }
};


  const handleChangeAttempt = (newAttempt: number) => {
    router.push(`/program/nilai/${id}?attempt=${newAttempt}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <span className="text-2xl text-indigo-600 animate-pulse">Memuat Nilai...</span>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <div className="text-center">
          <span className="text-xl text-red-600 font-semibold">Hasil tidak ditemukan</span>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-300 transform hover:scale-105"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const { category_scores, overall_score } = scoreData;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-4 sm:p-6">
      <main className="flex-1 mx-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-md animate-fade-in">
          <button
            onClick={() => router.back()}
            className="p-3 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-all duration-300 hover:scale-110 transform"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-6 h-6 text-indigo-700" />
          </button>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-900 text-center sm:text-left flex-1">
            LEMBAR HASIL TRYOUT UTBK 2025 - Attempt {attempt}{" "}
            <FontAwesomeIcon icon={faStar} className="text-yellow-400 ml-2 animate-pulse" />
          </h1>
          <button
            onClick={() => {
              Swal.fire({
                title: "Pilih Attempt",
                input: "select",
                inputOptions: Object.fromEntries(attempts.map((a) => [a, `Attempt ${a}`])),
                inputValue: attempt,
                showCancelButton: true,
                confirmButtonText: "Lihat",
                confirmButtonColor: "#16A34A",
                cancelButtonText: "Batal",
                customClass: {
                  popup: "animate__animated animate__fadeIn",
                },
              }).then((result) => {
                if (result.isConfirmed && result.value) {
                  handleChangeAttempt(Number(result.value));
                }
              });
            }}
            className="p-3 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-all duration-300 hover:scale-110 transform"
          >
            <FontAwesomeIcon icon={faHistory} className="w-6 h-6 text-indigo-700" />
          </button>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8 transform hover:scale-105 transition-all duration-300">
          <FontAwesomeIcon icon={faTrophy} className="text-6xl text-yellow-500 mb-6 animate-bounce" />
          <h2 className="text-4xl sm:text-5xl font-extrabold text-indigo-900 mb-4">Skor Keseluruhan</h2>
          <p className="text-6xl sm:text-7xl font-extrabold text-green-600 mb-6 animate-pulse">{overall_score.toFixed(0)}</p>
          <div className="w-full bg-gray-200 rounded-full h-6 mb-6">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-6 rounded-full"
              style={{ width: `${(overall_score / 1000) * 100}%` }}
            ></div>
          </div>
          <p className="text-xl sm:text-2xl text-gray-700 font-semibold">
            Progres Rata-rata: {((overall_score / 1000) * 100).toFixed(2)}%
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-indigo-900 mb-6">Skor Per Subtest</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-800 mb-4">Tes Skolastik</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Penalaran Umum: {(category_scores["Penalaran Umum"] || 0).toFixed(0)}</li>
                <li>Pengetahuan dan Pemahaman Umum: {(category_scores["Pengetahuan dan Pemahaman Umum"] || 0).toFixed(0)}</li>
                <li>Pemahaman Bacaan dan Menulis: {(category_scores["Pemahaman Bacaan dan Menulis"] || 0).toFixed(0)}</li>
                <li>Pengetahuan Kuantitatif: {(category_scores["Pengetahuan Kuantitatif"] || 0).toFixed(0)}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-800 mb-4">Tes Literasi</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Literasi Bahasa Indonesia: {(category_scores["Literasi Bahasa Indonesia"] || 0).toFixed(0)}</li>
                <li>Literasi Bahasa Inggris: {(category_scores["Literasi Bahasa Inggris"] || 0).toFixed(0)}</li>
                <li>Penalaran Matematika: {(category_scores["Penalaran Matematika"] || 0).toFixed(0)}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold text-indigo-900 mb-6">Daftar Jawaban</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-indigo-100">
                  <th className="py-2 px-4 border-b text-left text-indigo-800 font-semibold">No</th>
                  <th className="py-2 px-4 border-b text-left text-indigo-800 font-semibold">Soal</th>
                  <th className="py-2 px-4 border-b text-left text-indigo-800 font-semibold">Jawaban Anda</th>
                  <th className="py-2 px-4 border-b text-left text-indigo-800 font-semibold">Kunci Jawaban</th>
                  <th className="py-2 px-4 border-b text-left text-indigo-800 font-semibold">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {questionResults.map((result, index) => (
                  <tr
                    key={result.id}
                    className={result.user_answer === result.correct_answer ? "bg-green-100" : "bg-red-100"}
                  >
                    <td className="py-2 px-4 border-b">{index + 1}</td>
                    <td className="py-2 px-4 border-b">{result.question_text}</td>
                    <td className="py-2 px-4 border-b">{result.user_answer || "-"}</td>
                    <td className="py-2 px-4 border-b">{result.correct_answer}</td>
                    <td className="py-2 px-4 border-b">{result.test_category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/program/kerjakan_tryout/${id}`)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 text-xl shadow-md hover:shadow-lg transform hover:-translate-y-1"
          >
            Coba Lagi Sekarang!
          </button>
        </div>

        <div className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 sm:p-6 rounded-xl text-center animate-pulse">
          <h2 className="text-2xl sm:text-3xl font-bold">Jangan Menyerah!</h2>
          <p className="text-lg sm:text-xl mt-2">
            Setiap tryout adalah langkah menuju kesuksesanmu. Ayo lanjutkan perjuanganmu!
          </p>
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
  .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
`;

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);
document.adoptedStyleSheets = [styleSheet];