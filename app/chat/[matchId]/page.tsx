"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Chat() {
  const { matchId } = useParams();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [hasPrivatePhotos, setHasPrivatePhotos] = useState(false);
  const [iSharedMine, setISharedMine] = useState(false);
  const [theirPrivatePhotos, setTheirPrivatePhotos] = useState<any[]>([]);
  const [sharing, setSharing] = useState(false);
  const [revealedIds, setRevealedIds] = useState<number[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const stopTypingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    const uid = userData.user.id;
    setMyId(uid);

    const { data: match } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .eq("id", matchId)
      .single();
    const other = match ? (match.user1_id === uid ? match.user2_id : match.user1_id) : null;
    setOtherId(other);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("match_id", matchId)
      .neq("sender_id", uid)
      .eq("read", false);

    if (other) {
      loadPrivatePhotoState(uid, other);
    }

    const channel = supabase
      .channel(`chat-${matchId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (payload.new.sender_id !== uid) {
            supabase.from("messages").update({ read: true }).eq("id", payload.new.id).then();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId === uid) return;
        setOtherTyping(true);
        if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
        stopTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function loadPrivatePhotoState(uid: string, other: string) {
    const { count: myPrivateCount } = await supabase
      .from("private_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    setHasPrivatePhotos((myPrivateCount || 0) > 0);

    const { data: myGrant } = await supabase
      .from("private_photo_grants")
      .select("id")
      .eq("owner_id", uid)
      .eq("viewer_id", other)
      .maybeSingle();
    setISharedMine(!!myGrant);

    const { data: theirGrant } = await supabase
      .from("private_photo_grants")
      .select("id")
      .eq("owner_id", other)
      .eq("viewer_id", uid)
      .maybeSingle();

    if (theirGrant) {
      const { data: photos } = await supabase
        .from("private_photos")
        .select("*")
        .eq("user_id", other)
        .order("created_at", { ascending: false });
      setTheirPrivatePhotos(photos || []);
    }
  }

  async function handleShareMyPrivatePhotos() {
    if (!myId || !otherId) return;
    const sure = confirm("Vas a dar acceso a esta persona a todas tus fotos privadas. Continuar?");
    if (!sure) return;
    setSharing(true);
    await supabase
      .from("private_photo_grants")
      .upsert({ owner_id: myId, viewer_id: otherId, match_id: Number(matchId) }, { onConflict: "owner_id,viewer_id" });
    setISharedMine(true);
    setSharing(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
    if (!myId || !channelRef.current) return;
    if (typingTimeoutRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: myId } });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1500);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !myId) return;
    await supabase.from("messages").insert({ match_id: Number(matchId), sender_id: myId, content: text.trim() });
    setText("");
  }

  async function handleSendMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !myId) return;
    const isVideo = file.type.startsWith("video/");
    const selfDestruct = confirm(
      (isVideo ? "Vas a enviar un video." : "Vas a enviar una foto.") +
        " Pulsa Aceptar para que se autodestruya despues de verse una vez, o Cancelar para que se quede guardada en el chat."
    );

    setUploading(true);
    const path = `chat/${matchId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file);
    if (upErr) {
      alert("Error subiendo el archivo: " + upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("photos").getPublicUrl(path);

    const payload: any = { match_id: Number(matchId), sender_id: myId, self_destruct: selfDestruct };
    if (isVideo) {
      payload.video_url = data.publicUrl;
    } else {
      payload.image_url = data.publicUrl;
    }
    await supabase.from("messages").insert(payload);
    setUploading(false);
    e.target.value = "";
  }

  async function handleDeleteMessage(id: number) {
    const sure = confirm("Borrar este mensaje?");
    if (!sure) return;
    await supabase.from("messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  function handleRevealSelfDestruct(m: any) {
    if (revealedIds.includes(m.id)) return;
    setRevealedIds((prev) => [...prev, m.id]);
    supabase.from("messages").update({ viewed_at: new Date().toISOString() }).eq("id", m.id).then();
    setTimeout(() => {
      supabase.from("messages").delete().eq("id", m.id).then();
    }, 5000);
  }

  function renderMessage(m: any) {
    const mine = m.sender_id === myId;
    const isMedia = !!m.image_url || !!m.video_url;
    const bubbleStyle = {
      alignSelf: mine ? "flex-end" : "flex-start",
      background: mine ? "#e8352b" : "#171717",
      border: "2px solid " + (mine ? "#e8352b" : "#2a2a2a"),
      color: "#f5f5f5",
      borderRadius: 12,
      padding: isMedia ? 6 : "8px 14px",
      maxWidth: "75%",
      position: "relative" as const,
    };

    const hiddenBySelfDestruct = m.self_destruct && !mine && !revealedIds.includes(m.id);

    return (
      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
        <div style={bubbleStyle}>
          {hiddenBySelfDestruct ? (
            <button
              onClick={() => handleRevealSelfDestruct(m)}
              style={{ background: "none", border: "none", color: "#f5f5f5", fontSize: 13, cursor: "pointer", padding: 10, display: "flex", alignItems: "center", gap: 6 }}
            >
              🔥 Toca para ver (se borra tras verla)
            </button>
          ) : m.image_url ? (
            <img src={m.image_url} alt="Foto" style={{ maxWidth: "100%", borderRadius: 8, display: "block" }} />
          ) : m.video_url ? (
            <video src={m.video_url} controls style={{ maxWidth: "100%", borderRadius: 8, display: "block" }} />
          ) : (
            m.content
          )}
          {m.self_destruct && !hiddenBySelfDestruct && (
            <p style={{ fontSize: 10, color: mine ? "#ffdada" : "#c9a24b", margin: "4px 0 0" }}>🔥 Un solo vistazo</p>
          )}
        </div>
        {mine && (
          <button
            onClick={() => handleDeleteMessage(m.id)}
            style={{ background: "none", border: "none", color: "#9a9a9a", fontSize: 11, cursor: "pointer", padding: "2px 4px" }}
          >
            Borrar
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 16, borderBottom: "2px solid #2a2a2a" }}>
        <a href="/matches" style={{ color: "#f5f5f5" }}>← Volver</a>
        <a
          href={`/call/${matchId}`}
          style={{ background: "#e8352b", color: "#fff", fontWeight: 700, borderRadius: 20, padding: "6px 14px", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
        >
          📞 Llamar
        </a>
      </div>

      {(hasPrivatePhotos && !iSharedMine) || theirPrivatePhotos.length > 0 ? (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #2a2a2a", display: "flex", flexDirection: "column", gap: 8 }}>
          {hasPrivatePhotos && !iSharedMine && (
            <button
              onClick={handleShareMyPrivatePhotos}
              disabled={sharing}
              style={{ background: "none", border: "1px solid #c9a24b", color: "#c9a24b", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
            >
              {sharing ? "Compartiendo..." : "Compartir mis fotos privadas con esta persona"}
            </button>
          )}
          {theirPrivatePhotos.length > 0 && (
            <div>
              <p style={{ fontSize: 12, color: "#9a9a9a", marginBottom: 6 }}>Fotos privadas compartidas contigo:</p>
              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                {theirPrivatePhotos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt="Privada" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #2a2a2a" }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => renderMessage(m))}
        {otherTyping && (
          <p style={{ fontSize: 12, color: "#9a9a9a", fontStyle: "italic", margin: 0 }}>Escribiendo...</p>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, padding: 16, borderTop: "2px solid #2a2a2a" }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, border: "1px solid #2a2a2a", cursor: "pointer", flexShrink: 0 }}>
          {uploading ? "..." : "📷"}
          <input type="file" accept="image/*,video/*" onChange={handleSendMedia} disabled={uploading} style={{ display: "none" }} />
        </label>
        <input placeholder="Escribe un mensaje..." value={text} onChange={handleTextChange} style={{ flex: 1 }} />
        <button className="primary" type="submit">Enviar</button>
      </form>
    </div>
  );
}

