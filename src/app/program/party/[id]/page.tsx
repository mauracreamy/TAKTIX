"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faVideo, faClock, faCheckCircle, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

const supabaseUrl = "https://akpkltltfwyjitbhwtne.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcGtsdGx0Znd5aml0Ymh3dG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTk4NzUsImV4cCI6MjA2OTIzNTg3NX0.Kb7-L2FCCymQTbvQOksbzOCi_9twUrX0lFq9cho1WNI";
const supabase = createClient(supabaseUrl, supabaseKey);

interface LearningParty {
  id: number;
  zoom_link: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  description: string | null;
}

export default function PartyBelajar() {
  const router = useRouter();
  const { id } = useParams();
  const [learningParties, setLearningParties] = useState<LearningParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false); // State for expand/collapse

  const fetchLearningParties = async () => {
    setLoading(true);
    setError(null);
    try {
      const programId = Number(id);
      if (isNaN(programId)) throw new Error("ID program tidak valid");

      const { data, error } = await supabase
        .from("learning_parties")
        .select("id, zoom_link, start_time, end_time, is_active, description")
        .eq("program_id", programId)
        .eq("is_active", true)
        .order("start_time", { ascending: true });
      if (error) throw error;
      console.log("Fetched data:", data); // Debug: Log fetched data
      setLearningParties(data as LearningParty[]);
    } catch (err) {
      setError("Gagal memuat data Party Belajar: " + (err as Error).message);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLearningParties();
  }, [id]);

  // Format date (e.g., "Senin, 28 Juli 2025")
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format time range (e.g., "09:32 - 16:00")
  const formatTimeRange = (start: string, end: string) => {
    const startTime = new Date(start).toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = new Date(end).toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startTime} - ${endTime}`;
  };

  const getPartyStatus = (party: LearningParty) => {
    const now = new Date();
    const start = new Date(party.start_time);
    const end = new Date(party.end_time);
    let status = "";
    let timeLeft: string | null = null;

    if (now < start) {
      status = "Akan Datang";
      const diff = start.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        timeLeft = `${days > 0 ? days + " hari, " : ""}${hours > 0 ? hours + " jam, " : ""}${minutes} menit lagi`;
      }
    } else if (now >= start && now <= end) {
      status = "Sedang Berlangsung";
    } else {
      status = "Selesai";
    }
    return { status, timeLeft };
  };

  // Split parties into active and completed
  const activeParties = learningParties.filter((party) => {
    const { status } = getPartyStatus(party);
    return status === "Akan Datang" || status === "Sedang Berlangsung";
  });
  const completedParties = learningParties.filter((party) => {
    const { status } = getPartyStatus(party);
    return status === "Selesai";
  });

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-200 to-blue-100 p-4 sm:p-6 ml-[64px]">
        <div className="text-center">
          <p className="text-red-600 text-2xl mb-8 font-semibold">{error}</p>
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

          {activeParties.length > 0 ? (
            <div className="grid gap-4">
              {activeParties.map((party) => {
                const { status, timeLeft } = getPartyStatus(party);
                return (
                  <div
                    key={party.id}
                    className="bg-gradient-to-br from-yellow-100 to-green-100 p-4 rounded-xl border border-green-200 shadow-inner"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FontAwesomeIcon icon={faClock} className="text-yellow-500" />
                      <h4 className="text-lg font-semibold text-gray-700">Sesi Party Belajar</h4>
                    </div>
                    <p className="text-gray-600">
                      <strong>Tanggal:</strong> {formatDate(party.start_time)}
                    </p>
                    <p className="text-gray-600 mt-2">
                      <strong>Waktu:</strong> {formatTimeRange(party.start_time, party.end_time)}
                    </p>
                    <p className="text-gray-600 mt-2">
                      <strong>Deskripsi:</strong> {party.description || "Tidak ada deskripsi tersedia"}
                    </p>
                    <p
                      className={`text-lg font-semibold mt-4 ${
                        status === "Sedang Berlangsung" ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      Status: {status}
                      {timeLeft && status === "Akan Datang" && (
                        <span className="block text-yellow-600 animate-pulse">
                          (Mulai dalam {timeLeft})
                        </span>
                      )}
                    </p>
                    {status === "Sedang Berlangsung" ? (
                      <a
                        href={party.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full sm:w-auto mx-auto mt-4 px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-xl font-bold shadow-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 animate-bounce-slow"
                      >
                        <FontAwesomeIcon icon={faVideo} className="w-5 h-5" />
                        Gabung Zoom Sekarang!
                      </a>
                    ) : (
                      <div className="text-center mt-4">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-yellow-500 text-4xl mb-4 animate-pulse" />
                        <p className="text-yellow-600 text-xl font-semibold">Sesi akan dimulai. Siap-siap ya!</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center">
              <FontAwesomeIcon icon={faCheckCircle} className="text-yellow-500 text-4xl mb-4 animate-pulse" />
              <p className="text-yellow-600 text-xl font-semibold">
                Belum ada jadwal Party Belajar aktif untuk program ini.
              </p>
            </div>
          )}

          {completedParties.length > 0 && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all duration-300 w-full sm:w-auto"
              >
                <FontAwesomeIcon icon={showCompleted ? faChevronUp : faChevronDown} className="w-5 h-5" />
                <span className="font-medium">Sesi Selesai ({completedParties.length})</span>
              </button>
              {showCompleted && (
                <div className="grid gap-4 mt-4">
                  {completedParties.map((party) => (
                    <div
                      key={party.id}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 rounded-xl border border-gray-300 shadow-inner"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faClock} className="text-gray-500" />
                        <h4 className="text-lg font-semibold text-gray-700">Sesi Party Belajar</h4>
                      </div>
                      <p className="text-gray-600">
                        <strong>Tanggal:</strong> {formatDate(party.start_time)}
                      </p>
                      <p className="text-gray-600 mt-2">
                        <strong>Waktu:</strong> {formatTimeRange(party.start_time, party.end_time)}
                      </p>
                      <p className="text-gray-600 mt-2">
                        <strong>Deskripsi:</strong> {party.description || "Tidak ada deskripsi tersedia"}
                      </p>
                      <p className="text-lg font-semibold mt-4 text-gray-500">Status: Selesai</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
