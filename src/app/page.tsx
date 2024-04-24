import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { Chat } from "@/components/chat";
import { Qna } from "@/components/qna";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative container flex min-h-screen flex-col">
      <div className=" p-4 py-8 flex h-14 items-center justify-between supports-backdrop-blur:bg-background/60 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <span className="font-bold text-5xl bg-gradient-to-r from-orange-600 via-red-500 to-yellow-400 block my-4 text-transparent bg-clip-text">
          R2B2
        </span>
        <DarkModeToggle />
      </div>
      <div className="flex flex-1 py-4">
        <div className="w-full">
          <Qna />
          <hr className="my-4 " />
          <div className="mx-auto items-center justify-center flex">
            <Button className=" rounded-full text-lg p-2 px-3">+</Button>
          </div>
          {/* <Chat /> */}
        </div>
      </div>
    </main>
  );
}
