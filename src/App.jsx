import { useEffect, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

function App() {
  // เอาไว้เก็บภาพที่ผู้ใช้ใส่ใน input ลงมา
  const [file, setFile] = useState(null);
  //เก็บ imageUrl ไว้ใช้แสดงผลใน frontend
  const [imageUrl, setImageUrl] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  //ใช้อัปเดท State ตอนที่ผู้ใช้ทำการใส่ไฟล์ภาพใน input
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);

    setJob(null);
    setJobId(null);
    setError(null);
  };

  //Function รับตอนผู้ใช้กดปุ่ม Upload ภาพ (สำหรับ Event-driven architecture)
  // 1.สร้าง Job 2.ตั้งชื่อไฟล์ตาม JobId 3.อัปโหลด 4.บันทึก path กลับ
  const handleUpload = async () => {
    //เช็คว่าผู้ใช้อัปโหลดภาพมาไหม ถ้าไม่ก็หยุดก่อน
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // สร้าง Firestore document เก็บข้อมูลพื้นฐานก่อนรอบแรก เพื่อจะได้ให้ Firestore สร้าง ID มาก่อน เราจะได้เอาไปใช้เป็น JobId ต่อ
      const docRef = await addDoc(collection(db, "certificates"), {
        fileName: file.name,
        status: "pending",
        ocrText: null,
        error: null,
        createdAt: serverTimestamp(),
      });

      //ดึง Firestore documentId มาเพื่อเอามาใช้ประกอบ JobId
      const newJobId = docRef.id;
      console.log("Create Job:", newJobId);
      setJobId(newJobId);

      //ไฟล์ภาพที่ผู้ใช้อัปโหลดให้แยกนามสกุลไฟล์ออกมา
      const extension = file.name.split(".").pop();

      //ตั้งชื่อไฟล์ใน Storage ด้วย jobId ตอนที่อยู่ที่ Cloud Function จะได้หาได้ว่าเกี่ยวข้องกับ Firestore ตัวไหน
      const storagePath = `certificates/${newJobId}.${extension}`;

      //สร้าง path ไว้ให้ Storage เก็บถูกว่าจะเก็บไว้ที่ไหน
      const storageRef = ref(storage, storagePath);

      //อัปโหลดภาพขึ้น Storage
      await uploadBytes(storageRef, file);

      //อัปเดท Document อันที่สร้างไปตอนแรกโดยการเพื่ม StoragePath ลงไปเพื่อระบุว่า อ้างอิงจาก Storage ไหน
      await updateDoc(docRef, {
        storagePath,
      });

      console.log("Job Updated");

      console.log("upload complete", jobId);
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!jobId) {
      return;
    }

    console.log("Listening to Job", jobId);

    const jobRef = doc(db, "certificates", jobId);

    const unsubscribe = onSnapshot(
      jobRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.log("Job does not exist");
          return;
        }

        const data = snapshot.data();

        console.log("Job Updated", data);

        setJob(data);
      },
      (error) => {
        console.error("Firestore listener error", error);

        setError(error.message);
      },
    );
    return () => {
      console.log("Unsubscribe Job:", jobId);
      unsubscribe();
    };
  }, [jobId]);

  //Function รับตอนผู้ใช้กดปุ่ม Upload ภาพ (สำหรับ Batch Processing)
  // const handleUpload = async () => {
  //   if (!file) {
  //     alert("กรุณาอัปโหลดไฟล์ก่อน");
  //     return;
  //   }

  //   const storagePath = `certificates/${file.name}`;

  //   const storageRef = ref(storage, storagePath);

  //   await uploadBytes(storageRef, file);

  //   const downloadURL = await getDownloadURL(storageRef);

  //   setImageUrl(downloadURL);

  //   const docRef = await addDoc(collection(db, "certificates"), {
  //     fileName: file.name,
  //     storagePath: storagePath,
  //     imageUrl: downloadURL,
  //     status: "pending",
  //     ocrText: null,
  //   });
  // };

  return (
    <div className="app">
      <h1>OCR Certificate</h1>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {file && (
        <div>
          <p>File: {file.name}</p>

          <p>Size: {file.size} bytes</p>
        </div>
      )}

      <button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {error && (
        <div>
          <p>Error</p>

          <p>{error}</p>
        </div>
      )}

      {jobId && (
        <div>
          <h2>Job</h2>

          <p>ID: {jobId}</p>
        </div>
      )}

      {job && (
        <div>
          <h2>OCR Status</h2>

          {job.status === "pending" && <p>กำลังรอประมวลผล...</p>}

          {job.status === "processing" && <p>กำลัง OCR...</p>}

          {job.status === "completed" && (
            <div>
              <p>OCR สำเร็จ</p>

              <h3>OCR Result</h3>

              <pre>{job.ocrText}</pre>
            </div>
          )}

          {job.status === "failed" && (
            <div>
              <p>OCR ล้มเหลว</p>

              <p>{job.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
