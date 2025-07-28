"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheckCircle, faClock, faForward } from "@fortawesome/free-solid-svg-icons";
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

interface Tryout {
  id: string;
  name: string;
  total_questions?: number;
  duration_minutes?: number;
  exam_category?: string;
}

interface Question {
  id: number;
  tryout_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  test_category: string;
}

interface AttemptData {
  attempt_number: number;
}

// Tipe untuk categoryTotals
interface CategoryTotal {
  correct: number;
  total: number;
}

// Tipe untuk categoryScores
interface CategoryScores {
  [key: string]: number;
}

const supabaseUrl = "https://akpkltltfwyjitbhwtne.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcGtsdGx0Znd5aml0Ymh3dG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTk4NzUsImV4cCI6MjA2OTIzNTg3NX0.Kb7-L2FCCymQTbvQOksbzOCi_9twUrX0lFq9cho1WNI";
const supabase = createClient(supabaseUrl, supabaseKey);

// Konfigurasi durasi per subtest (dalam menit)
const subtestDurations: { [key: string]: number } = {
  "Penalaran Umum": 30,
  "Pengetahuan dan Pemahaman Umum": 15,
  "Pemahaman Bacaan dan Menulis": 25,
  "Pengetahuan Kuantitatif": 20,
  "Literasi Bahasa Indonesia": 42.5,
  "Literasi Bahasa Inggris": 20,
  "Penalaran Matematika": 42.5,
};

