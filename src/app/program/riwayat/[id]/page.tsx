"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faEye } from "@fortawesome/free-solid-svg-icons";
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

const supabaseUrl = "https://akpkltltfwyjitbhwtne.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcGtsdGx0Znd5aml0Ymh3dG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTk4NzUsImV4cCI6MjA2OTIzNTg3NX0.Kb7-L2FCCymQTbvQOksbzOCi_9twUrX0lFq9cho1WNI";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Riwayat() {
  const router = useRouter();
  const { id } = useParams();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiwayat();
  }, [id]);

  const fetchRiwayat = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token tidak ditemukan");

      const decodedToken = jwtDecode<CustomJwtPayload>(token);
      const userId = decodedToken.user.id;

      const tryoutId = Number(id);
      if (isNaN(tryoutId)) throw new Error("ID tryout tidak valid");

      // Ambil semua attempt untuk user_id dan tryout_id tertentu
      const { data: resultData, error: resultError } = await supabase
        .from("user_tryout_results")
        .select("attempt_number, question_id, user_answer, correct_answer")
        .eq("user_id", userId)
        .eq("tryout_id", tryoutId);
      if (resultError) throw resultError;

      if (!resultData || resultData.length === 0) {
        setAttempts([]);
        return;
      }

      // Kelompokkan berdasarkan attempt_number
      const attemptGroups = resultData.reduce((acc: any, item) => {
        const attemptNum = item.attempt_number;
        if (!acc[attemptNum]) {
          acc[attemptNum] = [];
        }
        acc[attemptNum].push(item);
        return acc;
      }, {});

      // Ambil total soal dari questions untuk menghitung empty
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select("id")
        .eq("tryout_id", tryoutId);
      if (questionError) throw questionError;
      const totalQuestions = questionData.length;

      // Hitung skor untuk setiap attempt
      const attemptSummaries = Object.keys(attemptGroups).map((attemptNum) => {
        const results = attemptGroups[Number(attemptNum)];
        let correct = 0, wrong = 0, empty = 0;

        questionData.forEach((q) => {
          const result = results.find((r: any) => r.question_id === q.id);
          if (result) {
            if (result.user_answer === result.correct_answer) correct++;
            else if (result.user_answer) wrong++;
          } else {
            empty++;
          }
        });

        const score = (correct * 4) + (wrong * -1);
        return {
          attempt_number: Number(attemptNum),
          correct,
          wrong,
          empty,
          score,
          total_questions: totalQuestions,
        };
      });

      setAttempts(attemptSummaries.sort((a, b) => b.attempt_number - a.attempt_number)); // Urutkan dari terbaru
    } catch (err) {
      console.error("Error fetching riwayat:", err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal memuat riwayat!",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAttempt = (attemptNumber: number) => {
    router.push(`/program/nilai/${id}?attempt=${attemptNumber}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <span className="text-2xl text-blue-600 animate-pulse">Memuat Riwayat...</span>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <span className="text-xl text-red-600">Tidak ada riwayat yang tersedia</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 sm:p-6 lg:p-8">
      <main className="flex-1 mx-auto max-w-4xl">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-transform transform hover:scale-110"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5 text-blue-600" />
            </button>
            <div className="h-3 w-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
            <h1 className="ml-3 text-xl sm:text-2xl font-bold text-blue-800">Riwayat Tryout</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-6 text-center">
            Riwayat Attempt - Tryout {id}
          </h2>
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div
                key={attempt.attempt_number}
                className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                onClick={() => handleViewAttempt(attempt.attempt_number)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-md font-medium text-blue-800">
                      Attempt {attempt.attempt_number}
                    </p>
                    <p className="text-sm text-gray-600">
                      Skor: {attempt.score} / {attempt.total_questions * 4} (Benar: {attempt.correct}, Salah: {attempt.wrong}, Kosong: {attempt.empty})
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAttempt(attempt.attempt_number);
                    }}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all duration-300"
                  >
                    <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}