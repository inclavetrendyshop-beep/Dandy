"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, distanceKm } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  city: string;
  tags: string[];
  photos: string[];
  lat: number | null;
  lng: number | null;
  verification_status?: string;
  age_verification_status?: string;
  last_active_at?: string;
  looking_now?: boolean;
  is_traveling?: boolean;
  traveling_city?: string;
};

const FREE_MAX_DISTANCE_KM = 5;
const ONLINE_WINDOW_MINUTES = 15;

declare global {
  interface Window {
    L: any;
  }
}

type Tab = "cercanos" | "conectados" | "favoritos" | "mapa";

export default function Nearby() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [people, setPeople] = useState<Profile[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("cercanos");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [matchName, setMatchName] = useState<string | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab === "mapa" && me) {
      loadLeaflet();
    }
  }, [tab, me]);

  useEffect(() => {
    if (mapReady) {
      drawMarkers();
    }
  }, [mapReady, people]);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
    if (!myProfile) {
      router.push("/onboarding");
      return;
    }
    setMe(myProfile);

    const { data: blocked } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${myProfile.id},blocked_id.eq.${myProfile.id}`);
    const blockedIds = (blocked || []).map((b) =>
      b.blocker_id === myProfile.id ? b.blocked_id : b.blocker_id
    );

    const { data: favs } = await supabase
      .from("favorites")
      .select("favorite_id")
      .eq("user_id", myProfile.id);
    setFavoriteIds((favs || []).map((f) => f.favorite_id));

    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", myProfile.id);

    const isPremium = !!myProfile.is_premium;
    const preferredMax = myProfile.pref_max_distance ?? FREE_MAX_DISTANCE_KM;
    const effectiveMaxDistance = isPremium ? preferredMax : Math.min(preferredMax, FREE_MAX_DISTANCE_KM);

    const withDistance = (candidates || [])
      .filter((c) => !blockedIds.includes(c.id))
      .map((c) => {
        const d = myProfile.lat && myProfile.lng && c.lat && c.lng
          ? distanceKm(myProfile.lat, myProfile.lng, c.lat, c.lng)
          : null;
        return { ...c, __distance: d };
      })
      .filter((c) => c.__distance === null || c.__distance <= effectiveMaxDistance)
      .sort((a, b) => {
        const da = a.__distance ?? Infinity;
        const db = b.__distance ?? Infinity;
        return da - db;
      });

    setPeople(withDistance);
    setLoading(false);
  }

  function isOnline(p: Profile) {
    if (!p.last_active_at) return false;
    const diffMin = (Date.now() - new Date(p.last_active_at).getTime()) / 60000;
    return diffMin <= ONLINE_WINDOW_MINUTES;
  }

  function formatDistance(p: any) {
    if (p.__distance === null || p.__distance === undefined) return null;
    if (p.__distance < 1) return Math.round(p.__distance * 1000) + " m";
    return p.__distance.toFixed(1).replace(".", ",") + " km";
  }

  async function openProfile(p: Profile) {
    setSelected(p);
    if (me && p.id !== me.id) {
      await supabase.from("profile_views").insert({ viewer_id: me.id, viewed_id: p.id });
    }
  }

  async function toggleFavorite(profileId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!me) return;
    const isFav = favoriteIds.includes(profileId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", me.id).eq("favorite_id", profileId);
      setFavoriteIds((prev) => prev.filter((id) => id !== profileId));
    } else {
      await supabase.from("favorites").insert({ user_id: me.id, favorite_id: profileId });
      setFavoriteIds((prev) => [...prev, profileId]);
    }
  }

  async function handleLike(target: Profile) {
    if (!me) return;
    await supabase.from("swipes").insert({ swiper_id: me.id, swiped_id: target.id, action: "like" });

    const { data: theirSwipe } = await supabase
      .from("swipes")
      .select("*")
      .eq("swiper_id", target.id)
      .eq("swiped_id", me.id)
      .eq("action", "like")
      .maybeSingle();
