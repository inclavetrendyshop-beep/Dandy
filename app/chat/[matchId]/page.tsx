"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Chat() {
  const { matchId } = useParams();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
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

  async function handleSendPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !myId) return;
    setUploading(true);

    const path = `chat/${matchId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file);
    if (upErr) {
      alert("Error subiendo la foto: " + upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("photos").getPublicUrl(path);

    await supabase.from("messages").insert({ match_id: Number(matchId), sender_id: myId, image_url: data.publicUrl });
    setUploading(false);
    e.target.value = "";
  }

  async function handleDeleteMessage(id: number) {
    const sure = confirm("Borrar este mensaje?");
    if (!sure) return;
    await supabase.from("messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  function renderMessage(m: any) {
    const mine = m.sender_id === myId;
    const bubbleStyle = {
      alignSelf: mine ? "flex-end" : "flex-start",
      background: mine ? "#e8352b" : "#171717",
      border: "2px solid " + (mine ? "#e8352b" : "#2a2a2a"),
      color: "#f5f5f5",
      borderRadius: 12,
      padding: m.image_url ? 6 : "8px 14px",
      maxWidth: "75%",
      position: "relative" as const,
    };
    return (
      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
        <div style={bubbleStyle}>
          {m.image_url ? (
            <img src={m.image_url} alt="Foto" style={{ maxWidth: "100%", borderRadius: 8, display: "block" }} />
          ) : (
            m.content
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: "2px solid #2a2a2a" }}>
        <a href="/matches" style={{ color: "#f5f5f5" }}>← Volver</a>
      </div>
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
          <input type="file" accept="image/*" onChange={handleSendPhoto} disabled={uploading} style={{ display: "none" }} />
        </label>
        <input placeholder="Escribe un mensaje..." value={text} onChange={handleTextChange} style={{ flex: 1 }} />
        <button className="primary" type="submit">Enviar</button>
      </form>
    </div>
  );
}
