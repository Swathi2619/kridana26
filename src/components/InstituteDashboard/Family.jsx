import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { createUserWithEmailAndPassword } from "firebase/auth";

import { useAuth } from "../../context/AuthContext";

const CreateFamilyPage = () => {
  const { user } = useAuth();
  const instituteId = user?.uid;

  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [formData, setFormData] = useState({
    email: "",
    fatherName: "",
    motherName: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  // =========================
  // FETCH STUDENTS
  // =========================
  const fetchStudents = async () => {
    const q = query(
      collection(db, "students"),
      where("instituteId", "==", instituteId),
    );

    const snap = await getDocs(q);

    const list = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setStudents(list);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // =========================
  // SELECT STUDENTS
  // =========================
  const toggleStudent = (uid) => {
    if (selectedStudents.includes(uid)) {
      setSelectedStudents(selectedStudents.filter((s) => s !== uid));
    } else {
      setSelectedStudents([...selectedStudents, uid]);
    }
  };

  // =========================
  // CREATE FAMILY
  // =========================
  const handleSubmit = async () => {
    if (!formData.email || selectedStudents.length === 0) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      // =========================
      // CHECK FAMILY EMAIL EXISTS
      // =========================

      const q = query(
        collection(db, "families"),
        where("email", "==", formData.email),
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        alert("Family already exists with this email");
        setLoading(false);
        return;
      }

      // =========================
      // CREATE AUTH USER
      // =========================

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        "123456",
      );

      const familyUID = userCredential.user.uid;

      // =========================
      // CREATE FAMILY DOCUMENT
      // =========================

      await setDoc(doc(db, "families", familyUID), {
        email: formData.email,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        phone: formData.phone,

        role: "family",
        instituteId,

        students: selectedStudents,

        createdAt: serverTimestamp(),
      });

      // =========================
      // LINK STUDENTS
      // =========================

      for (let studentId of selectedStudents) {
        const studentRef = doc(db, "students", studentId);

        await updateDoc(studentRef, {
          familyId: familyUID,
        });
      }

      alert("Family login created successfully");

      setFormData({
        email: "",
        fatherName: "",
        motherName: "",
        phone: "",
      });

      setSelectedStudents([]);
    } catch (error) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        alert("This email already has a login account");
      } else {
        alert("Error creating family");
      }
    }

    setLoading(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Family Login</h1>

      {/* Parent Details */}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <input
          placeholder="Parent Email"
          value={formData.email}
          onChange={(e) =>
            setFormData({
              ...formData,
              email: e.target.value,
            })
          }
          className="border p-3 rounded"
        />

        <input
          placeholder="Father Name"
          value={formData.fatherName}
         onChange={(e) => {
  const value = e.target.value;

  if (/^[A-Za-z\s]*$/.test(value)) {
    setFormData({
      ...formData,
      fatherName: value,
    });
  }
}}
          className="border p-3 rounded"
        />

        <input
          placeholder="Mother Name"
          value={formData.motherName}
onChange={(e) => {
  const value = e.target.value;

  if (/^[A-Za-z\s]*$/.test(value)) {
    setFormData({
      ...formData,
      motherName: value,
    });
  }
}}
          className="border p-3 rounded"
        />

        <input
          placeholder="Phone"
          value={formData.phone}
onChange={(e) => {
  const value = e.target.value;

  if (/^[0-9]{0,10}$/.test(value)) {
    setFormData({
      ...formData,
      phone: value,
    });
  }
}}
          className="border p-3 rounded"
        />
      </div>

      {/* STUDENTS */}

      <h2 className="text-lg font-semibold mb-4">Select Students</h2>

      <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto border p-4 rounded">
        {students.map((student) => (
          <label
            key={student.customerUid}
            className="flex items-center gap-3 border p-3 rounded cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedStudents.includes(student.customerUid)}
              onChange={() => toggleStudent(student.customerUid)}
            />

            <div>
              <p className="font-medium">
                {student.firstName} {student.lastName}
              </p>

              <p className="text-sm text-gray-500">{student.subCategory}</p>
            </div>
          </label>
        ))}
      </div>

      {/* SUBMIT */}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 bg-orange-500 text-white px-6 py-3 rounded hover:bg-orange-600"
      >
        {loading ? "Creating..." : "Create Family Login"}
      </button>
    </div>
  );
};

export default CreateFamilyPage;