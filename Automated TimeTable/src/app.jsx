import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore';
import { Plus, X, ListPlus, Clock, Users, CalendarDays, BookOpen, Trash2, Zap, UserCheck, UserPlus, SlidersHorizontal } from 'lucide-react';

// --- Global Setup & Constraints (Based on Requirements) ---
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const START_TIME = 9; // 9:00 AM
const END_TIME = 17;  // 5:00 PM
const LUNCH_BREAK = { start: 12, duration: 1 }; 

// Time slots for a 50-min class + 10-min break
const TIME_SLOTS = [];
for (let h = START_TIME; h < END_TIME; h++) {
    if (h === LUNCH_BREAK.start) {
        TIME_SLOTS.push({ time: ${h}:00, type: 'LUNCH_BREAK', duration: 60 });
        h += LUNCH_BREAK.duration - 1; 
        continue;
    }
    TIME_SLOTS.push({ time: ${h}:00, type: 'CLASS', duration: 50 });
}

// Mock color palette for different courses
const COURSE_COLORS = [
    'bg-blue-200 border-blue-600', 'bg-green-200 border-green-600', 
    'bg-yellow-200 border-yellow-600', 'bg-purple-200 border-purple-600',
    'bg-red-200 border-red-600', 'bg-indigo-200 border-indigo-600'
];

// --- Firebase Initialization ---
// FIX: Removed global mutable variables like db, auth, userId, isAuthReady.
// These will be managed within the React component lifecycle.
let db;
let auth;

// Global variables from Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof _firebase_config !== 'undefined' ? JSON.parse(_firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Utility Components ---
const InputField = ({ label, id, value, onChange, type = 'text', required = true, icon: Icon, min = null }) => (
    <div className="relative">
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition duration-150">
            {Icon && <Icon className="w-5 h-5 text-gray-400 ml-3" />}
            <input
                type={type}
                id={id}
                value={value}
                onChange={onChange}
                required={required}
                min={min}
                className="w-full px-3 py-2 text-gray-700 bg-white placeholder-gray-400 focus:outline-none"
            />
        </div>
    </div>
);

// --- Sub-Components for Tabbed View ---

