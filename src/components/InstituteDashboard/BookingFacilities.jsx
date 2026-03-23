import React, { useState, useEffect } from "react";
import { db } from "../../firebase";

import { collection, addDoc, serverTimestamp, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
const BookingFacilitiesPage = () => {
    const [form, setForm] = useState({
        sports: "",
        courts: "",
        players: "",
        amount: "",
        location: "",
        openingTime: "",
        closingTime: "",
    });

    const [dates, setDates] = useState([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [slots, setSlots] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const [tableSlots, setTableSlots] = useState([]);
    // ================= INPUT CHANGE =================
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // ================= ADD SLOT =================
    const handleAddSlot = () => {
        if (!form.openingTime || !form.closingTime || dates.length === 0) return;

const newSlot = {
  id: Date.now(), // ✅ UNIQUE ID (IMPORTANT)

  month: selectedMonth,
  days: `${dates[0].day} - ${dates[dates.length - 1].day}`,
  date: `${dates[0].date} - ${dates[dates.length - 1].date}`,
  time: `${form.openingTime} - ${form.closingTime}`,

  sports: form.sports,
  courts: form.courts,
  players: form.players,
  amount: form.amount,
  location: form.location,
};

        if (editIndex !== null) {
            const updated = [...tableSlots];
            updated[editIndex] = newSlot;
            setTableSlots(updated);
            setEditIndex(null);
        } else {
            setSlots([...slots, newSlot]);         // for current form
            setTableSlots([...tableSlots, newSlot]); // for table display
        }
    };

    const generateDates = () => {
        if (!fromDate || !toDate) return;

        let start = new Date(fromDate);
        let end = new Date(toDate);

        let temp = [];

        while (start <= end) {
            const dateStr = start.toLocaleDateString("en-GB");
            const dayStr = start.toLocaleDateString("en-US", { weekday: "long" });

            temp.push({ date: dateStr, day: dayStr });

            start.setDate(start.getDate() + 1);
        }

        // ✅ SET DATES
        setDates(temp);

        // ✅ SET MONTH (IMPORTANT)
        const monthName = new Date(fromDate).toLocaleString("default", {
            month: "long",
        });
        setSelectedMonth(monthName);

        setShowCalendar(false);
    };

    // ================= FETCH LOCATION =================
    const handleFetchLocation = () => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
                );

                const data = await res.json();

                if (data && data.display_name) {
                    setForm((prev) => ({
                        ...prev,
                        location: data.display_name,
                    }));
                }
            } catch (err) {
                console.log("Location error:", err);
            }
        });
    };

    // ================= SAVE TO FIREBASE =================
    const handleSave = async () => {
        try {
            await addDoc(collection(db, "sportsFacilities"), {
                ...form,
                slots,
                createdAt: serverTimestamp(),
            });
            alert("Saved Successfully");
            setForm({
                sports: "",
                courts: "",
                players: "",
                amount: "",
                location: "",
                openingTime: "",
                closingTime: "",
            });

            setDates([]);
            setFromDate("");
            setToDate("");
            setSelectedMonth("");
            setSlots([]);
            setEditIndex(null);
            fetchData();
        } catch (err) {
            console.log(err);
        }
    };
  const handleEdit = (index) => {
    const slot = tableSlots[index];

    // Extract time
    const [open, close] = slot.time.split(" - ");

    // Extract dates
    const [startDate, endDate] = slot.date.split(" - ");

    const formatDate = (d) => {
        const [day, month, year] = d.split("/");
        return `${year}-${month}-${day}`;
    };

    // ✅ SET FORM FULL DATA
    setForm({
        sports: slot.sports || "",
        courts: slot.courts || "",
        players: slot.players || "",
        amount: slot.amount || "",
        location: slot.location || "",
        openingTime: open,
        closingTime: close,
    });

    // ✅ SET DATES
    setFromDate(formatDate(startDate));
    setToDate(formatDate(endDate));

    setTimeout(() => {
        generateDates();
    }, 100);

    // ✅ SET MONTH
    setSelectedMonth(slot.month);

    setEditIndex(index);
};
    useEffect(() => {
        if (dates.length === 0) return;

        setSlots((prev) =>
            prev.map((slot) => ({
                ...slot,
                days: `${dates[0].day} - ${dates[dates.length - 1].day}`,
                date: `${dates[0].date} - ${dates[dates.length - 1].date}`,
                time: `${form.openingTime || ""} - ${form.closingTime || ""}`,
            }))
        );
    }, [dates, form.openingTime, form.closingTime]);
