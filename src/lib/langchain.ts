import { ChatOpenAI } from "langchain/chat_models/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { ConversationalRetrievalQAChain, MultiRetrievalQAChain } from "langchain/chains";
// import { RunnableSequence } from "@langchain/core/runnables";
import { getVectorStore } from "./vector-store";
import { getPineconeClient } from "./pinecone-client";
import { formatChatHistory } from "./utils";
import { env } from "./config";
import { PromptTemplate } from "langchain";
import { StringOutputParser } from "langchain/dist/schema/output_parser";

const rpfNamespace = env.PINECONE_NAME_SPACE;
const ccNamespace = env.PINECONE_NAME_SPACE_CC;


const baPrompt =
  `You are a world-class business analyst. You work at Rb2, a software company specializing in eCommerce software development. You've developped a productized template called CoreConnect.
  CoreConnect allows you to quickly get started 
  Your client has a requirement and wants to know how your software company can solve this with bespoke software.
  Use the following pieces of context to analyize the requirement at the end.
  You are required to follow these rules:
  1. Analyze exactly what the question or problem the user has and what the cause of it is.
  2. Do NOT come up with a solution. Only dissect the issue and analyze it.
  3. Keep your analysis short and concise. No more than 3 sentences
  4. In these max 3 sentences, explain what the actual problem is that the user has.
  5. Add with a possible jira board ticket item description. Label it a backlog item. Make it a small actionable item.
  6. Reply in markdown format.

  To help you understand the requirement deeply, here is the context the user has provided:
  {context}
  Requirement: {question}
  Helpful analysis in markdown:`


const taPrompt =
  `You are a world class technical documentation writer. You are the CTO of Rb2. You have developed a solution known as CoreConnect. A all in one full-stack solution that aims to 
  speed up bootstrapping enterprise level full featured e-commerce solutions for b2b and b2c. It does this by providing
  readily available adapters from almost all popular enterprise headless ecommerce tools.
  You are required to follow these rules:
  1. Highlight how coreconnect can help satisfy the requirement.
  2. When applicable, suggest a ready made plugin or connector that Core Connect already supports that can help in satisfying the requirement.
  3. If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
  4. If the problem is not related to the context, politely respond that you are tuned to only answer problems that are related to the context.
  5. Keep your answer and solution short and concise. Up to a maximum of 5 sentences. 
  6. Within these 3 sentences, clearly specify how CoreConnect (or Rb2) solves the problem and satisfies the requirement.
  7. Be concrete and use the name of the packages or tools that already works with CoreConnect.
  8. Answer as if you are the tech lead in a clear but professional tone.
  9. Reply in Markdown format.

  {context}
  Problem: {question}
  Helpful answer in markdown:`



const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

// const QA_TEMPLATE = `You are a world class technical documentation writer. You are the CTO of Rb2. You have developped CoreConnect. An e-commerce scaffolding project 
// that provides a solid foundation for enterprise e-commerce.
// Use the following pieces of context to answer the question at the end.
// If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
// If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

// {context}

// Question: {question}
// Helpful answer in markdown:`;

function makeChain(
  prompt: string,
  vectorstore: PineconeStore,
  writer: WritableStreamDefaultWriter
) {
  // Create encoding to convert token (string) to Uint8Array
  const encoder = new TextEncoder();

  // Create a TransformStream for writing the response as the tokens as generated
  // const writer = transformStream.writable.getWriter();

  const streamingModel = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    streaming: true,
    temperature: 0,
    verbose: true,
    callbacks: [
      {
        async handleLLMNewToken(token) {
          await writer.ready;
          await writer.write(encoder.encode(`${token}`));
        },
        async handleLLMEnd() {
          console.log("LLM end called");
        },
      },
    ],
  });
  const nonStreamingModel = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    verbose: true,
    temperature: 0,
  });

  // Let the BusinessAnalyst do it's work first.
  // const BaGPT = prompt1.pipe(streamingModel).pipe(new StringOutputParser());
  // const CoreGPT = RunnableSequence.from([
  //   {
  //     problem: BaGPT,
  //   },
  //   prompt2,
  //   streamingModel,
  //   new StringOutputParser(),
  // ]);

  // return CoreGPT;


  const chain = ConversationalRetrievalQAChain.fromLLM(
    streamingModel,
    vectorstore.asRetriever(),
    {
      qaTemplate: prompt,
      questionGeneratorTemplate: CONDENSE_TEMPLATE,
      returnSourceDocuments: true, //default 4
      questionGeneratorChainOptions: {
        llm: nonStreamingModel,
      },
    }
  );
  return chain;
}

