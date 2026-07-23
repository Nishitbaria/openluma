import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatPage() {
  return (
    <div
      className="-m-6 flex flex-col"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <ChatPanel />
    </div>
  );
}
