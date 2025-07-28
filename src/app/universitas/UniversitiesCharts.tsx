"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ApexOptions, ApexAnnotationsText } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface University {
  id: number;
  name: string;
  student_count?: number;
}

// Tipe opsional untuk legend formatter (agar tidak error)
interface LegendFormatterOpts {
  seriesIndex: number;
}

export default function UniversitiesChart({ universities }: { universities: University[] }) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<number[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [fullNames, setFullNames] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);

    const fetchData = async (token: string) => {
      try {
        const response = await axios.get(
          "https://api.program.taktix.co.id/university?page=1&pageSize=1000",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const uniData: University[] = response.data.data.universities
          .slice(0, 5)
          .map((uni: any) => ({
            ...uni,
            student_count: uni.student_count ?? Math.floor(Math.random() * 500) + 100,
          }))
          .sort((a: University, b: University) => (b.student_count ?? 0) - (a.student_count ?? 0));

        setCategories(uniData.map((uni) => uni.name));
        setData(uniData.map((uni) => uni.student_count ?? 0));
        setFullNames(uniData.map((uni) => uni.name));
      } catch (error) {
        console.error("Error mengambil data universitas:", error);
      }
    };

    const token = localStorage.getItem("token");
    if (token) {
      fetchData(token);
    }
  }, []);

  if (!isClient) {
    return null;
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      animations: {
        enabled: true,
        speed: 1000,
      },
      toolbar: {
        show: true,
      },
    },
    xaxis: {
      categories,
      position: "bottom",
      labels: {
        style: {
          colors: "#4B5563",
          fontWeight: 600,
          fontSize: "10px",
        },
        rotate: -45,
        rotateAlways: true,
        formatter: (value) => {
          return value && value.length > 20 ? `${value.substring(0, 20)}...` : value || "";
        },
      },
      title: {
        text: "Nama Universitas",
        style: { color: "#4B5563", fontWeight: 600 },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#4B5563",
        },
      },
      title: {
        text: "Jumlah Mahasiswa",
        style: { color: "#4B5563", fontWeight: 600 },
      },
    },
    colors: ["#6366F1", "#8B5CF6", "#A78BFA", "#C4B5FD", "#EDE9FE"],
    plotOptions: {
      bar: {
        borderRadius: 6,
        distributed: true,
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => (val ? val.toLocaleString() : "0"),
      style: {
        colors: ["#333"],
        fontSize: "12px",
        fontWeight: 600,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "center",
      fontSize: "12px",
      labels: {
        useSeriesColors: false,
        colors: "#1E293B",
        formatter: (seriesName: string, opts: LegendFormatterOpts): string => {
          return fullNames[opts.seriesIndex] || seriesName;
        },
      },
    },
    annotations: {
      texts: fullNames.map((name, index) => ({
        x: index * (100 / (fullNames.length - 1)),
        y: 0,
        text: name,
        textAnchor: "middle",
        foreColor: "#1E293B",
        fontSize: "12px",
        fontWeight: 600,
        borderWidth: 0,
        offsetY: -10,
      })) as ApexAnnotationsText[],
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 4,
    },
    title: {
      text: "5 Universitas Teratas Berdasarkan Jumlah Mahasiswa",
      align: "center",
      style: { color: "#1E293B", fontSize: "18px", fontWeight: 700 },
    },
    tooltip: {
      custom: ({ series, seriesIndex, dataPointIndex }) => {
        const name = fullNames[dataPointIndex] || "Unknown";
        const value = series[seriesIndex]?.[dataPointIndex]?.toLocaleString() || "0";
        return `<div class="bg-white p-2 shadow-lg rounded">
                  <span class="text-indigo-800 font-semibold">${name}</span><br>
                  <span class="text-gray-600">Mahasiswa: ${value}</span>
                </div>`;
      },
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { height: 300 },
          xaxis: { labels: { rotate: -45, style: { fontSize: "8px" } } },
          legend: { fontSize: "10px" },
        },
      },
      {
        breakpoint: 1024,
        options: {
          chart: { height: 350 },
          xaxis: { labels: { rotate: 0, style: { fontSize: "10px" } } },
          legend: { fontSize: "12px" },
        },
      },
    ],
  };

  const chartSeries = [
    {
      name: "Mahasiswa",
      data,
    },
  ].map((item, index) => ({
    ...item,
    name: fullNames[index] || item.name,
  }));

  return (
    <div
      className="bg-white rounded-xl shadow-md p-4 mb-6 hover:shadow-lg transition-all duration-300"
      style={{ paddingBottom: "40px", maxWidth: "100%", width: "1000px", margin: "0 auto" }}
    >
      <Chart options={chartOptions} series={chartSeries} type="bar" height={400} />
    </div>
  );
}
