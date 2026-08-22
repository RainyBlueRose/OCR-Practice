import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

function App() {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("กรุณาอัปโหลดไฟล์ก่อน");
      return;
    }

    const storagePath = `certificates/${file.name}`;

    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);

    const downloadURL = await getDownloadURL(storageRef);

    setImageUrl(downloadURL);

    const docRef = await addDoc(collection(db, "certificates"), {
      fileName: file.name,
      storagePath: storagePath,
      imageUrl: downloadURL,
      status: "pending",
      ocrText: null,
    });
  };

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
