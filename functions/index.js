import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
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
  { schedule: "*/10 * * * *", memory: "1GiB", timeoutSeconds: 300 },
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
      });

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
    }
  },
);
