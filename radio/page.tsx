"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Mixes-tributo a Larry Levan / Paradise Garage, subidos legalmente a Mixcloud
// (Mixcloud tiene licencia propia para permitir su reproducción/embebido).
const SHOWS = [
  {
    title: "Tribute to Larry Levan & The Paradise Garage — Pt. 5",
    dj: "Omar Abdallah",
    feed: "/djomarabdallah/tribute-to-larry-levan-the-paradise-garage-part-5/",
  },
  {
    title: "Larry Levan Live at the Paradise Garage (1979)",
    dj: "Amore Music Experience",
    feed: "/amemgmt/larry-levan-live-at-the-paradise-garage-1979/",
  },
  {
    title: "Larry Levan Live @ The Paradise Garage — Closing Night",
    dj: "djmixes",
    feed: "/djmixes/larry-levan-live-the-paradise-garage-closing-night-party-1987/",
  },
  {
    title: "Live at the Paradise Garage — Larry Levan",
    dj: "Soul Cool Records",
    feed: "/SoulCoolRecords/live-at-the-paradise-garage-larry-levan/",
  },
];

export default function Radio() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [current, setCurrent] =
