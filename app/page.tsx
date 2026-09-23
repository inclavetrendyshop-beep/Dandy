"use client";
import { useEffect, useState } from "react";
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
  role?: string;
  verification_status?: string;
  age_verification_status?: string;
  match_reveal_photo_url?: string;
  last_active_at?: string;
  looking_now?: boolean;
};

const FREE_MAX_DISTANCE_KM = 5;
const ONLINE_WINDOW_MINUTES = 15;

const ROLE_FILTER_OPTIONS = ["Activo", "Pasivo", "Versatil", "Versatil Activo", "Versatil Pasivo", "Neutro"];
const TAG_FILTER_OPTIONS = [
  "Barba", "Canas", "Elegante", "Clasico", "Ejecutivo", "Viajero",
  "Oso", "Nutria", "Cachorro", "Lobo", "Musculoso", "Deportista",
  "Militar", "Cuero", "Geek", "Daddy", "Twink", "Friki",
  "Sobrio", "Discreto", "Poz", "Indetectable", "Fetiche", "Asexual",
  "Vicio", "Sexo casual",
];

export default function SwipeDeck() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [matchName, setMatchName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceCapped, setDistanceCapped] = useState(false);
  const [togglingLookingNow, setTogglingLookingNow] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterRole, setFilterRole] = useState("Todos");
  const [filterTag, setFilterTag] = useState("Todos");
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [onlyLookingNow, setOnlyLookingNow] = useState(false);
  const [sortNearest, setSortNearest] = useState(false);

  useEffect(() => {
    load();
  }, []);

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

    await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", myProfile.id);

    const { data: swiped } = await supabase.from("swipes").select("swiped_id").eq("swiper_id", myProfile.id);
    const swipedIds = (swiped || []).map((s) => s.swiped_id);

    const { data: blocked } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${myProfile.id},blocked_id.eq.${myProfile.id}`);
    const blockedIds = (blocked || []).map((b) =>
      b.blocker_id === myProfile.id ? b.blocked_id : b.blocker_id
    );

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", myProfile.id)
      .gte("age", myProfile.pref_min_age)
      .lte("age", myProfile.pref_max_age);

    const { data: candidates } = await query;

    const isPremium = !!myProfile.is_premium;
    const preferredMax = myProfile.pref_max_distance ?? FREE_MAX_DISTANCE_KM;
    const effectiveMaxDistance = isPremium ? preferredMax : Math.min(preferredMax, FREE_MAX_DISTANCE_KM);
    let cappedSomeone = false;

    const filtered = (candidates || []).filter((c) => {
      if (swipedIds.includes(c.id)) return false;
      if (blockedIds.includes(c.id)) return false;
      if (myProfile.lat && myProfile.lng && c.lat && c.lng) {
        const d = distanceKm(myProfile.lat, myProfile.lng, c.lat, c.lng);
        if (d > effectiveMaxDistance) {
          if (!isPremium && d <= preferredMax) cappedSomeone = true;
          return false;
        }
      }
      return true;
    });

    setDistanceCapped(!isPremium && cappedSomeone);
    setDeck(filtered);
    setLoading(false);
  }

  function isOnline(p: Profile) {
    if (!p.last_active_at) return false;
    const diffMin = (Date.now() - new Date(p.last_active_at).getTime()) / 60000;
    return diffMin <= ONLINE_WINDOW_MINUTES;
  }

  function getVisibleDeck() {
    let out = deck.filter((p) => {
      if (filterName.trim() && !p.name?.toLowerCase().includes(filterName.trim().toLowerCase())) return false;
      if (filterRole !== "Todos" && p.role !== filterRole) return false;
      if (filterTag !== "Todos" && !(p.tags || []).includes(filterTag)) return false;
      if (onlyOnline && !isOnline(p)) return false;
      if (onlyLookingNow && !p.looking_now) return false;
      return true;
    });

    if (sortNearest && me?.lat && me?.lng) {
      out = [...out].sort((a, b) => {
        const da = a.lat && a.lng ? distanceKm(me.lat, me.lng, a.lat, a.lng) : Infinity;
        const db = b.lat && b.lng ? distanceKm(me.lat, me.lng, b.lat, b.lng) : Infinity;
        return da - db;
      });
    }

    return out;
  }

  function clearFilters() {
    setFilterName("");
    setFilterRole("Todos");
    setFilterTag("Todos");
    setOnlyOnline(false);
    setOnlyLookingNow(false);
    setSortNearest(false);
  }

  async function handleToggleLookingNow() {
    if (!me) return;
    setTogglingLookingNow(true);
    const next = !me.looking_now;
    await supabase
      .from("profiles")
      .update({ looking_now: next, looking_now_at: next ? new Date().toISOString() : null })
      .eq("id", me.id);
    setMe({ ...me, looking_now: next });
    setTogglingLookingNow(false);
  }

  async function handleSwipe(action: "like" | "pass") {
    if (!me) return;
    const target = getVisibleDeck()[0];
    if (!target) return;
    await supabase.from("swipes").insert({ swiper_id: me.id, swiped_id: target.id, action });

    if (action === "like") {
      const { data: theirSwipe } = await supabase
        .from("swipes")
        .select("*")
        .eq("swiper_id", target.id)
        .eq("swiped_id", me.id)
        .eq("action", "like")
        .maybeSingle();
      if (theirSwipe) {
        setMatchName(target.name);
        const orFilter = "and(user1_id.eq." + me.id + ",user2_id.eq." + target.id + "),and(user1_id.eq." + target.id + ",user2_id.eq." + me.id + ")";
        const { data: existingMatch } = await supabase
          .from("matches")
          .select("id")
          .or(orFilter)
          .maybeSingle();
        if (!existingMatch) {
          const { data: newMatch } = await supabase
            .from("matches")
            .insert({ user1_id: me.id, user2_id: target.id })
            .select()
            .single();

          if (newMatch) {
            if (me.match_reveal_photo_url) {
              await supabase.from("messages").insert({
                match_id: newMatch.id,
                sender_id: me.id,
                image_url: me.match_reveal_photo_url,
              });
            }
            if (target.match_reveal_photo_url) {
              await supabase.from("messages").insert({
                match_id: newMatch.id,
                sender_id: target.id,
                image_url: target.match_reveal_photo_url,
              });
            }
          }
        }
      }
    }
    setDeck((d) => d.filter((p) => p.id !== target.id));
  }

  async function handleBlock() {
    if (!me) return;
    const target = getVisibleDeck()[0];
    if (!target) return;
    if (!confirm("Bloquear a " + target.name + "? No volveras a ver este perfil.")) return;
    await supabase.from("blocks").insert({ blocker_id: me.id, blocked_id: target.id });
    setDeck((d) => d.filter((p) => p.id !== target.id));
  }

  async function handleReport() {
    if (!me) return;
    const target = getVisibleDeck()[0];
    if (!target) return;
    const reason = prompt("Por que quieres denunciar a " + target.name + "? (breve motivo)");
    if (reason === null) return;
    await supabase.from("reports").insert({ reporter_id: me.id, reported_id: target.id, reason });
    await supabase.from("blocks").insert({ blocker_id: me.id, blocked_id: target.id });
    alert("Gracias, hemos recibido tu denuncia.");
    setDeck((d) => d.filter((p) => p.id !== target.id));
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#9a9a9a" }}>Cargando...</div>;
  }

  const visibleDeck = getVisibleDeck();
  const current = visibleDeck[0];
  const filtersActive = filterName || filterRole !== "Todos" || filterTag !== "Todos" || onlyOnline || onlyLookingNow || sortNearest;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/events" style={{ color: "#f5f5f5" }}>Eventos</a>
          <a href="/matches" style={{ color: "#f5f5f5" }}>Matches</a>
          <a href="/radio" style={{ color: "#f5f5f5" }}>Radio</a>
          <a href="/settings" style={{ color: "#f5f5f5" }}>Filtros</a>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid " + (filtersActive ? "#f2c14e" : "#2a2a2a"),
            background: "none",
            color: filtersActive ? "#f2c14e" : "#f5f5f5",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showFilters ? "Ocultar filtros" : "Filtros" + (filtersActive ? " (activos)" : "")}
        </button>
        <button
          onClick={handleToggleLookingNow}
          disabled={togglingLookingNow}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "1px solid " + (me?.looking_now ? "#e8352b" : "#2a2a2a"),
            background: me?.looking_now ? "#e8352b" : "none",
            color: "#f5f5f5",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {me?.looking_now ? "🔥 Buscando ahora" : "Busco ahora"}
        </button>
      </div>

      {showFilters && (
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 12, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            placeholder="Buscar por nombre"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#9a9a9a", marginBottom: 4 }}>Rol</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #2a2a2a", background: "#171717", color: "#f5f5f5" }}
            >
              <option value="Todos">Todos</option>
              {ROLE_FILTER_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#9a9a9a", marginBottom: 4 }}>Etiqueta / tribu</label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #2a2a2a", background: "#171717", color: "#f5f5f5" }}
            >
              <option value="Todos">Todas</option>
              {TAG_FILTER_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} />
            Solo conectados ahora
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={onlyLookingNow} onChange={(e) => setOnlyLookingNow(e.target.checked)} />
            Solo quien busca ahora
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={sortNearest} onChange={(e) => setSortNearest(e.target.checked)} />
            Ordenar por mas cercanos primero
          </label>

          {filtersActive && (
            <button
              onClick={clearFilters}
              style={{ background: "none", border: "1px solid #9a9a9a", color: "#9a9a9a", borderRadius: 6, padding: 8, fontSize: 12, cursor: "pointer" }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {matchName && (
        <div style={{ background: "#f2c14e", color: "#0d0d0d", border: "2px solid #f5f5f5", borderRadius: 4, padding: 16, marginBottom: 16, fontWeight: 700 }}>
          Nuevo match con {matchName}! <a href="/matches" style={{ textDecoration: "underline" }}>Ver chat</a>
          <button onClick={() => setMatchName(null)} style={{ float: "right", background: "none", border: "none", fontWeight: 700 }}>X</button>
        </div>
      )}

      {distanceCapped && (
        <div style={{ background: "#1e1e1e", border: "1px solid #c9a24b", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: "#f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span>Con la cuenta gratuita solo ves perfiles a menos de {FREE_MAX_DISTANCE_KM} km. Hay mas gente esperando un poco mas lejos.</span>
          <a href="/settings" style={{ flexShrink: 0, background: "#c9a24b", color: "#1a1a1a", fontWeight: 700, padding: "6px 14px", borderRadius: 8, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>Hazte Premium</a>
        </div>
      )}

      {!current && (
        <div style={{ padding: 40, textAlign: "center", color: "#9a9a9a" }}>
          {deck.length === 0 ? "No hay mas perfiles por ahora. Ajusta tus filtros o vuelve mas tarde." : "Nadie coincide con estos filtros ahora mismo."}
        </div>
      )}
