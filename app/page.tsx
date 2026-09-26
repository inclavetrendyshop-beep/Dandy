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
  role?: string;
  verification_status?: string;
  age_verification_status?: string;
  match_reveal_photo_url?: string;
  last_active_at?: string;
  looking_now?: boolean;
  is_traveling?: boolean;
  traveling_city?: string;
};

type LastSwipe = {
  profile: Profile;
  action: "like" | "pass";
  swipeId: string;
  matchId?: string;
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
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortNearest, setSortNearest] = useState(false);
  const [viewToast, setViewToast] = useState(false);
  const loggedViewIds = useRef<Set<string>>(new Set());

  const [lastSwipe, setLastSwipe] = useState<LastSwipe | null>(null);
  const [rewinding, setRewinding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!me) return;

    function playPing() {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch {}
    }

    const channel = supabase
      .channel("profile-views-" + me.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profile_views", filter: "viewed_id=eq." + me.id },
        (payload: any) => {
          if (payload.new?.viewer_id === me.id) return;
          playPing();
          setViewToast(true);
          setTimeout(() => setViewToast(false), 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.id]);

  async function logView(targetId: string) {
    if (!me || targetId === me.id) return;
    if (loggedViewIds.current.has(targetId)) return;
    loggedViewIds.current.add(targetId);
    await supabase.from("profile_views").insert({ viewer_id: me.id, viewed_id: targetId });
  }

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
      if (onlyVerified && p.verification_status !== "approved") return false;
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
    setOnlyVerified(false);
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

    const { data: newSwipe } = await supabase
      .from("swipes")
      .insert({ swiper_id: me.id, swiped_id: target.id, action })
      .select()
      .single();

    let createdMatchId: string | undefined;

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
            createdMatchId = newMatch.id;
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
        } else {
          createdMatchId = existingMatch.id;
        }
      }
    }

    if (newSwipe) {
      setLastSwipe({ profile: target, action, swipeId: newSwipe.id, matchId: createdMatchId });
    }

    setDeck((d) => d.filter((p) => p.id !== target.id));
  }

  async function handleRewind() {
    if (!lastSwipe || rewinding) return;
    if (!me?.is_premium) {
      alert("Deshacer el ultimo swipe (Rewind) es una funcion Premium. Hazte Premium para usarla.");
      return;
    }
    setRewinding(true);
    try {
      if (lastSwipe.matchId) {
        await supabase.from("messages").delete().eq("match_id", lastSwipe.matchId);
        await supabase.from("matches").delete().eq("id", lastSwipe.matchId);
      }
      await supabase.from("swipes").delete().eq("id", lastSwipe.swipeId);
      setDeck((d) => [lastSwipe.profile, ...d]);
      setMatchName((current) => (current === lastSwipe.profile.name ? null : current));
      setLastSwipe(null);
    } finally {
      setRewinding(false);
    }
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
  const filtersActive = filterName || filterRole !== "Todos" || filterTag !== "Todos" || onlyOnline || onlyLookingNow || onlyVerified || sortNearest;

  if (current) {
    logView(current.id);
  }

  return (
    <div style={{ padding: 16 }}>
      {viewToast && (
        <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", background: "#f2c14e", color: "#0d0d0d", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 20, zIndex: 100 }}>
          👀 Alguien ha visto tu perfil
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="brand" style={{ fontSize: 24, color: "#e8352b" }}>Dandy</span>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/likes" style={{ color: "#f5f5f5" }}>Likes</a>
          <a href="/nearby" style={{ color: "#f5f5f5" }}>Cercanos</a>
          <a href="/viewers" style={{ color: "#f5f5f5" }}>Huellas</a>
          <a href="/trending" style={{ color: "#f5f5f5" }}>Tendencias</a>
          <a href="/events" style={{ color: "#f5f5f5" }}>Eventos</a>
          <a href="/matches" style={{ color: "#f5f5f5" }}>Matches</a>
          <a href="/radio" style={{ color: "#f5f5f5" }}>Radio</a>
          <a href="/travel" style={{ color: "#f5f5f5" }}>Viajar</a>
          <a href="/settings" style={{ color: "#f5f5f5" }}>Filtros</a>
          <a href="/soporte" style={{ color: "#f5f5f5" }}>Soporte</a>
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
            <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} />
            Solo perfiles verificados ✓
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

      {current && (
        <div style={{ border: "2px solid #f5f5f5", borderRadius: 8, overflow: "hidden", background: "#171717" }}>
          <div style={{ height: 380, background: "#1e6fd9", position: "relative" }}>
            {current.photos?.[0] ? (
              <img src={current.photos[0]} alt={current.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#fff" }}>
                Sin foto
              </div>
            )}
            {isOnline(current) ? (
              <span style={{ position: "absolute", top: 10, left: 10, background: "#4bc97a", color: "#0a0a0a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                ● En linea
              </span>
            ) : (
              <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(30,30,30,0.85)", color: "#9a9a9a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                ● Desconectado
              </span>
            )}
            {current.looking_now && (
              <span style={{ position: "absolute", top: 10, right: 10, background: "#e8352b", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                🔥 Busca ahora
              </span>
            )}
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {current.name}, {current.age}
              {current.verification_status === "approved" && (
                <span title="Perfil verificado" style={{ background: "#1e6fd9", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                  Verificado ✓
                </span>
              )}
              {current.age_verification_status === "approved" && (
                <span title="Edad verificada" style={{ background: "#4bc97a", color: "#0a0a0a", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                  Edad verificada ✓
                </span>
              )}
            </p>
            <p style={{ fontSize: 13, color: "#9a9a9a" }}>
              {current.city}
              {current.is_traveling && (
                <span title={"Viajando" + (current.traveling_city ? " en " + current.traveling_city : "")} style={{ marginLeft: 6 }}>
                  ✈️
                </span>
              )}
            </p>
            <p style={{ marginTop: 8 }}>{current.bio}</p>
            {current.tags?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {current.tags.map((tag) => (
                  <span key={tag} style={{ background: "#2a2a2a", color: "#f2c14e", fontSize: 12, padding: "4px 10px", borderRadius: 20 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <button onClick={handleBlock} style={{ background: "none", border: "none", color: "#9a9a9a", fontSize: 12, cursor: "pointer", padding: 0 }}>
                Bloquear
              </button>
              <button onClick={handleReport} style={{ background: "none", border: "none", color: "#9a9a9a", fontSize: 12, cursor: "pointer", padding: 0 }}>
                Denunciar
              </button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24, padding: 16, borderTop: "2px solid #2a2a2a" }}>
            <button
              onClick={handleRewind}
              disabled={!lastSwipe || rewinding}
              title={me?.is_premium ? "Deshacer ultimo swipe" : "Rewind es Premium"}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "2px solid " + (lastSwipe ? "#f2c14e" : "#2a2a2a"),
                background: "none",
                color: lastSwipe ? "#f2c14e" : "#5a5a5a",
                fontSize: 16,
                cursor: lastSwipe ? "pointer" : "default",
                opacity: lastSwipe ? 1 : 0.5,
              }}
            >
              ↺
            </button>
            <button onClick={() => handleSwipe("pass")} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #9a9a9a", background: "none", color: "#9a9a9a", fontSize: 20 }}>
              X
            </button>
            <button onClick={() => handleSwipe("like")} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #e8352b", background: "#e8352b", color: "#fff", fontSize: 20 }}>
              Like
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

