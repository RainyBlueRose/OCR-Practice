import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

function App() {
  // เอาไว้เก็บภาพที่ผู้ใช้ใส่ใน input ลงมา
  const [file, setFile] = useState(null);
  //เก็บ imageUrl ไว้ใช้แสดงผลใน frontend
  const [imageUrl, setImageUrl] = useState(null);

  //ใช้อัปเดท State ตอนที่ผู้ใช้ทำการใส่ไฟล์ภาพใน input
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
  };

  //Function รับตอนผู้ใช้กดปุ่ม Upload ภาพ (สำหรับ Event-driven architecture)
  // 1.สร้าง Job 2.ตั้งชื่อไฟล์ตาม JobId 3.อัปโหลด 4.บันทึก path กลับ
  const handleUpload = async () => {
    //เช็คว่าผู้ใช้อัปโหลดภาพมาไหม ถ้าไม่ก็หยุดก่อน
    if (!file) {
      return;
    }

    // สร้าง Firestore document เก็บข้อมูลพื้นฐานก่อนรอบแรก เพื่อจะได้ให้ Firestore สร้าง ID มาก่อน เราจะได้เอาไปใช้เป็น JobId ต่อ
    const docRef = await addDoc(collection(db, "certificates"), {
      fileName: file.name,
      status: "pending",
      ocrText: null,
      createdAt: serverTimestamp(),
    });

    //ดึง Firestore documentId มาเพื่อเอามาใช้ประกอบ JobId
    const jobId = docRef.id;

    //ไฟล์ภาพที่ผู้ใช้อัปโหลดให้แยกนามสกุลไฟล์ออกมา
    const extension = file.name.split(".").pop();

    //ตั้งชื่อไฟล์ใน Storage ด้วย jobId ตอนที่อยู่ที่ Cloud Function จะได้หาได้ว่าเกี่ยวข้องกับ Firestore ตัวไหน
    const storagePath = `certificates/${jobId}.${extension}`;

    //สร้าง path ไว้ให้ Storage เก็บถูกว่าจะเก็บไว้ที่ไหน
    const storageRef = ref(storage, storagePath);

    //อัปโหลดภาพขึ้น Storage
    await uploadBytes(storageRef, file);

    //อัปเดท Document อันที่สร้างไปตอนแรกโดยการเพื่ม StoragePath ลงไปเพื่อระบุว่า อ้างอิงจาก Storage ไหน
    await updateDoc(docRef, {
      storagePath,
    });

    console.log("upload complete", jobId);
  };

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
    <div>
      <h1>OCR Learning</h1>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {file && <p>Selected: {file.name}</p>}
      <button onClick={handleUpload}>upload</button>

      {imageUrl && (
        <img src={imageUrl} alt="Uploaded certificate" width="400" />
      )}
    </div>
  );
}

export default App;