export default function KerjakanTryout() {
  const router = useRouter();
  const { id } = useParams();
  const [tryout, setTryout] = useState<Tryout | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentSubtest, setCurrentSubtest] = useState("");
  const [subtestQuestions, setSubtestQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTryoutDetail();
  }, [id]);

  const fetchTryoutDetail = async () => {
    setLoading(true);
    try {
      const tryoutId = String(id);
      if (!tryoutId) throw new Error("ID tryout tidak valid");

      const { data: tryoutData, error: tryoutError } = await supabase
        .from("tryouts")
        .select("id, name, total_questions, duration_minutes, exam_category")
        .eq("id", tryoutId)
        .single();
      if (tryoutError) throw tryoutError;
      setTryout(tryoutData);

      const { data, error } = await supabase
        .from("questions")
        .select("id, tryout_id, question_text, option_a, option_b, option_c, option_d, correct_answer, test_category")
        .eq("tryout_id", tryoutId);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Tidak ada soal yang ditemukan");
      setQuestions(data);

      const firstSubtest = data[0]?.test_category || "";
      setCurrentSubtest(firstSubtest);
      updateSubtest(firstSubtest, data);
    } catch (err) {
      console.error("Error saat mengambil tryout atau soal:", err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err instanceof Error ? err.message : "Gagal memuat tryout atau soal!",
        confirmButtonColor: "#4B5EFC",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubtest = (subtest: string, allQuestions: Question[]) => {
    const subtestQs = allQuestions.filter((q) => q.test_category === subtest);
    setSubtestQuestions(subtestQs);
    const durationInMinutes = subtestDurations[subtest] || 0;
    const durationInSeconds = Math.round(durationInMinutes * 60);
    setTimeLeft(durationInSeconds);
    setCurrentQuestion(0); // Selalu mulai dari soal pertama (pagination 1)
  };

  useEffect(() => {
    if (timeLeft > 0 && !loading) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleNextSubtest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, loading, currentSubtest]);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers((prev) => {
      if (prev[questionId] === answer) {
        const { [questionId]: _, ...newAnswers } = prev;
        return newAnswers;
      }
      return {
        ...prev,
        [questionId]: answer,
      };
    });
  };

  const handleNext = () => {
    const currentSubtestQs = subtestQuestions;
    if (currentQuestion < currentSubtestQs.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleGoToQuestion = (index: number) => {
    if (index >= 0 && index < subtestQuestions.length) {
      setCurrentQuestion(index);
    }
  };

  const handleNextSubtest = () => {
    const allSubtests = [
      "Penalaran Umum",
      "Pengetahuan dan Pemahaman Umum",
      "Pemahaman Bacaan dan Menulis",
      "Pengetahuan Kuantitatif",
      "Literasi Bahasa Indonesia",
      "Literasi Bahasa Inggris",
      "Penalaran Matematika",
    ];
    const currentIndex = allSubtests.indexOf(currentSubtest);
    if (currentIndex < allSubtests.length - 1) {
      const nextSubtest = allSubtests[currentIndex + 1];
      setCurrentSubtest(nextSubtest);
      updateSubtest(nextSubtest, questions);
    } else {
      handleSubmit();
    }
  };

  const calculateCategoryScores = (questions: Question[], answers: Record<number, string>) => {
    const categoryTotals: { [key: string]: CategoryTotal } = {
      "Penalaran Umum": { correct: 0, total: questions.filter((q) => q.test_category === "Penalaran Umum").length || 30 },
      "Pengetahuan dan Pemahaman Umum": { correct: 0, total: questions.filter((q) => q.test_category === "Pengetahuan dan Pemahaman Umum").length || 20 },
      "Pemahaman Bacaan dan Menulis": { correct: 0, total: questions.filter((q) => q.test_category === "Pemahaman Bacaan dan Menulis").length || 20 },
      "Pengetahuan Kuantitatif": { correct: 0, total: questions.filter((q) => q.test_category === "Pengetahuan Kuantitatif").length || 20 },
      "Literasi Bahasa Indonesia": { correct: 0, total: questions.filter((q) => q.test_category === "Literasi Bahasa Indonesia").length || 30 },
      "Literasi Bahasa Inggris": { correct: 0, total: questions.filter((q) => q.test_category === "Literasi Bahasa Inggris").length || 20 },
      "Penalaran Matematika": { correct: 0, total: questions.filter((q) => q.test_category === "Penalaran Matematika").length || 20 },
    };

    questions.forEach((q) => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) categoryTotals[q.test_category].correct += 1;
    });

    const categoryScores: CategoryScores = {};
    for (let category in categoryTotals) {
      const { correct, total } = categoryTotals[category];
      const percentage = total > 0 ? (correct / total) * 100 : 0;
      categoryScores[category] = Math.round((percentage / 100) * 1000);
    }

    const overallScore = Math.round(
      Object.values(categoryScores).reduce((sum: number, score: number) => sum + score, 0) /
        (Object.keys(categoryScores).length || 1)
    );

    return { categoryScores, overallScore };
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "warning",
          title: "Silakan Login!",
          text: "Kamu perlu login untuk menyimpan hasil.",
          confirmButtonText: "OK",
          confirmButtonColor: "#16A34A",
        }).then(() => {
          router.push("/login");
        });
        return;
      }

      const decodedToken = jwtDecode<CustomJwtPayload>(token);
      const userId = decodedToken.user.id;
      if (!userId || isNaN(userId)) throw new Error("User ID tidak ditemukan atau tidak valid dari token");

      const tryoutId = String(id);

      const { data: attemptData, error: attemptError } = await supabase
        .from("user_tryout_results")
        .select("attempt_number")
        .eq("user_id", userId)
        .eq("tryout_id", tryoutId)
        .order("attempt_number", { ascending: false })
        .limit(1);
      if (attemptError) throw attemptError;

      const nextAttempt = attemptData && attemptData.length > 0 ? attemptData[0].attempt_number + 1 : 1;

      const validAnswers = questions.map((q) => ({
        user_id: userId,
        tryout_id: tryoutId,
        question_id: q.id,
        user_answer: answers[q.id] || null,
        correct_answer: q.correct_answer,
        attempt_number: nextAttempt,
      }));

      const promises = validAnswers.map((data) =>
        supabase.from("user_tryout_results").insert({
          user_id: data.user_id,
          tryout_id: data.tryout_id,
          question_id: data.question_id,
          user_answer: data.user_answer,
          correct_answer: data.correct_answer,
          attempt_number: data.attempt_number,
        })
      );
      await Promise.all(promises);

      const { categoryScores, overallScore } = calculateCategoryScores(questions, answers);

      await supabase.from("user_tryout_scores").insert({
        user_id: userId,
        tryout_id: tryoutId,
        attempt_number: nextAttempt,
        overall_score: overallScore,
        category_scores: categoryScores,
        created_at: new Date().toISOString(),
      });

      Swal.fire({
        icon: "success",
        title: "Selesai!",
        text: "Jawaban telah disimpan. Lihat hasil di halaman nilai.",
        confirmButtonText: "OK",
        confirmButtonColor: "#16A34A",
      }).then(() => {
        router.push(`/program/nilai/${id}?attempt=${nextAttempt}`);
      });
    } catch (err) {
      console.error("Error saat menyimpan jawaban:", err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err instanceof Error ? err.message : "Gagal menyimpan jawaban! Periksa console untuk detail.",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100">
        <div className="flex items-center gap-3 text-indigo-700 animate-pulse">
          <div className="w-10 h-10 border-4 border-t-indigo-700 border-b-transparent rounded-full animate-spin"></div>
          <span className="text-2xl font-semibold">Memuat Tryout...</span>
        </div>
      </div>
    );
  }

  if (!tryout || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100">
        <div className="text-center">
          <span className="text-xl text-red-600 font-semibold">Tryout atau soal tidak ditemukan</span>
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

  const currentQuestionData = subtestQuestions[currentQuestion] || ({} as Question);
  const selectedAnswer = answers[currentQuestionData.id];

  const allSubtests = [
    "Penalaran Umum",
    "Pengetahuan dan Pemahaman Umum",
    "Pemahaman Bacaan dan Menulis",
    "Pengetahuan Kuantitatif",
    "Literasi Bahasa Indonesia",
    "Literasi Bahasa Inggris",
    "Penalaran Matematika",
  ];
  const currentIndex = allSubtests.indexOf(currentSubtest);
  const isLastSubtest = currentIndex === allSubtests.length - 1;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg animate-fadeIn">
            <button
              onClick={() => router.back()}
              className="p-3 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-all duration-300 hover:scale-110"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-6 h-6 text-indigo-700" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900 text-center flex-1 animate-bounceIn">
              {tryout.name} - {tryout.exam_category}
            </h1>
            <div className="text-lg sm:text-xl font-semibold text-indigo-800 flex items-center animate-slideIn">
              <FontAwesomeIcon icon={faClock} className="mr-2 text-yellow-500" />
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg mb-6 animate-fadeInUp delay-100">
            <div className="flex justify-between items-center mb-4 bg-indigo-50 p-3 rounded-lg">
              <span className="text-lg text-indigo-800 font-medium">
                Kategori: {currentQuestionData.test_category}
              </span>
              <span className="text-lg text-indigo-800 font-medium">
                Soal {currentQuestion + 1} dari {subtestQuestions.length}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-indigo-900 mb-4">
              {currentQuestionData.question_text}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["A", "B", "C", "D"].map((option) => {
                const optionText = currentQuestionData[`option_${option.toLowerCase()}` as keyof Question] || "";
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(currentQuestionData.id, option)}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 flex items-center justify-between ${
                      selectedAnswer === option
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-100 border-gray-300 hover:bg-indigo-100"
                    } text-base sm:text-lg`}
                  >
                    <span className="font-bold">{option})</span>
                    <span>{optionText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation and Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6 animate-fadeInUp delay-200">
            <div className="flex gap-4">
              <button
                onClick={handleBack}
                disabled={currentQuestion === 0}
                className={`px-4 py-2 rounded-lg text-lg shadow-md transition-all duration-300 flex items-center gap-2 ${
                  currentQuestion === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
                Kembali
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-lg shadow-md"
              >
                Keluar
              </button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {subtestQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleGoToQuestion(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    index === currentQuestion
                      ? "bg-indigo-600 text-white"
                      : answers[subtestQuestions[index]?.id || index]
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              {currentQuestion < subtestQuestions.length - 1 && (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 text-lg shadow-md"
                >
                  Lanjut
                  <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
                </button>
              )}
              {currentQuestion === subtestQuestions.length - 1 && !isLastSubtest && (
                <button
                  onClick={handleNextSubtest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-lg shadow-md"
                >
                  Lanjut ke Subtest Berikutnya
                  <FontAwesomeIcon icon={faForward} className="w-5 h-5" />
                </button>
              )}
              {currentQuestion === subtestQuestions.length - 1 && isLastSubtest && (
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 text-lg shadow-md"
                >
                  Selesai
                  <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center animate-fadeInUp delay-300">
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-semibold text-lg shadow-lg"
            >
              Submit Sekarang
            </button>
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
  .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
  .animate-fadeInUp { animation: fadeInUp 0.5s ease-in-out; }
  .animate-bounceIn { animation: bounceIn 0.8s ease-in-out; }
  .animate-slideIn { animation: slideIn 0.5s ease-in-out; }
`;

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);
document.adoptedStyleSheets = [styleSheet];
