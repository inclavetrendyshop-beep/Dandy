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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }
    setMyId(userData.user.id);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !myId) return;
    await supabase.from("messages").insert({ match_id: Number(matchId), sender_id: myId, content: text.trim() });
    setText("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: "2px solid #2a2a2a" }}>
        <a href="/matches" style={{ color: "#f5f5f5" }}>← Volver</a>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.sender_id === myId ? "flex-end" : "flex-start",
              background: m.sender_id === myId ? "#e8352b" : "#171717",
              border: "2px solid " + (m.sender_id === myId ? "#e8352b" : "#2a2a2a"),
              color: "#f5f5f5",
              borderRadius: 12,
              padding: "8px 14px",
              maxWidth: "75%",
            }}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, padding: 16, borderTop: "2px solid #2a2a2a" }}>
        <input placeholder="Escribe un mensaje..." value={text} onChange={(e) => setText(e.target.value)} />
        <button className="primary" type="submit">Enviar</button>
      </form>
    </div>
  );
}
