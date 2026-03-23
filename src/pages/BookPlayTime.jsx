// File: src/pages/BookPlayTime.jsx

import React, { useState } from "react";
import { db } from "../firebase"; // ✅ same as your existing import

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";

export default function BookPlayTime() {
  const { user } = useAuth();
  const instituteId = user?.uid; // same pattern as your code

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    sport: "",
    time: "",
    date: "",
    payment: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // =========================
  // BOOK SLOT (LIKE YOUR FAMILY LOGIC)
  // =========================
  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.date || !form.time) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      // =========================
      // PREVENT DOUBLE BOOKING
      // =========================

      const q = query(
        collection(db, "bookings"),
        where("date", "==", form.date),
        where("time", "==", form.time),
        where("sport", "==", form.sport),
        where("trainerId", "==", instituteId)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        alert("Slot already booked for this time");
        setLoading(false);
        return;
      }

      // =========================
      // CREATE BOOKING
      // =========================

      await addDoc(collection(db, "bookings"), {
        ...form,
        amount: 200,
        trainerId: instituteId,
        createdAt: serverTimestamp(),
      });

      alert("Slot booked successfully!");

      setForm({
        name: "",
        phone: "",
        sport: "",
        time: "",
        date: "",
        payment: "",
      });
    } catch (err) {
      console.error(err);
      alert("Error booking slot");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-3 sm:p-6">
      <div className="w-full max-w-5xl border-2 border-orange-400 p-4 sm:p-6 md:p-8 bg-white rounded-xl shadow-lg">

        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-500">
            Book Your Play Time
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Pick a date and time to enjoy your game.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

          <div>
            <label className="text-sm">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-orange-300 rounded-md p-2 mt-1"
            />
          </div>

          <div>
            <label className="text-sm">Contact Number</label>
            <input
              type="text"
              maxLength={10}
              name="phone"
              value={form.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setForm({ ...form, phone: value });
              }}
              className="w-full border border-orange-300 rounded-md p-2 mt-1"
            />
          </div>

          <div>
            <label className="text-sm">Select Sport</label>
            <select
              name="sport"
              value={form.sport}
              onChange={handleChange}
              className="w-full border border-orange-300 rounded-md p-2 mt-1"
            >
              <option value="">Select</option>
              <option>Cricket</option>
              <option>Football</option>
              <option>Badminton</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Amount Per Hour</label>
            <input
              type="text"
              value="₹200/-"
              disabled
              className="w-full border border-orange-300 rounded-md p-2 mt-1 bg-gray-100"
            />
          </div>

          <div>
            <label className="text-sm">Select Time</label>
            <select
              name="time"
              value={form.time}
              onChange={handleChange}
              className="w-full border border-orange-300 rounded-md p-2 mt-1"
            >
              <option value="">Select</option>
              <option>6 AM - 7 AM</option>
              <option>7 AM - 8 AM</option>
              <option>5 PM - 6 PM</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Select Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border border-orange-300 rounded-md p-2 mt-1"
            />
          </div>

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="text-sm">Payment Mode</label>
              <select
                name="payment"
                value={form.payment}
                onChange={handleChange}
                className="w-full border border-orange-300 rounded-md p-2 mt-1"
              >
                <option value="">Select</option>
                <option>Online</option>
                <option>Offline</option>
              </select>
            </div>

            <button className="bg-orange-500 text-white px-4 py-2 rounded-md w-full sm:w-auto">
              Pay Now
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button className="flex-1 bg-gray-300 py-2 rounded-md">
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-orange-500 text-white py-2 rounded-md"
          >
            {loading ? "Booking..." : "Book a slot"}
          </button>
        </div>

      </div>
    </div>
  );
}
