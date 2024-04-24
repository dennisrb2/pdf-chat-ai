/*import { getChunkedDocsFromPDF } from "@/lib/pdf-loader";
import { pineconeEmbedAndStore } from "@/lib/vector-store";
import { getPineconeClient } from "@/lib/pinecone-client";
import { env } from "@/lib/config";

import fs from 'fs';
import path from 'path';

function getPDFFilesFromDirectory(directoryPath: string): Promise<{ name: string, path: string }[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf')
          .map(file => ({ name: file, path: path.join(directoryPath, file) }));
        resolve(pdfFiles);
      }
    });
  });
}

// This operation might fail because indexes likely need
// more time to init, so give some 5 mins after index
// creation and try again.
(async () => {
  try {
    const pineconeClient = await getPineconeClient();
    console.log("Preparing chunks from PDF files in directory");
    const pdfFiles = await getPDFFilesFromDirectory(env.PDF_PATH);
    for (const file of pdfFiles) {
      console.log(`Processing ${file.name}`);
      const docs = await getChunkedDocsFromPDF(file.path); // Assuming getChunkedDocsFromPDF can take a file path as argument
      console.log(`Loading ${docs.length} chunks from ${file.name} into pinecone...`);
      await pineconeEmbedAndStore(pineconeClient, docs);
      console.log(`Data from ${file.name} embedded and stored in pine-cone index`);
    }
  } catch (error) {
    console.error("Init client script failed ", error);
  }
})();
*/


import { getChunkedDocsFromPDF } from "@/lib/pdf-loader";
import { pineconeEmbedAndStore } from "@/lib/vector-store";
import { getPineconeClient } from "@/lib/pinecone-client";

(async () => {
  try {
    const pineconeClient = await getPineconeClient();
    console.log("Preparing chunks from PDF file");
    const docs = await getChunkedDocsFromPDF();
    console.log(`Loading ${docs.length} chunks into pinecone...`);
    await pineconeEmbedAndStore(pineconeClient, docs);
    console.log("Data embedded and stored in pine-cone index");
  } catch (error) {
    console.error("Init client script failed ", error);
  }
})();



