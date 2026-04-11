import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatPage() {
  return (
    <div className="flex flex-col -m-6" style={{ height: "calc(100vh - 4rem)" }}>
      <ChatPanel />
    </div>
  );
}
