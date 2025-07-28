"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faVideo, faClock, faCheckCircle } from "@fortawesome/free-solid-svg-icons";

const supabaseUrl = "https://akpkltltfwyjitbhwtne.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcGtsdGx0Znd5aml0Ymh3dG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTk4NzUsImV4cCI6MjA2OTIzNTg3NX0.Kb7-L2FCCymQTbvQOksbzOCi_9twUrX0lFq9cho1WNI";
const supabase = createClient(supabaseUrl, supabaseKey);

interface LearningParty {
  id: number;
  zoom_link: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function PartyBelajar() {
  const router = useRouter();
  const { id } = useParams();
  const [learningParty, setLearningParty] = useState<LearningParty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const fetchLearningParty = async () => {
      setLoading(true);
      setError(null);
      try {
        const programId = Number(id);
        if (isNaN(programId)) throw new Error("ID program tidak valid");

        const { data, error } = await supabase
          .from("learning_parties")
          .select("id, zoom_link, start_time, end_time, is_active")
          .eq("program_id", programId)
          .eq("is_active", true)
          .order("start_time", { ascending: true })
          .maybeSingle();
        if (error) throw error;
        setLearningParty(data as LearningParty);

        // Update countdown jika belum mulai
        if (data && new Date() < new Date(data.start_time)) {
          const updateTimer = () => {
            const now = new Date();
            const start = new Date(data.start_time);
            const diff = start.getTime() - now.getTime();
            if (diff <= 0) {
              setTimeLeft(null);
              return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${days}d ${hours}j ${minutes}m`);
          };
          updateTimer();
          const timer = setInterval(updateTimer, 60000); // Update setiap menit
          return () => clearInterval(timer);
        }
      } catch (err) {
        setError("Gagal memuat data Party Belajar: " + (err as Error).message);
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLearningParty();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-200 to-blue-100 animate-pulse">
        <div className="flex items-center gap-4 text-indigo-700">
          <div className="w-10 h-10 border-4 border-t-indigo-700 border-b-transparent rounded-full animate-spin"></div>
          <span className="text-3xl font-bold">Memuat Party Belajar...</span>
        </div>
      </div>
    );
  }

  if (error || !learningParty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-200 to-blue-100 p-4 sm:p-6 ml-[64px]">
        <div className="text-center">
          <p className="text-red-600 text-2xl mb-8 font-semibold">{error || "Party Belajar tidak ditemukan"}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
            <span className="font-medium">Kembali</span>
          </button>
        </div>
      </div>
    );
  }

  const isOngoing = new Date() >= new Date(learningParty.start_time) && new Date() <= new Date(learningParty.end_time);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-200 to-blue-100 p-4 sm:p-6 ml-[64px] overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8 animate-fade-in">
          <button
            type="button"
            className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-110"
            onClick={() => router.back()}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-6 h-6 text-indigo-700" />
          </button>
          <h1 className="ml-6 text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-blue-600 animate-pulse">
            Party Belajar Seru!
          </h1>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-indigo-200 transform hover:scale-101 transition-all duration-300">
          <div className="text-center mb-6">
            <FontAwesomeIcon icon={faVideo} className="text-5xl text-green-500 mb-4 animate-bounce" />
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-800 mb-2">Sesi Belajar Bareng</h2>
            <p className="text-gray-600 text-lg">Ayo gabung dan selesaikan soal bareng temen!</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-100 to-green-100 p-4 sm:p-6 rounded-xl mb-6 border border-green-200 shadow-inner">
            <p className="text-gray-700 text-lg mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="text-yellow-500" />
              <strong>Jadwal:</strong> {new Date(learningParty.start_time).toLocaleString("id-ID")} - {new Date(learningParty.end_time).toLocaleString("id-ID")}
            </p>
            {timeLeft && (
              <p className="text-yellow-600 text-lg font-semibold animate-pulse">
                Sisa waktu: {timeLeft} lagi!
              </p>
            )}
          </div>

          {isOngoing ? (
            <a
              href={learningParty.zoom_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full sm:w-auto mx-auto px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-xl font-bold shadow-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 animate-bounce-slow"
            >
              <FontAwesomeIcon icon={faVideo} className="w-5 h-5" />
              Gabung Zoom Sekarang!
            </a>
          ) : (
            <div className="text-center">
              <FontAwesomeIcon icon={faCheckCircle} className="text-yellow-500 text-4xl mb-4 animate-pulse" />
              <p className="text-yellow-600 text-xl font-semibold">
                Sesi {new Date() < new Date(learningParty.start_time) ? "akan dimulai" : "telah selesai"}. Siap-siap ya!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
