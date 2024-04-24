"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export const Qna = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [TlAnswer, setTlAnswer] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showBAButton, setShowBAButton] = useState<boolean>(false);
  const [showTLButton, setShowTLButton] = useState<boolean>(false);

  useEffect(() => {
    setQuestion(`I want to be able to manage content in multiple languages.`);
  }, []);

  const sendQuestion = async (gptRole: string, _question: string) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: _question,
          chatHistory: [],
          gptRole,
        }),
      });

      const reader = response?.body?.getReader();
      let streamingAIContent = "";
      let tokensEnded = false;

      while (true) {
        const { done, value } = (await reader?.read()) || {};

        if (done) {
          break;
        }

        const text = new TextDecoder().decode(value);
        if (text.includes("tokens-ended") && !tokensEnded) {
          tokensEnded = true;
        } else if (!tokensEnded) {
          streamingAIContent = streamingAIContent + text;
          if (gptRole === "TL") {
            setTlAnswer(streamingAIContent + " ");
          } else {
            setAnswer(streamingAIContent);
          }
        }
      }
      // setAnswer(streamingAIContent);
      // handleStreamEnd(question, streamingAIContent, sourceDocuments);
    } catch (error: any) {
      console.log("Error occured ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col justify-center gap-3">
          <h1 className="text-lg font-bold">Customer</h1>
          <div className="flex gap-10 justify-center items-center">
            <img
              className="w-24 h-24 p-1 rounded-full"
              src="/client.png"
              alt="Bordered avatar"
            />

            <textarea
              className="border border-gray-200 rounded-md h-24 w-full p-2"
              onChange={(e) => setQuestion(e.target.value)}
              value={question}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div className="flex gap-10 justify-center items-center">
            <div className="flex flex-col gap-5">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
            {/* <textarea
              className="border border-gray-200 rounded-md h-32 w-full p-2"
              onChange={(e) => setAnswer(e.target.value)}
              value={answer}
              disabled={isLoading}
            /> */}
            <div>
              <h1 className="text-lg font-bold text-right whitespace-nowrap">
                TechLead AI
              </h1>

              <img
                className="w-24 h-24 p-1 rounded-full"
                src="/ba.png"
                alt="Bordered avatar"
              />
            </div>
          </div>
          <div
            className="flex-shrink mx-auto w-1/6 text-center font-bold transition-all duration-300 cursor-pointer bg-gradient-to-r from-purple-600 text-sm to-pink-400 hover:to-purple-600 text-white h-10 whitespace-nowrap rounded-md items-center  flex p-2"
            onClick={() => sendQuestion("BA", question)}
          >
            {isLoading && (
              <svg
                className="animate-spin mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}{" "}
            Ask R2B2
          </div>
        </div>
        {/* 
        <div className="flex flex-col justify-center gap-3">
          <h1 className="text-lg font-bold text-right">TechLead AI</h1>
          <div className="flex gap-10 justify-center items-center">
            <textarea
              className="border border-gray-200 rounded-md h-32 w-full p-2"
              onChange={(e) => setTlAnswer(e.target.value)}
              value={TlAnswer}
              disabled={isLoading}
            />
            <img
              className="w-24 h-24 p-1 rounded-full"
              src="/tl.png"
              alt="Bordered avatar"
            />
          </div>
          <div
            className="flex-shrink mx-auto w-1/6 text-center font-bold transition-all duration-300 cursor-pointer bg-gradient-to-r from-purple-600 text-sm to-pink-400 hover:to-purple-600 text-white h-10 whitespace-nowrap rounded-md items-center  flex p-2"
            onClick={() => sendQuestion("TL", answer)}
          >
            {isLoading && (
              <svg
                className="animate-spin mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}{" "}
            Ask the TL
          </div>
        </div> */}
      </div>
    </div>
  );
};