type callChainArgs = {
  question: string;
  chatHistory: [string, string][];
  transformStream: TransformStream;
  gptRole: 'BA' | 'TA'
};

export async function callChain({
  question,
  chatHistory,
  transformStream,
  gptRole,
}: callChainArgs) {
  try {
    // Open AI recommendation
    const sanitizedQuestion = question.trim().replaceAll("\n", " ");
    const pineconeClient = await getPineconeClient();
    // let pineconeNamespace, prompt;

    // switch (gptRole) {
    //   case "BA": pineconeNamespace = rpfNamespace; prompt = baPrompt; break;
    //   case "TA": pineconeNamespace = ccNamespace; prompt = taPrompt; break;
    // }

    const vectorStore = await getVectorStore(pineconeClient, rpfNamespace);
    const vectorStoreTl = await getVectorStore(pineconeClient, ccNamespace);

    // Create encoding to convert token (string) to Uint8Array
    const encoder = new TextEncoder();
    const writer = transformStream.writable.getWriter();
    const promptChain = makeChain(baPrompt, vectorStore, writer);
    const promptChainTl = makeChain(taPrompt, vectorStoreTl, writer);
    // const formattedChatHistory = formatChatHistory(chatHistory);
    const formattedChatHistory = formatChatHistory([]);

    // Reference https://js.langchain.com/docs/modules/chains/popular/chat_vector_db#externally-managed-memory
    const res = await promptChain.call({
      question: sanitizedQuestion,
      chat_history: formattedChatHistory
    });


    promptChainTl.call({
      question: res.text,
      chat_history: formattedChatHistory
    })
      .then(async (res) => {
        const sourceDocuments = res?.sourceDocuments;
        const firstTwoDocuments = sourceDocuments.slice(0, 2);
        const pageContents = firstTwoDocuments.map(
          ({ pageContent }: { pageContent: string }) => pageContent
        );
        const stringifiedPageContents = JSON.stringify(pageContents);
        await writer.ready;
        await writer.write(encoder.encode("tokens-ended"));
        // Sending it in the next event-loop
        setTimeout(async () => {
          await writer.ready;
          // await writer.write(encoder.encode(`${stringifiedPageContents}`));
          await writer.close();
        }, 100);
      });

    return transformStream?.readable;
  } catch (e) {
    console.error(e);
    throw new Error("Call chain method failed to execute successfully!!");
  }


}


export async function callTLChain({
  question,
  transformStream,
}: any) {
  try {
    // Open AI recommendation
    const sanitizedQuestion = question.trim().replaceAll("\n", " ");
    const pineconeClient = await getPineconeClient();

    console.log('namespace', ccNamespace);
    const vectorStore = await getVectorStore(pineconeClient, ccNamespace);

    // Create encoding to convert token (string) to Uint8Array
    const encoder = new TextEncoder();
    const writer = transformStream.writable.getWriter();
    const promptChain = makeChain(taPrompt, vectorStore, writer);
    // const formattedChatHistory = formatChatHistory(chatHistory);
    const formattedChatHistory = formatChatHistory([]);

    // Reference https://js.langchain.com/docs/modules/chains/popular/chat_vector_db#externally-managed-memory
    promptChain.call({
      question: sanitizedQuestion,
      chat_history: formattedChatHistory
    })
      .then(async (res) => {
        const sourceDocuments = res?.sourceDocuments;
        const firstTwoDocuments = sourceDocuments.slice(0, 2);
        const pageContents = firstTwoDocuments.map(
          ({ pageContent }: { pageContent: string }) => pageContent
        );
        const stringifiedPageContents = JSON.stringify(pageContents);
        await writer.ready;
        await writer.write(encoder.encode("tokens-ended"));
        // Sending it in the next event-loop
        setTimeout(async () => {
          await writer.ready;
          await writer.write(encoder.encode(`${stringifiedPageContents}`));
          await writer.close();
        }, 100);
      });

    return transformStream?.readable;
  } catch (e) {
    console.error(e);
    throw new Error("Call chain method failed to execute successfully!!");
  }


}