useEffect(() => {
  fetchData();
}, []);
const handleDelete = async (index) => {
  const slotToDelete = tableSlots[index];

  try {
    const docRef = doc(db, "sportsFacilities", slotToDelete.docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const currentSlots = docSnap.data().slots || [];

    // ✅ DELETE using UNIQUE ID
    const updatedSlots = currentSlots.filter(
      (s) => s.id !== slotToDelete.id
    );

    await updateDoc(docRef, {
      slots: updatedSlots,
    });

    // ✅ update UI
    setTableSlots((prev) => prev.filter((_, i) => i !== index));

  } catch (err) {
    console.log("Delete error:", err);
  }
};
const fetchData = async () => {
  const querySnapshot = await getDocs(collection(db, "sportsFacilities"));

  let allSlots = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (data.slots) {
      const slotsWithId = data.slots.map((slot) => ({
        ...slot,
        docId: docSnap.id, // ✅ store document id
      }));

      allSlots = [...allSlots, ...slotsWithId];
    }
  });

  setTableSlots(allSlots);
};
    return (
        <div className="p-4 md:p-8 bg-white min-h-screen">
            {/* HEADER */}
            <h1 className="text-xl md:text-2xl font-bold text-orange-500 text-center">
                Add Sports Facilities
            </h1>
            <p className="text-center text-gray-500 mb-6 text-sm md:text-base">
                Configure courts, capacity, and availability for seamless bookings
            </p>

            {/* ================= BASIC INFO ================= */}
            <div className="bg-gray-100 rounded-xl p-4 md:p-6 mb-6 border">
                <h2 className="font-semibold mb-4">Basic Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm">Sports Offered</label>
                        <input
                            name="sports"
                            value={form.sports}
                            onChange={handleChange}
                            placeholder=""
                            className="w-full p-2 border rounded-md focus:outline-orange-400"
                        />
                    </div>

                    <div>
                        <label className="text-sm">
                            Number of Court’s Available
                        </label>
                        <input
                            name="courts"
                            value={form.courts}
                            onChange={handleChange}
                            placeholder="e.g: 5"
                            className="w-full p-2 border rounded-md focus:outline-orange-400"
                        />
                    </div>

                    <div>
                        <label className="text-sm">Number of Players per court</label>
                        <input
                            name="players"
                            value={form.players}
                            onChange={handleChange}
                            placeholder="e.g: 11"
                            className="w-full p-2 border rounded-md focus:outline-orange-400"
                        />
                    </div>

                    <div>
                        <label className="text-sm">Amount Per Hour</label>
                        <input
                            name="amount"
                            value={form.amount}
                            onChange={handleChange}
                            placeholder="e.g: 200 / Hour"
                            className="w-full p-2 border rounded-md focus:outline-orange-400"
                        />
                    </div>
                </div>
            </div>

            {/* ================= DATE & TIME ================= */}
            <div className="bg-gray-100 rounded-xl p-4 md:p-6 mb-6 border">
                <div className="flex justify-between items-center mb-3 relative">
                    <h2 className="font-semibold">Date & Time</h2>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="bg-orange-200 px-4 py-2 rounded-md text-sm flex items-center gap-2"
                    >
                        {selectedMonth || "Select Month"}
                        <img src="/calendar.png" alt="cal" className="w-4 h-4" />
                    </button>
                </div>
                {showCalendar && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

                        {/* POPUP BOX */}
                        <div className="bg-white rounded-xl p-6 w-[320px] shadow-lg relative">

                            {/* CLOSE BUTTON */}
                            <button
                                onClick={() => setShowCalendar(false)}
                                className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
                            >
                                ✕
                            </button>

                            <h2 className="text-lg font-semibold mb-4 text-center">
                                Select Dates
                            </h2>

                            {/* FROM */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-600">From</label>
                                <div className="flex items-center border rounded-md px-2">
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full p-2 outline-none"
                                    />
                                </div>
                            </div>

                            {/* TO */}
                            <div className="mb-4">
                                <label className="text-sm text-gray-600">To</label>
                                <div className="flex items-center border rounded-md px-2">
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full p-2 outline-none"
                                    />
                                </div>
                            </div>

                            {/* APPLY */}
                            <button
                                onClick={generateDates}
                                className="w-full bg-orange-500 text-white py-2 rounded-md"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}

                {/* DATE CHIPS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                    {dates.map((d, i) => (
                        <div
                            key={i}
                            className="relative bg-orange-200 px-4 py-3 rounded-md text-sm text-center"
                        >
                            {/* ❌ CLOSE BUTTON */}
                            <button
                                onClick={() => {
                                    const updated = dates.filter((_, index) => index !== i);
                                    setDates(updated);
                                }}
                                className="absolute top-1 right-2 text-xs hover:text-red-600"
                            >
                                ✕
                            </button>

                            <div>{d.date}</div>
                            <div className="text-gray-600">{d.day}</div>
                        </div>
                    ))}
                </div>

                {/* TIME SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="text-sm">Select Facility Days</label>
                        <input
                            value={
                                dates.length
                                    ? `${dates[0].day} - ${dates[dates.length - 1].day}`
                                    : ""
                            }
                            readOnly
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="text-sm">Opening Time</label>
                      <div className="relative w-full">
  <input
    type="time"
    name="openingTime"
    value={form.openingTime}
    onChange={handleChange}
className="w-full p-1.5 pr-4 border border-gray-300 rounded-md bg-gray-100 focus:outline-none appearance-none"
  />
 
</div>
                    </div>

                    <div>
                        <label className="text-sm">Closing Time</label>
                       <div className="relative w-full">
  <input
    type="time"
    name="closingTime"
    value={form.closingTime}
    onChange={handleChange}
   className="w-full p-1.5 pr-4 border border-gray-300 rounded-md bg-gray-100 focus:outline-none appearance-none"
  />
  
</div>
                    </div>

                    <button
                        onClick={handleAddSlot}
                        className="bg-orange-500 text-white px-4 py-2 rounded-md"
                    >
                        {editIndex !== null ? "Update Slot" : "+ Add Slot"}
                    </button>
                </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 md:p-6 mb-6 border">
                <div className="flex flex-col md:flex-row items-center gap-4">

                    <label className="w-full md:w-auto font-medium">
                        Location
                    </label>

                    <input
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        className="flex-1 w-full p-3 border border-orange-300 rounded-md bg-gray-200"
                    />

                    <button
                        onClick={handleFetchLocation}
                        className="bg-orange-500 text-white px-4 py-3 rounded-md whitespace-nowrap"
                    >
                        Fetch Current Location
                    </button>

                </div>
            </div>
            {/* ================= TABLE ================= */}
            <div className="bg-gray-100 rounded-xl p-4 md:p-6 border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm md:text-base text-center">
                        <thead>
                            <tr className="text-orange-500 border-b">
                                <th>Month</th>
                                <th>Days</th>
                                <th>Date</th>
                                <th>Operating Hours</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tableSlots.map((slot, i) => (
                                <tr key={i}>
                                    <td>{slot.month}</td>
                                    <td>{slot.days}</td>
                                    <td>{slot.date}</td>
                                    <td>{slot.time}</td>
                                    <td>
                                        <button
                                            onClick={() => handleEdit(i)}
                                            className="text-blue-500 mr-2"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            onClick={() => handleDelete(i)}
                                            className="text-red-500"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= ACTION BUTTONS ================= */}
            <div className="flex justify-end gap-4 mt-6">
                <button className="bg-gray-300 px-4 py-2 rounded-md">
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="bg-orange-500 text-white px-4 py-2 rounded-md"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default BookingFacilitiesPage;