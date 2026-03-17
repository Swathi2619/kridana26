/* FULL 400+ LINES DYNAMIC DASHBOARD CODE
   FIXES:
   - trainingMetrics undefined
   - physicalMetrics undefined
   - dynamic instituteId based on login
   - reloads empty if no data
   - no stale previous selection
   - UI unchanged
*/

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { CalendarDays, Activity, Clock } from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useSelectedStudent } from "../../context/SelectedStudentContext";
/* ---------------- Donut Component ---------------- */

const Donut = ({ data }) => {
  return (
    <PieChart width={180} height={180}>
      <Pie
        data={data}
        innerRadius={70}
        outerRadius={90}
        dataKey="value"
        paddingAngle={2}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  );
};

/* ---------------- Dashboard ---------------- */

const Dashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [trainingMetrics, setTrainingMetrics] = useState(null);
  const [physicalMetrics, setPhysicalMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [role, setRole] = useState("student");
  const { selectedStudentUid } = useSelectedStudent();

  console.log("Current Student:", selectedStudentUid);

  /* ---------------- FETCH DATA ---------------- */

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setAttendanceData([]);
        setTrainingMetrics(null);
        setPhysicalMetrics(null);

        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        /* 🔹 Check if user is student */
        const studentRef = doc(db, "students", user.uid);
        const studentSnap = await getDoc(studentRef);

        let targetStudentId = null;
        let instituteId = null;

        if (studentSnap.exists()) {
          /* STUDENT LOGIN */
          setRole("student");

          const studentData = studentSnap.data();
          instituteId = studentData.instituteId;
          targetStudentId = user.uid;
        } else {
          /* FAMILY LOGIN */
          setRole("family");

          const familyRef = doc(db, "families", user.uid);
          const familySnap = await getDoc(familyRef);

          if (!familySnap.exists()) {
            setLoading(false);
            return;
          }

          const familyData = familySnap.data();
          const studentIds = familyData.students || [];

          if (studentIds.length === 0) {
            setLoading(false);
            return;
          }

          /* Load students list */
          const studentDocs = await Promise.all(
            studentIds.map((id) => getDoc(doc(db, "students", id))),
          );

          const studentList = studentDocs
            .filter((s) => s.exists())
            .map((s) => ({ id: s.id, ...s.data() }));

          setStudents(studentList);

          const selected = studentList.find((s) => s.id === selectedStudentUid);

          targetStudentId = selected?.id || studentList[0].id;
          instituteId = selected?.instituteId || studentList[0].instituteId;
        }

        if (!targetStudentId || !instituteId) {
          setLoading(false);
          return;
        }
        /* 🔹 Fetch Institute Events */
        const eventsQuery = query(
          collection(db, "events"),
          where("basicInfo.instituteId", "==", instituteId),
        );

        const eventsSnap = await getDocs(collection(db, "events"));

        console.log("TOTAL EVENTS:", eventsSnap.docs.length);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = eventsSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((event) => {
            if (event.instituteId !== instituteId) return false;

            const endDate = event.schedule?.endDate;
            if (!endDate) return false;

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            return end >= today;
          })
          .sort(
            (a, b) =>
              new Date(a.schedule?.startDate) - new Date(b.schedule?.startDate),
          );

        console.log("Filtered Events:", upcomingEvents);

        setEvents(upcomingEvents); /* 🔹 Query performance data */

        const q = query(
          collection(db, `institutes/${instituteId}/performancestudents`),
          where("studentId", "==", targetStudentId),
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          setLoading(false);
          return;
        }

        const attendanceResult = [];
        let latestTraining = null;
        let latestPhysical = null;

        snap.docs.forEach((docSnap) => {
          const docData = docSnap.data();

          /* Attendance */
          if (docData.attendanceStats) {
            attendanceResult.push({
              title: `${docData.subCategory} Sessions`,
              total: docData.attendanceStats.total || 0,
              present: docData.attendanceStats.present || 0,
              absent:
                (docData.attendanceStats.total || 0) -
                (docData.attendanceStats.present || 0),
            });
          }

          /* Training Metrics */
          if (docData.metrics) {
            latestTraining = docData.metrics;
          }

          /* Physical Metrics */
          if (docData.physicalFitness) {
            latestPhysical = docData.physicalFitness;
          }
        });

        setAttendanceData(attendanceResult);
        setTrainingMetrics(latestTraining);
        setPhysicalMetrics(latestPhysical);

        setLoading(false);
      } catch (err) {
        console.error("Dashboard fetch error:", err);

        setAttendanceData([]);
        setTrainingMetrics(null);
        setPhysicalMetrics(null);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStudentUid]);

  /* ---------------- Helpers ---------------- */

  const parseScore = (val) => {
    if (!val) return 0;
    if (typeof val === "string" && val.includes("/")) {
      return Number(val.split("/")[0]) || 0;
    }
    if (typeof val === "string" && val.includes("%")) {
      return Number(val.replace("%", "")) || 0;
    }
    return Number(val) || 0;
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-white min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Top Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-orange-400 rounded-lg p-5 flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-md">
            <CalendarDays className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Upcming Events</h3>
            <p className="text-gray-500 text-sm">{events.length} Events</p>
          </div>
        </div>

        <div className="bg-white border border-orange-400 rounded-lg p-5 flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-md">
            <Activity className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Active Sports</h3>
            <p className="text-gray-500 text-sm">03 Sports</p>
          </div>
        </div>

        <div className="bg-white border border-orange-400 rounded-lg p-5 flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-md">
            <Clock className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Training Sessions</h3>
            <p className="text-gray-500 text-sm">10 Sessions</p>
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        {/* Upcoming Events */}
        <div className="col-span-1">
          <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>

          <div className="bg-white border border-orange-400 rounded-lg p-5 h-full">
            <div className="divide-y divide-gray-200">
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No upcoming events</p>
              ) : (
                events.slice(0, 5).map((event) => (
                  <div key={event.id} className="py-3">
                    <h4 className="font-semibold">
                      {event.basicInfo?.eventName}
                    </h4>

                    <p className="text-sm text-gray-500">
                      {event.schedule?.startDate} | {event.schedule?.startTime}
                    </p>

                    <p className="text-sm text-gray-500">
                      {event.schedule?.venueName}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Training Progress */}
        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-6">Training Progress</h2>

          <div className="bg-white border border-orange-400 rounded-lg p-5 h-full">
            <div className="flex flex-col lg:flex-row justify-around items-center gap-10">
              {/* Left Donut */}
              <div className="flex flex-col items-center">
                <Donut
                  data={[
                    {
                      value: parseScore(trainingMetrics?.coach),
                      color: "#f97316",
                    },
                    {
                      value: parseScore(trainingMetrics?.skill),
                      color: "#eab308",
                    },
                    {
                      value: parseScore(trainingMetrics?.fitness),
                      color: "#22c55e",
                    },
                    {
                      value: parseScore(trainingMetrics?.discipline),
                      color: "#6b7280",
                    },
                    {
                      value: parseScore(trainingMetrics?.team),
                      color: "#3b82f6",
                    },
                    {
                      value: parseScore(trainingMetrics?.focus),
                      color: "#ef4444",
                    },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <p>
                    <span className="w-3 h-3 bg-orange-500 inline-block mr-2 rounded-full"></span>
                    Coach Rating
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-yellow-400 inline-block mr-2 rounded-full"></span>
                    Skill Progress
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-green-500 inline-block mr-2 rounded-full"></span>
                    Fitness
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-gray-500 inline-block mr-2 rounded-full"></span>
                    Discipline
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-blue-500 inline-block mr-2 rounded-full"></span>
                    Team Work
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-red-500 inline-block mr-2 rounded-full"></span>
                    Effort
                  </p>
                </div>
              </div>

              {/* Right Donut */}
              <div className="flex flex-col items-center">
                <Donut
                  data={[
                    {
                      value: parseScore(physicalMetrics?.speed?.value),
                      color: "#f97316",
                    },
                    {
                      value: parseScore(physicalMetrics?.agility?.value),
                      color: "#eab308",
                    },
                    {
                      value: parseScore(physicalMetrics?.stamina?.value),
                      color: "#22c55e",
                    },
                    {
                      value: parseScore(physicalMetrics?.flexibility?.value),
                      color: "#3b82f6",
                    },
                    {
                      value: parseScore(physicalMetrics?.strength?.value),
                      color: "#10b981",
                    },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <p>
                    <span className="w-3 h-3 bg-orange-500 inline-block mr-2 rounded-full"></span>
                    Speed
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-yellow-400 inline-block mr-2 rounded-full"></span>
                    Agility
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-green-500 inline-block mr-2 rounded-full"></span>
                    Stamina
                  </p>
                  <p>
                    <span className="w-3 h-3 bg-blue-500 inline-block mr-2 rounded-full"></span>
                    Flexibility
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-6">
              <strong>Trainer Observation :</strong> Demonstrates consistent
              dedication, strong discipline, and steady improvement across all
              training sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-6">Attendance Summary</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center text-gray-500">
              Loading attendance...
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="col-span-3 text-center text-gray-500">
              No attendance data available
            </div>
          ) : (
            attendanceData.map((item, index) => (
              <div
                key={index}
                className="bg-white border border-orange-400 rounded-lg p-5"
              >
                <h3 className="font-semibold text-lg mb-4">{item.title}</h3>

                <p className="mb-2">
                  Total Session{" "}
                  <span className="float-right">{item.total}</span>
                </p>
                <p className="mb-2">
                  Present <span className="float-right">{item.present}</span>
                </p>
                <p className="mb-2">
                  Absent{" "}
                  <span className="float-right">
                    {item.absent.toString().padStart(2, "0")}
                  </span>
                </p>

                <div className="border-t mt-4 pt-3">
                  <p className="text-sm mb-2">
                    Attendance Rate : {item.present}/{item.total}
                  </p>
                  <div className="w-full bg-gray-200 h-2 rounded-full">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{
                        width: `${item.total ? (item.present / item.total) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
