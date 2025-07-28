"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faChevronRight, faUserEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import axios from "axios";

export default function Profile() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [photoProfile, setPhotoProfile] = useState("");
  const [email, setEmail] = useState("");
  const [examCount, setExamCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationId, setConfirmationId] = useState<number | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const user = decoded.user;
        setName(user.name || "User");
        setPhotoProfile(user.photo_profile || "https://i.pravatar.cc/150");
        setEmail(user.email || "user@example.com");
      } catch (error) {
        console.error("Invalid token:", error);
        setName("User");
        setPhotoProfile("https://i.pravatar.cc/150");
        setEmail("user@example.com");
      }
    } else {
      setName("User");
      setPhotoProfile("https://via.placeholder.com/150?text=User+Avatar");
      setEmail("user@example.com");
    }

    const fetchExamCount = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await axios.get(
            `/api/exam-pagination?page=1&per_page=100`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setExamCount(response.data.data.length || 0);
        } catch (error) {
          console.error("Error fetching exam count:", error);
        }
      }
    };
    fetchExamCount();
  }, []);

  const handleCheckHistory = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Token not found",
        text: "Please login to check history.",
      });
      return;
    }

    try {
      const response = await axios.get(
        `/api/exam-pagination?page=1&per_page=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.data.length > 0) {
        Swal.fire({
          icon: "success",
          title: "History found",
          text: "Your exam history is available!",
          confirmButtonColor: "#3085d6",
        });
        router.push(`/profile/riwayat`);
      } else {
        Swal.fire({
          icon: "info",
          title: "No History",
          text: "No exam history available yet. Start learning now!",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "Start Now",
          showCancelButton: true,
          cancelButtonText: "Cancel",
        }).then((result) => {
          if (result.isConfirmed) {
            router.push("/kedinasan");
          }
        });
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      Swal.fire({
        icon: "error",
        title: "History not found",
        text: "No history available for this exam.",
      });
    }
  };

  const handleRequestDelete = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Token not found",
        text: "Please login to request account deletion.",
      });
      return;
    }

    try {
      const response = await axios.post(
        "https://api.taktix.co.id/request-delete-account",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfirmationId(response.data.data.confirmation_id);
      setShowConfirmModal(true);
      Swal.fire({
        icon: "info",
        title: "Request Sent",
        text: response.data.message,
        confirmButtonColor: "#3085d6",
      });
    } catch (error) {
      console.error("Error requesting delete:", error);
      Swal.fire({
        icon: "error",
        title: "Request Failed",
        text: "Failed to request account deletion. Try again.",
      });
    }
  };

  const handleConfirmDelete = async () => {
    const token = localStorage.getItem("token");
    if (!token || !confirmationId || !tokenInput) {
      Swal.fire({
        icon: "error",
        title: "Invalid Input",
        text: "Please enter the confirmation token.",
      });
      return;
    }

    try {
      const response = await axios.delete(
        "https://api.taktix.co.id/confirm-delete-account",
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            confirmation_id: confirmationId,
            token: tokenInput,
          },
        }
      );
      Swal.fire({
        icon: "success",
        title: "Account Deleted",
        text: "Your account has been successfully deleted.",
        confirmButtonColor: "#3085d6",
      });
      localStorage.removeItem("token");
      router.push("/login");
    } catch (error: any) {
      console.error("Error confirming delete:", error.response?.data || error.message);
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: "Invalid token or permission denied. Check your confirmation token or contact support.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Confirmation Failed",
          text: "Failed to delete account. " + (error.response?.data?.message || "Try again."),
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 flex items-center justify-center py-4 sm:py-6 md:py-8 px-4 sm:px-6 lg:px-12">
      <div className="max-w-3xl w-full">
        <button
          onClick={() => router.back()}
          className="mb-4 sm:mb-6 p-2 sm:p-3 bg-white rounded-full shadow-md hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-indigo-600 text-lg sm:text-xl" />
        </button>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-blue-600 mb-6 sm:mb-8 text-center animate-fade-in">
          My Profile
        </h1>

        {/* Profile Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 transform hover:shadow-2xl transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="w-24 sm:w-32 md:w-40 h-24 sm:h-32 md:h-40 relative">
              <img
                src={photoProfile}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-2 sm:border-4 border-indigo-200 animate-pulse-slow"
              />
            </div>
            <div className="text-center sm:text-left mt-4 sm:mt-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">{name}</h2>
              <p className="text-gray-700 mt-2 text-sm sm:text-base md:text-lg">{email}</p>
              <Link href="/profile/ubahprofile">
                <button className="mt-4 px-3 sm:px-4 py-2 sm:py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base">
                  <FontAwesomeIcon icon={faUserEdit} /> Edit Profile
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Menu Section */}
        <div className="mt-6 sm:mt-8">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">Explore More</h3>
          <div className="space-y-4">
            <div
              className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 sm:p-5 shadow-md hover:bg-indigo-100 transition-all duration-300 cursor-pointer"
              onClick={handleCheckHistory}
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-700 text-base sm:text-lg md:text-xl font-medium">My Exam History</span>
                <FontAwesomeIcon icon={faChevronRight} className="text-indigo-500 text-lg sm:text-xl" />
              </div>
            </div>
            <Link href="/profile/ubahpassword">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 sm:p-5 shadow-md hover:bg-indigo-100 transition-all duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 text-base sm:text-lg md:text-xl font-medium">Change Password</span>
                  <FontAwesomeIcon icon={faChevronRight} className="text-indigo-500 text-lg sm:text-xl" />
                </div>
              </div>
            </Link>
            <div
              className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 sm:p-5 shadow-md hover:bg-red-100 transition-all duration-300 cursor-pointer"
              onClick={handleRequestDelete}
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-700 text-base sm:text-lg md:text-xl font-medium">Delete Account</span>
                <FontAwesomeIcon icon={faTrash} className="text-red-500 text-lg sm:text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Account Deletion</h2>
              <p className="text-gray-600 mb-4">Enter the confirmation token sent to your email:</p>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full p-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter token"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}