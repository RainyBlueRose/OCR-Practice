import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { PaddleOcrService } from "ppu-paddle-ocr";

initializeApp();

const db = getFirestore();
const bucket = getStorage().bucket();

const ocrService = new PaddleOcrService();

let ocrInitialized = false;

async function initializeOcr() {
  if (!ocrInitialized) {
    console.log("Initialize Paddle OCR...");

    await ocrService.initialize();

    ocrInitialized = true;

    console.log("Paddle OCR initialized.");
  }
}

export const testFunction = onSchedule(
  { memory: "512MiB", timeoutSeconds: 300 },
  async (event) => {
    console.log("Checking for pending OCR jobs...");

    const snapshot = await db
      .collection("certificates")
      .where("status", "==", "pending")
      .get();

    console.log(`found ${snapshot.size} pending jobs.`);

    if (snapshot.empty) {
      return;
    }

    await initializeOcr();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      console.log(data.storagePath);

      console.log(`processing ${data.fileName}`);

      await doc.ref.update({
        status: "processing",
        startedAt: FieldValue.serverTimestamp(),
      });

      try {
        const file = bucket.file(data.storagePath);

        const [buffer] = await file.download();

        console.log(`Download ${buffer.length} bytes`);

        const arrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        );

        console.log(`Running OCR on ${data.fileName}`);

        const result = await ocrService.recognize(arrayBuffer);

        console.log("OCR result:");
        console.log(result.text);

        await doc.ref.update({
          status: "completed",
          ocrText: result.text,
        });

        console.log(`completed ${data.fileName}`);

      } catch (error) {

        console.error("OCR failed", error);

        await doc.ref.update({
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          failedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  },
);