// FIX: Removed unused getCollectionRef prop
const FacultyManager = ({ courses, faculty, handleDeleteFaculty, handleAddFaculty, newFaculty, handleFacultyInputChange }) => {
    
    // Simple logic to mock availability status for visualization
    const getAvailabilityStatus = (facultyMember, day) => {
        // Mock data: Assume 80% availability on Monday-Wednesday, 50% otherwise
        const availabilityScore = facultyMember.id.charCodeAt(0) % 100;
        if (day === 'Friday') return availabilityScore > 75 ? 'Low' : 'High';
        if (day === 'Monday' || day === 'Tuesday') return availabilityScore > 20 ? 'High' : 'Low';
        return 'Medium';
    };

    const getStatusClasses = (status) => {
        switch(status) {
            case 'High': return 'bg-green-100 text-green-700 border-green-500';
            case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-500';
            case 'Low': return 'bg-red-100 text-red-700 border-red-500';
            default: return 'bg-gray-100 text-gray-500 border-gray-300';
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><UserPlus className="w-5 h-5 mr-2"/> Add New Faculty</h2>
                <form onSubmit={handleAddFaculty} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="Faculty Name" id="name" value={newFaculty.name} onChange={handleFacultyInputChange} icon={Users} />
                        <InputField label="Faculty ID (Unique)" id="id" value={newFaculty.id} onChange={handleFacultyInputChange} icon={Zap} />
                        <InputField label="Max Load (Hrs/Wk)" id="maxLoad" value={newFaculty.maxLoad} onChange={handleFacultyInputChange} type="number" min="1" icon={SlidersHorizontal} />
                    </div>
                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-300 flex items-center justify-center">
                        <Plus className="w-5 h-5 mr-2"/> Save Faculty Member
                    </button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><UserCheck className="w-5 h-5 mr-2"/> Faculty Availability Overview (Req 9, 12)</h2>
                
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/ID</th>
                            {DAYS_OF_WEEK.map(day => (
                                <th key={day} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{day}</th>
                            ))}
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {faculty.map(f => {
                            const currentCourses = courses.filter(c => c.instructor === f.name).length;
                            const currentLoad = currentCourses * 4; // Mock calculation
                            
                            return (
                                <tr key={f.id} className="hover:bg-gray-50 transition duration-100">
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                                        <p className="text-xs text-gray-500">{f.id} | Load: {currentLoad}/{f.maxLoad} Hrs</p>
                                    </td>
                                    {DAYS_OF_WEEK.map(day => {
                                        const status = getAvailabilityStatus(f, day);
                                        return (
                                            <td key={${f.id}-${day}} className="px-3 py-3 whitespace-nowrap text-center">
                                                <span className={inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClasses(status)}}>
                                                    {status}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3 whitespace-nowrap text-center">
                                        <button 
                                            onClick={() => handleDeleteFaculty(f.id)} 
                                            className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition"
                                            title="Delete Faculty"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                        {/* In a full app, this would open a detailed availability editor */}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {faculty.length === 0 && <p className="text-center py-6 text-gray-500 italic">No faculty defined yet. Use the form above to add one.</p>}
            </div>
        </div>
    );
};

// --- Main Application Component ---
const App = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [courses, setCourses] = useState([]);
    const [faculty, setFaculty] = useState([]);
    // FIX: isLoading is true by default, will be set to false after authentication.
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // FIX: Replaced global variables with React state for the authenticated user.
    const [user, setUser] = useState(null);

    const [newCourse, setNewCourse] = useState({
        code: '', name: '', instructor: '', semester: 'Fall 2026', count: 30,
        L: 3, T: 1, P: 2, S: 1 
    });
    const [newFaculty, setNewFaculty] = useState({ 
        id: '', name: '', maxLoad: 20
    });

    // --- Firebase Initialization and Authentication ---
    useEffect(() => {
        if (!firebaseConfig) {
            setError("Firebase configuration is missing.");
            setIsLoading(false);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);

            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser); // FIX: Set the user state object
                } else {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(auth, initialAuthToken);
                        } else {
                            await signInAnonymously(auth);
                        }
                    } catch (e) {
                        setError(Authentication failed: ${e.message});
                    }
                }
                setIsLoading(false); // FIX: Stop loading once auth state is resolved.
            });
            return () => unsubscribe(); // Cleanup subscription on unmount
        } catch (e) {
            setError(Initialization Error: ${e.message});
            setIsLoading(false);
        }
    }, []);

    // --- Data Handlers ---

    // FIX: useCallback now depends on user. It will be recreated when the user changes.
    const getCollectionRef = useCallback((collectionName) => {
        if (!db || !user) throw new Error("Database not ready or user not authenticated.");
        const path = artifacts/${appId}/public/data/${collectionName};
        return collection(db, path);
    }, [user]);

    // FIX: useEffect to set up listeners now depends on getCollectionRef.
    // This ensures that listeners are re-established if the user (and thus the ref function) changes.
    useEffect(() => {
        if (!user) return; // Don't run if user is not authenticated

        const setupListeners = () => {
            try {
                const coursesQuery = query(getCollectionRef('courses'));
                const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
                    const fetchedCourses = snapshot.docs.map((doc, index) => ({ 
                        id: doc.id, 
                        ...doc.data(),
                        colorClass: COURSE_COLORS[index % COURSE_COLORS.length]
                    }));
                    setCourses(fetchedCourses);
                }, (err) => { 
                    console.error("Course listener error:", err); 
                    setError(Course data fetch error: ${err.message}); 
                });

                const facultyQuery = query(getCollectionRef('faculty'));
                const unsubscribeFaculty = onSnapshot(facultyQuery, (snapshot) => {
                    const fetchedFaculty = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setFaculty(fetchedFaculty);
                }, (err) => { 
                    console.error("Faculty listener error:", err); 
                    setError(Faculty data fetch error: ${err.message}); 
                });
                
                // Return a cleanup function to unsubscribe from listeners on unmount
                return () => {
                    unsubscribeCourses();
                    unsubscribeFaculty();
                };

            } catch (e) {
                console.error("Listener setup error:", e);
                setError("Could not set up data listeners.");
            }
        };

        const cleanup = setupListeners();
        return cleanup;

    }, [getCollectionRef, user]); // Dependency on user and getCollectionRef

    // Course Handlers
    const handleCourseInputChange = (e) => {
        const { id, value } = e.target;
        setNewCourse(prev => ({ 
            ...prev, 
            [id]: ['L', 'T', 'P', 'S', 'count'].includes(id) ? parseInt(value) || 0 : value 
        }));
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        if (!user || !newCourse.code || !newCourse.name) return;
        const colorIndex = courses.length % COURSE_COLORS.length;
        
        try {
            await addDoc(getCollectionRef('courses'), {
                code: newCourse.code.toUpperCase().trim(),
                name: newCourse.name.trim(),
                instructor: newCourse.instructor.trim(),
                semester: newCourse.semester,
                registrationCount: newCourse.count,
                L: newCourse.L, T: newCourse.T, P: newCourse.P, S: newCourse.S,
                color: COURSE_COLORS[colorIndex].split(' ')[0].replace('-200', '-500'),
            });
            setNewCourse({ code: '', name: '', instructor: '', semester: 'Fall 2026', count: 30, L: 3, T: 1, P: 2, S: 1 });
        } catch (e) { console.error("Error adding course:", e); setError("Could not add course."); }
    };
    
    const handleDeleteCourse = async (id) => {
        if (!window.confirm("Are you sure you want to delete this course?")) return;
        try { await deleteDoc(doc(getCollectionRef('courses'), id)); } 
        catch (e) { console.error("Error deleting course:", e); setError("Could not delete course."); }
    };
    
    // --- Faculty Handlers ---

    const handleFacultyInputChange = (e) => {
        const { id, value } = e.target;
        setNewFaculty(prev => ({
            ...prev,
            [id]: id === 'maxLoad' ? parseInt(value) || 0 : value 
        }));
    };
    
    const handleAddFaculty = async (e) => {
        e.preventDefault();
        if (!user || !newFaculty.id || !newFaculty.name) return;
        
        try {
            await setDoc(doc(getCollectionRef('faculty'), newFaculty.id.toUpperCase().trim()), {
                name: newFaculty.name.trim(),
                maxLoad: newFaculty.maxLoad,
            });
            setNewFaculty({ id: '', name: '', maxLoad: 20 });
        } catch (e) {
            console.error("Error adding faculty:", e);
            setError(Could not add faculty. ID might already exist.);
        }
    };
    
    const handleDeleteFaculty = async (id) => {
        if (!window.confirm("Are you sure you want to delete this faculty member?")) return;
        try { await deleteDoc(doc(getCollectionRef('faculty'), id)); } 
        catch (e) { console.error("Error deleting faculty:", e); setError("Could not delete faculty."); }
    };

    // --- Mock Scheduling/Display Logic (Unchanged) ---
    const generateMockSchedule = (courseList) => {
        const mockSchedule = DAYS_OF_WEEK.reduce((acc, day) => {
            acc[day] = TIME_SLOTS.map(slot => ({
                ...slot,
                course: null,
                activityType: slot.type === 'LUNCH_BREAK' ? 'Lunch Break' : 'Available',
                colorClass: slot.type === 'LUNCH_BREAK' ? 'bg-gray-400 text-white' : 'bg-white text-gray-400 border-gray-300'
            }));
            return acc;
        }, {});

        let courseIndex = 0;
        
        DAYS_OF_WEEK.forEach((day, dayIndex) => {
            if (courseIndex < courseList.length) {
                const course = courseList[courseIndex];
                const lectureSlot = mockSchedule[day].find(s => s.type === 'CLASS' && !s.course);
                
                if (lectureSlot) {
                    lectureSlot.course = course.code;
                    lectureSlot.activityType = 'Lecture';
                    lectureSlot.colorClass = course.colorClass;
                    
                    const labSlot = mockSchedule[day].find(s => s.type === 'CLASS' && !s.course);
                    if(course.P > 0 && labSlot) {
                        labSlot.course = course.code;
                        labSlot.activityType = 'Lab';
                        labSlot.colorClass = course.colorClass.replace('-200', '-100') + ' border-dashed';
                    }
                    
                    courseIndex++;
                }
            }
        });
        
        DAYS_OF_WEEK.forEach(day => {
            mockSchedule[day].forEach(slot => {
                if(slot.activityType === 'Available' && Math.random() < 0.2) {
                    slot.activityType = 'Self-Study';
                    slot.colorClass = 'bg-gray-100 text-gray-700 border-gray-300 border-dashed';
                }
            })
        });

        return mockSchedule;
    };

    const mockSchedule = useMemo(() => generateMockSchedule(courses), [courses]);
    
    // --- Render Functions ---
    const renderTimeSlotCell = (slot) => {
        const baseClasses = "p-2 h-14 rounded-lg text-sm transition duration-300 shadow-sm border";

        if (slot.activityType === 'Lunch Break') {
            return (
                <div key={slot.time} className={${baseClasses} ${slot.colorClass} border-gray-500 flex items-center justify-center text-xs font-bold}>
                    <Clock className="w-4 h-4 mr-1" /> {slot.activityType}
                </div>
            );
        }

        const courseDetails = courses.find(c => c.code === slot.course);

        if (slot.course) {
             const activityStyle = slot.activityType === 'Lab' ? 'font-semibold text-sm' : 'font-bold text-base';
            return (
                <div key={slot.time} className={${baseClasses} ${slot.colorClass} border-l-4 p-3}>
                    <p className="text-xs text-gray-700 font-medium">{slot.time}</p>
                    <p className={${activityStyle} truncate}>{slot.course} - {slot.activityType}</p>
                    <p className="text-xs text-gray-600 truncate">{courseDetails?.instructor}</p>
                </div>
            );
        }

        if (slot.activityType === 'Self-Study') {
            return (
                <div key={slot.time} className={${baseClasses} ${slot.colorClass} border-gray-400 text-gray-700 flex flex-col justify-center}>
                    <p className="text-xs text-gray-600 font-medium">{slot.time}</p>
                    <p className="font-semibold text-sm">{slot.activityType}</p>
                </div>
            );
        }

        return (
            <div key={slot.time} className={${baseClasses} bg-white border-gray-200 text-gray-300 italic flex items-center}>
                <p className="text-xs font-medium mr-2">{slot.time}</p>
                <p>Free Slot</p>
            </div>
        );
    };


    const renderDashboard = () => (
        <>
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><ListPlus className="w-5 h-5 mr-2"/> Course Definition (Input Collection)</h2>
                <form onSubmit={handleAddCourse} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <InputField label="Course Code" id="code" value={newCourse.code} onChange={handleCourseInputChange} icon={Plus} />
                        <InputField label="Course Name" id="name" value={newCourse.name} onChange={handleCourseInputChange} icon={BookOpen} />
                        
                        {/* FIX: Changed instructor input to a dropdown select */}
                        <div className="relative">
                            <label htmlFor="instructor" className="block text-xs font-medium text-gray-500 mb-1">Instructor</label>
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition duration-150">
                                <Users className="w-5 h-5 text-gray-400 ml-3" />
                                <select 
                                    id="instructor" 
                                    value={newCourse.instructor} 
                                    onChange={handleCourseInputChange}
                                    className="w-full pl-2 pr-3 py-2 text-gray-700 bg-white focus:outline-none appearance-none"
                                    required
                                >
                                    <option value="" disabled>Select an instructor</option>
                                    {faculty.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <InputField label="Registration Count" id="count" value={newCourse.count} onChange={handleCourseInputChange} type="number" min="1" icon={Users} />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="col-span-4 font-semibold text-gray-700 mb-2">LTPSC Structure (L: Lecture, T: Tutorial, P: Practical, S: Self-Study Hours/Week)</p>
                        <InputField label="L" id="L" value={newCourse.L} onChange={handleCourseInputChange} type="number" required={false} min="0" />
                        <InputField label="T" id="T" value={newCourse.T} onChange={handleCourseInputChange} type="number" required={false} min="0" />
                        <InputField label="P" id="P" value={newCourse.P} onChange={handleCourseInputChange} type="number" required={false} min="0" />
                        <InputField label="S" id="S" value={newCourse.S} onChange={handleCourseInputChange} type="number" required={false} min="0" />
                    </div>

                    <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center">
                        <Plus className="w-5 h-5 mr-2"/> Save Course Definition
                    </button>
                </form>
            </div>

            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Defined Courses ({courses.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map(course => (
                        <div key={course.id} className="bg-white p-4 rounded-xl shadow-md border-l-4" style={{ borderColor: course.color }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xl font-extrabold text-gray-800">{course.code}</p>
                                    <p className="text-sm text-gray-600 mb-2">{course.name}</p>
                                </div>
                                <button onClick={() => handleDeleteCourse(course.id)} className="text-red-400 hover:text-red-600 transition">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-2 border-t pt-2">
                                <span>Instructor: {course.instructor}</span>
                                <span>L{course.L} T{course.T} P{course.P} S{course.S}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><CalendarDays className="w-5 h-5 mr-2"/> Generated Timetable (Mock)</h2>
                <div className="flex flex-col md:grid md:grid-cols-6 gap-2 min-w-[700px]">
                    
                    <div className="hidden md:block">
                        <div className="p-2 h-10 font-bold text-gray-700">Time</div>
                        {TIME_SLOTS.map(slot => (
                            <div key={header-${slot.time}} className="p-2 h-14 text-xs text-gray-600 font-medium flex items-center justify-end border-b border-dashed border-gray-200">
                                {/* FIX: Changed duration from 60 mins to 50 mins to match comments */}
                                {slot.type !== 'LUNCH_BREAK' && <span>{slot.time} - {new Date(new Date(2000/01/01 ${slot.time}).getTime() + 50 * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
                            </div>
                        ))}
                    </div>

                    {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="flex-grow">
                            <div className="p-2 h-10 font-bold text-blue-600 border-b-2 border-blue-200 mb-2 text-center">{day}</div>
                            <div className="space-y-2">
                                {mockSchedule[day].map(renderTimeSlotCell)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    // --- Main Render Logic ---

    if (isLoading) {
        return <div className="text-center p-8 text-xl font-semibold text-blue-600">Authenticating & Loading Timetable System...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-xl font-semibold text-red-600 bg-red-100 rounded-xl m-4">Error: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <header className="mb-6 p-6 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-extrabold text-blue-800 mb-1">Automated Timetable System</h1>
                <p className="text-sm text-gray-600">
                    {/* FIX: Display the user's UID from state */}
                    User ID: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{user?.uid}</span>
                </p>
                <div className="mt-4 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button 
                            onClick={() => setActiveTab('dashboard')}
                            className={py-2 px-1 text-sm font-medium border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}}
                        >
                            Courses & Schedule
                        </button>
                        <button 
                            onClick={() => setActiveTab('faculty')}
                            className={py-2 px-1 text-sm font-medium border-b-2 ${activeTab === 'faculty' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}}
                        >
                            Faculty Management
                        </button>
                    </nav>
                </div>
            </header>
            
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'faculty' && (
                <FacultyManager 
                    faculty={faculty}
                    courses={courses}
                    handleDeleteFaculty={handleDeleteFaculty}
                    handleAddFaculty={handleAddFaculty}
                    newFaculty={newFaculty}
                    handleFacultyInputChange={handleFacultyInputChange}
                />
            )}
            
            <footer className="mt-8 text-center text-xs text-gray-500">
                <p>This application demonstrates data handling and UI structure. A dedicated backend service is required to enforce all complex scheduling constraints.</p>
            </footer>
        </div>
    );
};

export default App;
